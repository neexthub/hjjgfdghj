# Roadmap

## Login and provider logos
- [x] Start the login email field empty and remove misleading automatic-admin signup copy.
- [x] Replace provider logos with verified online assets and normalize their display sizes.
- [x] Verify login, logos and existing operator admin access; retain private-data authorization rather than granting public signups unrestricted access.

## Admin Forbidden
- [x] Diagnose and fix authorization failures without weakening admin permissions.
- [x] Verify signed-in merchant/account creation and toggles, API key creation/toggles/deletion, payment creation/status changes and dashboard readback.

## Number-free Android connection
- [x] Remove receiving-number input; use only API URL and key.
- [x] Read existing and incoming wallet SMS with explicit permission; server resolves receiving account safely and verifies TRX.
- [x] Test no-number ingest and rebuild signed update APK.

## Per-user data and SMS cleanup
- [x] Show personal and merchant wallets separately in the payment window.
- [x] Isolate admin data per user account.
- [x] Admin phones tab shows today's SMS with phone name; unmatched SMS auto-deleted after 1 day.

## Current request: Android release and end-to-end QA
- [x] Accept all incoming messages from the four wallet providers and verify eight personal/merchant examples; clarify setup readiness.
- [x] Complete branded Android setup/settings/dashboard and reliable delivery; test four-provider message rules.
- [x] Build and verify signed release APK; add working download in admin dashboard.
- [x] Verify eight personal/merchant payment → simulated SMS → HTTP callback delivery → browser success redirect flows.
- [x] Verify signed-in admin CRUD with the operator account.
- [x] Report physical-phone and production-hosting limitations.
- [ ] Physical Android UI/background/SMS tests (blocked: requires a real phone).
- [ ] Copied migration reset (blocked: managed history cannot be cleared).

