import {
  icon,
  escapeHTML as h,
  money,
  date,
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
import { campaignMarkup, bindCampaign, deckMarkup, bindDeck } from "./decks.js";
import { bargainingFor } from "./travel-advice.js";
import { contributionReceipts, clearContributionReceipts } from "./receipts.js";
import {
  productFor,
  productName,
  changeProduct,
  packLabel,
} from "./products.js";

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
  scanVersion = 0,
  focusScan = false;
history.scrollRestoration = "manual";
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
  ["/taxis", "taxi", "Taxi fares"],
  ["/autos", "car-side", "Auto fares"],
  ["/monuments", "landmark", "Monuments"],
  ["/contribute", "clipboard-list", "Contribute"],
];
const flow = createContributionFlow({
  state,
  devMock,
  navigate,
  render,
  identify: identifyPhoto,
});

const infoRoutes = {
  "/install": ["install", "mobile-screen-button"],
  "/privacy": ["privacy", "shield-halved"],
  "/about": ["pilot", "circle-info"],
  "/story": ["story", "book-open"],
};

function moreButton(mobile, current) {
  return `<button type="button" class="${mobile ? "mobile-more" : "icon-button desktop-more"}" data-menu-toggle aria-controls="mobile-menu" aria-expanded="false" ${current ? 'aria-current="location"' : ""} aria-label="More navigation">${icon("ellipsis")}${mobile ? "<span>More</span>" : ""}</button>`;
}
function shell(content, path) {
  const active =
    path === "/scan" || path === "/compare"
      ? "/"
      : path.startsWith("/contribute") ||
          ["/report", "/submitted"].includes(path)
        ? "/contribute"
        : path;
  const more = Object.hasOwn(infoRoutes, path);
  return `<header class="site-header"><div class="header-inner">
    <a href="/" class="brand" aria-label="FairFare home"><img src="/assets/brand-mark.png" alt="" width="38" height="38"><span>FairFare</span></a>
    <nav class="desktop-nav" aria-label="Main navigation">${nav.map(([url, , label]) => `<a href="${url}" ${url === active ? 'aria-current="page"' : ""}>${label}</a>`).join("")}</nav>
    <div class="header-tools"><button class="icon-button" id="theme-toggle" aria-label="Switch colour theme" aria-pressed="${document.documentElement.dataset.theme === "dark"}">${icon(document.documentElement.dataset.theme === "dark" ? "sun" : "moon")}</button>${moreButton(false, more)}</div>
  </div></header>
  <main id="main" class="main-content ${path === "/" ? "home-content" : ""}" tabindex="-1">${content}</main>
  ${path === "/" ? '<footer class="site-footer"><span>Photos are sent for identification.</span><a href="/privacy">Privacy Policy</a></footer>' : ""}
  <nav class="bottom-nav" aria-label="Mobile main navigation">${nav.map(([url, i, label]) => `<a href="${url}" ${url === active ? 'aria-current="page"' : ""}${url === "/contribute" ? ' aria-label="Your Contributions"' : ""}>${icon(i)}<span>${label}</span></a>`).join("")}${moreButton(true, more)}</nav>
  <nav id="mobile-menu" class="mobile-menu more-menu" aria-label="More pages" hidden>${Object.entries(
    infoRoutes,
  )
    .map(
      ([url, [type, glyph]]) =>
        `<a href="${url}" ${url === path ? 'aria-current="page"' : ""}>${icon(glyph)}${h(policies[type][0])}</a>`,
    )
    .join("")}</nav>
  <dialog id="info-dialog" class="dialog" aria-labelledby="dialog-title"><div class="dialog-top"><h2 id="dialog-title"></h2><button class="icon-button" id="close-dialog" aria-label="Close dialog">${icon("xmark")}</button></div><div id="dialog-body"></div></dialog>`;
}
function home() {
  return `<div class="home-start">
    <h1 class="sr-only">FairFare</h1>
    ${campaignMarkup()}
    ${scan(true)}
    <button type="button" class="ready-launch ${state.travelReady ? "is-ready" : ""}" data-dialog="ready" aria-haspopup="dialog"><span class="ready-copy">${readyCopy()}</span><img src="/assets/monuments/hawa.webp" alt="" width="720" height="420" loading="lazy"></button>
  </div>`;
}
function readyCopy() {
  return state.travelReady
    ? `<span class="ready-symbol">${icon("check")}</span><strong>You’re ready for Jaipur</strong><small>Review tips</small>`
    : `<strong>Get Ready for Jaipur</strong><small>Open travel tips ${icon("arrow-right")}</small>`;
}
function infoPage(path) {
  const [type, glyph] = infoRoutes[path];
  const [title, body] = policies[type];
  return `<article class="info-page"><header><span>${icon(glyph)}</span><h1>${h(title)}</h1></header><div class="info-copy">${body}${type === "install" ? '<button type="button" class="button primary" id="install-now" hidden>Install FairFare</button>' : ""}</div></article>`;
}

