# Methodology — Doc-Sync Gate

Two scripts enforce the ownership contract described in [context_docs.md](context_docs.md):

- `scripts/build_doc_manifest.sh` — sole writer of `context/_doc_manifest.json` and
  `context/code_map.md`. Run it whenever any context doc's `modules:` list changes.

- `scripts/check_doc_sync.sh` — three modes:
  - `--audit`: prints `unowned=N double=N dead=N` + offending file lists (exit 0, never blocks)
  - `--precommit`: exits 1 if staged arch code has no staged doc change, OR if frontmatter
    changed but manifest was not regenerated. Respects `SKIP_DOC_SYNC=1` (prints loudly).
  - `--warn`: non-blocking; prints doc-change nag + uncommitted-changes reminder (used by Stop hook)

Shared logic lives in `scripts/_doc_sync_common.sh`. Mode implementations live in
`scripts/_doc_sync_{audit,precommit,warn}.sh`.

All scripts self-locate via `$(dirname "$0")` so they work from any working directory.

Pre-commit hook (`scripts/pre-commit` → `.git/hooks/pre-commit`) calls `--precommit` mode.
**Per-machine install step required on every fresh clone:** `bash scripts/install_hooks.sh`
