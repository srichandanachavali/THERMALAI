# ThermalAI — Release Workflow

`main` is production. Every commit to `main` must be tagged. Fast-forward-only.

---

## Invariants

- `main` is always tagged — never push to `main` without completing the tag ritual
- The doc manifest (`context/_doc_manifest.json`) must be regenerated LAST, after all
  other changes, and staged before the commit — if you tag before regenerating, the
  manifest in the tagged commit is stale and the doc-sync gate will fire on the next commit
- Never fast-forward production to an untagged commit
- CI must pass before merging to `main`

---

## Tag Ritual (step by step)

```bash
# 1. Make sure you're on develop (or a release/* branch), CI is green
git checkout develop

# 2. Decide the new version (SemVer: PATCH for bug fix, MINOR for feature, MAJOR for breaking)
NEW_VERSION=1.1.0

# 3. Update VERSION file
echo "$NEW_VERSION" > VERSION

# 4. Add a [X.Y.Z] section to CHANGELOG.md

# 5. Regenerate the manifest LAST (after all other doc/code changes)
bash scripts/build_doc_manifest.sh

# 6. Stage everything
git add VERSION CHANGELOG.md context/_doc_manifest.json context/code_map.md
git add <any other changed files>

# 7. Commit
git commit -m "chore: release v$NEW_VERSION"

# 8. Verify the commit landed — do not tag an uncommitted state
git log --oneline -1

# 9. Tag (annotated)
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

# 10. Merge or PR to main (requires 1 review, CI green)
# 11. Push tag AFTER merge
git push origin main "v$NEW_VERSION"
```

---

## The Gotcha: Regenerate Manifest Last

If you update `context/*.md` frontmatter and then forget to run `build_doc_manifest.sh`
before tagging:
- The tagged commit has a stale `_doc_manifest.json`
- The next commit will trigger `--precommit` gate failure:
  `frontmatter changed but manifest not regenerated`
- You will need `SKIP_DOC_SYNC=1` to get past it, which prints a loud warning

**Always make `bash scripts/build_doc_manifest.sh` the last step before `git add`.**

---

## CI/CD Pipeline

- `ci.yml` — runs backend (Jest), frontend (react-scripts), ML (pytest) in parallel on every push except `main`
- `deploy.yml` — same tests → triggers Render deploy hook on push to `main`
- A failing test suite in `deploy.yml` blocks the Render hook

If CI fails on `main`, use a `fix/*` branch, merge to both `main` and `develop`, and
issue a PATCH release.

---

## Render Services

| Service | Render type | Build command |
|---|---|---|
| Frontend | Static site | `npm run build` in `frontend/` |
| Backend | Web service (Node) | `node server.js` in `backend/` |
| ML API | Web service (Python) | `python app.py` in `ml-model/` |

**Known blocker:** ML service requires `tensorflow-cpu` in `requirements.txt` — full
`tensorflow` OOMs the Render free-tier build. See `context/known-issues.md` issue #1.

---

## Hotfix Process

```bash
git checkout main
git checkout -b fix/describe-the-fix

# make changes, test
bash scripts/build_doc_manifest.sh
git add ... && git commit -m "fix: ..."

# PR to main (fast: skip develop)
# After merge, back-port to develop:
git checkout develop && git merge fix/describe-the-fix
```

Hotfixes that go directly to `main` skip `develop`. Back-port immediately after merge.
