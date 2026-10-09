# JOKI.IN Website

Storefront: https://jokiin.my.id
Repository: Jokitugasbykay/joktugasbykay.github.io

## Runtime

- `index.html`: customer storefront, catalogue, cart, checkout, reviews and tracking.
- `login/index.html`: Supabase email/Google authentication.
- `src/worker.js`: deployed Cloudflare payment, upload, promo and status API.
- `wrangler.jsonc`: the authoritative Worker entry point and static asset configuration.
- `supabase/functions/jokiin-api/index.ts`: verified-user checkout/reviews and privacy-limited tracking.
- `database/`: setup and migration SQL. Do not rerun seed or migration scripts blindly.
- `invoice/` and `assets/invoice-*.js`: read-only printable invoice.
- `api/*.php`, `.htaccess`, `database/schema.sql` and `admin/`: retained Apache/PHP deployment variant, not executed by Cloudflare.

Business prices come from Supabase. Secrets belong only in the server environment.
The publishable configuration in `config.js` is intentionally public and requires RLS.

## Verification

Use Node.js 24+, install dependencies with `npm ci`, then run `npm test`.
Browser checks use installed Google Chrome through Playwright's `chrome` channel.
Generated screenshots are ignored. No test in `npm test` creates a real payment.
The `*-live.cjs` checks are separate, explicit checks against the live site.

## Operations

- [Cloudflare deployment](README_CLOUDFLARE.md)
- [Legacy PHP deployment](README_DEPLOY.md)
- [Payment/security actions](SECURITY-REMEDIATION.md)
- [Google Drive task attachments](README_TASK_ATTACHMENTS.md)
- [Product and price updates](README_PRODUCT_UPDATE.md)
- [Promo deployment history](README_PROMO_WEEKLY.md)
- [Backend/frontend audit for commit 3](docs/audit-commit-3.md)

Repository commits do not independently prove that Cloudflare or an Edge Function deployed.
Rotate previously exposed credentials even after deleting them from the current tree.

