import type { JiraClientOptions, JiraQueryOptions } from "../lib/types.ts";
import { readEnv } from "./env.ts";

const DEFAULT_FIELDS = ["summary", "status", "assignee"];

export interface JiraCredentialsInput {
  readonly host?: string;
  readonly email?: string;
  readonly apiToken?: string;
  readonly password?: string;
  readonly personalAccessToken?: string;
}

export interface JiraQueryInput {
  readonly jql: string;
  readonly fields?: readonly string[];
  readonly maxResults?: number;
  readonly expand?: readonly string[];
}

/**
 * Resolves Jira client options combining CLI arguments with environment variables.
 */
export function resolveJiraClientOptions(
  input: JiraCredentialsInput,
): JiraClientOptions {
  const host = input.host ?? readEnv("JIRA_HOST");

  if (!host) {
    throw new Error(
      "Jira host is required. Provide it via --host or JIRA_HOST environment variable.",
    );
  }

  const email = input.email ?? readEnv("JIRA_EMAIL") ?? readEnv("JIRA_USERNAME");
  const inlineApiToken = input.apiToken ?? input.password;
  const apiToken = inlineApiToken ?? readEnv("JIRA_API_TOKEN") ?? readEnv("JIRA_PASSWORD");
  const personalAccessToken = input.personalAccessToken ??
    readEnv("JIRA_PERSONAL_ACCESS_TOKEN") ?? readEnv("JIRA_PAT");

  if (personalAccessToken) {
    return {
      host,
      authentication: {
        type: "pat",
        token: personalAccessToken,
      },
    };
  }

  if (email && apiToken) {
    return {
      host,
      authentication: {
        type: "basic",
        email,
        apiToken,
      },
    };
  }

  throw new Error(
    "Missing credentials. Provide --email with --api-token/--password, or a personal access token.",
  );
}

/**
 * Builds the Jira query options merging defaults with user provided preferences.
 */
export function createQueryOptions(input: JiraQueryInput): JiraQueryOptions {
  const fields = input.fields && input.fields.length > 0 ? input.fields : DEFAULT_FIELDS;

  return {
    jql: input.jql,
    fields,
    maxResults: input.maxResults,
    expand: input.expand,
  };
}
