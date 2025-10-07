# Agent Guide

This project is intentionally structured to make it easy for autonomous or semi-autonomous agents to extend the Jira tooling library.

## Key Commands

- `deno task jira -- --help` – inspect all available subcommands.
- `deno task jira query ...` – run the primary query workflow.
- `deno task lint` / `deno task fmt` / `deno task test` – quality gates.

## Development Workflow

1. Enter the reproducible environment with `devbox shell`.
2. Work inside `src/lib` for reusable logic and keep CLI wrappers thin.
3. Add unit tests beside related modules under `tests/unit`.
4. For end-to-end scenarios, place tests in `tests/integration` and rely on dependency injection to avoid hitting external services.
5. Run `deno task fmt` before opening a PR to ensure consistent formatting.
6. Whenever you add a dependency, run a license scan (e.g. via `deno info` or your preferred SBOM tool) to confirm compatibility with MIT. If the library is acceptable, record its notice in `THIRD_PARTY_LICENSES.md`; if it is not, replace it before merging.
7. When Codex is used for major functionality or refactors, record the full prompt, precise timestamp, and complete model identifier (include version tag/build) in `CODEX.md` so provenance stays up to date.
8. Whenever a timestamp is needed, obtain it through an agent action (e.g. invoking `date` in the workspace) rather than hard-coding or estimating.
9. If CLI usage, commands, or flags change, immediately update `README.md` so documentation stays in sync with the tooling.

## Adding Commands

- Create reusable primitives inside `src/lib` whenever possible.
- Use `createJiraCommand()` as the aggregation point for new subcommands.
- Export any new helpers through `src/mod.ts` to keep the public surface cohesive.

## Credentials Handling

- Always favour environment variables or secure prompts rather than storing secrets in files.
- When prompting, rely on `@cliffy/prompt` helpers so input stays hidden.

## Testing Notes

- Tests run without network access; stub adapters instead of calling Jira.
- Prefer deterministic timestamps by injecting `now()` style functions—see `createQueryCommand` for an example.
