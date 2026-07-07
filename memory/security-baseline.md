---
name: security-baseline
description: Security baseline set at v1.2.0 (2026-07-06); truth doc = docs/SECURITY_AUDIT.md; regression policy for auth, CORS, socket.io, and helmet
metadata:
  type: project
---

# Security baseline — locked at v1.2.0 (2026-07-06)

**Truth doc:** `docs/SECURITY_AUDIT.md`

The v1.2.0 security-hardening pass established these invariants. Any future change
that removes or weakens them must cite the audit doc, update it, and add a memory
entry recording the exception.

**Why:** Before v1.2.0 every mutating HTTP route and every Socket.io connection was
anonymous, CORS was `origin: '*'`, and there were no security headers — a single
`curl -X POST /api/simulate/A` could trigger real Twilio SMS to real plant operators.
The compliance audit flagged 5 real vulnerabilities in Section 9. See [[render-tensorflow-oom]]
for related domain-risk context.

**How to apply:**

- Every new mutating/sensitive route MUST include `verifyToken` (and `adminOnly` where role tiers apply). See `backend/middleware/auth.js`.
- Socket.io connections MUST pass through the `io.use((socket, next) => …)` JWT check in `backend/server.js`. Do not add a bypass or a second `Server` instance without one.
- CORS on both `backend/server.js` and `ml-model/app.py` MUST read `FRONTEND_ORIGIN` from env — never hardcode `'*'`, never accept a reflected origin.
- `helmet()` on Express and the `@app.after_request` header block on Flask MUST remain in place. Disabling CSP is allowed (socket.io upgrade needs it off by default) but the other helmet defaults are required.
- Every `docs/SECURITY_AUDIT.md` claim of a guard MUST cite a real file:line. If the file changes, update the audit.
- Row #3 in the audit (historical secrets in git) stays **GAP** until every checkbox in `docs/SECRET_ROTATION.md` is checked with a real date. **This is a human task and cannot be marked FIXED by code alone.** See [[watchdog-degraded-mode]] for the same "honest GAP over false PASS" pattern.

Regression on any of the above requires a new memory entry citing this one, plus a
follow-up commit updating `docs/SECURITY_AUDIT.md`.
