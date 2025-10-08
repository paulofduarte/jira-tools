import { assertEquals } from "@std/assert";
import { createJiraCommand } from "../../src/cli/jira.ts";

async function collectHelpOutput(args: string[]): Promise<string> {
  const output: string[] = [];
  const originalLog = console.log;

  console.log = (...data: unknown[]) => {
    output.push(data.map((item) => String(item)).join(" "));
  };

  try {
    const command = createJiraCommand().noExit();
    await command.parse(args);
  } finally {
    console.log = originalLog;
  }

  return output.join("\n");
}

Deno.test("jira help mirrors root --help output", async () => {
  const helpOutput = await collectHelpOutput(["help"]);
  const flagOutput = await collectHelpOutput(["--help"]);
  assertEquals(helpOutput, flagOutput);
});

Deno.test("jira help command delegates to subcommand help", async () => {
  const helpOutput = await collectHelpOutput(["help", "query"]);
  const flagOutput = await collectHelpOutput(["query", "--help"]);
  assertEquals(helpOutput, flagOutput);
});
