# Dead code audit

Date: 2026-10-26. Baseline: `fcb7bf2affe6b9cfdd7ef728f8d7d25093834b78`.
Scope: all 320 tracked files in the storefront repository. The separate Workplace
repository and deployment configuration outside Git are not part of this checkout.

## Removed

- `src/catalog.js`: an exact duplicate of `assets/catalog.js`. The storefront loads
  only the asset version, and Wrangler deploys `src/worker.js`, not this file.
  Tests and the catalog documentation now point to the deployed browser script.
- Retired welcome modal: no opener or runtime caller exists. Removed its hidden
  markup, 116 retired CSS selectors/keyframes (including the obsolete toast rule),
  close handlers, special history branch and `assets/welcome-popup.png`.
- `formatFileSize`, `validateTaskFiles`, `reviewAvatarChecks` and the empty
  `checkReviewAvatar`: no production callers. Removed tests of the retired helpers
  and the obsolete external avatar experiment. Existing upload-disabled and server
  security checks remain.
- 19 unused payment icon files under `assets/icon/`: alfamart, bank-lain, bjb, bni,
  bri, brilink, bsi, cimb, DANA, flip, GOPAY, indo-logo, Jenius, link aja, logo-wa,
  mandiri, ovo, permata and Shopy pay. Current code references only QRIS and the
  Instagram/TikTok icons in that directory. No dynamic icon-path builder exists.
- `assets/qrcode.png`, `assets/secure.gif` and `assets/ui-art/gemini.webp`: no code
  or configuration references. Gemini art is loaded as `gemini.png`.

Total: 24 deleted files, containing 590,700 bytes, plus retired inline code/styles.

## Evidence and retained files

Examined HTML entry points, local resource URLs, imports, PHP includes, function
and variable references, Worker routes, package scripts, Wrangler asset exclusions,
tests, setup SQL and deployment documentation. Dynamic asset references in
Supabase products, promo banners, profiles, reviews, site_settings and
promo_settings were checked read-only. Those queries returned no references to
the removed assets; legacy review photos are still referenced and were retained.

The PHP/Apache variant (`api/`, `admin/`, `.htaccess`, `database/schema.sql`,
`storage/`) remains documented and internally connected, despite not executing on
Cloudflare. SQL migrations, manual setup/seed scripts, 404/payment redirects,
vendor licenses, generated catalog photo paths and dynamic UI icon fallbacks
are not dead files. Public brand/icon aliases were retained because external
consumers cannot be ruled out from this storefront checkout.

Backend payment sources, Edge Functions, database SQL and the active
`assets/catalog.js` are byte-for-byte unchanged. No database changes, commits,
pushes or deployments were performed.

## Verification

- Baseline suite: 73 passed, two failed before cleanup. The sold-count test
  expected 80 while the current default is 108; the dropdown test clicked a title
  hidden by the active catalog banner. Updated those stale test expectations.
- Final post-cleanup suite: 76 passed, zero failures, including the new asset test.
- New local asset reference test passed: page resources and CSS URLs resolve.
- Chrome CSSOM comparison against the baseline passed for inline styles and
  `assets/ui-refinements.css`, after filtering only retired selectors/keyframes.
  All retained style declarations and rule order match the baseline.
- `git diff --check` passed. No real payment or production write was attempted.
