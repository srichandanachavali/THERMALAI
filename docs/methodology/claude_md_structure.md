# Methodology — CLAUDE.md Structure

CLAUDE.md must follow this section order:

1. What this is (one-liner, stack, ports)
2. "Where the brain lives" — ordered reading list stating which file answers which question:
   `context/MEMORY.md` → `context/code_map.md` → `context/tunables.md` →
   `memory/MEMORY.md` → `docs/design/` locked specs
3. Standing rules
4. Conventions (doc-sync binding, semver, backups, test hygiene, coverage-delta before
   running suites)
5. Active hooks + the per-machine pre-commit install step
6. Branch / release model
7. NEVER DO list tied to the domain risk
