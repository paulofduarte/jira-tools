import { Command } from "@cliffy/command";
import { CompletionsCommand } from "@cliffy/command/completions";
import { HelpCommand } from "@cliffy/command/help";
import { createQueryCommand } from "./query_command.ts";
import { VERSION } from "../version.ts";

/**
 * Builds the root Jira CLI command providing access to all subcommands.
 */
export function createJiraCommand(): Command {
  const root = new Command()
    .name("jira")
    .version(VERSION)
    .description("CLI tools for interacting with Jira.")
    .command("query", createQueryCommand())
    .command("completions", new CompletionsCommand())
    .command("help", new HelpCommand().global());

  root.action(async () => {
    await root.showHelp();
  });

  return root;
}

if (import.meta.main) {
  await createJiraCommand().parse(Deno.args);
}
