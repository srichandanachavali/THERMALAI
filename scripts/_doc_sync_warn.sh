# run_warn — --warn mode: non-blocking nag after a Claude turn.
# Sourced by check_doc_sync.sh — not executed directly.

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
