# Jira Tools

CLI utilities for automating Jira workflows with a modern Deno + TypeScript stack. The
toolkit is designed as a reusable library plus thin CLI wrappers so future commands can
be added quickly. Generated with Codex – see [`CODEX.md`](CODEX.md) for generation
details.

## Features

- Reusable library that wraps jira.js for Version 3 of the Jira REST API.
- `jira` umbrella command with subcommands plus standalone binaries such as `jira-query`.
- Formats: JSON (default), CSV, text, and Excel (`.xlsx`) with optional file output.
- Secure credential handling via environment variables, `.env` files, CLI flags, or
  interactive hidden prompts.
- Verbose mode (`--verbose`) to log Jira API traffic and surface stack traces when
  troubleshooting.
- Autocompletion generation for popular shells.
- Comprehensive unit and integration test coverage with Deno’s built-in test runner.

## Prerequisites

1. Install [Jetify Devbox](https://www.jetify.com/docs/devbox/install) (ensures a consistent development environment).
2. Clone this repository and enter the project directory.
3. Start a shell in the project environment:

   ```bash
   devbox shell
   ```

   This pulls the pinned `deno` runtime declared in `devbox.json`.

## Project Layout

Project layout overview:

```text
src/
  cli/            # CLI entry points and command wiring
  config/         # Environment and configuration helpers
  lib/            # Reusable Jira library, formatters, IO helpers
tests/
  unit/           # Unit tests for helpers, services, and formatters
  integration/    # End-to-end style tests for CLI commands
```

## Usage

When you enter `devbox shell`, the repository’s `.bin` directory is added to your `PATH`
so the wrapped CLI scripts are available immediately.

### View CLI Help

```bash
devbox shell
jira --help
jira query --help
jira-query --help
```

Outside a `devbox` shell (or in other environments) you can invoke the scripts directly
as long as `deno` is installed:

```bash
.bin/jira --help
.bin/jira-query --format json --jql "project = ENG"
```

You can still fall back to `deno task jira …` or `deno task jira-query …` if you prefer
to run the tasks explicitly.

### Query Issues

```bash
deno task jira query \
  --host https://your-domain.atlassian.net \
  --email you@example.com \
  --api-token your-token \
  --jql "project = ENG ORDER BY created DESC" \
  --format csv \
  --output reports/eng-recent \\
  --verbose
```

The command prints the output to STDOUT (unless `--no-stdout` is set) and saves an
appropriately named file when `--output` or `--output-dir` is provided. Use `--verbose`
to stream Jira request/response metadata and keep stack traces for failing calls. For
security, you can omit sensitive values to be prompted interactively (e.g.
`--api-token`).

### Environment Variables & `.env`

Supported variables:

- `JIRA_HOST`
- `JIRA_EMAIL` / `JIRA_USERNAME`
- `JIRA_API_TOKEN` / `JIRA_PASSWORD`
- `JIRA_PERSONAL_ACCESS_TOKEN` / `JIRA_PAT`
- `JIRA_USE_ENHANCED_SEARCH`

Place them in a `.env` file or pass via the environment. Use `--env-file` to point at custom paths.

Set `JIRA_USE_ENHANCED_SEARCH=true` to opt into Atlassian's experimental Search & Reconcile
endpoint. When the flag is unset (default), the CLI uses the stable `/rest/api/3/search` API to
guarantee consistent results on every Jira tenant.

### Generating Jira Credentials

- **Jira API token (recommended for Atlassian Cloud):** Visit the [Atlassian API token management page](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/),
  create a new token, then store it securely (for example in your shell configuration or
  `.env`). API tokens inherit the permissions of the Atlassian account, so make sure the
  account has at least _Browse Projects_ access to every project you plan to query.
- **Jira Personal Access Token (Cloud):** Follow the official guide for
  [personal access tokens](https://support.atlassian.com/jira-cloud-administration/docs/create-personal-access-tokens/)
  and grant only the scopes you need:
  - _Classic scopes_: `read:jira-work` is sufficient for issue queries; add `read:jira-user`
    if you need assignee/user metadata.
  - _Granular scopes_: choose the **Jira REST API (read)** preset or manually include
    `read:issue:jira` and `read:project:jira` (add `read:user:jira` when user details are
    required). Avoid broader scopes unless you truly need them.
- **Self-managed instances:** For Jira Data Center / Server, create a PAT from your profile
  or ask your administrator (see the
  [Data Center documentation](https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html)).
  Grant only the read scope required for issue search (`read`), and avoid falling back to
  username/password unless strictly necessary.

After creating a token, export it as `JIRA_API_TOKEN` (or `JIRA_PERSONAL_ACCESS_TOKEN`)
before running the CLI. You can also provide it interactively with the corresponding
flag (`--api-token` / `--personal-access-token`).

### Autocompletion

Generate shell completions through the embedded command:

```bash
deno task jira completions bash > /usr/local/etc/bash_completion.d/jira
```

Replace `bash` with `zsh`, `fish`, etc. per your shell’s installation guidance.

## Testing & Linting

```bash
deno task lint
deno task fmt
deno task test
deno task sbom   # generates sbom.spdx.json from deno.lock
```

Unit and integration tests stub external dependencies, so the suite runs offline.

## Git Hooks

To enable commit-time formatting and linting checks, point Git at the bundled hooks:

```bash
git config core.hooksPath .githooks
```

Commits will now run `deno fmt --check` and `deno lint` automatically (using
`devbox run` as a fallback when Deno is not installed globally).

## Continuous Integration

GitHub Actions (see `.github/workflows/ci.yml`) run linting, formatting, the SBOM
generator, and the full test suite on every push/PR, then submit the resulting SPDX
file to GitHub’s dependency graph.

## Future Work

- Additional subcommands (e.g. bulk transitions, changelog reports).
- Packaging via `deno compile` to produce standalone executables for each command.
- Extended configuration (caching, pagination strategies, etc.).
