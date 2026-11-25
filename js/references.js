import { SUPABASE_URL } from "./config.js";
import { escapeHTML as h, money, date, icon, disclosure } from "./ui.js";
import { productFor, packLabel, sellingPlaces } from "./products.js";
export function referenceImage(o, cls = "reference-image") {
  if (
    !o.image_path ||
    !/^(elephants\/(plain|painted|inlay|openwork)|bangles\/(lac|glass|metal)-(plain|patterned|stonework))\.webp$/.test(
      o.image_path,
    )
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
  const product = productFor(o.category_id);
  const bangles = o.category_id === "bangles";
  const measure = bangles
    ? `${o.size_cm} cm inside · ${packLabel(Number(o.attributes?.pack_count))}`
    : `${o.size_cm} cm high`;
  const detail = bangles
    ? o.attributes?.width_style
    : o.attributes?.carving_detail;
  const material =
    o.material === "sandalwood" && o.provenance === "synthetic"
      ? "Assumed sandalwood"
      : product?.materials[o.material];
  return `<article class="comparable"><div class="comparable-overview">${referenceImage(o)}<div><strong>${money(o.price_inr)}</strong><p>${h(measure)} · ${h(product?.finishes[o.finish])}</p><small>${h(material)} · ${h(sellingPlaces[o.segment] || o.segment)}<br>${h(o.ff_markets.locality)}</small></div></div><details>${disclosure("See where this price came from")}<p class="demo-label">${o.provenance === "synthetic" ? "Made-up price for this demo" : o.provenance === "community" ? "Price shared by a visitor" : "Price checked by FairFare"}</p>${o.provenance !== "synthetic" && o.source_note ? `<p>${h(o.source_note)}</p>` : ""}<p>${detail ? `${h(detail)} · ` : ""}${h(o.price_type)} price · ${date(o.observed_at)}</p><ul>${o.reasons.map((x) => `<li>${h(x)}</li>`).join("")}</ul><p class="small muted">This picture shows an example of the style. ${h(o.image_credit)}. ${h(o.image_license)}</p>${o.source_url?.startsWith("https://") ? `<a href="${h(o.source_url)}" target="_blank" rel="noopener noreferrer">Read the source</a>` : ""}<small>Record ${h(o.id.slice(0, 8))}</small></details></article>`;
}
