import { Version3Client } from "@jira";
import type {
  JiraAuthentication,
  JiraClientOptions,
  JiraSearchAdapter,
  JiraSearchRequest,
  JiraSearchResponse,
} from "./types.ts";

type Logger = Pick<Console, "error"> & Partial<Pick<Console, "debug" | "info" | "log">>;

export interface JiraSearchAdapterOptions {
  readonly verbose?: boolean;
  readonly logger?: Logger;
}

type JiraJsAuthentication = NonNullable<
  ConstructorParameters<typeof Version3Client>[0]["authentication"]
>;

/**
 * Normalizes jira.js authentication options to guard against future API changes.
 */
function buildAuthentication(authentication: JiraAuthentication): JiraJsAuthentication {
  if (authentication.type === "basic") {
    return {
      basic: {
        email: authentication.email,
        apiToken: authentication.apiToken,
      },
    } satisfies JiraJsAuthentication;
  }

  return {
    personalAccessToken: authentication.token,
  } as unknown as JiraJsAuthentication;
}

/**
 * Translates a high-level search request into the structure expected by jira.js.
 */
function createSearchPayload(request: JiraSearchRequest) {
  return {
    jql: request.jql,
    startAt: request.startAt,
    maxResults: request.maxResults,
    fields: request.fields ? [...request.fields] : undefined,
    expand: request.expand ? [...request.expand] : undefined,
  };
}

/**
 * Creates a Jira search adapter backed by jira.js' Version 3 client.
 */
export function createJiraSearchAdapter(
  options: JiraClientOptions,
  adapterOptions: JiraSearchAdapterOptions = {},
): JiraSearchAdapter {
  const client = new Version3Client({
    host: options.host,
    authentication: buildAuthentication(options.authentication),
  });
  const logger = adapterOptions.logger ?? console;

  return {
    async search(request: JiraSearchRequest): Promise<JiraSearchResponse> {
      const log = logger.debug ?? logger.info ?? logger.error;

      if (adapterOptions.verbose) {
        log.call(
          logger,
          "[jira-tools] Sending JQL request",
          {
            jql: request.jql,
            fields: request.fields,
            expand: request.expand,
            startAt: request.startAt,
            maxResults: request.maxResults,
          },
        );
      }

      try {
        const response = await client.issueSearch.searchForIssuesUsingJql(createSearchPayload(
          request,
        ));
        const issues = Array.isArray(response.issues)
          ? response.issues.map((issue) => issue as unknown as Record<string, unknown>)
          : [];
        const total = typeof response.total === "number" ? response.total : issues.length;
        const startAt = typeof response.startAt === "number" ? response.startAt : request.startAt;
        const maxResults = typeof response.maxResults === "number"
          ? response.maxResults
          : issues.length;

        if (adapterOptions.verbose) {
          log.call(
            logger,
            "[jira-tools] Received JQL response",
            {
              total,
              fetched: issues.length,
              startAt,
              maxResults,
            },
          );
        }

        return {
          issues,
          total,
          startAt,
          maxResults,
        };
      } catch (error) {
        if (adapterOptions.verbose) {
          logger.error("[jira-tools] JQL request failed", error);
        }
        throw error;
      }
    },
  };
}
