# ThermalAI — Methodology Brief (index)

> This is a binding methodology document. Every Claude session working in this repo
> must read this file and its linked topic docs before taking any action.
>
> PROJECT_NAME: THERMALAI
> ONE_LINE: predicts thermal runaway in industrial reactors 10-20 minutes early using an RF+LSTM ensemble
> PRIMARY_LANG: javascript (backend/frontend) + python (ml-model)
> ARCH_DIRS: backend/ frontend/src/ ml-model/
> EXEMPT_DIRS: backend/tests/ frontend/src/**/__tests__/ ml-model/tests/ docs/ .github/ ml-model/data/
> DOMAIN_RISK: sends real SMS/email alerts to plant operators and writes alerts to the production
>   MongoDB — a false or suppressed alert has real-world safety cost
> SHELL: bash
> RELEASE_RUNTIME: Render-deployed services (frontend, backend, ml-api)

This brief was split by topic. Read the relevant section(s):

| Topic | File |
|---|---|
| Context docs (`context/`) ownership | [methodology/context_docs.md](methodology/context_docs.md) |
| Doc-sync gate scripts | [methodology/doc_sync_gate.md](methodology/doc_sync_gate.md) |
| Memory layer (`memory/`) + file format | [methodology/memory_layer.md](methodology/memory_layer.md) |
| CLAUDE.md structure | [methodology/claude_md_structure.md](methodology/claude_md_structure.md) |
| Conventions detail (SemVer, test hygiene) | [methodology/conventions.md](methodology/conventions.md) |
| Standing rule pattern + constraints | [methodology/standing_rules.md](methodology/standing_rules.md) |
| Locked specs (`docs/design/`) | [methodology/locked_specs.md](methodology/locked_specs.md) |
| Release workflow invariants | [methodology/release_workflow.md](methodology/release_workflow.md) |
| The 16 retrofit tasks | [methodology/retrofit_tasks.md](methodology/retrofit_tasks.md) |
