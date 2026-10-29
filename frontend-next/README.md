# Information Center migration pilot

This source lives only on `migration/nextjs-typescript`. Its starting checkpoint is
`5c2cb378f729b26e9dc87e7d5033b012794a7eaa`. Production recovery point `Comit-7`
remains `711d4e42541601aec320772d6ff246713389de0a`.

The 14 files under `src/` and four public images were copied without content
changes from the existing `sandbox-information-pilot`. This phase ports the
Information Center, not the storefront, Digital Store, authentication or payment.
The source also renders Information at `/` for the isolated application; that
generated root page is never published over the legacy storefront.

## Exact toolchain

| Package | Version |
| --- | --- |
| Node.js | 26.13.0 LTS |
| npm | 12.2.1 |
| Next.js | 16.4.3 |
| React / React DOM | 19.3.1 |
| TypeScript | 7.0.2 |
| @types/node | 26.6.6 |
| @types/react / @types/react-dom | 19.3.0 |

Versions and security metadata were checked on 2026-10-29. No prereleases are used.
The old source manifest/lockfile are not installation inputs: this manifest pins
every direct dependency, and isolated npm generated the new lockfile. Lock root
metadata, resolved versions, peers, engines, registry origins, integrity values,
optional platform packages and registry lifecycle metadata were checked.

Official sources:

- https://registry.npmjs.org/next/latest
- https://github.com/vercel/next.js/releases/tag/v16.4.3
- https://nextjs.org/blog/nextjs-security-update-october-14-2026
- https://nextjs.org/blog/upcoming-nextjs-security-release-november-2026
- https://github.com/vercel/next.js/security/advisories
- https://github.com/facebook/react/security/advisories
- https://nodejs.org/dist/index.json
- https://registry.npmjs.org/react/latest
- https://registry.npmjs.org/typescript/latest
- https://nextjs.org/docs/app/guides/static-exports
- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/

The registry bulk advisory response for all 80 resolved packages was empty at
audit time. Direct GitHub advisory queries covered Next, React/React DOM,
TypeScript and React Server DOM packages; later Sharp/PostCSS queries hit an API
rate limit and were covered through the resolved registry graph instead. This
is a point-in-time check, not a guarantee of no vulnerabilities. The announced
November 3 security release has unpublished affected-version details. Re-audit
and patch as necessary before any deployment decision.

## Reproduce in this migration worktree

Run these commands from its repository root. Provisioning downloads only the
standalone Node executable and npm distribution into ignored `.toolchain/`.
It does not replace global Node/npm. Node is checked against the official
SHA256 list; npm is checked against its registry integrity and ECDSA signature.
The Node release PGP signature was not independently verified.

```powershell
node frontend-next/scripts/provision-toolchain.cjs
node frontend-next/scripts/npm.cjs ci --no-audit --no-fund
node frontend-next/scripts/npm.cjs run type-check
node frontend-next/scripts/npm.cjs test
node frontend-next/scripts/npm.cjs run build
```

Provisioning refuses to overwrite an existing toolchain. Reuse the verified
one on repeat runs. The wrapper checks Node's version and invokes the selected
npm using that Node, project-local cache and PATH. The lockfile must not be
hand-edited. An intentional future dependency change requires fresh advisory
review and lockfile generation using this exact npm, followed by `npm ci`.

```powershell
node frontend-next/scripts/npm.cjs run audit:lock
```

That optional review command contacts official registry metadata and the npm
bulk advisory endpoint. It writes its audit receipt under `.verification/`.

For two clean builds, use the following sequence. The cleaner removes only
this application's generated `.next/` and `out/` after checking their paths.

```powershell
node frontend-next/scripts/clean-output.cjs
node frontend-next/scripts/npm.cjs run build
node frontend-next/scripts/build-snapshot.cjs
node frontend-next/scripts/clean-output.cjs
node frontend-next/scripts/npm.cjs run build
node frontend-next/scripts/build-snapshot.cjs compare
```

The comparator reports raw hashes separately. Its only normalization replaces
the generated Next BUILD_ID literal in paths/text; it does not ignore CSS,
JavaScript, HTML or RSC content differences otherwise.

## Selective export, with preflight and recovery

```powershell
node frontend-next/scripts/npm.cjs run export:information -- --check
# Review frontend-next/.verification/publication.json before the write step.
node frontend-next/scripts/npm.cjs run export:information
```

The publication allowlist starts with exactly five Information route artifacts:
`index.html`, `index.txt`, `__next._full.txt`, `__next._tree.txt`, and
`__next.information/__PAGE__.txt`, all under `information/`. It follows their
explicit asset references to the required `_next/static/` files and four public
images. Every referenced local dependency must exist. The current build selects
seven chunks/styles and four byte-identical existing images, for 16 total paths.

The helper never copies the complete `out/`, `node_modules`, `.next/` or caches
to the repository root. It preserves root `index.html`, `404.html`, other routes,
old hashed chunks and shared assets. A different existing shared asset, symlink
or local Information edit aborts before replacement. Existing Information files
may be replaced only if they match the materialized baseline bytes. This uses
`git cat-file --filters`, respecting the checkout's line-ending conversion.

