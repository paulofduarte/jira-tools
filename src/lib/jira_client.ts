import { Version3Client } from "@jira";
import type {
  JiraAuthentication,
  JiraClientOptions,
  JiraSearchAdapter,
  JiraSearchRequest,
  JiraSearchResponse,
} from "./types.ts";

type Logger = Pick<Console, "error"> & Partial<Pick<Console, "debug" | "info" | "log">>;

type EnhancedSearchResponse = {
  issues?: Array<Record<string, unknown>>;
  nextPageToken?: string | null;
  total?: number;
};

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
        const response = await client.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
          jql: request.jql,
          fields: request.fields ? [...request.fields] : undefined,
          expand: request.expand ? request.expand.join(",") : undefined,
          maxResults: request.maxResults,
          nextPageToken: request.nextPageToken ?? undefined,
          failFast: true,
        }) as unknown as EnhancedSearchResponse;
        const issues = Array.isArray(response.issues)
          ? response.issues.map((issue) => issue as unknown as Record<string, unknown>)
          : [];
        const total = typeof response.total === "number" ? response.total : issues.length;
        const startAt = request.startAt;
        const maxResults = request.maxResults;

        if (adapterOptions.verbose) {
          log.call(
            logger,
            "[jira-tools] Received JQL response",
            {
              total,
              fetched: issues.length,
              startAt,
              maxResults,
              nextPageToken: response.nextPageToken ?? null,
            },
          );
        }

        return {
          issues,
          total,
          startAt,
          maxResults,
          nextPageToken: response.nextPageToken ?? null,
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
