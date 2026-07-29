# Seal verification note (additive — the frozen records themselves are untouched)

`AAP_OBJECTIVE.md` is sealed at sha256
`fa656a9c0688b8b6747afc02cdfbc41a876423e651f472769d7f62f7c35b549d` (SYNTHESIS.md A.1).
That hash is over the file's canonical LF bytes. This machine has `core.autocrlf=true`,
so the Windows working-tree copy materializes CRLF and hashes differently — that is a
line-ending materialization, not content drift.

**Canonical byte-check (verified 2026-07-28, matches the seal exactly):**

```bash
git show ddc578e:docs/planning/aap/AAP_OBJECTIVE.md | sha256sum
```

2026-07-28: a repo-wide Prettier pass briefly reformatted the aap/ records in the
working tree; they were restored byte-exact from commit `ddc578e` the same session and
`docs/planning/aap/` was added to `.prettierignore` so formatters can never touch the
frozen records again.
