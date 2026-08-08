# Methodology — The 16 Retrofit Tasks (ordered)

These tasks bring an existing project into full compliance with this methodology.
Execute in order, confirming each with the user before the next.

**Pre-step** — Create `docs/METHODOLOGY_BRIEF.md` from inline brief content.

**Task 1** — Create `context/` directory. MOVE the seven `.claude/*.md` docs into `context/`
(keep `.claude/` for settings/hooks only). Create `context/MEMORY.md` as an index of every
context doc: one line each — `[title](file.md) — which question it answers`.

**Task 2** — Add YAML frontmatter to EVERY context doc with: `title`, `description`,
`modules:` (exact source files that doc owns), `tests:` (test files covering those modules),
`references:`. Every architectural source file under `backend/`, `frontend/src/`, `ml-model/`
must be owned by EXACTLY ONE doc. Assign ownership sensibly. If a file fits no existing doc,
create a new `context/<area>.md` for it.

**Task 3** — Build `scripts/build_doc_manifest.sh` — reads every context doc's frontmatter,
generates `context/_doc_manifest.json` (file → owning-doc map) and `context/code_map.md`
(flow spine + by-area tree). Header comment in both generated files:
`GENERATED — never hand-edit. Regenerate with scripts/build_doc_manifest.sh`.
This script is the SOLE writer of these two files.

**Task 4** — Build `scripts/check_doc_sync.sh` with `--audit`, `--precommit`, and `--warn` modes.
Put shared logic in `scripts/_doc_sync_common.sh`. All scripts working-directory-agnostic.
Support `SKIP_DOC_SYNC=1` override with loud warning.

**Task 5** — Install the gate: create `scripts/install_hooks.sh` that copies the precommit runner
into `.git/hooks/pre-commit`. Update `scripts/pre-commit` to call `check_doc_sync.sh --precommit`.
Document in CLAUDE.md that this is a per-machine step required on every fresh clone.

**Task 6** — Add a Claude Code Stop hook in `.claude/settings.json`: after every turn, run
`scripts/check_doc_sync.sh --warn` (non-blocking). If architectural code changed this turn with
no doc change, print each changed file and its owning doc (or "NO OWNING DOC: create one").
Also add the uncommitted-changes nag.

**Task 7** — Create `memory/` per memory_layer.md: `memory/README.md` (explains memory/ vs
context/ split), `memory/MEMORY.md` index, and seed three memory files:
- `ensemble-weights-locked.md` (risk_score formula + thresholds; truth doc = context/ml-models.md)
- `render-tensorflow-oom.md` (full tensorflow OOMs Render free tier; see context/known-issues)
- `watchdog-degraded-mode.md` (ML-down fallback is a false-SAFE hazard; ml_degraded flag required)

**Task 8** — Convert DECISIONS.md ADR-001 (dual ensemble) into a locked spec:
`docs/design/ensemble_locked_spec.md` with numbered citable clauses (C1, C2...).
Mark ADR-001 in DECISIONS.md as "superseded by locked spec — history".
Add memory fact: "ensemble locked on 2026-07-03; truth doc = docs/design/ensemble_locked_spec.md".

**Task 9** — Create `context/tunables.md` — every operator knob as a row:
plain-English meaning | config key + file | current value | why.
Include at minimum: RF/LSTM weights, risk thresholds, watchdog poll interval and timeout
(read real values from `backend/server.js` NOW, do not guess), MongoDB TTL (7d), JWT expiry,
Socket.io event names, ML port 5001. Write the caveat INTO the doc:
"Keys are source of truth; values quoted here may be stale — always re-read the live config/source at query time."

**Task 10** — Add one STANDING RULE to CLAUDE.md:

```
## STANDING RULE: NO FALSE-SAFE FALLBACKS (set 2026-07-03)
> "When a prediction service is down, the system must never present a fabricated SAFE score as if it were real."
```

Behavior table: watchdog fallback must always tag degraded readings (`ml_degraded` flag /
system alert), UI must show ML-down banner, alerts must not auto-resolve during degradation.

Burn case 2026-07-03: Render ML deploy failed (TensorFlow ~500 MB OOM on free tier); backend
silently fell back to `risk_score: 0 / SAFE` for every reactor — a plant operator would have
seen "all safe" while the prediction engine was dead.

Then IMPLEMENT the rule: verify backend actually flags degraded readings; if it doesn't, add the
`ml_degraded` flag to the fallback path and a frontend banner, with a test.

**Task 11** — Restructure CLAUDE.md into the claude_md_structure.md order: (1) what this is,
(2) "Where the brain lives" ordered reading list, (3) standing rules, (4) conventions,
(5) active hooks + the per-machine pre-commit install step, (6) branch/release model,
(7) NEVER DO list tied to the domain risk: never send test SMS/email through live
Twilio/Nodemailer creds; never write test data to the production MongoDB; never mark a degraded
reading as SAFE without the degraded flag; never fast-forward production to an untagged commit.

**Task 12** — Create `VERSION` file (1.1.0 — this retrofit is a MINOR release), add CHANGELOG
entry `[1.1.0]` listing everything above, and write `docs/release_workflow.md` per release_workflow.md
(main/production, fast-forward-only, tag ritual, the gotcha: regenerate manifest LAST and stage
it; verify commit landed before tagging).

**Task 13** — Coverage-delta task: list every source file with no covering test in any suite.
Add at least one meaningful new test for the watchdog degraded-mode path (simulate ML down,
assert system alert + degraded flag). Record remaining gaps in `context/open_work.md` and
`context/roadmap.md` (impact-ranked).

**Task 14** — Make `docs/01_PRD.md`..`docs/06_IMPLEMENTATION_PLAN.md` genuinely THERMALAI-specific
— write with real facts from this repo. Update `docs/LAST_REVIEWED.md` to today with a note of
what was reviewed.

**Task 15** — SELF-TEST THE GATES (do not skip): make a trivial change to
`backend/controllers/reactorController.js`, stage only it, attempt commit, SHOW the pre-commit
block message. Then update the owning doc, regenerate manifest, stage all, show the commit pass.
Run `scripts/check_doc_sync.sh --audit` and show `unowned=0 double=0 dead=0`.
Paste all three outputs.

**Task 16** — Commit as the 1.1.0 release, tag `v1.1.0`, and print a final report: everything
created, the one manual per-clone step, and the audit line.
