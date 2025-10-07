import { assertEquals, assertExists } from "@std/assert/mod.ts";
import { createQueryCommand } from "../../src/cli/query_command.ts";
import type {
  JiraQueryOptions,
  JiraQueryResult,
  JiraSearchAdapter,
  JiraSearchResponse,
} from "../../src/lib/types.ts";
import type { FormatResult } from "../../src/lib/formatters.ts";

Deno.test("jira-query command writes output and saves to file", async () => {
  const outputs: (string | Uint8Array)[] = [];
  const saved: { path?: string; result?: FormatResult } = {};
  let capturedClientOptions: unknown;
  let receivedQueryOptions: JiraQueryOptions | undefined;

  const mockResult: JiraQueryResult = {
    total: 1,
    fetched: 1,
    issues: [
      {
        key: "TEST-1",
        fields: { summary: "Summary" },
        raw: { key: "TEST-1" },
      },
    ],
  };

  const mockFormat: FormatResult = {
    payload: '{"ok":true}',
    fileExtension: "json",
    mimeType: "application/json",
    contentType: "text",
  };

  const command = createQueryCommand({
    loadEnv: () => Promise.resolve(),
    createAdapter: (options) => {
      capturedClientOptions = options;
      return {
        search: (): Promise<JiraSearchResponse> =>
          Promise.resolve({
            issues: [],
            total: 0,
            startAt: 0,
            maxResults: 0,
          }),
      };
    },
    createService: (_adapter: JiraSearchAdapter) => ({
      runQuery(options: JiraQueryOptions): Promise<JiraQueryResult> {
        receivedQueryOptions = options;
        return Promise.resolve(mockResult);
      },
    }),
    formatResult: () => Promise.resolve(mockFormat),
    writeStdout: (result) => {
      outputs.push(result.payload);
      return Promise.resolve();
    },
    writeFile: (result, path) => {
      saved.path = path;
      saved.result = result;
      return Promise.resolve();
    },
    now: () => 1234567890,
  });

  command.name("jira-query");

  await command.parse([
    "--jql",
    "project = TEST",
    "--host",
    "https://example.atlassian.net",
    "--email",
    "user@example.com",
    "--api-token",
    "token-123",
    "--output",
    "report",
  ]);

  assertExists(capturedClientOptions);
  assertEquals(
    (capturedClientOptions as { host: string }).host,
    "https://example.atlassian.net",
  );
  assertEquals(receivedQueryOptions?.jql, "project = TEST");
  assertEquals(receivedQueryOptions?.fields, [
    "summary",
    "status",
    "assignee",
  ]);
  assertEquals(outputs[0], mockFormat.payload);
  assertEquals(saved.result, mockFormat);
  assertExists(saved.path);
  assertEquals(
    saved.path?.endsWith("report.json"),
    true,
  );
});
