#!/usr/bin/env bash
# Install the ThermalAI pre-commit hook into .git/hooks/.
# Run once per machine after every fresh clone:
#   bash scripts/install_hooks.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

HOOK_SRC="$SCRIPT_DIR/pre-commit"
HOOK_DST="$REPO_ROOT/.git/hooks/pre-commit"

if [ ! -f "$HOOK_SRC" ]; then
  echo "❌ scripts/pre-commit not found — check your repo." >&2
  exit 1
fi

cp "$HOOK_SRC" "$HOOK_DST"
chmod +x "$HOOK_DST"

echo "✅ Pre-commit hook installed at .git/hooks/pre-commit"
echo "   This must be re-run on every fresh clone."
