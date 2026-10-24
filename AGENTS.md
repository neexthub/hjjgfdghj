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
- Express gateway styling through semantic global tokens so admin and checkout share a single theme.

- Store and SMS API keys enforce separate scopes; store reads and writes are merchant-scoped to prevent cross-store access.
- Keep external URL validation in a shared client-safe API contract and document the actual endpoint contracts in the admin API section.
