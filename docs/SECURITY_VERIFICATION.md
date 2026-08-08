# ThermalAI — Security Verification Transcript

**Companion to:** `docs/SECURITY_AUDIT.md` (the audit table and executive summary live there).
This file holds the machine-output transcript and cross-references so the audit doc stays compact.

---

## Verification transcript

Machine outputs (Windows, 2026-07-06):

```
$ bash scripts/check_doc_sync.sh --audit
unowned=0 double=0 dead=0

$ cd backend && npm test
Test Suites: 5 passed, 5 total
Tests:       40 passed, 40 total

$ cd frontend && npx react-scripts test --watchAll=false
Test Suites: 4 passed, 4 total
Tests:       25 passed, 25 total

$ python -m pytest ml-model/tests/ -q
12 passed, 24 warnings in 16.68s

$ cd backend && npm audit
found 0 vulnerabilities

$ cd frontend && npm audit --json | jq '.metadata.vulnerabilities'
crit: 0 high: 13 mod: 6 low: 9   (all high are transitive dev deps via react-scripts)
```

---

## Cross-references

- `docs/SECRET_ROTATION.md` — 5-row checklist for row #3 (all boxes unchecked)
- `memory/security-baseline.md` — locked baseline pointing to this file
- `context/open_work.md` — Security GAPs section (rows #3, #18, #21, #22)
- `context/roadmap.md` — impact-ranked (row #3 is the top item)
- `CLAUDE.md` §7 NEVER DO — new binding line 7 about `.env` and compromised credentials
