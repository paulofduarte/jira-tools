export type JiraAuthType = "basic" | "pat";

/**
 * Defines the credentials required for Jira basic (email + API token) authentication.
 */
export interface JiraBasicAuth {
  readonly type: "basic";
  readonly email: string;
  readonly apiToken: string;
}

/**
 * Defines the credentials required for Jira personal access token authentication.
 */
export interface JiraPatAuth {
  readonly type: "pat";
  readonly token: string;
}

/**
 * Represents the authentication configuration accepted by the Jira clients.
 */
export type JiraAuthentication = JiraBasicAuth | JiraPatAuth;

/**
 * Defines the minimal options required to instantiate a Jira API client.
 */
export interface JiraClientOptions {
  readonly host: string;
  readonly authentication: JiraAuthentication;
}

/**
 * Describes the arguments accepted by the Jira query service when running a JQL query.
 */
export interface JiraQueryOptions {
  readonly jql: string;
  readonly fields?: readonly string[];
  readonly maxResults?: number;
  readonly expand?: readonly string[];
}

/**
 * Represents the structured issue object exposed by the library.
 */
export interface JiraIssueData {
  readonly key: string;
  readonly fields: Record<string, unknown>;
  readonly raw: Record<string, unknown>;
}

/**
 * Represents the result produced by the Jira query service.
 */
export interface JiraQueryResult {
  readonly issues: readonly JiraIssueData[];
  readonly total: number;
  readonly fetched: number;
}

/**
 * Defines the response returned by the low level Jira client search operation.
 */
export interface JiraSearchResponse {
  readonly issues: readonly Record<string, unknown>[];
  readonly total: number;
  readonly startAt: number;
  readonly maxResults: number;
  readonly nextPageToken?: string | null;
}

/**
 * Describes a low level Jira search request that can be executed by an adapter.
 */
export interface JiraSearchRequest {
  readonly jql: string;
  readonly fields?: readonly string[];
  readonly startAt: number;
  readonly maxResults: number;
  readonly expand?: readonly string[];
  readonly nextPageToken?: string | null;
}

/**
 * Interface that any Jira search adapter must implement so it can be used by the query service.
 */
export interface JiraSearchAdapter {
  search(request: JiraSearchRequest): Promise<JiraSearchResponse>;
}
