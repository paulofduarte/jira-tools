import { assertEquals, assertExists, assertStringIncludes } from "@std/assert/mod.ts";
import { formatQueryResult } from "../../src/lib/formatters.ts";
import type { JiraQueryResult } from "../../src/lib/types.ts";

const resultFixture: JiraQueryResult = {
  issues: [
    {
      key: "TEST-1",
      fields: {
        summary: "Issue summary",
        status: { name: "To Do" },
        assignee: { displayName: "Alice" },
      },
      raw: {
        key: "TEST-1",
        fields: {
          summary: "Issue summary",
        },
      },
    },
  ],
  total: 1,
  fetched: 1,
};

Deno.test("formatQueryResult produces JSON output", async () => {
  const formatted = await formatQueryResult(resultFixture, "json");

  assertEquals(formatted.fileExtension, "json");
  assertEquals(formatted.contentType, "text");
  assertStringIncludes(formatted.payload as string, '"TEST-1"');
});

Deno.test("formatQueryResult produces CSV output", async () => {
  const formatted = await formatQueryResult(resultFixture, "csv");

  assertEquals(formatted.fileExtension, "csv");
  assertStringIncludes(formatted.payload as string, "key,summary,status,assignee");
  assertStringIncludes(formatted.payload as string, "TEST-1,Issue summary,To Do,Alice");
});

Deno.test("formatQueryResult produces text output", async () => {
  const formatted = await formatQueryResult(resultFixture, "text");

  assertEquals(formatted.fileExtension, "txt");
  assertStringIncludes(formatted.payload as string, "Key: TEST-1");
});

Deno.test("formatQueryResult produces Excel output", async () => {
  const formatted = await formatQueryResult(resultFixture, "excel");
  const { read, utils } = await import("@xlsx");

  assertEquals(formatted.fileExtension, "xlsx");
  assertEquals(formatted.contentType, "binary");
  const payload = formatted.payload as Uint8Array;
  assertExists(payload);

  const workbook = read(payload, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = utils.sheet_to_json<Record<string, string>>(sheet);

  assertEquals(rows.length, 1);
  assertEquals(rows[0].key, "TEST-1");
  assertEquals(rows[0].summary, "Issue summary");
});
