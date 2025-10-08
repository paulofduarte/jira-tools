import { assertEquals } from "@std/assert";
import { loadEnvironment, readEnv } from "../../src/config/env.ts";

Deno.test("loadEnvironment loads .env file when present", async () => {
  await Deno.mkdir("./tmp/env-tests", { recursive: true });
  const tempDir = await Deno.makeTempDir({ dir: "./tmp/env-tests" });
  const envPath = `${tempDir}/.env`;
  await Deno.writeTextFile(envPath, "JIRA_HOST=https://env-test.atlassian.net\n");

  await loadEnvironment(envPath);
  const host = readEnv("JIRA_HOST");

  try {
    assertEquals(host, "https://env-test.atlassian.net");
  } finally {
    Deno.env.delete("JIRA_HOST");
  }
});