function scan(embedded = false) {
  const ready = Boolean(state.analysis);
  const title = ready
    ? productName(state.attributes.category_id)
    : state.manual && !state.image
      ? "Product details"
      : "Scan a product";
  const photoActions = `<div class="photo-actions">
    ${state.image ? `<button class="button secondary" id="take-photo">${icon("camera")}Retake</button>` : ""}
    <button class="button secondary" id="choose-photo">${icon("image")}${state.image ? "Replace" : "Gallery"}</button>
  </div>`;
  const form = `<form id="attributes-form">
    ${attributesForm(state.attributes, "", { detected: ready })}
    <div id="comparison-feedback" aria-live="polite"></div>
    <div class="task-actions"><button class="button primary full" type="submit" ${state.scanBusy ? "disabled" : ""}>See price</button></div>
  </form>`;
  return `<section id="scan" class="${embedded ? "home-scan" : "scan-page"}" aria-labelledby="scan-title"><div class="page-heading scan-heading">
    ${
      embedded
        ? `<span class="pilot-label">${icon("location-dot")} Jaipur pilot</span><h2 id="scan-title">${h(title)}</h2><p>Wooden elephants and fashion bangles · illustrative prices</p>`
        : `
    <a class="back-link" data-up href="/">${icon("arrow-left")}Home</a>
    <h1 id="scan-title">${h(title)}</h1>`
    }
  </div>
  ${devMock ? notice("Development mock · no AI request is sent.") : ""}
  <div class="scan-layout ${ready ? "scan-confirming" : ""}">
    <section class="photo-card ${state.image ? "photo-selected" : ""}" aria-label="Product photo">
      <div id="photo-area">${
        state.image
          ? `<img class="product-preview" src="${state.image.url}" alt="Your selected product photo">`
          : `<button class="capture-tile" id="take-photo"><span class="viewfinder">${icon("camera")}</span><strong>Take a photo</strong></button>`
      }</div>
      ${photoActions}
      <input id="camera-input" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" tabindex="-1">
      <input id="gallery-input" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" tabindex="-1">
      <div id="photo-feedback" aria-live="polite"></div>
      ${state.image ? '<button class="text-link" id="clear-scan">Remove photo</button>' : ""}
    </section>
    <section class="confirm-card" aria-label="Product details">
      <div id="analysis-feedback" aria-live="polite">${
        state.scanBusy
          ? loading("Identifying photo…")
          : state.scanError
            ? notice(h(state.scanError), "error")
            : ready
              ? '<span class="sr-only recognition">Photo identified. Confirm the product details.</span>'
              : ""
      }</div>
      ${state.image && !state.scanBusy && !ready ? '<button class="button secondary" id="retry-identify">Retry identification</button>' : ""}
      ${ready ? form : `<details class="confirmation-details" ${state.scanError || state.manual ? "open" : ""}><summary><span class="manual-closed-label">Enter details manually</span><span class="manual-open-label">Use a photo instead</span></summary>${form}</details>`}
      ${ready ? `<details class="recognition-details"><summary>Identification notes</summary><p>${h(state.analysis.visible_characteristics)}</p><p>${h(state.analysis.uncertainty)}</p></details>` : ""}
    </section>
  </div></section>`;
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
  const product = productFor(a.category_id);
  const bangles = a.category_id === "bangles";
  const finish = product?.finishes[a.finish];
  const unit = bangles ? packLabel(Number(a.pack_count)) : "";
  const alternativePanel =
    r.status === "alternatives"
      ? `
    <div class="range-options">
      <h2>${r.field === "material" ? "Prices by possible material" : `Prices by possible ${product.finishLabel.toLowerCase()}`}</h2>
      <p class="small muted">Illustrative ranges${bangles ? ` for ${h(unit)}` : ""}. Confirm with the seller before choosing.</p>
      ${r.alternatives.map(({ label, value, result }) => `<div class="range-option"><div><strong>${h(label)}</strong><span>${money(result.low)}–${money(result.high)}</span><small>${result.matches.length} comparisons${result.synthetic ? ` · ${result.synthetic} synthetic` : ""}</small></div><button type="button" class="button secondary" data-range-choice="${h(value)}" aria-label="Use ${h(label)}">Use</button></div>`).join("")}
    </div>`
      : "";
  return `<div class="result-layout"><div class="page-heading"><a class="back-link" data-up data-scan href="${state.scanReturn || "/"}">${icon("arrow-left")}Edit details</a><div class="result-product">${state.image ? `<img src="${state.image.url}" alt="Your scanned product" width="68" height="68">` : icon("tag")}<div><h1>${h(productName(a.category_id))}</h1><p>${a.size_cm ? `${h(a.size_cm)} cm${bangles ? " inside" : " high"}` : ""}${unit ? ` · ${h(unit)}` : ""}${finish ? ` · ${h(finish)}` : ""} · ${h(a.segment)}</p></div></div></div><section class="price-panel panel${r.status === "ready" ? " price-found" : ""}">${r.status === "ready" ? `<p class="eyebrow">${icon("tag")} ${r.synthetic ? "Illustrative price range" : "Typical comparison range"}</p><p class="price-range">${money(r.low)}<span>–</span>${money(r.high)}</p><p class="range-caption">${unit ? `${h(unit)} · ` : ""}${r.matches.length} comparable observations${r.synthetic ? ` · ${r.synthetic} synthetic` : ""}</p>` : alternativePanel || `<div class="empty-result">${icon("scale-balanced")}<h2>Not enough similar observations</h2><p>${h(r.reason)}</p><a href="${state.scanReturn || "/"}" data-up data-scan class="button secondary">Review details</a></div>`}</section>${["ready", "alternatives"].includes(r.status) ? bargainingMarkup(a.segment, product?.tip) : ""}${r.status === "ready" ? `<div class="task-actions result-actions"><button class="button primary full" id="report-purchase">Bought it? Share the price</button></div>` : ""}<div class="result-disclosures"><details><summary>Compare ${r.matches.length} similar ${r.synthetic ? "demo records" : "observations"}</summary><p class="small muted">Images illustrate material and design across examples. They do not show an actual purchase or exact size.</p><div class="comparables-grid">${r.matches.map(comparable).join("") || "No matching approved records."}</div></details><details><summary>Product details & matching</summary><dl class="attribute-list"><div><dt>Material</dt><dd>${h(product?.materials[a.material] || "Unconfirmed")}</dd></div>${bangles ? `<div><dt>Quantity</dt><dd>${h(unit)}</dd></div>` : `<div><dt>Carving</dt><dd>${h(a.carving_detail || "Either")}</dd></div>`}<div><dt>Location</dt><dd>Jaipur</dd></div></dl><p>Same product, material, finish and selling setting. ${bangles ? "Inner diameter within 0.3 cm and the same number of bangles. Metal means fashion metal, not precious metal." : "Height within 2 cm or 20%, whichever is larger. Carving detail matches exactly when selected."} Records are no older than a year. Material cannot be verified from a photo.</p></details><details><summary>Sources, uncertainty & calculation</summary><p>${h(r.method || "Each range requires at least three compatible records. Different possible materials or designs are shown separately.")}</p><p>${r.excluded || 0} extreme prices excluded. Asking, observed and paid prices may differ; each listing names its type.</p><p>Synthetic records are separately modelled examples, not independent real-world transactions. Reference illustrations do not establish species, workmanship, origin or authenticity. This is a demonstration, not an appraisal or a verdict on a seller.</p><a href="/about" class="text-link">About FairFare</a></details>${r.status === "ready" ? `<details><summary>Have a seller’s quote?</summary><form id="quote-form"><label for="quoted-price">Quoted price (₹)</label><div class="input-action"><input type="number" id="quoted-price" name="quote" min="1" max="100000" step="0.01" required inputmode="decimal"><button class="button secondary">Compare quote</button></div><div id="quote-context" aria-live="polite"></div></form></details>` : ""}</div></div>`;
}
function bargainingMarkup(setting, productTip) {
  const advice = bargainingFor(setting);
  if (!advice) return "";
  const offer =
    advice.low === 0
      ? `Up to ${advice.high}%`
      : `${advice.low}–${advice.high}%`;
  return `<section class="bargaining-card" aria-labelledby="bargaining-heading">
    <div class="bargaining-head">${icon("handshake")}<div><h2 id="bargaining-heading">Bargaining in Jaipur</h2><small>${h(advice.setting)} · ${h(advice.scope)}</small></div></div>
    <p><strong>${offer} below asking</strong> ${advice.low === 0 ? "if the seller is open to offers." : "as an opening offer."}</p>
    <p class="bargaining-note">Suggested approach. Actual discounts vary.</p>
    <p class="bargaining-tip">${h(advice.tip)}</p>
    <details><summary>More bargaining tips</summary>${productTip ? `<p>${h(productTip)}</p>` : ""}<p>Choose a comfortable maximum and walk away politely if you don’t agree.</p></details>
  </section>`;
}
const receiptMoney = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});
function contributorHome() {
  const receipts = contributionReceipts();
  return `<div class="desk-layout">
    <header class="desk-intro">${icon("clipboard-check")}<h1>Your Contributions</h1><p>Found a price in Jaipur? Share it to help the next traveller compare.</p><a class="button primary full" href="/contribute/new">${icon("plus")}Add an observation</a></header>
    <section class="receipt-history" aria-labelledby="receipt-heading">
      <h2 id="receipt-heading">On this device</h2>
      ${receipts.length ? `<ul>${receipts.map((receipt) => `<li><div><strong>${h(productName(receipt.category))}</strong><small>${receipt.kind === "purchase" ? "Bought it?" : "Observation"} · ${h(date(receipt.observed))}</small><small>Ref ${h(receipt.reference)} · Submitted for review</small></div><strong>${receiptMoney.format(receipt.price)}</strong></li>`).join("")}</ul><details><summary>Manage history</summary><p>Clearing the list removes the copies saved in this browser. Your submitted reports remain with FairFare.</p><button type="button" class="button secondary" data-dialog="clear-history">Clear device history</button></details>` : '<p class="receipt-empty">Any new purchase or observation you submit from this browser will appear here.</p>'}
    </section>
    <details><summary>What to prepare</summary><p>Bring a clear photo, the item details, the price, the date and the Jaipur locality. Remove personal details from any evidence.</p></details>
  </div>`;
}
function confirmation() {
  return `<section class="confirmation panel">${devMock ? notice("Development mock · nothing was submitted or stored.") : ""}<div class="success-mark">${icon("check")}</div><p class="eyebrow">Pending review</p><h1>Thanks. We’ve got it.</h1><p>Your observation will be checked before it can become a reference.</p><div class="receipt-note"><span>Submission reference</span><strong>${h(state.submission.id.slice(0, 8))}</strong></div><a href="/contribute" class="button primary full">Your Contributions</a><a href="/" class="button secondary full">Back to home</a></section>`;
}
function empty(title, text, url, label) {
  return `<section class="empty-page"><span class="large-icon">${icon("compass")}</span><h1>${title}</h1><p>${text}</p><a class="button primary" href="${url}">${label}</a></section>`;
}
function navigate(path) {
  if (location.pathname + location.search === path) return;
  history.pushState({ parent: location.pathname }, "", path);
  render();
}
function goUp(path, scan = false) {
  focusScan = scan && path === "/";
  if (history.state?.parent === path) history.back();
  else {
    history.replaceState({}, "", path);
    render();
  }
}
function render() {
  controller.abort();
  controller = new AbortController();
  const signal = controller.signal,
    path = location.pathname.replace(/\/$/, "") || "/";
  const returningToScan =
    path === "/" && (focusScan || app.dataset.screen === "/compare");
  focusScan = false;
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
  app.dataset.screen = path;
  app.classList.toggle(
    "focused-task",
    path === "/scan" ||
      path === "/compare" ||
      path === "/contribute/new" ||
      path === "/report" ||
      path === "/submitted",
  );
  app.innerHTML = shell(
    (
      pages[path] ||
      (Object.hasOwn(infoRoutes, path) ? () => infoPage(path) : null) ||
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
      "/taxis": "Taxi fares",
      "/autos": "Auto fares",
      "/monuments": "Monuments",
      "/contribute": "Your Contributions",
      "/contribute/new": "Add an observation",
      "/report": "Share a purchase",
      "/submitted": "Pending review",
    }[path] ||
      (Object.hasOwn(infoRoutes, path)
        ? policies[infoRoutes[path][0]][0]
        : "Page not found")) + " | FairFare";
  window.scrollTo(0, 0);
  document.querySelector("#main").focus({ preventScroll: true });
  bindShell();
  const campaign = app.querySelector("[data-campaign]");
  if (campaign) bindCampaign(campaign, signal);
  bindReferenceImages(app);
  if (path === "/" || path === "/scan") bindScan(signal);
  if (path === "/install") bindInstall();
  if (path === "/compare") bindComparison();
  if (path === "/taxis") bindTaxi(app);
  if (path === "/autos") bindAutos(app);
  if (path === "/monuments") bindMonuments(app, signal);
  if (path === "/contribute/new" || (path === "/report" && state.result))
    flow.bind(path === "/report", signal);
  document.querySelector("#announcer").textContent = document.title;
  if (returningToScan) revealScan();
}
function revealScan() {
  const title = document.querySelector("#scan-title");
  title.setAttribute("tabindex", "-1");
  title.focus({ preventScroll: true });
  document.querySelector("#scan").scrollIntoView({ block: "start" });
}
function renderScan() {
  focusScan = location.pathname === "/";
  render();
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
  const menu = document.querySelector("#mobile-menu");
  app.querySelectorAll("[data-menu-toggle]").forEach((button) => {
    button.onclick = () => {
      const opening = menu.hidden;
      setMore(opening);
      if (opening)
        (menu.querySelector("[aria-current]") || menu.querySelector("a")).focus(
          { preventScroll: true },
        );
    };
  });
  app.onpointerdown = (event) => {
    if (
      !menu.hidden &&
      !event.target.closest("#mobile-menu, [data-menu-toggle]")
    )
      setMore(false);
  };
  document.querySelector("#close-dialog").onclick = () =>
    document.querySelector("#info-dialog").close();
  app
    .querySelectorAll("[data-dialog]")
    .forEach((b) => (b.onclick = () => showInfo(b.dataset.dialog)));
}

