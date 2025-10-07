# Jira Tools

CLI utilities for automating Jira workflows with a modern Deno + TypeScript stack. The toolkit is designed as a reusable library plus thin CLI wrappers so future commands can be added quickly. Generated with Codex – see [`CODEX.md`](CODEX.md) for generation details.

## Features

- Reusable library that wraps jira.js for Version 3 of the Jira REST API.
- `jira` umbrella command with subcommands plus standalone binaries such as `jira-query`.
- Formats: JSON (default), CSV, text, and Excel (`.xlsx`) with optional file output.
- Secure credential handling via environment variables, `.env` files, CLI flags, or interactive hidden prompts.
- Autocompletion generation for popular shells.
- Comprehensive unit and integration test coverage with Deno’s built-in test runner.

## Prerequisites

1. Install [Jetify Devbox](https://www.jetify.com/devbox/docs/install) (ensures a consistent development environment).
2. Clone this repository and enter the project directory.
3. Start a shell in the project environment:
   ```bash
   devbox shell
   ```
   This pulls the pinned `deno`, `node`, and helper tools declared in `devbox.json`.

## Project Layout

```
src/
  cli/            # CLI entry points and command wiring
  config/         # Environment and configuration helpers
  lib/            # Reusable Jira library, formatters, IO helpers
tests/
  unit/           # Unit tests for helpers, services, and formatters
  integration/    # End-to-end style tests for CLI commands
```

## Usage

Run commands through Deno or add them to your path once compiled.

### View CLI Help

```bash
deno task jira -- --help
deno task jira-query -- --help
```

### Query Issues

```bash
deno task jira query \
  --host https://your-domain.atlassian.net \
  --email you@example.com \
  --api-token your-token \
  --jql "project = ENG ORDER BY created DESC" \
  --format csv \
  --output reports/eng-recent
```

The command prints the output to STDOUT (unless `--no-stdout` is set) and saves an appropriately named file when `--output` or `--output-dir` is provided. For sensitive values you can omit the flag value to be prompted securely (e.g. `--api-token`).

### Environment Variables & `.env`

Supported variables:

- `JIRA_HOST`
- `JIRA_EMAIL` / `JIRA_USERNAME`
- `JIRA_API_TOKEN` / `JIRA_PASSWORD`
- `JIRA_PERSONAL_ACCESS_TOKEN` / `JIRA_PAT`

Place them in a `.env` file or pass via the environment. Use `--env-file` to point at custom paths.

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
```

Unit and integration tests stub external dependencies, so the suite runs offline.

## Git Hooks

To enable commit-time formatting and linting checks, point Git at the bundled hooks:

```bash
git config core.hooksPath .githooks
```

Commits will now run `deno fmt --check` and `deno lint` automatically (using `devbox run` as a fallback when Deno is not installed globally).

## Continuous Integration

GitHub Actions (see `.github/workflows/ci.yml`) run linting, formatting, and the full test suite on every push/PR.

## Future Work

- Additional subcommands (e.g. bulk transitions, changelog reports).
- Packaging via `deno compile` to produce standalone executables for each command.
- Extended configuration (caching, pagination strategies, etc.).
