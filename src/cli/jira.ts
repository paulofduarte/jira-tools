import { CompletionsCommand } from "@cliffy/command/completions";
import { HelpCommand } from "@cliffy/command/help";
import { Command } from "@cliffy/command";
import { createQueryCommand } from "./query_command.ts";
import { VERSION } from "../version.ts";

/**
 * Builds the root Jira CLI command providing access to all subcommands.
 */
export function createJiraCommand() {
  const root = new Command()
    .name("jira")
    .version(VERSION)
    .description("CLI tools for interacting with Jira.");

  root
    .command("query", createQueryCommand())
    .command("completions", new CompletionsCommand())
    .command("help", new HelpCommand().global().noExit());

  root.reset();

  root.action(async () => {
    await root.showHelp();
  });

  return root.reset();
}

if (import.meta.main) {
  await createJiraCommand().parse(Deno.args);
}
