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
