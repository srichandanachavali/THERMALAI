#!/usr/bin/env bash
# Doc-sync gate — three modes:
#   --audit      : report unowned/double-owned/dead-reference counts (exit 0)
#   --precommit  : exit 1 if staged arch code has no staged doc, or manifest is stale
#   --warn       : non-blocking nag after a Claude turn
#
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

# ── --audit mode ─────────────────────────────────────────────────────────────
run_audit() {
  load_manifest

  local unowned=0 double=0 dead=0
  local unowned_list=() double_list=() dead_list=()

  # Check every arch file
  while IFS= read -r f; do
    local doc="${FILE_TO_DOC[$f]:-}"
    if [[ -z "$doc" ]]; then
      ((unowned++)) || true
      unowned_list+=("  $f")
    elif [[ "$doc" == DOUBLE:* ]]; then
      ((double++)) || true
      double_list+=("  $f → ${doc#DOUBLE:}")
    fi
  done < <(list_arch_files)

  # Check manifest entries for dead references (file claimed but not on disk)
  for f in "${!FILE_TO_DOC[@]}"; do
    [[ "${FILE_TO_DOC[$f]}" == DOUBLE:* ]] && continue
    if [[ ! -f "$REPO_ROOT/$f" ]]; then
      ((dead++)) || true
      dead_list+=("  $f (claimed by ${FILE_TO_DOC[$f]})")
    fi
  done

  echo "unowned=$unowned double=$double dead=$dead"
  if (( unowned > 0 )); then
    echo ""
    echo "UNOWNED files (no context doc claims them):"
    printf '%s\n' "${unowned_list[@]}"
  fi
  if (( double > 0 )); then
    echo ""
    echo "DOUBLE-OWNED files (claimed by more than one doc):"
    printf '%s\n' "${double_list[@]}"
  fi
  if (( dead > 0 )); then
    echo ""
    echo "DEAD references (file in manifest but not on disk):"
    printf '%s\n' "${dead_list[@]}"
  fi
}

# ── --precommit mode ─────────────────────────────────────────────────────────
run_precommit() {
  load_manifest
  local failed=0

  # Get staged files
  local staged_arch=() staged_docs=() staged_manifest=0
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    # Is it an architectural file?
    local is_arch=0
    for dir in "${ARCH_DIRS[@]}"; do
      case "$f" in
        ${dir}/*) is_arch=1; break ;;
      esac
    done
    if (( is_arch )); then
      is_exempt "$f" || staged_arch+=("$f")
    fi
    # Is it a doc?
    case "$f" in
      context/*.md|docs/*.md|docs/**/*.md) staged_docs+=("$f") ;;
    esac
    # Is it the manifest?
    [[ "$f" == "context/_doc_manifest.json" ]] && staged_manifest=1
  done < <(git -C "$REPO_ROOT" diff --cached --name-only)

  # Rule 1: staged arch code with no staged doc change
  if (( ${#staged_arch[@]} > 0 && ${#staged_docs[@]} == 0 )); then
    echo ""
    echo "❌ DOC-SYNC GATE: Architectural code staged with no context/docs update."
    echo ""
    echo "   Staged arch files:"
    for f in "${staged_arch[@]}"; do
      echo "     $f  →  $(owning_doc "$f")"
    done
    echo ""
    echo "   Update the owning context doc, regenerate the manifest"
    echo "   (bash scripts/build_doc_manifest.sh), then re-stage."
    echo "   Emergency bypass: SKIP_DOC_SYNC=1 git commit ..."
    failed=1
  fi

  # Rule 2: frontmatter changed but manifest not regenerated
  local fm_changed=0
  for f in "${staged_docs[@]}"; do
    case "$f" in context/*.md) fm_changed=1; break ;; esac
  done
  if (( fm_changed && !staged_manifest )); then
    echo ""
    echo "❌ DOC-SYNC GATE: context/*.md frontmatter changed but _doc_manifest.json"
    echo "   was NOT re-staged. Run: bash scripts/build_doc_manifest.sh"
    echo "   then: git add context/_doc_manifest.json context/code_map.md"
    failed=1
  fi

  if (( failed )); then
    echo ""
    exit 1
  fi

  echo "✅ Doc-sync gate passed."
}

# ── --warn mode ──────────────────────────────────────────────────────────────
run_warn() {
  load_manifest

  # Check for architectural files changed this turn (unstaged + staged, vs HEAD)
  local changed_arch=()
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    local is_arch=0
    for dir in "${ARCH_DIRS[@]}"; do
      case "$f" in ${dir}/*) is_arch=1; break ;; esac
    done
    (( is_arch )) || continue
    is_exempt "$f" && continue
    changed_arch+=("$f")
  done < <(git -C "$REPO_ROOT" diff --name-only HEAD 2>/dev/null || true)

  # Check for context/docs changes
  local doc_changed=0
  while IFS= read -r f; do
    case "$f" in context/*.md|docs/*.md) doc_changed=1; break ;; esac
  done < <(git -C "$REPO_ROOT" diff --name-only HEAD 2>/dev/null || true)

  if (( ${#changed_arch[@]} > 0 && !doc_changed )); then
    echo ""
    echo "┌─ DOC-SYNC REMINDER ─────────────────────────────────────────────┐"
    echo "│  Architectural code changed this turn with no doc update.        │"
    echo "│  Consider updating the owning context doc before committing.     │"
    echo "│                                                                  │"
    for f in "${changed_arch[@]}"; do
      printf "│  %-30s → %-28s │\n" "$f" "$(owning_doc "$f")"
    done
    echo "└──────────────────────────────────────────────────────────────────┘"
  fi

  # Uncommitted-changes nag
  local uncommitted
  uncommitted=$(git -C "$REPO_ROOT" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  if (( uncommitted > 0 )); then
    echo ""
    echo "ℹ️  You have $uncommitted uncommitted file(s). Remember to commit before switching tasks."
  fi
}

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
