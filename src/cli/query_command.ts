import { Command } from "@cliffy/command";
import { Secret } from "@cliffy/prompt";
import { createQueryOptions, resolveJiraClientOptions } from "../config/jira.ts";
import { loadEnvironment } from "../config/env.ts";
import {
  createJiraSearchAdapter,
  formatQueryResult,
  type FormatResult,
  type JiraQueryResult,
  JiraQueryService,
  type JiraSearchAdapter,
  type OutputFormat,
  writeToFile,
  writeToStdout,
} from "../mod.ts";
import { extname, join, resolve } from "@std/path";
interface QueryOptions {
  host?: string;
  email?: string;
  apiToken?: string | boolean;
  password?: string | boolean;
  personalAccessToken?: string | boolean;
  jql: string;
  format: OutputFormat;
  field?: string[];
  fields?: string[];
  maxResults?: number;
  expand?: string[];
  output?: string;
  outputDir?: string;
  envFile?: string;
  noStdout?: boolean;
  verbose?: boolean;
}

const FORMAT_COMPLETIONS = ["json", "csv", "text", "excel"];

export interface QueryCommandDependencies {
  loadEnv?: (path?: string) => Promise<void>;
  createAdapter?: (
    options: Parameters<typeof createJiraSearchAdapter>[0],
    config?: Parameters<typeof createJiraSearchAdapter>[1],
  ) => JiraSearchAdapter;
  createService?: (adapter: JiraSearchAdapter) => Pick<JiraQueryService, "runQuery">;
  formatResult?: (
    result: JiraQueryResult,
    format: OutputFormat,
  ) => Promise<FormatResult>;
  writeStdout?: (result: FormatResult) => Promise<void>;
  writeFile?: (result: FormatResult, path: string) => Promise<void>;
  now?: () => number;
  logger?: Pick<Console, "error"> & Partial<Pick<Console, "debug" | "info" | "log">>;
  exit?: (code: number) => never;
}

/**
 * Creates an array of fields from CLI options removing duplicates.
 */
function resolveFields(options: QueryOptions): string[] | undefined {
  const accumulator = new Set<string>();
  const add = (value?: string | string[]) => {
    if (!value) {
      return;
    }
    const values = Array.isArray(value) ? value : value.split(",");
    for (const entry of values) {
      const field = entry.trim();
      if (field.length > 0) {
        accumulator.add(field);
      }
    }
  };

  add(options.field);
  add(options.fields);

  return accumulator.size > 0 ? [...accumulator] : undefined;
}

/**
 * Prompts the user for a secret value when the option is supplied without an explicit value.
 */
async function resolveSecretOption(
  value: string | boolean | undefined,
  message: string,
): Promise<string | undefined> {
  if (typeof value === "string") {
    return value;
  }

  if (value === true) {
    if (!Deno.stdin.isTerminal()) {
      throw new Error(
        `Cannot prompt for ${message.toLowerCase()} in a non-interactive environment.`,
      );
    }

    const secret = await Secret.prompt(message);
    return secret;
  }

  return undefined;
}

/**
 * Determines the path where the output file should be written.
 */
function resolveOutputPath(
  options: QueryOptions,
  extension: string,
  now: () => number,
): string | undefined {
  if (!options.output && !options.outputDir) {
    return undefined;
  }

  if (options.output && options.outputDir) {
    throw new Error("Specify either --output or --output-dir, not both.");
  }

  if (options.output) {
    const output = extname(options.output) ? options.output : `${options.output}.${extension}`;
    return resolve(output);
  }

  const fileName = `jira-query-${now()}.${extension}`;
  const directory = resolve(options.outputDir ?? ".");
  return join(directory, fileName);
}

/**
 * Registers the Jira query subcommand.
 */
