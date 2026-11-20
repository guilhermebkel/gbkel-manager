# Docs standards

What goes in `docs/` and where everything else goes.

## Two kinds of file

- **Standard.** A rule that applies to every file of its kind. Each rule is one line a reviewer or a tool can answer yes or no, tagged with how it is checked. The file is `docs/<topic>-standards.md`. Harness changes follow `docs/harness-standards.md`.
- **Guide.** How to do a recurring job (deploy the image, add an adapter). A guide is listed in the table below.

`docs/adr/` and `docs/agents/` keep their own rules and are not classified here.

| File | Kind |
| --- | --- |
| `docs/adapters.md` | guide |
| `docs/deploying-with-caprover.md` | guide |

`docs/code-standards.md` and `docs/test-standards.md` are standards.

## What a standard never contains

- A specific alias, domain or platform setting as the rule. An example may name one, as an example: inside a fenced block, or on a line that says "e.g." or "example".
- A description of the domain. The terms are in `GLOSSARY.md`.

Test for a new line: **would it stay true if the alias, adapter or domain it mentions were renamed or deleted?** If not, it does not go in a standard.

## Where the other content goes

- What an alias is and the terms: `GLOSSARY.md`.
- Why a choice was made: `docs/adr/`. An ADR is not edited once accepted; a new one replaces it.
- How one adapter behaves: the code and its tests; if it needs prose, `docs/adapters.md`.
- A rule a tool can check is a tool (`docs/code-standards.md`); the standard then says which tool and keeps the line.
- Commands in a doc must exist in `package.json`.
