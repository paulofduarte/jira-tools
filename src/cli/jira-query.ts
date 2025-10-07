import { Command } from "@cliffy/command/mod.ts";
import { createQueryCommand } from "./query_command.ts";
import { VERSION } from "../version.ts";

/**
 * Entry point for the standalone jira-query command.
 */
export function createJiraQueryCommand(): Command {
  const query = createQueryCommand();
  query.name("jira-query");
  query.version(VERSION);
  return query;
}

if (import.meta.main) {
  await createJiraQueryCommand().parse(Deno.args);
}
