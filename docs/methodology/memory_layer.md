# Methodology — Memory Layer (memory/)

`memory/` stores locked facts, incident records, and learned feedback — things that were
**decided** or **learned**, not things that describe how the system currently works.

Split:
- `context/` = how the system works right now
- `memory/` = what was learned / decided / burned on

## Memory File Format

```markdown
---
name: short-kebab-case-slug
description: one-line summary
metadata:
  type: project | feedback | user | reference
---

<body — for project/feedback: lead with the fact/rule, then **Why:** and **How to apply:** lines>
```

Each memory file has frontmatter with `type: project | feedback | user | reference`.
`memory/MEMORY.md` is the index.
