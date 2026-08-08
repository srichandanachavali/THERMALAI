# run_audit — --audit mode: report unowned/double-owned/dead-reference counts.
# Sourced by check_doc_sync.sh — not executed directly.

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
