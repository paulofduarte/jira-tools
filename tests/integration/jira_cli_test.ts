import { assertEquals, assertExists, assertRejects } from "@std/assert";
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
  let capturedAdapterConfig: unknown;
  let receivedQueryOptions: JiraQueryOptions | undefined;
  const testLogger = {
    error: (_message?: unknown, _meta?: unknown) => {},
    debug: (_message?: unknown, _meta?: unknown) => {},
  };

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
    createAdapter: (options, adapterConfig) => {
      capturedClientOptions = options;
      capturedAdapterConfig = adapterConfig;
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
    logger: testLogger,
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
  assertEquals(capturedAdapterConfig, {
    verbose: false,
    logger: testLogger,
    useEnhancedSearch: true,
  });
});

Deno.test("jira-query honours legacy search toggle", async () => {
  let capturedUseEnhanced: boolean | undefined;
  const command = createQueryCommand({
    loadEnv: () => Promise.resolve(),
    createAdapter: (_options, adapterConfig) => {
      capturedUseEnhanced = adapterConfig?.useEnhancedSearch;
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
    createService: () => ({
      runQuery(): Promise<JiraQueryResult> {
        return Promise.resolve({
          total: 0,
          fetched: 0,
          issues: [],
        });
      },
    }),
    formatResult: () =>
      Promise.resolve({
        payload: "",
        fileExtension: "txt",
        mimeType: "text/plain",
        contentType: "text",
      }),
    writeStdout: () => Promise.resolve(),
    writeFile: () => Promise.resolve(),
    logger: console,
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
    "--legacy-search",
  ]);

  assertEquals(capturedUseEnhanced, false);
});

Deno.test("jira-query command hides stack trace unless verbose", async () => {
  const errors: Array<unknown[]> = [];
  const command = createQueryCommand({
    loadEnv: () => Promise.resolve(),
    createAdapter: () => ({
      search: (): Promise<JiraSearchResponse> =>
        Promise.resolve({
          issues: [],
          total: 0,
          startAt: 0,
          maxResults: 0,
        }),
    }),
    createService: () => ({
      runQuery(): Promise<JiraQueryResult> {
        return Promise.reject(new Error("Request failed"));
      },
    }),
    formatResult: () => Promise.reject(new Error("Should not be called")),
    writeStdout: () => Promise.resolve(),
    writeFile: () => Promise.resolve(),
    now: () => 123,
    logger: {
      error: (...args: unknown[]) => {
        errors.push(args);
      },
    },
    exit: (code: number): never => {
      throw new Error(`exit:${code}`);
    },
  });

  command.name("jira-query");

  await assertRejects(
    () =>
      command.parse([
        "--jql",
        "project = TEST",
        "--host",
        "https://example.atlassian.net",
        "--email",
        "user@example.com",
        "--api-token",
        "token-123",
      ]),
    Error,
    "exit:1",
  );

  assertEquals(errors.length > 0, true);
  assertEquals(errors[0][0], "Error: Request failed");
});
