# Methodology — Standing Rule Pattern

Standing rules use this format in CLAUDE.md:

```
## STANDING RULE: <NAME> (set <date>)
> "<one-sentence invariant>"
Behavior table: ...
Burn case <date>: <what happened that made this rule necessary>
```

Standing rules are never removed — only superseded by a newer rule citing the old one.

## Constraints (always apply)

- Never hand-edit generated artifacts (`context/_doc_manifest.json`, `context/code_map.md`)
- Never delete existing docs — integrate or mark superseded
- Never touch real `.env` secrets
- If any instruction conflicts with this brief, the brief wins — flag the conflict to the user
- DOMAIN_RISK context: every alert suppression or false-SAFE score has real-world safety cost
  for plant operators monitoring live reactor conditions
