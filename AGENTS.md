# Agent Guide

This project is intentionally structured to make it easy for autonomous or
semi-autonomous agents to extend the Jira tooling library.

## Key Commands

- `deno task jira -- --help` – inspect all available subcommands.
- `deno task jira query ...` – run the primary query workflow.
- `deno task lint` / `deno task fmt` / `deno task test` – quality gates.

## Development Workflow

1. Enter the reproducible environment with `devbox shell`.
2. Work inside `src/lib` for reusable logic and keep CLI wrappers thin.
3. Add unit tests beside related modules under `tests/unit`.
4. For end-to-end scenarios, place tests in `tests/integration` and rely on dependency
   injection to avoid hitting external services.
5. Run `deno task fmt` before opening a PR to ensure consistent formatting.
6. Execute `deno task test` (and fix any failures) before staging changes so CI never
   catches regressions you already know about.
7. Whenever you add a dependency, run a license scan (e.g. via `deno info` or your
   preferred SBOM tool) to confirm compatibility with MIT. If the library is acceptable,
   record its notice in `THIRD_PARTY_LICENSES.md`; swap it out if it is not compatible
   before merging.
8. Always run `devbox` commands from the repository root so the generated `devbox.lock`
   stays consistent, and commit the lockfile with your changes.
9. When Codex is used for major functionality or refactors, record the full prompt,
   precise timestamp, and complete model identifier (include version tag/build) in
   `CODEX.md` so provenance stays up to date.
10. Whenever a timestamp is needed, obtain it through an agent action (e.g. invoking
    `date` in the workspace) rather than hard-coding or estimating.
11. If CLI usage, commands, or flags change, immediately update `README.md` so
    documentation stays in sync with the tooling.
12. When adding documentation, double-check external links (curl the URL or use a
    browser) to ensure they are reachable and current before committing.

## Adding Commands

- Create reusable primitives inside `src/lib` whenever possible.
- Use `createJiraCommand()` as the aggregation point for new subcommands.
- Export any new helpers through `src/mod.ts` to keep the public surface cohesive.
- For each new CLI command, add a matching executable script under `.bin/` and run
  `git update-index --chmod=+x <script>` after staging but before committing so the
  executable bit is recorded.

## Credentials Handling

- Always favour environment variables or secure prompts rather than storing secrets in
  files.
- When prompting, rely on `@cliffy/prompt` helpers so input stays hidden.

## Testing Notes

- Tests run without network access; stub adapters instead of calling Jira.
- Prefer deterministic timestamps by injecting `now()` style functions—see
  `createQueryCommand` for an example.
