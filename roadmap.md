# Roadmap

## Admin Forbidden
- [ ] Diagnose and fix authorization failures without weakening admin permissions.
- [ ] Verify signed-in admin actions, or identify the missing account/access blocker.

## Number-free Android connection
- [x] Remove receiving-number input; use only API URL and key.
- [x] Read existing and incoming wallet SMS with explicit permission; server resolves receiving account safely and verifies TRX.
- [x] Test no-number ingest and rebuild signed update APK.

## Current request: Android release and end-to-end QA
- [x] Accept all incoming messages from the four wallet providers and verify eight personal/merchant examples; clarify setup readiness.
- [x] Complete branded Android setup/settings/dashboard and reliable delivery; test four-provider message rules.
- [x] Build and verify signed release APK; add working download in admin dashboard.
- [x] Verify eight personal/merchant payment → simulated SMS → HTTP callback delivery → browser success redirect flows.
- [ ] Verify signed-in admin CRUD (blocked: no auth user).
- [x] Report physical-phone and production-hosting limitations.
- [ ] Physical Android UI/background/SMS tests (blocked: requires a real phone).
- [ ] Copied migration reset (blocked: managed history cannot be cleared).

