import {
  icon,
  escapeHTML as h,
  money,
  notice,
  loading,
  attributesForm,
  readAttributes,
} from "./ui.js";
import { compressImage, discardImage } from "./images.js";
import { identify, getObservations } from "./api.js";
import { compareObservations } from "./matching.js";
import {
  taxiPage,
  bindTaxi,
  autosPage,
  bindAutos,
  monumentsPage,
  bindMonuments,
} from "./guidance.js";
import { policies } from "./policies.js";
import { comparable, bindReferenceImages } from "./references.js";
import { createContributionFlow } from "./contribution.js";

const app = document.querySelector("#app");
const defaults = () => ({
  category_id: "wooden_elephant",
  material: "wood",
  finish: "plain",
  segment: "shop",
  carving_detail: "unknown",
});
const state = {
  image: null,
  attributes: defaults(),
  analysis: null,
  result: null,
  submission: null,
  scanBusy: false,
  scanError: "",
};
const devMock =
  ["localhost", "127.0.0.1"].includes(location.hostname) &&
  new URLSearchParams(location.search).get("mock") === "1";
let controller = new AbortController(),
  installPrompt = null,
  scanVersion = 0;
const restored = new URLSearchParams(location.search).get("__route");
if (restored && restored.startsWith("/") && !restored.startsWith("//"))
  history.replaceState({}, "", restored);
try {
  document.documentElement.dataset.theme =
    localStorage.getItem("fairfare-theme") || "light";
} catch {
  document.documentElement.dataset.theme = "light";
}
const nav = [
  ["/", "house", "Home"],
  ["/scan", "camera", "Scan"],
  ["/taxis", "taxi", "App taxis"],
  ["/autos", "car-side", "Autos"],
  ["/monuments", "landmark", "Monuments"],
];
const flow = createContributionFlow({
  state,
  devMock,
  navigate,
  render,
  identify: identifyPhoto,
});

