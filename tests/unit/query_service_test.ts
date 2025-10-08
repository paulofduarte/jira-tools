import { assertEquals, assertRejects } from "@std/assert";
import { JiraQueryService } from "../../src/lib/query_service.ts";
import type {
  JiraQueryOptions,
  JiraSearchAdapter,
  JiraSearchRequest,
  JiraSearchResponse,
} from "../../src/lib/types.ts";

function createIssue(key: string): Record<string, unknown> {
  return {
    key,
    fields: {
      summary: `Summary ${key}`,
    },
  };
}

function createAdapter(
  responses: JiraSearchResponse[],
): JiraSearchAdapter {
  let index = 0;
  return {
    search(request: JiraSearchRequest): Promise<JiraSearchResponse> {
      const response = responses[index];
      index += 1;
      return Promise.resolve({
        ...response,
        startAt: request.startAt,
        nextPageToken: response.nextPageToken ?? null,
      });
    },
  };
}

Deno.test("JiraQueryService aggregates paginated results", async () => {
  const adapter = createAdapter([
    {
      issues: [createIssue("TEST-1"), createIssue("TEST-2")],
      total: 3,
      startAt: 0,
      maxResults: 2,
      nextPageToken: "token-1",
    },
    {
      issues: [createIssue("TEST-3")],
      total: 3,
      startAt: 2,
      maxResults: 1,
      nextPageToken: null,
    },
  ]);

  const service = new JiraQueryService(adapter);
  const options: JiraQueryOptions = {
    jql: "project = TEST",
    maxResults: 5,
  };

  const result = await service.runQuery(options);

  assertEquals(result.total, 3);
  assertEquals(result.fetched, 3);
  assertEquals(result.issues.length, 3);
  assertEquals(result.issues[0].key, "TEST-1");
  assertEquals(result.issues[2].key, "TEST-3");
});

Deno.test("JiraQueryService respects maxResults limit", async () => {
  const adapter = createAdapter([
    {
      issues: [createIssue("TEST-1"), createIssue("TEST-2")],
      total: 5,
      startAt: 0,
      maxResults: 2,
      nextPageToken: "token-1",
    },
    {
      issues: [createIssue("TEST-3"), createIssue("TEST-4")],
      total: 5,
      startAt: 2,
      maxResults: 2,
      nextPageToken: null,
    },
  ]);

  const service = new JiraQueryService(adapter);
  const result = await service.runQuery({
    jql: "project = TEST",
    maxResults: 3,
  });

  assertEquals(result.fetched, 3);
  assertEquals(result.issues.map((issue) => issue.key), [
    "TEST-1",
    "TEST-2",
    "TEST-3",
  ]);
});

Deno.test("JiraQueryService paginates using startAt when nextPageToken is missing", async () => {
  const firstPageIssues = Array.from(
    { length: 100 },
    (_, index) => createIssue(`TEST-${index + 1}`),
  );
  const secondPageIssues = Array.from(
    { length: 20 },
    (_, index) => createIssue(`TEST-${index + 101}`),
  );

  const adapter = createAdapter([
    {
      issues: firstPageIssues,
      total: 120,
      startAt: 0,
      maxResults: 100,
      nextPageToken: undefined,
    },
    {
      issues: secondPageIssues,
      total: 120,
      startAt: 100,
      maxResults: 20,
      nextPageToken: undefined,
    },
  ]);

  const service = new JiraQueryService(adapter);
  const result = await service.runQuery({
    jql: "project = TEST",
    maxResults: 120,
  });

  assertEquals(result.fetched, 120);
  assertEquals(result.total, 120);
  assertEquals(result.issues[0].key, "TEST-1");
  assertEquals(result.issues[result.issues.length - 1]?.key, "TEST-120");
});

Deno.test("JiraQueryService rejects empty JQL queries", async () => {
  const adapter = createAdapter([]);
  const service = new JiraQueryService(adapter);

  await assertRejects(
    () => service.runQuery({ jql: "   " }),
    Error,
    "JQL query must not be empty",
  );
});
