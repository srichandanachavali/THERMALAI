#!/usr/bin/env bash
# Shared logic for build_doc_manifest.sh and check_doc_sync.sh.
# Sourced by both — do not execute directly.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTEXT_DIR="$REPO_ROOT/context"

# Directories whose .js/.py files are architectural (must be owned).
ARCH_DIRS=("backend" "frontend/src" "ml-model")

# Directories explicitly exempt from ownership requirement.
EXEMPT_DIRS=(
  "backend/tests"
  "frontend/src/__tests__"
  "frontend/src/components/__tests__"
  "frontend/src/services/__tests__"
  "ml-model/tests"
  "ml-model/data"
  "docs"
  ".github"
)

# Returns 0 (true) if the given repo-relative path is exempt.
is_exempt() {
  local filepath="$1"
  # Exempt node_modules, __pycache__, .venv, build, dist
  case "$filepath" in
    */node_modules/*|*/\__pycache__/*|*/.venv/*|*/build/*|*/dist/*) return 0 ;;
  esac
  # Exempt if under any EXEMPT_DIR
  for exempt in "${EXEMPT_DIRS[@]}"; do
    case "$filepath" in
      ${exempt}/*|${exempt}) return 0 ;;
    esac
  done
  # Exempt if basename starts with underscore
  local base
  base="$(basename "$filepath")"
  case "$base" in _*) return 0 ;; esac
  # Exempt if matches test_*, demo_*, *_probe.*, package-init, *.test.js, *.spec.js, setupTests*
  case "$base" in
    test_*|demo_*|*_probe.*|package-init*) return 0 ;;
    *.test.js|*.spec.js|setupTests.*) return 0 ;;
  esac
  return 1
}

# List all architectural source files (repo-relative paths, .js and .py only)
list_arch_files() {
  for dir in "${ARCH_DIRS[@]}"; do
    local abs_dir="$REPO_ROOT/$dir"
    [ -d "$abs_dir" ] || continue
    while IFS= read -r -d '' f; do
      local rel="${f#$REPO_ROOT/}"
      # Only .js and .py
      case "$rel" in
        *.js|*.py) : ;;
        *) continue ;;
      esac
      is_exempt "$rel" && continue
      echo "$rel"
    done < <(find "$abs_dir" \
      \( -name "node_modules" -o -name "__pycache__" -o -name ".venv" -o -name "build" -o -name "dist" \) -prune \
      -o -type f \( -name "*.js" -o -name "*.py" \) -print0)
  done | sort -u
}

# Build an in-memory map of file→owning-doc from context/*.md frontmatter.
# Prints lines: "<file>|<doc-path>" for each claimed module.
# Uses Python to parse the YAML frontmatter safely.
extract_module_claims() {
  python3 - "$CONTEXT_DIR" <<'PYEOF'
import sys, os, re

context_dir = sys.argv[1]
for fname in sorted(os.listdir(context_dir)):
    if not fname.endswith('.md'):
        continue
    if fname.startswith('_') or fname in ('MEMORY.md', 'code_map.md'):
        continue
    fpath = os.path.join(context_dir, fname)
    with open(fpath, encoding='utf-8') as fh:
        content = fh.read()
    # Extract YAML frontmatter between first pair of ---
    m = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not m:
        continue
    fm = m.group(1)
    # Parse modules: list
    in_modules = False
    for line in fm.splitlines():
        if re.match(r'^modules\s*:', line):
            in_modules = True
            # Check for inline empty list
            if re.match(r'^modules\s*:\s*\[\s*\]', line):
                in_modules = False
            continue
        if in_modules:
            if re.match(r'^\s+-\s+', line):
                module = line.strip().lstrip('- ').strip()
                print(f"{module}|context/{fname}")
            elif re.match(r'^\S', line):
                in_modules = False
PYEOF
}
