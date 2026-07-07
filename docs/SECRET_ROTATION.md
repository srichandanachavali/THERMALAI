# ThermalAI — Secret Rotation Checklist

**Status:** ⚠️ ROTATION REQUIRED — NOT YET DONE
**Discovered:** 2026-07-04 (compliance audit)
**Documented:** 2026-07-06 (v1.2.0 security hardening)

---

## Why this exists

Between 2026-05-09 and 2026-05-10, a `backend/.env` file containing live production
credentials was accidentally committed and later removed from tracking. **Removal from
the working tree does not scrub the credentials from git history.** Anyone with a clone
of this repository can extract the original values with a single `git log -p` command.

Every credential listed below is **compromised until it is regenerated at its provider**.
Rewriting git history is **not** the fix — even after `git filter-repo`, forks, mirrors,
CI caches, and anyone with a prior clone still hold the leaked values. The only real
remediation is rotation at each provider.

---

## Leak history

| Commit | Date | Action |
|---|---|---|
| `8c88d92` | 2026-05-09 19:37 | Initial commit of `backend/.env` with `MONGO_URI` |
| `674dd66` | 2026-05-09 23:23 | Added `EMAIL_USER`, `EMAIL_PASS` |
| `650db89` | 2026-05-10 11:54 | Added `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` |
| `158d0f6` | 2026-05-10 12:27 | Added `JWT_SECRET` |
| `dd791c5` | 2026-05-10 18:30 | `.env` removed from tracking — but history retained |

Verify at any time with: `git log --all -p -- backend/.env`

---

## Rotation checklist

Complete each row and check the box; commit the checked file only after you have
regenerated the credential at its provider and updated `backend/.env` locally.
**Never commit the new value.**

### 1. MongoDB Atlas — user `srichandanachavali_db_user`

- **Leaked value (prefix):** `mongodb+srv://srichandanachavali_db_user:b5N3Nj…eezC@cluster0.dw230wu.mongodb.net/...`
- **Impact if unrotated:** Full read/write on the `thermalai` production database — reactor readings, alerts, user accounts, and password hashes are readable and modifiable by anyone with the URI.
- **How to rotate:**
  1. Log in to MongoDB Atlas → Database Access
  2. Edit user `srichandanachavali_db_user` → Edit Password → Autogenerate Secure Password
  3. Copy the new password into `backend/.env` `MONGO_URI` (URL-encode any special chars)
  4. Restart the backend (`npm start`) and verify the login endpoint returns 200
- **Status:** ⬜ ROTATION REQUIRED — NOT YET DONE
- **Rotated on:** _(fill in ISO date when complete)_

### 2. Twilio Account SID

- **Leaked value:** `AC8a17c567173de78664132e101e6e5dba`
- **Impact if unrotated:** Anyone with the SID + token can send SMS on the ThermalAI Twilio account, drain balance, and impersonate the alerting number to plant operators. **Real-world safety risk: fake CRITICAL alert text messages.**
- **How to rotate:**
  1. Log in to Twilio Console → Account → API keys & tokens
  2. Under "Live credentials" → click the "Request a secondary token"
  3. Promote the secondary to primary, then delete the old primary
  4. (Optional but recommended) Create a new subaccount for ThermalAI and issue a fresh SID+token pair; delete the old subaccount entirely
  5. Update `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in `backend/.env`
- **Status:** ⬜ ROTATION REQUIRED — NOT YET DONE
- **Rotated on:** _(fill in ISO date when complete)_

### 3. Twilio Auth Token

- **Leaked value:** `1a66ed25fce76fe7c3852d5cc3e7f389`
- Rotated together with the SID above (row 2).
- **Status:** ⬜ ROTATION REQUIRED — NOT YET DONE
- **Rotated on:** _(fill in ISO date when complete)_

### 4. Gmail App Password (`EMAIL_PASS`)

- **Leaked value:** `lyan uzyi qzfx biyo`
- **Impact if unrotated:** Anyone with the app password can send email as the ThermalAI notification account, phish plant operators, and read anything the account has access to (if 2FA scoping allows).
- **How to rotate:**
  1. Go to https://myaccount.google.com/apppasswords
  2. Find the `thermalai` (or whatever name) entry → click the trash icon → confirm removal
  3. Create a new app password named `thermalai-backend`
  4. Copy the 16-char value into `EMAIL_PASS` in `backend/.env` (with spaces or without — either works)
  5. Restart the backend and send a test alert
- **Status:** ⬜ ROTATION REQUIRED — NOT YET DONE
- **Rotated on:** _(fill in ISO date when complete)_

### 5. JWT_SECRET

- **Leaked value:** `thermalai_secret_key_2026`
- **Impact if unrotated:** Anyone with the secret can forge JWTs for any user (any role) and use them to bypass every `verifyToken`/`adminOnly` guard in the backend. **This includes triggering `/api/simulate/:id` with a forged admin token.**
- **How to rotate:**
  1. Generate a new 32-char random secret (e.g. `openssl rand -base64 32`, `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`, or PowerShell: `[Convert]::ToBase64String([byte[]](1..32 | %{Get-Random -Max 256}))`)
  2. Replace `JWT_SECRET=` in `backend/.env`
  3. Restart the backend — **this invalidates every existing session token**; every user must log in again
- **Status:** ⬜ ROTATION REQUIRED — NOT YET DONE
- **Rotated on:** _(fill in ISO date when complete)_

---

## After all boxes are ticked

- Update this file's top status to `✅ ROTATION COMPLETE — <date>`.
- Add a note in `CHANGELOG.md` under the current version (or open a follow-up minor release).
- Update `context/known-issues.md` — remove the "compromised credentials" entry.
- Update `docs/SECURITY_AUDIT.md` — change row #44 from GAP → FIXED with the rotation date.
- Update `context/roadmap.md` — mark "Rotate compromised credentials" as done and re-rank.

---

## Prevention

The `.gitignore` already covers `.env`, `.env.*` (with `!.env.example`), and the
pre-commit hook (`scripts/pre-commit`) blocks direct commits to `main`. The NEVER-DO
line added to `CLAUDE.md` §7 in v1.2.0 makes the "never commit `.env`" rule binding.

If a secret is ever committed again, do **not** attempt to hide it — rotate immediately
and add an entry to this file with a new row.
