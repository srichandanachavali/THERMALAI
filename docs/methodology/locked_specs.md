# Methodology — Locked Specs (docs/design/)

Architectural decisions that must not be changed without a formal ADR:
- Numbered citable clauses (C1, C2, ...)
- When a locked spec supersedes an ADR, the ADR is marked
  `Status: Superseded — see docs/design/<spec>.md (history only)`
- A memory fact records when the spec was locked and where the truth doc is

See also: [context_docs.md](context_docs.md) — locked specs are the source of truth that
context docs must not contradict.
