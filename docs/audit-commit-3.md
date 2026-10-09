# Backend / Frontend Audit: Commit 3

Date: 2026-10-09. Baseline: `e3565bc4fdfc2b1733aec1786debe2153a7dad62`.
Scope: the storefront repository and its connected Supabase project. The separate
Workplace application is not included in this repository audit. Live database access
was read-only; no payment, customer record or schema was changed.

## Findings, Ordered by Risk

1. **High: Mayar promo reservation is checked too late.** `src/worker.js:createPayment`
   validates the active coupon but does not reserve a per-account campaign before
   creating the provider link. Live `payment_orders` has no promo guard; the
   per-account guard runs on `orders`, reached by `private.sync_paid_mayar_order()`
   after Mayar reports PAID. Two pending links can therefore reach the provider;
   the second order can be rejected only during reconciliation, after payment.
   The payment implementation is deliberately unchanged by this cleanup. Fixing
   this requires a separate payment change with pre-charge reservation tests.
2. **Medium: printable invoices omit authentication.** `assets/invoice-page.js`
   calls the tracking API without the owner's bearer token and does not reject
   `detail_restricted`. A PAID reference can render an incomplete invoice with
   missing items and zero-valued totals. The API correctly withholds private
   details. Invoice/payment behavior was preserved as requested; a follow-up
   should authenticate the owner and reject incomplete responses.
3. **Medium: login open redirect, fixed.** The `redirect` query parameter previously
   went straight to `location.replace`. It now accepts only same-origin HTTP(S)
   URLs and falls back to `/` for external, executable or malformed destinations.
4. **Medium: review delete policy is broader than the UI.** Database policy
   `Admin can manage reviews` permits every `role=admin` to delete five-star
   reviews, while the UI only shows that action to founder/supervisor. No role
   or database policy was changed in this cleanup. Align the policy separately
   if the intended restriction is founder/supervisor only.
5. **Low: stale test and package configuration, fixed.** Two checks required an
   undocumented HTML argument, two assertions used pre-existing avatar/promo
   assumptions, browser imports contained one machine's absolute path, and
   `npm start` referenced a nonexistent `server.js`. Tests now run through
   `npm test`, with pinned Playwright, portable imports and ignored output.

## Verified Boundaries

- All 15 public tables have RLS enabled. Authenticated profile updates are granted
  only for `name`, `phone` and `photo_url`; customers cannot promote their role.
- Tracking excludes customer/task/price details for guests and non-owners.
- Worker status exposes provider links only to the owner or checkout-key holder.
- Webhook authentication fails closed; PAID reconciliation verifies the provider's
  transaction and amount rather than trusting the webhook body.
- Worker and Edge JSON bodies are bounded. File uploads retain the existing
  10-file / 50-MB checks, allowed types and Drive ownership configuration.
- Public metrics expose aggregate counts, not customer/order rows. Realtime
  ranking, rating updates, censorship, ownership and drag behavior were retained.
- Supabase advisor notices for public promo/helpful-count RPCs are intentional
  APIs, not automatically vulnerabilities. Admin RPCs checked here enforce database
  identity and role. No blanket permission revocations were made.
- Advisor follow-ups: leaked-password protection disabled, 11 unindexed foreign
  keys, three site-settings policies with per-row auth calls, and duplicated
  permissive policies. Unused order indexes were kept: low usage is not proof
  that an index is dead. No billing upgrade was performed.
- Previously exposed webhook credentials still need verified rotation outside
  Git. This audit cannot establish the deployed secret's value or rotation.

References: [Supabase advisors](https://supabase.com/docs/guides/database/database-linter),
[password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Cleanup Evidence

Deleted five retired assets with no repository or live catalogue/settings/review
references (4,216,760 bytes in the current tree, not a benchmark estimate):

- `assets/hero-jokiin.png`
- `assets/hero-jokiin-light.png`
- `assets/hero-jokiin-dark.png`
- `assets/service-icons.png`
- `assets/welcome-mascot.png`

Removed the uncalled `openWelcomeModal` function and unused `PROMO_API_URL`.
The hidden welcome markup and closing handlers were retained to avoid changing
shared modal behavior. Consolidated duplicated README content into an entry-point
and operations index. Excluded docs and test dependencies from static deployment.

Dynamic catalogue photos, review avatars, fallback icons, legacy PHP endpoints,
historical SQL and brand/PWA compatibility assets were not removed based merely
on a text search. Their absence from a literal URL search is not sufficient proof.

## Validation

- Baseline `node --test tests/*.test.cjs`: 20 pass, four harness failures.
- Cleanup checks: `npm test`; inline/local JS syntax; same-origin login redirect
  attacks; avatar circle/drag; promo dismissal/expiry/load; partial censorship;
  role/ownership deletion; live metric ordering; payment privacy/rate limits.
- Cleanup `npm test`: 26 pass, zero failures. `git diff --check` passes.
- Storefront markup/styles match the baseline after normalizing line endings.
  Worker, Edge, PHP, SQL, payment, invoice and order-improvements sources match
  the baseline. No desktop redesign is included in this checkpoint.
- No live charge, webhook credential rotation, PHP-host deployment or production
  Drive upload was attempted. Sandbox/provider end-to-end payment testing remains
  an operational prerequisite for any future payment change.

## Ponytail Gain

Published benchmark medians, five tasks and three models; NOT this repository:

```text
Lines: baseline #################### 100%; ponytail #--- 6-20% (80-94% fewer)
Cost:  baseline #################### 100%; ponytail #####------ 23-53% (47-77% lower)
Speed: ponytail 3-6x faster
```
