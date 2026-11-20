# Domain docs

Before exploring, read `GLOSSARY.md` and the ADRs in `docs/adr/` that touch the area you're about to work in. If they don't exist, proceed silently.

When your output names a domain concept (issue title, test name, proposal), use the glossary's term. A concept missing from the glossary is either invented language (reconsider) or a real gap (note it).

| Area | ADR |
| --- | --- |
| Where the harness comes from | 0001 |
| Core and adapters (Netlify, CapRover) | 0002 |
| Layers, file suffixes and imports | 0003 |
| TypeScript without a build step | 0004 |
| Oxlint with a minimal ESLint | 0005 |
| How the CapRover image is released | 0006 |

If your output contradicts an ADR, say so explicitly: _Contradicts ADR-0002 (...), but worth reopening because..._
