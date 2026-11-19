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
export function attributesForm(a = {}, prefix = "") {
  const select = (name, list) =>
    `<select id="${prefix + name}" name="${name}" required>${options(list, a[name])}</select>`;
  return `<div class="form-grid essential-attributes">
 ${field("Height (cm)", prefix + "size_cm", `<input id="${prefix}size_cm" name="size_cm" type="number" inputmode="decimal" min="2" max="30" step="0.1" value="${escapeHTML(a.size_cm || "")}" placeholder="e.g. 10" required aria-describedby="${prefix}size_cm-hint">`, "Base to highest point. Please estimate or measure.")}
 ${field(
   "Finish",
   prefix + "finish",
   select("finish", [
     ["unknown", "Not sure"],
     ["plain", "Plain carved wood"],
     ["painted", "Painted"],
     ["inlay", "Inlaid"],
     ["openwork", "Openwork / elephant inside"],
   ]),
 )}
 ${field(
   "Where is it sold?",
   prefix + "segment",
   select("segment", [
     ["shop", "Local craft shop"],
     ["street", "Street or market stall"],
     ["boutique", "Boutique or gallery"],
   ]),
 )}
 </div><details class="attribute-extra"><summary>${a.material === "unknown" ? "Edit details · material unconfirmed" : "Edit product details"}</summary><div class="form-grid">
 ${field(
   "Product",
   prefix + "category_id",
   select("category_id", [
     ["wooden_elephant", "Carved wooden elephant"],
     ["unsupported", "Another product (outside pilot)"],
   ]),
 )}
 ${field(
   "Material",
   prefix + "material",
   select("material", [
     ["unknown", "Not sure"],
     ["wood", "Wood · species unverified"],
     ["sandalwood", "Sandalwood · independently verified by me"],
   ]),
   "A photo cannot verify wood species or authenticity.",
 )}
 ${field(
   "Carving detail",
   prefix + "carving_detail",
   select("carving_detail", [
     ["unknown", "Not sure / either"],
     ["simple", "Simple carving"],
     ["detailed", "Detailed carving"],
   ]),
   "Choose only if you can inspect the object.",
 )}
 </div></details>`;
}
export function readAttributes(form) {
  const f = new FormData(form);
  return {
    category_id: f.get("category_id"),
    material: f.get("material"),
    size_cm: Number(f.get("size_cm")),
    finish: f.get("finish"),
    segment: f.get("segment"),
    decoration: String(f.get("decoration") || "").trim(),
    carving_detail: String(f.get("carving_detail") || "unknown"),
  };
}
