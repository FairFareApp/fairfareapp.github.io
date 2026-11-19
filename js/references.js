import { SUPABASE_URL } from "./config.js";
import { escapeHTML as h, money, date, icon } from "./ui.js";
export function referenceImage(o, cls = "reference-image") {
  if (
    !o.image_path ||
    !/^elephants\/(plain|painted|inlay|openwork)\.webp$/.test(o.image_path)
  )
    return `<div class="image-fallback ${cls}">${icon("image")}<span>No reference image</span></div>`;
  return `<div class="reference-media ${cls}"><img src="${SUPABASE_URL}/storage/v1/object/public/fairfare-reference-images/${o.image_path}" alt="${h(o.image_alt)}" width="384" height="384" loading="lazy"><span class="image-unavailable" hidden>Image unavailable</span></div>`;
}
export function bindReferenceImages(root) {
  root.querySelectorAll(".reference-media img").forEach((img) => {
    const fallback = () => {
      img.hidden = true;
      img.nextElementSibling.hidden = false;
    };
    img.addEventListener("error", fallback);
    if (img.complete && !img.naturalWidth) fallback();
  });
}
export function comparable(o) {
  return `<article class="comparable"><div class="comparable-overview">${referenceImage(o)}<div><strong>${money(o.price_inr)}</strong><p>${h(o.size_cm)} cm · ${h(o.finish)}</p><small>${h(o.material === "wood" ? "Wood" : "Assumed sandalwood")} · ${h(o.segment)}<br>${h(o.ff_markets.locality)}</small></div></div><details><summary>Listing details</summary><p class="demo-label">${o.provenance === "synthetic" ? "Synthetic demonstration record" : h(o.provenance + " observation")}</p><p>${h(o.source_note)}</p><p>${h(o.attributes?.carving_detail || "Unspecified")} carving · ${h(o.price_type)} price · ${date(o.observed_at)}</p><ul>${o.reasons.map((x) => `<li>${h(x)}</li>`).join("")}</ul><p class="small muted">${h(o.image_credit)}. ${h(o.image_license)}. Shared finish illustration, not a purchase photo, scale or workmanship reference.</p>${o.source_url?.startsWith("https://") ? `<a href="${h(o.source_url)}" target="_blank" rel="noopener noreferrer">Source information</a>` : ""}<small>Record ${h(o.id.slice(0, 8))}</small></details></article>`;
}