export function createQueryCommand(
  dependencies: QueryCommandDependencies = {},
) {
  const {
    loadEnv = loadEnvironment,
    createAdapter = createJiraSearchAdapter,
    createService = (adapter: JiraSearchAdapter) => new JiraQueryService(adapter),
    formatResult = formatQueryResult,
    writeStdout = writeToStdout,
    writeFile = writeToFile,
    now = () => Date.now(),
    logger = console,
    exit = (code: number) => Deno.exit(code),
  } = dependencies;

  return new Command()
    .name("query")
    .description("Execute a Jira JQL query and print the results.")
    .option("--host <host:string>", "Jira host (e.g. https://company.atlassian.net)")
    .option("--email <email:string>", "Jira account email used for basic authentication.")
    .option(
      "--api-token [apiToken:string]",
      "Jira API token. Omit the value to be prompted securely.",
    )
    .option(
      "--password [password:string]",
      "Jira password (for self-hosted instances). Omit value to prompt securely.",
    )
    .option(
      "--personal-access-token [token:string]",
      "Jira personal access token. Omit the value to be prompted securely.",
    )
    .option(
      "-q, --jql <jql:string>",
      "JQL query to execute.",
      { required: true },
    )
    .option(
      "-f, --format <format:string>",
      "Output format (json, csv, text, excel).",
      {
        default: "json",
        value: (value) => value.toLowerCase() as OutputFormat,
      },
    )
    .option(
      "--field <field:string>",
      "Field to include in the response (can be repeated).",
      { collect: true },
    )
    .option(
      "--fields <fields:string>",
      "Comma separated list of fields to include.",
      { collect: true },
    )
    .option(
      "-m, --max-results <max:number>",
      "Maximum number of issues to fetch (defaults to 50).",
      {
        value: (value) => {
          if (value <= 0) {
            throw new Error("--max-results must be a positive number.");
          }
          return value;
        },
      },
    )
    .option(
      "--expand <expand:string>",
      "Fields to expand in the Jira response (can be repeated).",
      { collect: true },
    )
    .option(
      "-o, --output <path:string>",
      "File path where the output should be saved. Extension is appended when missing.",
    )
    .option(
      "--output-dir <directory:string>",
      "Directory where the output should be saved. A timestamped file name is used.",
    )
    .option("--env-file <path:string>", "Path to the .env file to load.")
    .option(
      "--no-stdout",
      "Do not print the output to STDOUT (useful when only saving to files).",
    )
    .option(
      "-v, --verbose",
      "Enable verbose logging of Jira API calls and include stack traces on failure.",
      { default: false },
    )
    .complete("format", () => FORMAT_COMPLETIONS)
    .action(async (options: QueryOptions) => {
      await loadEnv(options.envFile ?? ".env");

      const apiToken = await resolveSecretOption(
        options.apiToken,
        "Enter your Jira API token",
      );
      const password = await resolveSecretOption(
        options.password,
        "Enter your Jira password",
      );
      const personalAccessToken = await resolveSecretOption(
        options.personalAccessToken,
        "Enter your Jira personal access token",
      );

      const fields = resolveFields(options);

      const clientOptions = resolveJiraClientOptions({
        host: options.host,
        email: options.email,
        apiToken,
        password,
        personalAccessToken,
      });

      const queryOptions = createQueryOptions({
        jql: options.jql,
        fields,
        maxResults: options.maxResults,
        expand: options.expand,
      });

      try {
        const adapter = createAdapter(clientOptions, {
          verbose: options.verbose,
          logger,
        });
        const service = createService(adapter);
        const result = await service.runQuery(queryOptions);
        const formatted = await formatResult(result, options.format);

        const outputPath = resolveOutputPath(
          options,
          formatted.fileExtension,
          now,
        );

        if (!options.noStdout) {
          await writeStdout(formatted);
          if (formatted.contentType === "text") {
            await Deno.stdout.write(new TextEncoder().encode("\n"));
          }
        }

        if (outputPath) {
          await writeFile(formatted, outputPath);
          const logInfo = logger.info ?? logger.debug ?? logger.error;
          logInfo.call(logger, `Saved output to ${outputPath}`);
        }
      } catch (error) {
        if (options.verbose) {
          logger.error("[jira-tools] Command failed", error);
        } else {
          const message = error instanceof Error ? error.message : String(error);
          logger.error(`Error: ${message}`);
        }
        exit(1);
      }
    });
}