function shell(content, path) {
  const contributor = path.startsWith("/contribute"),
    active = ["/compare", "/report"].includes(path) ? "/scan" : path;
  return `<header class="site-header"><div class="header-inner"><a href="/" class="brand" aria-label="FairFare home"><img src="/assets/brand-mark.png" alt="" width="38" height="38"><span>FairFare</span></a><nav class="desktop-nav" aria-label="Main navigation">${nav.map(([url, i, label]) => `<a href="${url}" ${url === active ? 'aria-current="page"' : ""}>${label}</a>`).join("")}</nav><div class="header-tools"><a class="quiet-link" href="${contributor ? "/" : "/contribute"}">${contributor ? "Tourist app" : "Contribute"}</a><button class="icon-button" id="theme-toggle" aria-label="Switch colour theme" aria-pressed="${document.documentElement.dataset.theme === "dark"}">${icon(document.documentElement.dataset.theme === "dark" ? "sun" : "moon")}</button><button class="icon-button mobile-menu-button" id="menu-toggle" aria-label="Open navigation menu" aria-expanded="false">${icon("bars")}</button></div></div><nav id="mobile-menu" class="mobile-menu" aria-label="More navigation" hidden><a href="/contribute">Contributor desk</a><button id="install-mobile">Install app</button><button data-dialog="privacy">Photo privacy</button><button data-dialog="pilot">About the demonstration</button></nav></header>
  <main id="main" class="main-content ${path === "/" ? "home-content" : ""}" tabindex="-1">${content}</main><footer class="site-footer"><span>${icon("location-dot")} Jaipur pilot</span><div><button data-dialog="pilot">Demonstration</button><button data-dialog="privacy">Privacy</button><button id="install-button">Install app</button></div></footer>
  ${!contributor ? `<nav class="bottom-nav" aria-label="Mobile main navigation">${nav.map(([url, i, label]) => `<a href="${url}" ${url === active ? 'aria-current="page"' : ""}>${icon(i)}<span>${label}</span></a>`).join("")}</nav>` : ""}<dialog id="info-dialog" class="dialog" aria-labelledby="dialog-title"><div class="dialog-top"><h2 id="dialog-title"></h2><button class="icon-button" id="close-dialog" aria-label="Close dialog">${icon("xmark")}</button></div><div id="dialog-body"></div></dialog>`;
}
function home() {
  return `<section class="home-start" aria-labelledby="home-title"><p class="location">${icon("location-dot")} Jaipur, Rajasthan</p><h1 id="home-title">A price check, before you buy.</h1><a href="/scan" class="scan-launch"><span class="scan-launch-icon">${icon("camera")}</span><span>Scan a Product</span><small>Wooden elephant pilot</small></a><p class="home-subline">Photo. Confirm. Compare.</p></section><nav class="home-shortcuts" aria-label="More in Jaipur">${[
    ["/taxis", "taxi", "App taxis"],
    ["/autos", "car-side", "Autos & taxis"],
    ["/monuments", "landmark", "Monuments"],
  ]
    .map(
      ([url, i, text]) =>
        `<a href="${url}">${icon(i)}<span>${text}</span>${icon("chevron-right")}</a>`,
    )
    .join(
      "",
    )}</nav><div class="home-meta"><span class="demo-label">Illustrative prices · demonstration</span><a href="/contribute">Contribute a price ${icon("chevron-right")}</a></div>`;
}
function photoPreview(image) {
  return image
    ? `<img class="product-preview" src="${image.url}" alt="Your selected product photo">`
    : `<div class="photo-empty"><div class="viewfinder">${icon("camera")}</div><p>Keep the whole object in view.</p></div>`;
}
function scan() {
  const ready = Boolean(state.analysis);
  return `<div class="page-heading"><a class="back-link" href="/">${icon("arrow-left")}Home</a><h1>${ready ? (state.analysis.category_id === "wooden_elephant" ? "Looks like a wooden elephant." : "This looks outside the pilot.") : "Scan a product"}</h1><p>${ready ? "Check the details. Then see the price." : "Start with a photo of your find."}</p></div>${devMock ? notice("Development mock · no AI request or submission is sent.") : ""}<div class="scan-layout"><section class="photo-card"><div id="photo-area">${photoPreview(state.image)}</div><div class="photo-actions"><button class="button primary" id="take-photo">${icon("camera")}${state.image ? "Retake" : "Take a photo"}</button><button class="button secondary" id="choose-photo">${icon("image")}${state.image ? "Replace" : "Gallery"}</button></div><input id="camera-input" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" tabindex="-1"><input id="gallery-input" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" tabindex="-1"><div id="photo-feedback" aria-live="polite"></div><p class="privacy-note">${icon("shield-halved")}Not saved. Sent for identification when selected.<button class="text-link" data-dialog="privacy">Privacy</button></p>${state.image ? '<button class="text-link" id="clear-scan">Remove photo</button>' : ""}</section><section class="confirm-card"><div id="analysis-feedback" aria-live="polite">${state.scanBusy ? loading("Taking a closer look…") : state.scanError ? notice(h(state.scanError), "error") : ready ? `<div class="recognition"><span>${icon("check")} ${devMock ? "Mock identification" : "Photo identified"}</span><h2>${h(state.analysis.category_id === "wooden_elephant" ? "Wooden elephant" : "Outside this pilot")}</h2></div>` : ""}</div>${state.image && !state.scanBusy && state.scanError ? '<button class="button secondary" id="retry-identify">Try identification again</button>' : ""}<details class="confirmation-details" ${ready || state.scanError || state.manual ? "open" : ""}><summary>${ready ? "Confirm your product" : "Enter details yourself"}</summary><form id="attributes-form">${attributesForm(state.attributes)}<div id="comparison-feedback" aria-live="polite"></div><button class="button primary full" type="submit" ${state.scanBusy ? "disabled" : ""}>See price ${icon("chevron-right")}</button><p class="small muted">Illustrative demonstration prices.</p></form></details>${ready ? `<details class="recognition-details"><summary>What the photo can tell us</summary><p>${h(state.analysis.visible_characteristics)}</p><p>${h(state.analysis.uncertainty)}</p></details>` : ""}</section></div>`;
}
function comparison() {
  const r = state.result,
    a = state.attributes;
  if (!r)
    return empty(
      "Check a product first",
      "Take a photo or enter its details.",
      "/scan",
      "Scan a product",
    );
  return `<div class="result-layout"><div class="page-heading"><a class="back-link" href="/scan">${icon("arrow-left")}Edit details</a><div class="result-product">${state.image ? `<img src="${state.image.url}" alt="Your scanned product" width="68" height="68">` : icon("tag")}<div><h1>${a.category_id === "wooden_elephant" ? "Wooden elephant" : "Outside this pilot"}</h1><p>${h(a.size_cm)} cm · ${h(a.finish)} · ${h(a.segment)}</p></div></div></div><section class="price-panel panel">${r.status === "ready" ? `<p class="eyebrow">${r.synthetic ? "Illustrative price range" : "Typical comparison range"}</p><p class="price-range">${money(r.low)}<span>–</span>${money(r.high)}</p><p class="range-caption">Middle half of ${r.matches.length} comparable ${r.synthetic ? "demo records" : "observations"}.</p>${r.synthetic ? `<p class="demo-label">Demonstration · ${r.synthetic}/${r.matches.length} synthetic records<br><span>Illustrative only. Not verified Jaipur market prices.</span></p>` : ""}<div class="buying-tip">${icon("comment-dollar")}<p>Ask for the total. Check carving, finish and condition before making an offer.</p></div>` : `<div class="empty-result">${icon("scale-balanced")}<h2>Not enough similar observations</h2><p>${h(r.reason)}</p><a href="/scan" class="button secondary">Review details</a></div>`}</section>${r.status === "ready" ? `<button class="share-price" id="report-purchase"><span><strong>Bought it? Share the price.</strong><small>Details ready. Add what you paid.</small></span>${icon("chevron-right")}</button>` : ""}<div class="result-disclosures"><details><summary>Compare ${r.matches.length} similar ${r.synthetic ? "demo records" : "observations"}</summary><p class="small muted">Images illustrate finish only. Shared across examples, not photos of purchases or exact dimensions.</p><div class="comparables-grid">${r.matches.map(comparable).join("") || "No matching approved records."}</div></details><details><summary>Product details & matching</summary><dl class="attribute-list"><div><dt>Material</dt><dd>${h(a.material === "wood" ? "Wood · species unverified" : a.material)}</dd></div><div><dt>Carving</dt><dd>${h(a.carving_detail || "Either")}</dd></div><div><dt>Location</dt><dd>Jaipur</dd></div></dl><p>Same product, material, finish and selling setting. Height within 2 cm or 20%, whichever is larger. Records no older than a year; pending submissions excluded. Carving detail matches exactly when selected. Wood species and quality cannot be established from a photo.</p></details><details><summary>Sources, uncertainty & calculation</summary><p>${h(r.method || "At least three compatible records are required.")}</p><p>${r.excluded || 0} extreme prices excluded. Asking, observed and paid prices may differ; each listing names its type.</p><p>Synthetic records are separately modelled examples, not independent real-world transactions. Reference illustrations do not establish species, workmanship, origin or authenticity. This is a demonstration, not an appraisal or a verdict on a seller.</p><button data-dialog="pilot" class="text-link">About the demonstration</button></details>${r.status === "ready" ? `<details><summary>Have a seller’s quote?</summary><form id="quote-form"><label for="quoted-price">Quoted price (₹)</label><div class="input-action"><input type="number" id="quoted-price" name="quote" min="1" max="100000" step="0.01" required inputmode="decimal"><button class="button secondary">Compare quote</button></div><div id="quote-context" aria-live="polite"></div></form></details>` : ""}</div></div>`;
}
function contributorHome() {
  return `<div class="desk-layout"><div class="page-heading"><p class="eyebrow">Contributor desk · Jaipur</p><h1>Share a local price.</h1><p>One product. One observation.</p></div><section class="contribution-start panel"><span class="desk-icon">${icon("clipboard-list")}</span><h2>What did you find?</h2><p>Wooden elephant figurines, 2–30 cm.</p><a class="button primary full" href="/contribute/new">${icon("plus")}Add an observation</a><div class="step-preview"><span>Photo</span>${icon("chevron-right")}<span>Details</span>${icon("chevron-right")}<span>Price</span>${icon("chevron-right")}<span>Review</span></div></section><p class="review-note">${icon("clock")}Reviewed before it becomes a reference.</p><details><summary>What to prepare</summary><ul><li>A clear product photo you have permission to share.</li><li>Height, finish and where it was sold.</li><li>Price, date and the Jaipur locality.</li><li>Optional evidence with personal details removed.</li></ul><p>Evidence is private. Nothing is published automatically.</p></details></div>`;
}
function confirmation() {
  return `<section class="confirmation panel">${devMock ? notice("Development mock · nothing was submitted or stored.") : ""}<div class="success-mark">${icon("check")}</div><p class="eyebrow">Pending review</p><h1>Thanks. We’ve got it.</h1><p>Your observation will be checked before it can become a reference.</p><div class="receipt-note"><span>Submission reference</span><strong>${h(state.submission.id.slice(0, 8))}</strong></div><p class="small muted">Published prices haven’t changed.</p><a href="/" class="button primary full">Back to home</a><a href="/contribute/new" class="button secondary full">Add another observation</a></section>`;
}
function empty(title, text, url, label) {
  return `<section class="empty-page"><span class="large-icon">${icon("compass")}</span><h1>${title}</h1><p>${text}</p><a class="button primary" href="${url}">${label}</a></section>`;
}
function navigate(path) {
  history.pushState({}, "", path);
  render();
}
function render() {
  controller.abort();
  controller = new AbortController();
  const signal = controller.signal,
    path = location.pathname.replace(/\/$/, "") || "/";
  const pages = {
    "/": home,
    "/scan": scan,
    "/compare": comparison,
    "/taxis": taxiPage,
    "/autos": autosPage,
    "/monuments": monumentsPage,
    "/contribute": contributorHome,
    "/contribute/new": () => flow.page(false),
    "/report": () => (state.result ? flow.page(true) : comparison()),
    "/submitted": () =>
      state.submission
        ? confirmation()
        : empty(
            "No submission here yet",
            "Start with your product.",
            "/scan",
            "Scan a product",
          ),
  };
  app.innerHTML = shell(
    (
      pages[path] ||
      (() =>
        empty(
          "This page isn’t on our map.",
          "404 · Let’s get you back to Jaipur.",
          "/",
          "Back to FairFare",
        ))
    )(),
    path,
  );
  document.title =
    ({
      "/": "Jaipur",
      "/scan": "Scan a product",
      "/compare": "Your price comparison",
      "/taxis": "App taxis",
      "/autos": "Autos & taxis",
      "/monuments": "Monuments",
      "/contribute": "Contributor desk",
      "/contribute/new": "Add an observation",
      "/report": "Share a purchase",
      "/submitted": "Pending review",
    }[path] || "Page not found") + " | FairFare";
  window.scrollTo(0, 0);
  document.querySelector("#main").focus({ preventScroll: true });
  bindShell();
  bindReferenceImages(app);
  if (path === "/scan") bindScan(signal);
  if (path === "/compare") bindComparison();
  if (path === "/taxis") bindTaxi(app);
  if (path === "/autos") bindAutos(app, signal);
  if (path === "/monuments") bindMonuments(app, signal);
  if (path === "/contribute/new" || (path === "/report" && state.result))
    flow.bind(path === "/report", signal);
  document.querySelector("#announcer").textContent = document.title;
}
function bindShell() {
  const theme = document.querySelector("#theme-toggle");
  theme.onclick = () => {
    const dark = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem("fairfare-theme", dark ? "dark" : "light");
    } catch {}
    theme.setAttribute("aria-pressed", String(dark));
    theme.innerHTML = icon(dark ? "sun" : "moon");
  };
  const menu = document.querySelector("#mobile-menu"),
    toggle = document.querySelector("#menu-toggle");
  toggle.onclick = () => {
    menu.hidden = !menu.hidden;
    toggle.setAttribute("aria-expanded", String(!menu.hidden));
    toggle.setAttribute(
      "aria-label",
      menu.hidden ? "Open navigation menu" : "Close navigation menu",
    );
  };
  document.querySelector("#close-dialog").onclick = () =>
    document.querySelector("#info-dialog").close();
  app
    .querySelectorAll("[data-dialog]")
    .forEach((b) => (b.onclick = () => showInfo(b.dataset.dialog)));
  app.querySelectorAll("#install-button,#install-mobile").forEach(
    (b) =>
      (b.onclick = async () => {
        if (installPrompt) {
          await installPrompt.prompt();
          await installPrompt.userChoice;
          installPrompt = null;
        } else showInfo("install");
      }),
  );
}
function showInfo(type) {
  const [title, body] = policies[type] || policies.pilot;
  document.querySelector("#dialog-title").textContent = title;
  document.querySelector("#dialog-body").innerHTML = body;
  document.querySelector("#info-dialog").showModal();
}
async function identifyPhoto(image, signal) {
  return devMock
    ? {
        category_id: "wooden_elephant",
        product_name: "Wooden elephant",
        material: "wood",
        finish: "plain",
        visible_characteristics:
          "Elephant-shaped carved wooden figurine. Development fixture, not image recognition.",
        uncertainty:
          "Size, species, authenticity and quality cannot be verified from a photo.",
      }
    : identify(image.data, signal);
}
async function analyse() {
  const version = ++scanVersion,
    image = state.image;
  if (!image) return;
  state.scanBusy = true;
  state.scanError = "";
  render();
  const signal = controller.signal;
  try {
    const a = await identifyPhoto(image, signal);
    if (signal.aborted || version !== scanVersion) return;
    state.analysis = a;
    state.attributes = { ...state.attributes, ...a, carving_detail: "unknown" };
  } catch (e) {
    if (signal.aborted || version !== scanVersion) return;
    state.scanError = e.message;
  } finally {
    if (version === scanVersion) {
      state.scanBusy = false;
      if (!signal.aborted) render();
    }
  }
}
function bindScan(signal) {
  if (state.image)
    document
      .querySelector("#take-photo")
      .classList.replace("primary", "secondary");
  const form = document.querySelector("#attributes-form");
  form.oninput = () => {
    state.attributes = readAttributes(form);
    state.manual = true;
  };
  const camera = document.querySelector("#camera-input"),
    gallery = document.querySelector("#gallery-input");
  document.querySelector("#take-photo").onclick = () => camera.click();
  document.querySelector("#choose-photo").onclick = () => gallery.click();
  let preparing = false;
  for (const input of [camera, gallery])
    input.onchange = async () => {
      const file = input.files[0];
      input.value = "";
      if (!file || preparing) return;
      preparing = true;
      const target = document.querySelector("#photo-feedback");
      target.innerHTML = loading("Preparing photo…");
      try {
        const image = await compressImage(file);
        if (signal.aborted) {
          discardImage(image);
          return;
        }
        discardImage(state.image);
        state.image = image;
        state.analysis = null;
        state.result = null;
        state.attributes = defaults();
        state.manual = false;
        analyse();
      } catch (e) {
        if (!signal.aborted) target.innerHTML = notice(h(e.message), "error");
      } finally {
        preparing = false;
      }
    };
  const clear = document.querySelector("#clear-scan");
  if (clear)
    clear.onclick = () => {
      scanVersion++;
      discardImage(state.image);
      state.image = null;
      state.analysis = null;
      state.result = null;
      state.scanBusy = false;
      state.scanError = "";
      render();
    };
  if (
    state.image &&
    !state.scanBusy &&
    !state.analysis &&
    !document.querySelector("#retry-identify")
  ) {
    document
      .querySelector("#analysis-feedback")
      .insertAdjacentHTML(
        "afterend",
        '<button class="button secondary" id="retry-identify">Identify photo</button>',
      );
  }
  const retry = document.querySelector("#retry-identify");
  if (retry) retry.onclick = analyse;
  form.onsubmit = async (e) => {
    e.preventDefault();
    state.attributes = readAttributes(form);
    state.result = null;
    const button = form.querySelector('button[type="submit"]'),
      target = document.querySelector("#comparison-feedback");
    button.disabled = true;
    target.innerHTML = loading("Finding similar products…");
    try {
      const rows = await getObservations(signal, state.attributes);
      if (signal.aborted) return;
      state.result = compareObservations(state.attributes, rows);
      navigate("/compare");
    } catch (e) {
      if (!signal.aborted) {
        target.innerHTML = notice(h(e.message), "error");
        button.disabled = false;
      }
    }
  };
}
function bindComparison() {
  const report = document.querySelector("#report-purchase");
  if (report)
    report.onclick = () => {
      flow.startPurchase();
      navigate("/report");
    };
  const form = document.querySelector("#quote-form");
  if (form)
    form.onsubmit = (e) => {
      e.preventDefault();
      const q = Number(new FormData(form).get("quote")),
        r = state.result;
      document.querySelector("#quote-context").innerHTML = notice(
        `This quote is ${q < r.low ? "below" : q > r.high ? "above" : "within"} the ${r.synthetic ? "illustrative" : "comparison"} range. Check the actual product and what is included. This does not establish a correct price or seller conduct.`,
      );
    };
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (
    !a ||
    e.defaultPrevented ||
    e.button !== 0 ||
    e.ctrlKey ||
    e.metaKey ||
    e.shiftKey ||
    e.altKey ||
    a.target ||
    a.hasAttribute("download")
  )
    return;
  const u = new URL(a.href, location.href);
  if (u.origin === location.origin && !u.hash) {
    e.preventDefault();
    navigate(u.pathname + u.search);
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const dialog = document.querySelector("#info-dialog");
    if (dialog?.open) {
      e.preventDefault();
      dialog.close();
      return;
    }
    const menu = document.querySelector("#mobile-menu"),
      toggle = document.querySelector("#menu-toggle");
    if (menu && !menu.hidden) {
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation menu");
      toggle.focus();
    }
  }
});
window.addEventListener("popstate", render);
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
});
window.addEventListener("pagehide", () => {
  controller.abort();
  scanVersion++;
  discardImage(state.image);
  state.image = null;
  state.analysis = null;
  state.result = null;
  state.scanBusy = false;
  flow.clear();
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted) render();
});
window.addEventListener("offline", () => {
  document.querySelector("#announcer").textContent =
    "You are offline. Identification and submissions need a connection.";
});
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("/sw.js").catch(() => {});
render();
