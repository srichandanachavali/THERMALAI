# Methodology — Conventions Detail

Companion to `CLAUDE.md` §4. Holds the detail that would otherwise bloat the guide.

## Versioning

**SemVer** `MAJOR.MINOR.PATCH` lives in `VERSION`:
- PATCH: bug fix, doc update, test addition
- MINOR: new feature, new context doc, methodology retrofit
- MAJOR: breaking API or schema change

## Test Hygiene

- Run `scripts/check_doc_sync.sh --audit` before test suites (clean = manifest current).
- Never skip a failing test without an issue in `context/open_work.md`.
- Do not commit commented-out tests.

## Coverage Delta

Before a new feature, check `context/open_work.md`. If a touched module has no test, add one.
The bar is "no untested module in the critical safety path," not 100%.
