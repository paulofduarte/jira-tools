import { stringify } from "@std/csv/stringify";
import type { JiraIssueData, JiraQueryResult } from "./types.ts";

const DEFAULT_TEXT_SEPARATOR = "\n---\n";

export type OutputFormat = "json" | "csv" | "text" | "excel";

export interface FormatMetadata {
  readonly fileExtension: string;
  readonly mimeType: string;
  readonly contentType: "text" | "binary";
}

export interface FormatResult extends FormatMetadata {
  readonly payload: string | Uint8Array;
}

/**
 * Converts complex Jira field values into serialisable data suitable for CSV and text outputs.
 */
function simplifyValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => simplifyValue(entry) ?? "").join(", ");
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.name === "string") {
      return obj.name;
    }

    if (typeof obj.displayName === "string") {
      return obj.displayName;
    }

    return JSON.stringify(obj);
  }

  return `${value}`;
}

/**
 * Maps Jira issues into plain objects ready to feed formatters.
 */
function buildRecords(issues: readonly JiraIssueData[]): Record<string, unknown>[] {
  return issues.map((issue) => {
    const record: Record<string, unknown> = { key: issue.key };

    for (const [field, value] of Object.entries(issue.fields)) {
      record[field] = simplifyValue(value);
    }

    return record;
  });
}

/**
 * Generates an ordered list of headers from the provided records.
 */
function extractHeaders(records: readonly Record<string, unknown>[]): string[] {
  const headers = new Set<string>(["key"]);

  for (const record of records) {
    for (const key of Object.keys(record)) {
      headers.add(key);
    }
  }

  return [...headers];
}

/**
 * Formats the query result as a JSON document.
 */
function formatJson(result: JiraQueryResult): FormatResult {
  const payload = JSON.stringify(
    {
      total: result.total,
      fetched: result.fetched,
      issues: result.issues.map((issue) => issue.raw),
    },
    null,
    2,
  );

  return {
    payload,
    fileExtension: "json",
    mimeType: "application/json",
    contentType: "text",
  };
}

/**
 * Formats the query result as CSV text.
 */
async function formatCsv(result: JiraQueryResult): Promise<FormatResult> {
  const records = buildRecords(result.issues);
  const headers = extractHeaders(records);
  const rows = records.map((record) =>
    headers.map((header) => simplifyValue(record[header]) ?? "")
  );

  const payload = await stringify(rows, { columns: headers, header: true });

  return {
    payload,
    fileExtension: "csv",
    mimeType: "text/csv",
    contentType: "text",
  };
}

/**
 * Formats the query result as a human-readable text table.
 */
function formatText(result: JiraQueryResult): FormatResult {
  const records = buildRecords(result.issues);
  const payload = records.map((record) => {
    const summary = [
      `Key: ${record.key ?? ""}`,
      `Summary: ${record.summary ?? ""}`,
      `Status: ${record.status ?? ""}`,
      `Assignee: ${record.assignee ?? ""}`,
    ].join("\n");

    return summary;
  }).join(DEFAULT_TEXT_SEPARATOR);

  return {
    payload,
    fileExtension: "txt",
    mimeType: "text/plain",
    contentType: "text",
  };
}

/**
 * Formats the query result as an Excel workbook.
 */
async function formatExcel(result: JiraQueryResult): Promise<FormatResult> {
  const { utils, write } = await import("@xlsx");
  const records = buildRecords(result.issues);
  const worksheet = utils.json_to_sheet(records);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "jira-query");

  const arrayBuffer = write(workbook, { bookType: "xlsx", type: "array" });
  const payload = new Uint8Array(arrayBuffer);

  return {
    payload,
    fileExtension: "xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    contentType: "binary",
  };
}

/**
 * Formats the Jira query result according to the requested output format.
 */
export async function formatQueryResult(
  result: JiraQueryResult,
  format: OutputFormat,
): Promise<FormatResult> {
  switch (format) {
    case "json":
      return formatJson(result);
    case "csv":
      return await formatCsv(result);
    case "text":
      return formatText(result);
    case "excel":
      return await formatExcel(result);
    default:
      throw new Error(`Unsupported format: ${format satisfies never}`);
  }
}
