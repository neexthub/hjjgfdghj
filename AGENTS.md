<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep branding and page metadata in shared client-safe modules; the root mounts the intro once to avoid duplicate checkout delays.
- Preserve /index as a redirect to / so existing preview tabs and bookmarks reach the canonical homepage.
- Express gateway styling through semantic global tokens so admin and checkout share a single theme.

- Store and SMS API keys enforce separate scopes; store reads and writes are merchant-scoped to prevent cross-store access.
- Keep external URL validation in a shared client-safe API contract and document the actual endpoint contracts in the admin API section.
- Keep the native Android gateway in Android with encrypted configuration, SQLite delivery queue, WorkManager retries and a foreground status service so SMS survives network interruptions without polling loops.
- Build Android releases outside the web build, serve only verified signed APKs from public/downloads, and keep signing material outside source control so downloads never expose private keys.
- Resolve number-free SMS receivers from the merchant-bound ingest key and a unique provider/type collection account; leave ambiguous messages unmatched to prevent cross-store verification.
- Import existing wallet SMS once through WorkManager after explicit read permission, while retaining the broadcast receiver for new messages to avoid continuous inbox polling.
- Each signed-in admin owns their merchants, keys, phones and SMS (owner_id + RLS); payments/accounts inherit ownership from the merchant so users never see each other's data.
