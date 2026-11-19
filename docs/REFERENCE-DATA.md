# Demonstration reference data

## Fashion bangles

The same pilot now includes 2,835 separately keyed synthetic bangle scenarios. Lac (lakh), glass and fashion metal are modelled separately, each in plain, patterned and stone-set designs. Seven inner-diameter anchors from 4.5 to 7.5 cm, five exact pack quantities (1, 2, 4, 6 or 12 pieces), three selling settings and three locality samples give coverage across the supported combinations. Each sample's width style is recorded. The asking price is the total for the stated quantity. Comparisons allow 0.3 cm of diameter variation and require the same design, material, setting and pack quantity.

Nine generated material/design illustrations are stored as 384px WebP assets under `bangles/` in the same public bucket. Each shows an example pair to illustrate appearance. Listings state the actual modelled quantity separately. Metal refers to fashion metal with no authenticated precious-metal content. When material is unknown, each supported material with at least three compatible records gets its own labelled estimate.

The Jaipur pilot is a demonstration. Its 1,469 approved reference records are synthetic: the original 29 plus 1,440 modelled scenarios added on 19 November 2026. None is a researched market quotation, verified transaction or independent real-world price observation. Modelled locality/date/species values do not assert that an event occurred. Pending public contributions remain separate and excluded.

Coverage: carved wooden elephants, heights 2–30 cm; generic wood with unverified species, or separately assumed sandalwood; plain, painted, inlaid and openwork finishes; street, craft-shop and boutique settings; simple or detailed carving. Ten height anchors have three distinct variations per combination, with different height, price, illustrative date, locality and decorative style. They are scenarios, not copied observations. The price formula lives only in the migration seed, never in the client price calculation. Expensive-looking finish or species in an illustration is not evidence of authenticity.

Matching still requires three eligible records. Category, material, finish, setting and Jaipur must match; height tolerance is max(2 cm, 20%); maximum age one year. Selected carving detail matches exactly; choosing either pools both and does not make a workmanship claim. Record ID and independence key prevent repeated records inflating the sample. Tukey fences remove extreme prices, then the middle half is rounded outward to ₹10. Synthetic rows can support an illustrative range, never an independent market-evidence claim. The data expires naturally; it is not refreshed automatically to appear current.

## Product illustrations

Four images in `assets/references/` were generated specifically for FairFare using OpenAI image generation on 19 November 2026. They depict plain carved wood, painted wood, geometric inlay and openwork with an elephant inside. No third-party product photograph was used. Images are project-generated assets subject to the provider's terms; no exclusive copyright or Creative Commons licence is asserted.

The corresponding public Supabase bucket is `fairfare-reference-images`, paths `elephants/{finish}.webp`. Each 384×384 WebP is approximately 13–20 KB. The database stores path, alt text, kind, credit and licence/provenance notes. Shared images illustrate finish only, not size, species, carving quality, a particular merchant or a verified purchase. This is disclosed in the listing and results. The public bucket permits reading; no public upload/update/delete policy exists. Private submission evidence remains in the separate private `fairfare-evidence` bucket.

Unsupported products, unknown materials/finishes and truly inadequate samples continue to show insufficient data. The UI does not infer sandalwood or physical dimensions from a photo.
