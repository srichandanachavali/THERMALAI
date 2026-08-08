# Contributing to ThermalAI

## Reporting Bugs

Open a [GitHub Issue](https://github.com/srichandanachavali/THERMALAI/issues) with:
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs from `backend/logs/` or browser console
- Environment (Docker / manual, OS, Node/Python version)

## Proposing Features

Open a GitHub Discussion before writing code. Features that touch the ML ensemble, alert system, or auth layer need design sign-off first. Small improvements (UI tweaks, new metrics) can go straight to a PR.

## Branch Naming

| Prefix | Use for |
|--------|---------|
| `feature/` | New functionality (e.g. `feature/per-plant-contacts`) |
| `fix/` | Bug fixes (e.g. `fix/lstm-cold-start`) |
| `docs/` | Documentation only |
| `release/` | Release candidates (e.g. `release/v1.1.0`) |

Always branch from `develop`, not `main`.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add per-plant SMS contact configuration
fix: prevent LSTM cold-start NaN on first reading
docs: update API reference for /explain endpoint
test: add pytest coverage for maintenance thresholds
chore: bump tensorflow-cpu to 2.17
```

Types: `feat` · `fix` · `docs` · `test` · `chore` · `refactor` · `ci`

## Pull Request Checklist

Before opening a PR to `develop`:

- [ ] All three test suites pass locally (`npm test`, `CI=true npm test`, `pytest tests/ -v`)
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] `CLAUDE.md` updated if you changed architecture, ports, env vars, or key files
- [ ] No `.env` files or real secrets committed
- [ ] Backend changes use CommonJS (`require`/`module.exports`) — no `import`
- [ ] Frontend changes use ES modules (`import`/`export`) — no `require`
- [ ] New backend log statements use `logger.*` not `console.*`
- [ ] No staged file exceeds ~8,000 characters (~2,000 tokens) — enforced by the pre-commit hook; split oversized files by responsibility/topic instead

## File-Size Guardrail

Every source/config/doc file must stay under **~8,000 characters (~2,000 tokens)**.
The pre-commit hook blocks any staged file over this limit (lockfiles, minified/bundled
output, and generated build dirs are exempt). If a file grows too large, split it by
responsibility (code) or topic (docs) and link the parts from an index — the same
pattern as `context/` and `docs/methodology/`.

## Code Style

**JavaScript (backend + frontend):** ESLint with the project's existing config. Run `npx eslint .` before pushing.

**Python (ml-model):** [Black](https://black.readthedocs.io/) formatter. Run `black .` before pushing.

No style-only PRs — format fixes should be bundled with the change that touches the file.
