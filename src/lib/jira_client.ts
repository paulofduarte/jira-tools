import { Version3Client } from "@jira";
import type {
  JiraAuthentication,
  JiraClientOptions,
  JiraSearchAdapter,
  JiraSearchRequest,
  JiraSearchResponse,
} from "./types.ts";

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
): JiraSearchAdapter {
  const client = new Version3Client({
    host: options.host,
    authentication: buildAuthentication(options.authentication),
  });

  return {
    async search(request: JiraSearchRequest): Promise<JiraSearchResponse> {
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

      return {
        issues,
        total,
        startAt,
        maxResults,
      };
    },
  };
}
