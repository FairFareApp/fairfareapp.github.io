# Verification record

The current redesign is covered by [19 November redesign verification](REDESIGN-QA.md). The record below describes the original 17 November implementation and is retained as history.

Date: 17 November 2026. Implementation verification is recorded here; real-device acceptance remains with the owner. This report does not claim that a phone camera, on-screen keyboard or installed mobile PWA has been verified.

## Production verification

GitHub Pages successfully built application commit `c31ec69` from `main`. The live root returned HTTP 200 and the expected application shell. The deployed comparison flow fetched Supabase observations and computed the same six-record illustrative range as local testing, with no browser console warnings/errors captured.

Direct `/scan` and `/contribute/new` navigation and refresh were exercised in the production browser. Unknown `/this-page-does-not-exist?qa=1#detail` retained its full path/query/fragment and displayed the branded 404; its return link navigated home. Raw deep-link requests return GitHub Pages HTTP 404 with the intended client restoration script, then resolve to the SPA. Credential-file URLs returned 404 and no file contents.

Production home and scan render inspections both returned zero failures at 1440, 768 and 390 pixels. Every emitted fold/page screenshot was opened. The documented canvas/title/natural-height warnings remained, with no new findings. Manifest and service worker returned HTTP 200. Production-origin preflight requests succeeded for both functions; invalid POSTs returned HTTP 400 with the correct CORS origin.

The owner asked to finish implementation-side work first and conduct phone tests afterward. Those tests are documented in `MANUAL-QA.md`; no device acceptance is implied by the successful deployment.

## Vision response follow-up

The owner reported a formatting failure during a real phone scan. A controlled reproduction with a public wooden-elephant photograph returned `finish_reason: length`, 1,000 completion tokens, 1,000 reasoning tokens, and no usable JSON. The original request budget could be consumed entirely by optional model reasoning; the error copy incorrectly suggested a clearer image could solve a response-format failure.

The deployed `fairfare-identify` version 3 disables optional reasoning, requires the configured provider's structured-output support, enforces a strict product JSON schema, and allows 2,048 output tokens. Parsing distinguishes truncation, provider failure, absent content, invalid JSON and invalid attributes. It accepts one complete JSON object in plain/fenced/prose-wrapped/text-part responses without inventing missing values or parsing reasoning. Failure logs contain only fixed reason codes, finish reason, content type and character count; no image, raw response text, reasoning or credentials.

Two deliberate live requests were used for this fix: one baseline reproduction and one successful check through the deployed Supabase function, using the same resized public test photograph. The fixed request returned HTTP 200 with `wooden_elephant`, probable `wood`, visible attributes, explicit uncertainty and an unknown finish requiring confirmation. No price or dimensions were returned. Source photograph: [Teak elephant figurines by Vis M, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Teak_elephant_figurines.jpg), used only as an ignored local test asset, never as a Jaipur observation or shipped product photo. The normalized, image-free response is retained as `tests/fixtures/vision-elephant.json`.

Current regression result: 21 tests passed, including six new vision-request/parsing cases. Syntax and secret scans passed. No frontend layout or camera implementation changed. The previous UI delivery gate remains applicable; exact reproduction using the owner's original photo is still an owner check. A reinstall or frontend refresh is not required to use the backend fix.

## Automated and backend evidence

- `npm test`: 21 tests passed (15 in the initial implementation snapshot). Matching compatibility, robust ranges, insufficient data, pending exclusion, submission validation, file consent/signatures, model normalization, API errors, service-worker exclusions, 404 restoration and vision truncation/format handling are covered.
- `npm run check`: syntax checks, privileged-credential patterns and credential-file tracking passed. Both themes' normal-text token pairs passed at 5.12:1 or above; control boundaries passed 3:1. Focus rings are 3px and use a checked accent.
- Taste-skill source lint: zero failures or warnings. Rendered checks at 1440, 768 and 390 pixels passed after fixing hidden-file-input overflow. Additional browser checks at 320 and 375 pixels found no horizontal overflow.
- Anonymous reference reads succeeded. Anonymous reads of submissions/evidence, writes to trusted references, and execution of privileged RPCs returned HTTP 401.
- Known private evidence objects could not be fetched through private or public Storage paths. Anonymous listing returned an empty list.
- A purchase report arrived pending with no photos/consent. A contributor report arrived pending with explicit consent and two private evidence entries. A retry returned the same submission ID. Approved references remained at 29.
- A trusted approval transaction completed inside a rollback. Both labelled QA submissions were then rejected, never published.
- Supabase security advisor: no warning/error findings; three INFO notices for intentionally policy-free private tables. See `MODERATION.md` before changing those policies.
- Initial implementation used one intentional live OpenRouter inference, which returned a validated unsupported result for a non-product image. The follow-up above used two further deliberate requests, bringing implementation-side live inference tests to three total. Most testing uses fixtures. Account/model discovery confirmed image input availability and a free model; no daily provider allowance is assumed from deprecated account metadata.
- Sanitized model response retained in `tests/fixtures/vision-unsupported.json`; no image or key is included.

