import { Version3Client } from "@jira";
import type {
  JiraAuthentication,
  JiraClientOptions,
  JiraSearchAdapter,
  JiraSearchRequest,
  JiraSearchResponse,
} from "./types.ts";

/**
 * Normalizes jira.js authentication options to guard against future API changes.
 */
function buildAuthentication(authentication: JiraAuthentication) {
  if (authentication.type === "basic") {
    return {
      basic: {
        email: authentication.email,
        apiToken: authentication.apiToken,
      },
    };
  }

  return {
    personalAccessToken: authentication.token,
  };
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

      return {
        issues: response.issues as Record<string, unknown>[],
        total: response.total ?? response.issues.length,
        startAt: response.startAt ?? 0,
        maxResults: response.maxResults ?? response.issues.length,
      };
    },
  };
}
