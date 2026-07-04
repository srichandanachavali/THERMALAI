#!/usr/bin/env bash
# Build context/_doc_manifest.json and context/code_map.md from context doc frontmatter.
# SOLE writer of those two files -- never hand-edit them.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_doc_sync_common.sh
source "$SCRIPT_DIR/_doc_sync_common.sh"

MANIFEST="$CONTEXT_DIR/_doc_manifest.json"
CODE_MAP="$CONTEXT_DIR/code_map.md"

# Force UTF-8 for Python subprocesses on Windows
export PYTHONUTF8=1

# ---------------------------------------------------------------------------
# 1. Build the manifest JSON
# ---------------------------------------------------------------------------
echo "Building $MANIFEST ..."

python3 - "$CONTEXT_DIR" "$REPO_ROOT" <<'PYEOF'
import sys, os, re, json
from datetime import datetime, timezone

context_dir = sys.argv[1]
repo_root   = sys.argv[2]
manifest    = {}   # file_path -> owning_doc
all_docs    = {}   # doc -> [modules]

for fname in sorted(os.listdir(context_dir)):
    if not fname.endswith('.md'):
        continue
    if fname.startswith('_') or fname in ('MEMORY.md', 'code_map.md'):
        continue
    fpath = os.path.join(context_dir, fname)
    with open(fpath, encoding='utf-8') as fh:
        content = fh.read()
    m = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not m:
        continue
    fm = m.group(1)
    doc_key = f"context/{fname}"
    modules = []
    in_modules = False
    for line in fm.splitlines():
        if re.match(r'^modules\s*:', line):
            in_modules = True
            if re.match(r'^modules\s*:\s*\[\s*\]', line):
                in_modules = False
            continue
        if in_modules:
            if re.match(r'^\s+-\s+', line):
                module = line.strip().lstrip('- ').strip()
                modules.append(module)
                if module in manifest:
                    manifest[module] = f"DOUBLE:{manifest[module]}+{doc_key}"
                else:
                    manifest[module] = doc_key
            elif re.match(r'^\S', line):
                in_modules = False
    all_docs[doc_key] = modules

output = {
    "_comment": "GENERATED -- never hand-edit. Regenerate with scripts/build_doc_manifest.sh",
    "_generated": datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
    "file_to_doc": manifest,
    "doc_to_files": all_docs,
}
manifest_path = os.path.join(context_dir, '_doc_manifest.json')
with open(manifest_path, 'w', encoding='utf-8') as fh:
    json.dump(output, fh, indent=2)
    fh.write('\n')
print(f"  Wrote {len(manifest)} file->doc entries across {len(all_docs)} docs.")
PYEOF

# ---------------------------------------------------------------------------
# 2. Build code_map.md  (write via Python to guarantee UTF-8 on Windows)
# ---------------------------------------------------------------------------
echo "Building $CODE_MAP ..."

python3 - "$CONTEXT_DIR" "$MANIFEST" <<'PYEOF'
import sys, os, json

context_dir   = sys.argv[1]
manifest_path = sys.argv[2]

with open(manifest_path, encoding='utf-8') as fh:
    data = json.load(fh)
doc_to_files = data.get('doc_to_files', {})

lines = []
lines.append("<!-- GENERATED -- never hand-edit. Regenerate with scripts/build_doc_manifest.sh -->")
lines.append("")
lines.append("# ThermalAI -- Code Map")
lines.append("")
lines.append("## Flow Spine")
lines.append("")
lines.append("A sensor reading travels through the system in this order:")
lines.append("")
lines.append("```")
lines.append("ml-model/stream_data.py          (owned by: context/dev-commands.md)")
lines.append("    |  POST /api/reactors/stream")
lines.append("    v")
lines.append("backend/controllers/reactorController.js   (context/api-contracts.md)")
lines.append("    |  POST :5001/predict   -> RF score")
lines.append("    |  POST :5001/predict-lstm -> LSTM score")
lines.append("    v")
lines.append("ml-model/app.py + ml-model/risk_engine.py  (context/ml-models.md)")
lines.append("    |  ensemble = RF*0.40 + LSTM*0.60")
lines.append("    v")
lines.append("backend/controllers/reactorController.js   (context/api-contracts.md)")
lines.append("    |  Reactor.save() -> MongoDB            (context/data-models.md)")
lines.append("    |  io.emit('reactor_update')            (context/architecture.md)")
lines.append("    |  if WARNING/CRITICAL:")
lines.append("    |    Alert.save()                       (context/data-models.md)")
lines.append("    |    io.emit('new_alert')               (context/architecture.md)")
lines.append("    v")
lines.append("frontend/src/context/SocketContext.js      (context/architecture.md)")
lines.append("    |  updates reactors[] / alerts[] state")
lines.append("    v")
lines.append("frontend/src/pages/ReactorDetail.js        (context/frontend-patterns.md)")
lines.append("    |  RiskGauge, ExplainPanel, MaintenancePanel, AIComparison")
lines.append("    +> operator sees live risk score + explanations")
lines.append("```")
lines.append("")
lines.append("ML Watchdog (backend/server.js -> context/architecture.md):")
lines.append("```")
lines.append("setInterval(checkMLHealth, 30000 ms)")
lines.append("    |  GET :5001/health   timeout=5000 ms")
lines.append("    |  if down: io.emit('system_alert', { type: 'ML_DOWN' })")
lines.append("    |           Alert.save({ reactor_id:'SYSTEM', risk_score:100 })")
lines.append("    |  individual readings: ml_degraded:true flagged on enrichedReading")
lines.append("    v")
lines.append("frontend/src/context/SocketContext.js  -> mlStatus = 'down'")
lines.append("    v")
lines.append("frontend/src/App.js  -> MLStatusBanner shown (red banner)")
lines.append("```")
lines.append("")
lines.append("## By-Area Ownership")
lines.append("")

for doc, files in sorted(doc_to_files.items()):
    lines.append(f"### {doc}")
    if files:
        for f in sorted(files):
            lines.append(f"  - `{f}`")
    else:
        lines.append("  *(no source files -- meta doc)*")
    lines.append("")

code_map_path = os.path.join(context_dir, 'code_map.md')
with open(code_map_path, 'w', encoding='utf-8') as fh:
    fh.write('\n'.join(lines) + '\n')

print(f"  Wrote {len(doc_to_files)} doc sections.")
PYEOF

echo ""
echo "Manifest and code map regenerated."
