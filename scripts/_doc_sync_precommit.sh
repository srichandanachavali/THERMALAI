# run_precommit — --precommit mode: exit 1 if staged arch code has no staged
# doc, or if the manifest is stale. Sourced by check_doc_sync.sh — not executed
# directly.

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
