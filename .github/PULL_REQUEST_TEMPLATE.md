## What and why

<!-- One or two sentences. -->

## Linked issue

<!-- Closes #123. One pull request closes one issue. -->

## How I tested it

<!-- `pnpm check:changed` is the minimum; CI runs the full `pnpm check`. Say what you tried by hand (a `curl -H "Host: ..."` against the Docker image, a dry run of a sync). -->

- [ ] The acceptance criteria of the issue are met
- [ ] `pnpm check:changed` passes
- [ ] New behavior has a test next to the file it tests
- [ ] A new alias field or capability is in the schema, the matcher and every adapter's declared capabilities
- [ ] New output paths are tested with a fake secret

## Checklist

- [ ] No tokens, passwords or private URLs anywhere in the diff
- [ ] The core still imports no Node built-in
- [ ] Docs, `GLOSSARY.md` or an ADR updated if behavior or vocabulary changed
- [ ] Anything kept only for an old script or stored shape carries `@legacy`