function setMore(open) {
  document.querySelector("#mobile-menu").hidden = !open;
  app
    .querySelectorAll("[data-menu-toggle]")
    .forEach((button) => button.setAttribute("aria-expanded", String(open)));
}

function bindInstall() {
  const button = document.querySelector("#install-now");
  if (!button || !installPrompt) return;
  button.hidden = false;
  button.onclick = async () => {
    const prompt = installPrompt;
    installPrompt = null;
    button.disabled = true;
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      // Keep the manual steps available when the native prompt is withdrawn.
    } finally {
      button.hidden = true;
    }
  };
}

function showInfo(type) {
  const [title, content] = policies[type] || policies.pilot;
  const body = document.querySelector("#dialog-body");
  const dialog = document.querySelector("#info-dialog");
  dialog.classList.toggle("tips-dialog", type === "ready");
  document.querySelector("#dialog-title").textContent = title;
  body.innerHTML = type === "ready" ? deckMarkup() : content;
  if (type === "ready") {
    const deck = body.querySelector("[data-deck]");
    bindDeck(deck);
    deck.addEventListener(
      "readycomplete",
      () => {
        state.travelReady = true;
        const trigger = app.querySelector(".ready-launch");
        trigger.classList.add("is-ready");
        trigger.querySelector(".ready-copy").innerHTML = readyCopy();
        document.querySelector("#announcer").textContent =
          "You’re ready for Jaipur. Enjoy the trip!";
      },
      { once: true },
    );
  }
  if (type === "clear-history") {
    body.querySelector("#clear-device-history").onclick = () => {
      if (clearContributionReceipts()) {
        dialog.close();
        render();
      } else
        body.querySelector("[role=status]").textContent =
          "This browser blocked access to saved history.";
    };
  }
  dialog.showModal();
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
  renderScan();
  const signal = controller.signal;
  try {
    const a = await identifyPhoto(image, signal);
    if (signal.aborted || version !== scanVersion) return;
    state.analysis = a;
    state.attributes = {
      ...state.attributes,
      ...a,
      material: a.material || "unknown",
      finish: a.finish || "unknown",
      carving_detail: "unknown",
    };
  } catch (e) {
    if (signal.aborted || version !== scanVersion) return;
    state.scanError = e.message;
  } finally {
    if (version === scanVersion) {
      state.scanBusy = false;
      if (!signal.aborted) renderScan();
    }
  }
}
function bindScan(signal) {
  const form = document.querySelector("#attributes-form");
  const category = state.attributes.category_id;
  form.onchange = (event) => {
    if (event.target.name !== "category_id" || event.target.value === category)
      return;
    state.attributes = changeProduct(readAttributes(form), category);
    state.analysis = null;
    state.manual = true;
    renderScan();
  };
  form.oninput = () => {
    state.attributes = readAttributes(form);
  };
  const manual = document.querySelector(".confirmation-details");
  if (manual)
    manual.ontoggle = () => {
      state.manual = manual.open;
      if (!state.image)
        document.querySelector("#scan-title").textContent = manual.open
          ? "Product details"
          : "Scan a product";
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
      state.manual = false;
      state.attributes = defaults();
      renderScan();
    };
  const retry = document.querySelector("#retry-identify");
  if (retry) retry.onclick = analyse;
  form.onsubmit = async (e) => {
    e.preventDefault();
    state.attributes = readAttributes(form);
    const button = form.querySelector('button[type="submit"]'),
      target = document.querySelector("#comparison-feedback");
    const attrs = state.attributes;
    const product = productFor(attrs.category_id);
    if (product && attrs.material === "unknown" && attrs.finish === "unknown") {
      target.innerHTML = notice(
        `Choose the ${product.finishLabel.toLowerCase()} or edit the material to see prices.`,
        "error",
      );
      target.scrollIntoView({ block: "nearest" });
      return;
    }
    state.result = null;
    button.disabled = true;
    target.innerHTML = loading("Finding similar products…");
    try {
      const rows = product ? await getObservations(signal, attrs) : [];
      if (signal.aborted) return;
      state.result = compareObservations(state.attributes, rows);
      state.scanReturn = location.pathname === "/scan" ? "/scan" : "/";
      navigate("/compare");
    } catch (e) {
      if (!signal.aborted) {
        target.innerHTML = notice(h(e.message), "error");
        button.disabled = false;
        target.scrollIntoView({ block: "nearest" });
      }
    }
  };
}
function bindComparison() {
  for (const button of document.querySelectorAll("[data-range-choice]")) {
    button.onclick = () => {
      const { field, alternatives } = state.result;
      const choice = alternatives.find(
        (x) => x.value === button.dataset.rangeChoice,
      );
      if (!choice) return;
      state.attributes[field] = choice.value;
      state.result = choice.result;
      render();
    };
  }
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
    if (
      a.hasAttribute("data-up") ||
      ((location.pathname === "/report" ||
        location.pathname === "/contribute/new") &&
        a.classList.contains("back-link"))
    )
      goUp(u.pathname, a.hasAttribute("data-scan"));
    else navigate(u.pathname + u.search);
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
    const menu = document.querySelector("#mobile-menu");
    if (menu && !menu.hidden) {
      e.preventDefault();
      setMore(false);
      document
        .querySelector(
          matchMedia("(max-width: 760px)").matches
            ? ".mobile-more"
            : ".desktop-more",
        )
        .focus();
    }
  }
});
window.addEventListener("popstate", render);
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  bindInstall();
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
if (window.visualViewport) {
  const updateKeyboardInset = () => {
    const viewport = window.visualViewport;
    const inset =
      viewport.scale === 1
        ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        : 0;
    document.documentElement.style.setProperty(
      "--keyboard-inset",
      `${inset}px`,
    );
  };
  window.visualViewport.addEventListener("resize", updateKeyboardInset);
  window.visualViewport.addEventListener("scroll", updateKeyboardInset);
  updateKeyboardInset();
}
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("/sw.js").catch(() => {});
render();
finishLaunch();
for (const stylesheet of document.querySelectorAll("[data-screen-style]"))
  stylesheet.media = "all";

function finishLaunch() {
  const splash = document.querySelector("#launch-splash");
  if (!splash) return;
  const mark = splash.querySelector(".launch-mark");
  const style = getComputedStyle(splash);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    splash.hidden = true;
    return;
  }
  const logoMotion = mark
    .getAnimations?.()
    .find((motion) => motion.animationName === "launch-mark");
  const dismiss = () => {
    if (splash.hidden || splash.classList.contains("launch-exit")) return;
    splash.classList.add("launch-exit");
    const exit = splash
      .getAnimations?.()
      .find((motion) => motion.animationName === "launch-exit");
    if (exit)
      void exit.finished
        .catch(() => {})
        .then(() => {
          splash.hidden = true;
        });
    else splash.hidden = true;
  };
  if (logoMotion) void logoMotion.finished.catch(() => {}).then(dismiss);
  else dismiss();
}
