# Architecture

## Request paths

1. The browser loads a buildless HTML/CSS/ES-module app from GitHub Pages.
2. A chosen image is decoded in memory, resized to at most 1280 pixels and re-encoded as JPEG. This also removes original metadata. A 20 MB input cap and 1.5 MB output cap apply.
3. Identification sends a transient data URL to `fairfare-identify`. That function validates file type/signature and request size, consumes a quota, then calls the configured OpenRouter model. No image or response is logged or stored by FairFare.
4. The structured response is validated and normalized. Dimensions, prices, authenticity, species and quality claims are not accepted as model-derived facts. Unknown finish stays unknown; it does not silently become plain wood.
5. Confirmed attributes query `ff_observations`, joined to market locations. PostgreSQL privileges and RLS expose approved records only. The pure `matching.js` module filters, excludes outliers and calculates the range.
6. Public submissions go to `fairfare-submit`, which ignores approval-related input, enforces the pilot scope and requires image consent. Files receive fresh UUID paths, without upsert. The service-role-only `ff_insert_submission` RPC inserts pending submission and evidence metadata atomically. Failed uploads are cleaned up; uncertain transaction commits are checked before deleting any files. Retries use a request UUID.

## Tables

| Table                             | Purpose                                              | Public access       |
| --------------------------------- | ---------------------------------------------------- | ------------------- |
| `ff_categories`                   | Extensible category definitions                      | Read enabled        |
| `ff_markets`                      | Cities and localities                                | Read enabled        |
| `ff_observations`                 | Published/held reference observations and provenance | Read approved only  |
| `ff_submissions`                  | Contributor and purchase reports                     | None                |
| `ff_evidence`                     | Private evidence object metadata                     | None                |
| `ff_guidance`                     | Source-linked tourist information                    | Read published only |
| `fairfare_private.ff_rate_limits` | Expiring quota buckets                               | None                |

Every application table has RLS enabled. `anon` and `authenticated` have no write grants. No public policies exist on submissions/evidence; this is an intentional deny-all state. All privileged RPCs are `SECURITY INVOKER`, have an empty search path, and revoke execution from PUBLIC/anon/authenticated. Only `service_role` can invoke them. There are no privileged public views or security-definer functions.

The private `fairfare-evidence` bucket allows JPEG/PNG/WebP up to 1.5 MB. No anonymous Storage policies are created. Public clients cannot read/list a known evidence object, upload, overwrite or delete files. Trusted reviewers inspect evidence in the Supabase Dashboard. Images are never automatically republished when an observation is approved.

## Abuse limits

Identification is limited to four attempts per connection bucket per 15 minutes, and 20 requests per site per UTC day by default. Submissions use eight attempts per connection bucket per 15 minutes, plus a 150-per-day site cap. Counters are atomic PostgreSQL upserts, so separate Edge Function instances share limits.

Raw IP addresses are not stored; network information is hashed with a server secret and daily salt. Proxy header reliability varies. A public no-login endpoint cannot establish a persistent person identity, and CORS/public API keys are not bot protection. A distributed caller can exhaust the global allowance. Keep provider spending limits in place; add a verified challenge or gateway protection before broad public launch if abuse warrants it. This pilot does not claim those protections are already installed.

Quota cleanup and evidence retention are manual operator tasks. No scheduled cleanup job is claimed. Expired quota rows can be removed without affecting active buckets.

## State and navigation

Photos, analysis, comparison and submission confirmation live in JavaScript memory only. Refreshing `/compare` honestly asks for a new product instead of pretending to recover an image. Theme choice alone is persisted in localStorage. Forms retain values while errors are shown; summaries link to invalid fields and inline errors remain visible.

The History API router intercepts same-origin links, restores history on popstate, resets route focus and aborts obsolete requests. Async image tasks check the route's abort signal before changing state. Native dialogs supply focus trapping and Escape dismissal. The contributor shell has its own destinations.

The service worker caches an explicit list of app-shell URLs only. Navigation is network-first with shell fallback. Static shell files are network-first with cached fallback. Cross-origin requests, API data, POSTs and unlisted photographs are never cached. External font/icon CDNs are not precached; labels and system fonts remain usable offline. Future releases should bump the cache version when changing shell structure.

## Provenance

Synthetic, researched and community provenance are separate database values. Initial fixtures are all synthetic and labelled in the interface. Approval means eligible for the published dataset, not proof of a genuine purchase. Manual review must establish actual provenance and distinguish asking from paid prices.

The visual direction is recorded in `DESIGN.md`. The supplied logo was cropped and resized with rounded transparent corners, with a separately padded maskable icon. No generated people, testimonials, market photographs or invented merchants are shipped.
