# Redesign verification · 19 November 2026

This records implementation-side checks. Real phone camera selection, permission prompts, actual current provider recognition, touch/keyboard feel and installed mobile PWA acceptance still require the owner’s device test. They are not claimed as verified here.

## Automated and live backend evidence

- `npm test`: 24 deterministic tests pass. Includes exact compatibility, three-record minimum, duplicate source/ID rejection, carving separation, pending exclusion, outliers, pagination, validation, vision parsing, SPA restoration and service-worker privacy.
- `npm run check`: syntax, privileged-secret patterns, credential-file tracking and light/dark contrast checks pass. Body/secondary foreground pairs exceed 4.5:1; control boundaries exceed 3:1.
- `npm run test:references`: reads all 1,469 actual approved Supabase rows through pagination. All 2,088 combinations (every integer height 2–30, both material assumptions, four finishes, three settings, and simple/detailed/either carving) produce at least three compatible records, with 3–18 records after filtering. All have relevant illustration metadata. No pending records or independent-market-evidence claims. Detailed machine-readable ranges/counts are in the ignored `.local/reference-coverage.json`.
- A filtered request for a 14 cm inlaid wood elephant at a street stall returns compatible rows from the server, rather than fetching an arbitrary first 1,000 records. Unit tests separately prove page-two fetching and threshold enforcement.
- Four public Storage images return 200 and their SHA-256 values match the local 384px WebPs. Total product illustration payload is 58,394 bytes. Anonymous uploads are denied. Private evidence remains private. The fixed-asset import endpoint was disabled immediately afterward and now returns 410 with no Storage capability.
- Live `fairfare-submit` v3 preserves optional carving detail. One purchase QA report without photos and one contributor QA report with consented product/evidence images arrived pending. Idempotent retry returned the same ID. Both QA records were then rejected, never published. No vision calls were made by this integration check.
- Security advisor: no warning/error findings. Three INFO entries reflect intentionally policy-free private submissions, evidence and quota tables. No policy was weakened to silence them.

## Browser verification

`npm run test:browser` uses real installed Chrome/Edge, actual application scripts and actual approved database records. Only identification and submission endpoints are mocked: four identification responses (including one error/retry) and two submission responses. Zero real OpenRouter calls or public writes from the browser suite.

Eleven passing workflow groups cover home/navigation; automatic photo identification and confirmation; computed results; reference images/details/quote context; quick purchase reuse and explicit consent; contributor five-step validation and draft backtracking; identification error recovery; transport choices/checklist/ride notes; monument images/categories/sources; keyboard menu/dialog dismissal and theme changes; all 11 direct routes at 320, 390, 768 and 1440 pixels in both themes; and offline PWA shell reopening. No JavaScript exceptions were recorded. Screenshots and machine-readable reports are in ignored `.local/browser-redesign/`.

The browser run caught and fixed an inherited CSP restriction blocking new public reference images, and verified loading after the path was allowed. It also led to explicit Escape dismissal for the information dialog. A scan interrupted by navigation retains a visible identification retry action when returning.

## Visual and usability review

Real rendered screenshots were inspected for home, scan, result, comparable listings, contributor photo/review and monuments, including mobile and dark mode. The design inspector reports zero failures for home, scan, contributor photo and monuments at desktop/tablet/mobile. Its unused-canvas warning assumes a sidebar: this app has top navigation and deliberately centered equal-margin capped canvases. The monument small-text warning concerns secondary locality/source text; names, fees, controls and visitor input remain larger. Bottom navigation labels were increased to 11px and their edge inset widened.

ROUND 1

Seen in one second: the camera/Scan a Product action; a rupee range on results.

Idea (one sentence): turn the supplied price-tag silhouette into a quiet action surface, then attach each result to optional visible evidence.

Live thing: a transient scan, editable confirmed details, database-calculated range and a pending observation.

Layout words by screen: home=centered action / scan=photo plus confirmation / result=price plus disclosures / visits=photo cards / contribution=single-step form.

Scores: design 8 · usability 8 · creativity 7 · content 8 → overall 7.8.

Caps applied: consumer app screen rules, not marketing-page photo/motion quotas. Owner explicitly requests a minimal task home and restrained motion. No claims of real-device perfection.

Top three problems and fixes:

1. Old mobile home buried Scan beneath 188 visible words and decorative logo content (`redesign-before/mobile-fold.jpg`). Rebuilt as one dominant action; new home has 50 visible words including navigation/footer.
2. New result images initially failed due to the inherited CSP (`browser-redesign/failure.jpg`, superseded). Added only the named public reference path and confirmed all displayed reference images decode.
3. Initial contributor photo step gave Continue more emphasis than Camera. Camera now owns the empty photo state; Continue gains emphasis after a photo is present. Scan Retake similarly defers to See price after recognition.

Usability scenarios: souvenir check starts with Scan, auto-identifies and asks only relevant matching details; monument fees are visible on each card without opening methodology; contributor goes through one field group at a time and can backtrack without losing data. Evidence, sources, uncertainty and methodology remain accessible through disclosure controls.

See the [delivery gate](../anti-slop/delivery-2026-11-19.md) and [phone checklist](MANUAL-QA.md).
