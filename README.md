# FairFare

A mobile-first, vanilla JavaScript PWA for finding local price context in Jaipur.

Production: [fairfareapp.github.io](https://fairfareapp.github.io)

Repository: [FairFareApp/fairfareapp.github.io](https://github.com/FairFareApp/fairfareapp.github.io)

## What works

- Camera/gallery file input, in-memory preview, replacement and compression.
- Real OpenRouter vision requests through Supabase, with validated structured attributes and editable confirmation.
- Deterministic comparison against approved Supabase observations. Incompatible materials, sizes, finishes and settings are excluded. Insufficient data produces no range.
- Purchase reporting and a separate contributor interface. All public submissions enter pending review.
- Consent-based private photo/evidence uploads through an Edge Function; idempotent retries and atomic database writes.
- App-taxi payment guidance and booking checklist; local ride agreement notes; monument visitor-category guidance with official links.
- History API routes, GitHub Pages 404 restoration, branded unknown route, light/dark themes, manifest, install guidance and a cache-limited service worker.

No frontend dependencies, transpilation or build step. Node is used only for local serving, tests and developer utilities. The only development dependency is pinned `sharp`, used to convert the supplied logo and prepare test images. Icons use the FontAwesome 6.7.2 CDN. Manrope is loaded from Google Fonts, with system fallbacks when offline.

## Pilot data and limits

The 1,469 approved reference records are **synthetic demonstration scenarios** (29 original plus 1,440 added in the redesign). They are not researched prices, verified purchases or independent real market evidence. Two material assumptions, four finishes, three settings and two carving levels cover the 2–30 cm pilot. Four generated finish illustrations are hosted in Supabase Storage and labelled on listings. See [reference data and image provenance](docs/REFERENCE-DATA.md). Ranges are computed from eligible database rows, never hardcoded in the UI.

For wooden elephants, reference matching uses heights from 2–30 cm and allows a height difference of 2 cm or 20%, whichever is greater. Both product categories use Jaipur observations within one year and require at least three compatible records per range. Tukey fences remove extreme prices, then the middle 50% rounds outward to ₹10.

The pilot also includes 2,835 synthetic fashion-bangle references with nine illustrations. Comparisons use the package price for the exact quantity, inner diameter, design, material and selling setting. If the material is unclear, the app shows each compatible material’s range separately.

Monuments fetch current official entry prices for City Palace Museum, Jaigarh Fort and Jawahar Kala Kendra through `fairfare-tickets`. Visitor tiers are drawn from the official pages. A source failure is labelled with the last verified date. Auto tariff guidance remains source-linked, with the availability shown on the fare screen. Ride-hailing fare guidance links out to providers.

## Run locally

```sh
npm ci
npm run dev
```

Open [localhost:4173](http://localhost:4173). The development server serves only application paths, never the local credential files, database scripts or developer utilities.

```sh
npm test
npm run check
```

`npm run test:references` checks the actual database's full coverage without writes or vision calls. `npm run test:browser` uses installed Chrome/Edge and the design inspector's CDP utility. It runs at 375 × 812 by default. Set `FAIRFARE_VIEWPORT` to `390x844` or `1440x900` to repeat the full flow at either size. Set `TASTE_CDP_PATH` if the driver is installed elsewhere. The suite captures screenshots, checks action visibility and both themes, reads real reference data, and mocks identification and submissions. Set `TEST_BASE_URL` to verify the deployed site. See the [mobile workflow review](docs/MOBILE-QA.md).

Tests cover matching, outliers, insufficient data, pending isolation, server validation, model response normalization, API error handling, SPA restoration and service-worker cache exclusions. `check` verifies JavaScript syntax, credential patterns, secret-file tracking and computed light/dark contrast pairs.

### Economical mock development

Open `http://localhost:4173/scan?mock=1` to use a clearly labelled fixture for AI identification. Mock mode also simulates submission confirmation without persisting any record or image. It is enabled only on `localhost` or `127.0.0.1`, is not offered as a product control, and cannot activate on the production hostname. Comparison reads still use the real database.

Use `?mock=network-error` on a local data route to exercise its error and retry state without network requests. Remove the parameter and reload to recover.

`npm run test:backend` is an **explicit live integration check**, not part of `npm test`. It creates two private QA submissions, one with two small image fixtures, checks pending status/idempotency, and tests anonymous access denial. Read its code before rerunning. It never calls OpenRouter. Test records must be rejected by a trusted reviewer and never published.

`node scripts/vision-live-check.mjs <non-sensitive-image>` deliberately makes **one live AI request**. Do not run it in CI or repeatedly during styling. Sanitized responses are saved in ignored `.local/` files.

## Backend

The existing FairFare project is used. See [architecture](docs/ARCHITECTURE.md) and [moderation](docs/MODERATION.md).

Production secrets, set by the owner in the Supabase Dashboard:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`, the exact model identifier from the owner's local configuration
- Optional `VISION_DAILY_LIMIT`, defaults to 20 site-wide requests per UTC day, independently of provider quota

No OpenRouter key, service-role key or privileged database credential appears in browser code. `js/config.js` and the function's `_shared/public-config.js` contain the intentionally public Supabase publishable key. If that key is rotated, update both files and redeploy both functions.

The CLI on this machine was not authenticated; the connected Supabase plugin applied and verified the schema and deployed the functions. Both migrations were first created with `supabase migration new` and contain the applied schema. The remote project has no CLI migration-history table yet. **Do not blindly run `db push` against this existing project.** After authenticating/linking the CLI, reconcile the already-applied versions:

```sh
supabase migration repair 20261117124823 20261117130642 --status applied --linked
supabase migration list --linked
```

Review the current CLI `--help` before using these commands. On a fresh project, apply both migrations in order. The initial migration seeds synthetic fixtures and should not be rerun against an existing dataset.

The JavaScript Edge Function entrypoints are configured in `supabase/config.toml`. They intentionally disable platform JWT verification for a no-login MVP, validate the public API key themselves, restrict browser origins, validate/limit request bodies and enforce database-backed request quotas. Public keys identify the application, not a person. See the abuse limitations in the architecture document.

## Deployment

GitHub Pages serves the organisation-site repository's `main` branch at `/`. `.nojekyll` makes this a direct static deployment. No project-site base path is used.

Push the reviewed application files to `main`; GitHub Pages builds them. `404.html` carries the complete original path, query and fragment to `index.html`, which restores the path before routing. Genuinely unknown routes render a branded 404. A first deep-link request still returns HTTP 404 because that is GitHub Pages' hosting behavior; the browser then restores the application route.

`scripts/github.mjs inspect` and `build` use Git's credential manager in memory to inspect the fixed FairFare repository and deployment. They never print the credential. `pages` can restore the documented Pages branch configuration if needed.

## Privacy and source control

Ordinary scan images are transient. They are not written to PostgreSQL, Storage, localStorage, IndexedDB or service-worker caches. Closing/reloading the page clears them. Identification sends a compressed image to OpenRouter and its model provider; provider retention policies apply. FairFare does not claim provider-level zero retention.

Only explicitly consented report/contribution photos are uploaded to the private bucket. No receipt identifiers or payment details should be included. Evidence deletion/retention is an operator task, described in moderation. There is no analytics or advertising SDK.

`supa.txt` was already present in the initial public Git commit. It has been removed from tracking while preserving the local copy. The historical scan found a project URL/publishable key pattern and no privileged credential patterns. Removing the current file does not remove old Git history; no history rewrite was performed. `openrouter.txt` was not tracked. Both files and environment files are ignored. If the operator later discovers any privileged value in earlier copies, rotate it before further use.

## Verification and demonstration

See [QA evidence and delivery gate](docs/QA.md), [real-device checklist](docs/MANUAL-QA.md), and [90-second demonstration](docs/DEMO.md). A successful desktop check does not verify a phone camera, AI recognition of the intended object, mobile keyboard behavior or PWA installation. Those require the owner's device test before calling the pilot fully verified.