## Browser click-through

| Control / flow                            | Observed result                                                                                                                        |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Home Scan a Product                       | Navigated to `/scan`.                                                                                                                  |
| Take a photo, keyboard Enter              | Opened the desktop capture/file chooser; selected fixture previewed. Real rear-camera behavior is unverified.                          |
| Choose a photo                            | Opened gallery/file chooser; fixture decoded, compressed and previewed.                                                                |
| Clear photo                               | Removed preview and disabled identification.                                                                                           |
| Identify (local mock)                     | Displayed labelled editable product attributes without an AI request.                                                                  |
| Manual details, size and material         | Opened fields, accepted corrections and queried Supabase.                                                                              |
| Compare, 10 cm plain wood shop            | Calculated ₹310–₹410 from six approved synthetic records.                                                                              |
| Unsupported category                      | Displayed insufficient data and outside-pilot identity, without an unrelated price.                                                    |
| Method and comparable listing disclosures | Opened calculation rules, provenance and match reasons.                                                                                |
| Seller quote                              | Displayed relative context with no seller accusation.                                                                                  |
| Report my purchase                        | Reused confirmed attributes. Empty submit focused linked errors and retained form values.                                              |
| Purchase mock submit                      | Opened an explicitly labelled no-persistence confirmation. Live persistence was tested separately through the actual Edge Function.    |
| Contributor desk / Add observation        | Opened separate navigation and workflow.                                                                                               |
| Contributor photo / AI suggestion         | Previewed fixture and filled editable attributes in labelled mock mode.                                                                |
| Evidence selection / consent              | Prepared evidence, blocked missing consent, and allowed mock completion after consent.                                                 |
| Contribution terms / privacy              | Opened dialogs; Escape closed them and restored focus.                                                                                 |
| App taxi payment choices                  | Changed payment-specific guidance. Booking checkbox changed completion feedback.                                                       |
| Negotiated / metered ride                 | Changed agreement guidance. Destination, amount and return selection generated an on-screen ride note.                                 |
| Visitor category / counter questions      | Student selection changed eligibility guidance; disclosure opened actual counter questions.                                            |
| Network-error fixture / Retry             | Auto and monument blocks displayed errors and retry behavior without replacing the whole screen.                                       |
| Theme                                     | Switched light/dark surfaces; no console errors captured during normal interactions.                                                   |
| Mobile menu / Escape                      | Opened and closed navigation; destinations remained available through bottom navigation.                                               |
| Pilot, Privacy, Install app               | Opened relevant disclosures or platform install instructions. Native installation remains a device check.                              |
| Unknown route / refresh / return          | Kept the unknown path and displayed branded 404; return link navigated home.                                                           |
| Back / Forward                            | Returned between home and scan after each history navigation completed.                                                                |
| Tab navigation                            | Focus reached the back link in DOM order with a visible 3px solid outline; Enter activated capture input and Escape dismissed dialogs. |

External source URLs are real official/operator destinations. Current monument fees could not be verified, so no rupee prices are presented as official. Their third-party availability is outside FairFare's control.

## Visual critique

Dealt style: Pastel consumer, seed 521539996, with the owner's brand palette retained. No redraw. The tag/logo and the evidence-attached price range give the app its face. The live feature is the actual attribute-to-database comparison, supplemented by quote context and ride notes.

Self-review, not an independent award rating: hierarchy 8/10, identity 8/10, density 8/10, interaction clarity 8/10. Three defects corrected during review: text under 11px, a cramped phone scan panel, and sideways overflow from hidden file controls. All listed desktop/tablet/mobile screenshot sheets were opened and reviewed. No external photographs, generated people or stock product images are shipped; the supplied logo is the only persistent visual asset family.

Defended inspector warnings:

- The capped canvas is centered, with equal 148px desktop outer margins. The inspector's sidebar heuristic incorrectly treats one margin as unused canvas; this app has a top bar and no sidebar.
- Home has an introductory 42px headline to distinguish the first-use invitation from task screens. Task titles are 28–32px; this is the sole larger app heading.
- Independent capture/form/help sections align at the top and keep their natural content height, rather than stretching a short help block into a large blank card. They stack on phones. This accounts for the ragged-row warnings on task screens.
- Warm white and terracotta are explicit owner brand direction, retained with `--allow palette-cream`; they were not chosen from the skill's default palette.

## Antislop implementation delivery gate

This gate applies to the implemented, locally exercised interface. Real-device acceptance below remains separate and is not represented as passed.

