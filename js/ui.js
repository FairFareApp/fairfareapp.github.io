import { products, productFor, packCounts, packLabel, sellingPlaces } from "./products.js";

export const escapeHTML = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const icon = (name) =>
  `<i class="fa-solid fa-${name}" aria-hidden="true"></i>`;
export const money = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
export const date = (v) =>
  new Date(v + "T12:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const notice = (text, type = "info") =>
  `<div class="notice ${type}" role="${type === "error" ? "alert" : "note"}">${icon(type === "error" ? "circle-exclamation" : "circle-info")}<span>${text}</span></div>`;
export const loading = (text) =>
  `<div class="loading" role="status"><span class="spinner" aria-hidden="true"></span>${text}</div>`;
export const disclosure = (label) =>
  `<summary><span>${label}</span><span class="disclosure-action" aria-hidden="true"><span>Show</span><span>Hide</span></span></summary>`;
export const options = (list, selected) =>
  list
    .map(
      ([value, label]) =>
        `<option value="${escapeHTML(value)}" ${value === String(selected) ? "selected" : ""}>${escapeHTML(label)}</option>`,
    )
    .join("");
export function field(label, name, content, hint = "") {
  return `<div class="field"><label for="${name}">${label}</label>${content}${hint ? `<small id="${name}-hint">${hint}</small>` : ""}</div>`;
}
export function attributesForm(a = {}, prefix = "", { detected = false } = {}) {
  const product = productFor(a.category_id);
  const bangles = a.category_id === "bangles";
  const select = (name, list, required = true) =>
    `<select id="${prefix + name}" name="${name}" ${required ? "required" : ""}>${options(list, a[name])}</select>`;
  const category = field(
    "Product",
    prefix + "category_id",
    select("category_id", [
      ...Object.entries(products).map(([key, value]) => [key, value.name]),
      ["unsupported", "Another product"],
    ]),
  );
  if (!product) return category;
  const guess = product.finishes[a.finish];
  const visibleFinish = !detected || !guess;
  const finish = field(
    product.finishLabel,
    prefix + "finish",
    select("finish", [
      ["unknown", "Not sure"],
      ...Object.entries(product.finishes),
    ]),
  );
  const material = field(
    "Material",
    prefix + "material",
    select("material", [
      ["unknown", "Not sure"],
      ...Object.entries(product.materials),
    ]),
    "Ask the seller what the item is made of if you are unsure.",
  );
  const materialUnknown = !product.materials[a.material];
  return `<div class="form-grid essential-attributes">
    ${detected ? "" : category}
    ${field(product.sizeLabel, prefix + "size_cm", `<input id="${prefix}size_cm" name="size_cm" type="number" inputmode="decimal" min="${product.min}" max="${product.max}" step="0.1" value="${escapeHTML(a.size_cm || "")}" required aria-describedby="${prefix}size_cm-hint">`, product.sizeHint)}
    ${bangles ? field("How many bangles are sold together?", prefix + "pack_count", select("pack_count", [["", "Choose the number of bangles"], ...packCounts.map((count) => [String(count), packLabel(count)])])) : ""}
    ${field(
      "Where is it sold?",
      prefix + "segment",
      select("segment", Object.entries(sellingPlaces)),
    )}
    ${visibleFinish ? finish : ""}
  </div>
  ${detected && guess ? `<p class="small muted inferred-detail">The photo suggests ${escapeHTML(guess.toLowerCase())}. ${materialUnknown ? "The material is unclear." : `Possible material: ${escapeHTML(product.materials[a.material])}.`}</p>` : ""}
  <details class="attribute-extra">${disclosure(detected ? "Check or change the product details" : "Add material or carving details")}<div class="form-grid">
    ${detected ? category : ""}
    ${!visibleFinish ? finish : ""}
    ${material}
    ${
      bangles
        ? ""
        : field(
            "Carving detail",
            prefix + "carving_detail",
            select("carving_detail", [
              ["unknown", "Not sure"],
              ["simple", "Simple carving"],
              ["detailed", "Detailed carving"],
            ]),
            "Choose only if you can inspect the object.",
          )
    }
  </div></details>
  <input type="hidden" name="decoration" value="${escapeHTML(a.decoration || "")}">`;
}
export function readAttributes(form) {
  const f = new FormData(form);
  return {
    category_id: f.get("category_id"),
    material: f.get("material") || "unknown",
    size_cm: Number(f.get("size_cm")),
    finish: f.get("finish") || "unknown",
    segment: f.get("segment") || "shop",
    pack_count: Number(f.get("pack_count")) || "",
    decoration: String(f.get("decoration") || "").trim(),
    carving_detail: String(f.get("carving_detail") || "unknown"),
  };
}
