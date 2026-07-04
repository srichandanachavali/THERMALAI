# memory/ vs context/ — What Goes Where

## context/
Describes **how the system works right now** — architecture, API contracts, data models,
ML model formulas, frontend patterns, dev commands, known issues, operator tunables.
These docs are the authoritative source of truth for the live codebase. Update them
whenever the code changes.

## memory/
Stores **what was learned or decided** — things that will not change unless a formal
ADR or override is raised. Includes:
- Locked architectural decisions (ensemble weights, threshold values)
- Incident records (things that broke, and why the fix was made)
- Learned feedback (patterns to avoid, patterns to repeat)

Memory files are indexed in `memory/MEMORY.md`. Each file has YAML frontmatter
with `type: project | feedback | user | reference` per the methodology brief.

**Do not confuse the two directories:**
- "How does the ML ensemble work?" → context/ml-models.md
- "Why are the ensemble weights 0.40/0.60 and are they locked?" → memory/ensemble-weights-locked.md
- "What happened when TensorFlow OOMed on Render?" → memory/render-tensorflow-oom.md
