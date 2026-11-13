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

- Orders are created only through the `place_order` database function so prices/stock are computed server-side, never trusted from the client.
- Storage buckets are private (workspace blocks public); covers use long-lived signed URLs, digital files use short signed URLs gated by `can_access_book_file`.
- Author production lives in separate manuscript/version/invoice/event records; state transitions use guarded database RPCs so authors cannot approve, invoice, or mark payment themselves.
- Royalties are immutable sale-time records created only by trusted paid-order reconciliation; payouts reserve balance through a locked RPC and never imply an automatic bank transfer.
- Shared locale context owns language, country and display currency; exchange rates are public server-function reads and converted display amounts never alter order settlement prices.

- Native apps are Capacitor shells (android/, ios/) loading the published site and built by .github/workflows/build-mobile.yml; never ship an unsigned iOS bundle as an IPA.
- Admin access is decided only by the database `has_role` check (server functions use requireSupabaseAuth + has_role); never add client-side PINs, master passwords or localStorage admin flags — they ship in the public bundle.
- Accounts exist only in Lovable Cloud auth; never add a browser/localStorage fallback account system — it creates accounts admins can never see.
- Author/publisher approval state belongs in the database `account_applications` table (sign-up trigger + admin-only `review_account_application` RPC); never store approvals in localStorage. Migration file is in supabase/migrations and must be applied byte-for-byte before switching the admin panels to it.
