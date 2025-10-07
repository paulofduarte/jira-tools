# Codex Generation Notes

- **Generation date:** 2025-10-07 (UTC)
- **AI model:** Codex CLI assistant (`gpt-5-codex-cli`, GPT-5 Codex family, build 2025-10-07), operated in the user's workspace.
- **Project status:** Scaffolded and implemented according to the prompt below.

## Original Prompt

```
Let's start a project from scratch. I want to create a set of jira cli tools to help automating some tasks involving jira, mostly targeting at extracting data and reporting into it.

The project needs to be implemented in typescript and run in a deno runtime. The reason for deno is that I intend to compile the cli tools into standalone executables in the future.

To set the project environment we must use jetify devbox. This is to gurantee a unified development environment accross different machines.

The first tool to implement is jira-query that allows a JQL query to run and respond into into the STDOUT multiple formats, default being JSON, but an option for CSV and TEXT must be provided. Also an option to save the output into files must be provided, an excel export would be a nice to have. Credentials should be passable via command line (passwords should be hidden while typing), via command flags and environment variables. If a .env file is provided load the environment variable from there.

The cli tools should be usable as commands and subcommands. For example `jira-query` can also be used as `jira query`. calling just `jira` will present help for its commands. All cli tools must have a useful help reachable via `--help` and provide autocompletion for most common shells. 

All the tools should be build designed as a reusable library, the cli tool just a wrapper to use the libraries. This will allow better code reusability for future tools.

The JIRA API must be handled by using the jira.js library.

Create all the project scaffolding, the jira-query tool, README.md and AGENTS.md. Also init the git repo and set github actions. All generated code should come with relevant unit tests and integration tests. The code should be designed with reusability and modern best practices in mind. Comments should be added into all public functions of the library document what they do and how to use them. Code comment should be only used to describe complex logic. Use modern and mainstream opensource libraries whenever necessary to avoid creating unnecessary code.

All dependencies and the evironment set must be on the latest released versions.
```
