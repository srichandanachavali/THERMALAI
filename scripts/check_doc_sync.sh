#!/usr/bin/env bash
# Doc-sync gate — three modes:
#   --audit      : report unowned/double-owned/dead-reference counts (exit 0)
#   --precommit  : exit 1 if staged arch code has no staged doc, or manifest is stale
#   --warn       : non-blocking nag after a Claude turn
#
# Mode implementations live in scripts/_doc_sync_{audit,precommit,warn}.sh.
# Override (emergency only): SKIP_DOC_SYNC=1 — prints loudly.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_doc_sync_common.sh
source "$SCRIPT_DIR/_doc_sync_common.sh"

MANIFEST="$CONTEXT_DIR/_doc_manifest.json"

MODE="${1:-}"
if [[ -z "$MODE" ]]; then
  echo "Usage: check_doc_sync.sh --audit | --precommit | --warn" >&2
  exit 1
fi

# ── SKIP override ────────────────────────────────────────────────────────────
if [[ "${SKIP_DOC_SYNC:-0}" == "1" ]]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  ⚠️  DOC-SYNC GATE SKIPPED  (SKIP_DOC_SYNC=1)              ║"
  echo "║  This bypass must only be used in genuine emergencies.      ║"
  echo "║  Run scripts/check_doc_sync.sh --audit after you finish.   ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  exit 0
fi

# ── Helpers ──────────────────────────────────────────────────────────────────

# Load manifest into associative array file→doc
declare -A FILE_TO_DOC
load_manifest() {
  [ -f "$MANIFEST" ] || return
  while IFS='|' read -r file doc; do
    [[ -n "$file" && -n "$doc" ]] && FILE_TO_DOC["$file"]="$doc"
  done < <(python3 - "$MANIFEST" <<'PYEOF'
import sys, json
with open(sys.argv[1]) as fh:
    data = json.load(fh)
for f, d in data.get('file_to_doc', {}).items():
    print(f"{f}|{d}")
PYEOF
)
}

# Print owning doc for a file, or "NO OWNING DOC"
owning_doc() {
  local f="$1"
  echo "${FILE_TO_DOC[$f]:-NO OWNING DOC: create one in context/}"
}

# ── Mode implementations ─────────────────────────────────────────────────────
source "$SCRIPT_DIR/_doc_sync_audit.sh"
source "$SCRIPT_DIR/_doc_sync_precommit.sh"
source "$SCRIPT_DIR/_doc_sync_warn.sh"

# ── Dispatch ─────────────────────────────────────────────────────────────────
case "$MODE" in
  --audit)      run_audit ;;
  --precommit)  run_precommit ;;
  --warn)       run_warn ;;
  *)
    echo "Unknown mode: $MODE" >&2
    echo "Usage: check_doc_sync.sh --audit | --precommit | --warn" >&2
    exit 1
    ;;
esac
