import { assertEquals, assertExists, assertStringIncludes } from "@std/assert/mod.ts";
import { formatQueryResult } from "../../src/lib/formatters.ts";
import type { JiraQueryResult } from "../../src/lib/types.ts";

type ExcelJSCell = {
  value: unknown;
};

type ExcelJSRow = {
  getCell(index: number): ExcelJSCell;
};

type ExcelJSWorksheet = {
  columns: Array<{ header: string; key: string }>;
  addRow(record: Record<string, unknown>): void;
  getRow(index: number): ExcelJSRow;
};

type ExcelJSWorkbook = {
  addWorksheet(name: string): ExcelJSWorksheet;
  getWorksheet(name: string): ExcelJSWorksheet | undefined;
  worksheets: ExcelJSWorksheet[];
  xlsx: {
    load(data: unknown): Promise<void>;
    writeBuffer(): Promise<ArrayBuffer | Uint8Array>;
  };
};

type ExcelJSModule = {
  Workbook: new () => ExcelJSWorkbook;
};

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
  const excelJSImport = await import("@exceljs");
  const ExcelJS =
    ((excelJSImport as { default?: ExcelJSModule }).default ?? excelJSImport) as ExcelJSModule;

  assertEquals(formatted.fileExtension, "xlsx");
  assertEquals(formatted.contentType, "binary");
  const payload = formatted.payload as Uint8Array;
  assertExists(payload);

  const workbook = new ExcelJS.Workbook();
  const { Buffer: NodeBuffer } = await import("node:buffer");
  const buffer = NodeBuffer.from(payload);
  await workbook.xlsx.load(buffer);

  const sheet = workbook.getWorksheet("jira-query") ?? workbook.worksheets[0];
  const headerRow = sheet.getRow(1);
  assertEquals(headerRow.getCell(1).value, "key");
  assertEquals(headerRow.getCell(2).value, "summary");
  assertEquals(headerRow.getCell(3).value, "status");
  assertEquals(headerRow.getCell(4).value, "assignee");

  const dataRow = sheet.getRow(2);
  assertEquals(dataRow.getCell(1).value, "TEST-1");
  assertEquals(dataRow.getCell(2).value, "Issue summary");
  assertEquals(dataRow.getCell(3).value, "To Do");
  assertEquals(dataRow.getCell(4).value, "Alice");
});
