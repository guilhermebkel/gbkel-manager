# 0003. Layers import downward, the folder name is the file suffix, imports use an alias

Status: accepted (2026-11-20)

## Context

With several adapters and a shared core, a name like `Netlify.ts` hides what a file may do, and relative imports hide which layer a dependency crosses.

## Decision

`src/` folders form layers (`Errors` < `Protocols` < `Utils` < `Schemas` < `Generators` < `Adapters` < `Setup`) and a layer imports only the ones below it. A file in a mapped folder ends with the folder name, singular, one class per file. Imports use the package `imports` alias `#app/<Folder>/<File>.ts`, never `../`. Lint enforces all three.

## Consequences

Names are longer. The order of layers must be kept in the lint config when a layer is added. The alias works unchanged in Node, TypeScript, Vitest and the Docker image.
