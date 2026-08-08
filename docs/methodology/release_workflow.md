# Methodology — Release Workflow

Covered in `docs/release_workflow.md`. Key invariants:

- `main` is production — fast-forward-only, always tagged
- Tag ritual: update VERSION → update CHANGELOG → regenerate manifest LAST → stage all → commit → tag
- **Gotcha:** regenerate manifest last. If you tag before regenerating, the manifest in the
  tagged commit is stale and the gate will fire on the next commit.
- Never fast-forward production to an untagged commit