All destinations are revalidated after planning. Durable copies of replaced
Information files stay under `.verification/publication-backup-*/`. Replacement
files are staged first, assets precede HTML/RSC, and a failed write/rename
restores replaced destinations. This is not an atomic whole-directory deploy;
do not serve the destination concurrently while updating. Keep the backup until
review completes. Recovery must restore only the recorded Information files,
never reset the worktree, and retain old chunks for cached clients. No recovery
or production deployment is performed automatically.

Source, toolchain, caches and verification artifacts remain excluded from Worker
assets by the repository's existing `.assetsignore`; its configuration is not
changed. Git ignores generated local outputs but tracks source and lockfile.

## Actual verification on 2026-10-29

| Check | Actual result |
| --- | --- |
| Isolated npm ci | PASS, 28 installed packages |
| Manifest/lock and resolved metadata review | PASS, 80 lock entries; advisory response empty |
| Type generation and strict TypeScript check | PASS |
| Next production static export | PASS |
| Two clean build comparison | PASS, 32 paths; 15 raw-identical, zero differences after BUILD_ID normalization |
| Selective-export unit tests | PASS, 8 tests; no skips |
| Selective-export preflight/publication | PASS, 16 selected paths, durable baseline backup retained |
| Existing routing/resource regression tests | PASS, 22 tests in four files; no skips |
| Browser fixture | PASS, 6 cases, Chrome 156.0.8078.47, Playwright 1.64.1 |
| Wrangler 4.154.0 startup | FAIL, no ready signal within 45 seconds |
| HTTP route/MIME/fallback probes | NOT RUN, blocked by Wrangler startup |
| Full legacy test suite, transactions, production | NOT RUN |

Browser cases cover widths 320, 390 and 1440 at height 900, both themes, single
visible logo, tooltip bounds/no duplicate native title, overflow, hydration,
keyboard theme toggle, persistence through refresh, Back/Forward and query/hash
preservation. Six screenshots and the runtime receipt are under `.verification/`.
There were no page/console errors or unexpected denied requests in those cases.

The browser runner fulfills requests from hash-verified `out/` bytes, rejects
unknown requests/mutations, blocks WebSockets and service workers, and cancels
downloads/popups. Google Fonts CSS is an empty fixture and preconnect hints are
removed only from the in-memory response. Layout was therefore verified with
system fallback fonts. The destination storefront is a synthetic heading, so
these browser results do not verify the real legacy storefront bootstrap,
authentication or Digital Store. Request interception is not proof of OS-level
network isolation for Chrome and its subprocesses.

The cached browser and Wrangler tools were used without adding dependencies to
this application. To run the optional scripts, explicitly provide
`PLAYWRIGHT_MODULE_PATH`, `CHROME_EXECUTABLE`, or `WRANGLER_CLI_PATH` pointing to
the separately verified installations, then use `.toolchain/node.exe` to execute
`scripts/browser-check.cjs` or `scripts/local-http-check.cjs`. They are not run by
`npm test`. HTTP testing uses only loopback GETs with redirects not followed,
no credentials, no API mutations and a noninteractive no-tunnel local session.

The four existing regression files were run unchanged with isolated Node:

```powershell
frontend-next/.toolchain/node.exe --test tests/storefront-routing.test.cjs tests/testimonial-dynamic-routes.test.cjs tests/local-assets.test.cjs tests/digital-store-modular-architecture.test.cjs
```

These checks are not the complete legacy suite and are not real transactions.

The actual Wrangler attempt logged Request.cf lookup timeouts and never reached
readiness; the owned process tree was stopped. This does not prove the Worker or
the exported page is broken. Route/MIME/fallback integration remains a blocking
unverified gate. The initial export preflight also rejected CRLF baseline bytes;
using Git's checkout filters corrected that validation without changing assets.

## Deployment and phase boundaries

This is static App Router output. There is no deployed Next server, OpenNext
adapter, Server Actions, middleware, ISR, request-time cookies or optimized image
service in this phase. Static export removes those runtime surfaces, but does
not remove build-time, client dependency, asset-serving or supply-chain risks.

The source retains its existing theme storage key `theme`, independent from
the legacy storefront's `jokiin_theme`; cross-page preference unification is
deferred. Status labels are static content, not live backend health checks.
Google Fonts availability and the complete legacy navigation remain separate
integration checks. No payment, invoice, JWT, Worker API, database, deployment
configuration or production data is modified.

Do not push merely because build checks pass. Local route integration, both
independent reviews and verified remote deployment isolation are required gates.
Production remains unchanged; no commit, push, deployment or cutover is implied.

Independent review: Agent 7 verified all 45 changed paths and byte identity of
357 protected tracked files, both dirty worktrees and their indexes. Agent 10
reviewed the complete source/export diff and closed the reported collision,
partial-write cleanup, fixture-source, font-method and documentation findings.
Neither reviewer ran tests. After the final fixture restriction, the six browser
cases passed again. HTTP integration remains blocked, so Phase 1 is not cleared
for commit/push. Final migration state is 3 tracked modifications, 42 untracked
files and no staging; HEAD and the main index remain at their initial state.