R-02 PASS: source scan found no em dash in application copy.

R-03 PASS: rendered 1440/768/390 checks and 320/375 browser width checks show no horizontal overflow; mobile uses stacked tasks and bottom navigation.

R-17 PASS: reference counts/ranges are calculated from fetched records; all initial values are labelled synthetic.

R-18 PASS: no testimonials, people or customer counts are invented.

R-23 PASS: logo conversion was explicitly requested; no assumed people or final product photographs were generated.

R-24 PASS: every internal destination is implemented, including contributor routes and unknown-route handling.

R-25 PASS: computed text/control contrast pairs pass in both themes; no text is placed over variable imagery.

R-26 PASS: controls have routing, input, disclosure, dialog, state, submission or external-source behavior; click-through evidence is above.

R-27 PASS: photo/comparison empty states, fetching/processing states, network errors, retry states and insufficient data are implemented and exercised.

R-28 PASS: the only visitor-question disclosure addresses actual ticket-counter choices.

R-32 PASS: semantic controls, tested Tab/Enter/Escape paths, native dialog focus containment and visible 3px focus styles are present.

R-33 PASS: features were edited directly in source; no source-replacement patch scripts are shipped.

R-34 PASS: both neutral light/dark token sets were exercised and contrast-checked.

R-35 PASS: the app ran, browser controls were exercised, source/render checks ran, and the specific limits of real-device verification are documented.

R-36 PASS: no invented security certification, performance, merchant or customer claims appear.

R-37 PASS: owner brand direction, Design Read and dials were written before implementation.

R-38 PASS: synthetic data is disclosed; unavailable official fees are not filled with plausible numbers.

R-01 PASS: flat owner brand accents mark context/actions; no gradients or glows.

R-04 PASS: requested FontAwesome icons correspond to camera, travel modes, evidence, navigation and controls; decorative glyphs are aria-hidden.

R-06 PASS: Manrope's open shapes and tabular figures serve readable forms and rupee comparisons; no decorative monospace or tracked uppercase labels.

R-07 PASS: no decorative grid or pattern background.

R-08 PASS: chevrons signal navigation/disclosure; arrows are not attached to every CTA.

R-09 PASS: status labels denote pilot/provenance/pending state, without glow or a decorative status dot.

R-10 PASS: no glass or backdrop blur.

R-12 PASS: resting task panels are flat; shadow is restricted to the modal.

R-13 PASS: no glow.

R-14 PASS: cards contain product tasks, peer travel destinations or evidence, with hierarchy derived from the workflow.

R-19 PASS: short control feedback and processing indicators only, with reduced-motion CSS; no page choreography.

R-22 PASS: no generic illustration; only the explicitly supplied price-tag artwork.

Liveliness dials PASS: ENERGY 2 / RHYTHM 2 / MOTION 1 are recorded and reflected in the interaction-focused interface.

Liveliness focal point PASS: home leads with scan; comparison leads with the calculated range; contribution leads with the product observation.

Liveliness space/accent/motif PASS: consistent gutters separate tasks; terracotta marks primary action; the price tag and evidence label repeat product identity.

C-1 PASS: major decisions and their one-line purposes are recorded in `DESIGN.md`.

C-2 PASS: functional control evidence is recorded above, with simulated and live submission tests distinguished.

C-3 PASS: screens follow scan, compare, travel or observation jobs; no filler dashboards, KPI rows or testimonials.

C-4 PASS: implemented empty/error/loading states, responsive reflow, both themes and keyboard paths were checked; physical device acceptance is explicitly outstanding.

C-5 PASS: all proof is either recorded test evidence, sourced guidance or explicitly synthetic data.

R-05 PASS: scan, comparison, guidance and contribution use content-driven compositions, not a marketing template.

R-11 PASS: panel/control/status radii have separate roles; elements are not uniformly pills.

R-15 PASS: CTAs name actions such as Scan a Product, Compare local observations and Submit for review.

R-16 PASS: source lint found no stock marketing buzzwords.

R-20 PASS: Jaipur scope, wooden-elephant attributes, rupee evidence and the supplied tag give product-specific identity.

R-21 PASS: an implemented light/dark choice supports outdoor and evening use.

R-29 PASS: sage and terracotta accents sit on neutral grounds.

R-30 PASS: no named product's layout or branding is copied.

R-31 PASS: colour, layout, type, spacing, panels, icons and motion have written reasons in `DESIGN.md`.

## Acceptance still required

Follow `MANUAL-QA.md` on a real phone: camera/permissions/rear selection, intended handicraft recognition, mobile connection handling, keyboard visibility, installation/home-screen icon, standalone navigation and offline recovery. Also submit an owner-controlled real or explicitly labelled test observation and inspect it in Supabase. The implementation is not declared fully device-verified until that feedback arrives.
