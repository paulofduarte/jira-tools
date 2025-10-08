import type {
  JiraIssueData,
  JiraQueryOptions,
  JiraQueryResult,
  JiraSearchAdapter,
  JiraSearchRequest,
} from "./types.ts";

const DEFAULT_PAGE_SIZE = 50;
const API_PAGE_LIMIT = 100;

/**
 * Normalizes raw Jira issue objects into the structure exposed by the library.
 */
function toIssueData(issue: Record<string, unknown>): JiraIssueData {
  const key = typeof issue.key === "string" ? issue.key : "UNKNOWN";
  const fields = (issue.fields && typeof issue.fields === "object")
    ? issue.fields as Record<string, unknown>
    : {};

  return {
    key,
    fields,
    raw: issue,
  };
}

/**
 * Calculates the next page parameters to be sent to Jira.
 */
function createSearchRequest(
  adapterRequest: Omit<JiraSearchRequest, "startAt" | "maxResults" | "nextPageToken">,
  startAt: number,
  remaining: number,
  nextPageToken?: string | null,
): JiraSearchRequest {
  const maxResults = Math.min(API_PAGE_LIMIT, remaining);

  return {
    ...adapterRequest,
    startAt,
    maxResults,
    nextPageToken,
  };
}

/**
 * Provides high-level helpers to run paginated Jira JQL queries.
 */
export class JiraQueryService {
  constructor(private readonly adapter: JiraSearchAdapter) {}

  /**
   * Executes the provided JQL query and aggregates the response into a reusable structure.
   */
  async runQuery(options: JiraQueryOptions): Promise<JiraQueryResult> {
    if (!options.jql.trim()) {
      throw new Error("JQL query must not be empty.");
    }

    const limit = Math.max(options.maxResults ?? DEFAULT_PAGE_SIZE, 1);
    let total = 0;
    let startAt = 0;
    let nextPageToken: string | null | undefined = undefined;
    const issues: JiraIssueData[] = [];

    const baseRequest: Omit<JiraSearchRequest, "startAt" | "maxResults" | "nextPageToken"> = {
      jql: options.jql,
      fields: options.fields,
      expand: options.expand,
    };

    while (issues.length < limit) {
      const remainingCapacity = limit - issues.length;
      const request = createSearchRequest(
        baseRequest,
        startAt,
        remainingCapacity,
        nextPageToken ?? undefined,
      );
      const page = await this.adapter.search(request);
      const pageIssues = Array.isArray(page.issues) ? page.issues : [];
      const normalized = pageIssues.slice(0, remainingCapacity).map(toIssueData);
      issues.push(...normalized);

      total = typeof page.total === "number" ? page.total : (total || issues.length);
      const consumed = pageIssues.length;
      startAt = (typeof page.startAt === "number" ? page.startAt : request.startAt) + consumed;
      nextPageToken = page.nextPageToken ?? null;

      if (pageIssues.length === 0) {
        break;
      }

      if (issues.length >= limit) {
        break;
      }

      const hasNextToken = nextPageToken !== null && nextPageToken !== undefined;
      const pageFilled = pageIssues.length === request.maxResults;
      const totalKnown = typeof total === "number";
      const fetchedAllKnown = totalKnown && issues.length >= Math.min(total, limit);

      if (!hasNextToken) {
        if (!pageFilled || fetchedAllKnown) {
          break;
        }
      }
    }

    return {
      issues,
      total,
      fetched: issues.length,
    };
  }
}
