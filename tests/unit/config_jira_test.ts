import { assertEquals, assertThrows } from "@std/assert/mod.ts";
import { createQueryOptions, resolveJiraClientOptions } from "../../src/config/jira.ts";

Deno.test("resolveJiraClientOptions prefers personal access token when provided", () => {
  const options = resolveJiraClientOptions({
    host: "https://example.atlassian.net",
    personalAccessToken: "pat-token",
    email: "user@example.com",
    apiToken: "api-token",
  });

  assertEquals(options.authentication.type, "pat");
  assertEquals(options.authentication.token, "pat-token");
});

Deno.test("resolveJiraClientOptions falls back to basic auth when PAT is absent", () => {
  const options = resolveJiraClientOptions({
    host: "https://example.atlassian.net",
    email: "user@example.com",
    apiToken: "api-token",
  });

  assertEquals(options.authentication.type, "basic");
  assertEquals(options.authentication.email, "user@example.com");
  assertEquals(options.authentication.apiToken, "api-token");
});

Deno.test("resolveJiraClientOptions reads credentials from environment variables", () => {
  Deno.env.set("JIRA_HOST", "https://env.atlassian.net");
  Deno.env.set("JIRA_EMAIL", "env@example.com");
  Deno.env.set("JIRA_API_TOKEN", "env-token");

  try {
    const options = resolveJiraClientOptions({});
    assertEquals(options.host, "https://env.atlassian.net");
    assertEquals(options.authentication.type, "basic");
    assertEquals(options.authentication.email, "env@example.com");
    assertEquals(options.authentication.apiToken, "env-token");
  } finally {
    Deno.env.delete("JIRA_HOST");
    Deno.env.delete("JIRA_EMAIL");
    Deno.env.delete("JIRA_API_TOKEN");
  }
});

Deno.test("resolveJiraClientOptions throws when required credentials are missing", () => {
  assertThrows(
    () =>
      resolveJiraClientOptions({
        host: "https://missing.atlassian.net",
        email: "missing@example.com",
      }),
    Error,
    "Missing credentials",
  );
});

Deno.test("createQueryOptions applies defaults", () => {
  const options = createQueryOptions({ jql: "project = TEST" });
  assertEquals(options.fields, ["summary", "status", "assignee"]);
  assertEquals(options.jql, "project = TEST");
});

Deno.test("createQueryOptions preserves custom fields", () => {
  const options = createQueryOptions({
    jql: "project = TEST",
    fields: ["summary", "priority"],
  });

  assertEquals(options.fields, ["summary", "priority"]);
});
