# Security remediation — 3 October 2026

## Applied to Supabase

- Browsers cannot insert/delete orders, write payment records, or update prices/payment status.
- Order updates require a database-verified admin and allow workflow fields only.
- Processing, revision and completion require verified payment.
- Guest tracking returns status and dates only. Personal/task details require the owner session or an admin.
- Removed browser execution permissions from the internal photo trigger.

## Repository changes

- Removed tracked `.env`; `.env.example` contains no webhook secret.
- Added `.assetsignore` to exclude server code, configuration, database files and secrets from Cloudflare assets.
- Worker checkout, upload, status and webhook use the shared database rate limiter.
- Payment links require the checkout key or an owner session.
- Missing or previously exposed webhook secrets are rejected. Payment reconciliation still verifies payment through Mayar's API.
- JSON bodies are capped at 48 KB; existing attachments retain the 50 MB / 10 file limits.

## Production actions still required

1. In Cloudflare, replace `MAYAR_WEBHOOK_SECRET` with a newly generated random secret. Update Mayar's configured webhook credential to match. Do not put the new secret in Git or a public file.
2. Deploy `src/worker.js` with `wrangler.jsonc` and `.assetsignore`, then verify checkout/status/upload with a test transaction. A repo commit alone does not prove that the Worker deployed.
3. The exposed secret remains in Git history and must be considered permanently compromised. Rotation is required even after deleting `.env`.
4. Native Supabase leaked-password protection requires Pro or above. This project is Free. Do not upgrade without the account owner's billing authorization. After an authorized upgrade, enable it in Auth password settings.

## Validation

Run `node --test tests/security.test.cjs`. Security tests cover guest/other-user/owner/admin tracking, rate-limit rejection, payment-link privacy, webhook authentication, and server-file blocking. Database permission checks and denied-write tests run against Supabase inside rolled-back transactions.
