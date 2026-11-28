import {
  icon,
  escapeHTML as h,
  money,
  date,
  notice,
  loading,
  disclosure,
  attributesForm,
  readAttributes,
} from "./ui.js";
import { compressImage, discardImage } from "./images.js";
import { identify, getObservations } from "./api.js";
import { compareObservations } from "./matching.js";
import { sellerQuoteMarkup, bindSellerQuote } from "./quote.js";
import {
  faresPage,
  bindFares,
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
  sellingPlaces,
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
  ["/fares", "taxi", "Ride fares", "Rides"],
  ["/monuments", "landmark", "Tickets"],
  ["/contribute", "clipboard-list", "Share a price", "Share"],
];
const scanRoutes = new Set(["/", "/scan", "/compare", "/report"]);
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
  return `<button type="button" class="${mobile ? "mobile-more" : "icon-button desktop-more"}" data-menu-toggle aria-controls="mobile-menu" aria-expanded="false" ${current ? 'aria-current="location"' : ""} aria-label="More pages">${icon("ellipsis")}${mobile ? "<span>More</span>" : ""}</button>`;
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
    <div class="header-tools"><button type="button" class="city-trigger" data-dialog="city" aria-haspopup="dialog">${icon("location-dot")}<span><strong>Jaipur</strong><small>Change city</small></span></button><button class="icon-button" id="theme-toggle" aria-label="Switch between light and dark mode" aria-pressed="${document.documentElement.dataset.theme === "dark"}">${icon(document.documentElement.dataset.theme === "dark" ? "sun" : "moon")}</button>${moreButton(false, more)}</div>
  </div></header>
  <main id="main" class="main-content ${path === "/" ? "home-content" : ""}" tabindex="-1">${content}</main>
  ${path === "/" ? '<footer class="site-footer"><span>If you use a photo, FairFare sends a copy to its photo service.</span><a href="/privacy">Privacy Policy</a></footer>' : ""}
  <nav class="bottom-nav" aria-label="Mobile main navigation">${nav.map(([url, i, label, shortLabel]) => `<a href="${url}" ${url === active ? 'aria-current="page"' : ""}${shortLabel ? ` aria-label="${label}"` : ""}>${icon(i)}<span>${shortLabel || label}</span></a>`).join("")}${moreButton(true, more)}</nav>
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
    <h1 class="sr-only">Check prices in Jaipur with FairFare</h1>
    ${campaignMarkup()}
    <section class="home-tools" aria-label="Souvenir price check and Jaipur travel tips">
      ${scan(true)}
      <button type="button" class="ready-launch ${state.travelReady ? "is-ready" : ""}" data-dialog="ready" aria-haspopup="dialog">
        <span class="ready-copy">${readyCopy()}</span>
        ${icon("map-location-dot")}
      </button>
    </section>
    <section class="home-intro" aria-labelledby="home-title">
      <h2 id="home-title">Check prices before you pay</h2>
      <p>Check what you might pay for a souvenir, a ride or a monument ticket in Jaipur. You can also share a price you saw.</p>
      <div class="intro-links"><a href="/fares">${icon("taxi")} Check ride fares</a><a href="/monuments">${icon("ticket")} Check entry fees</a></div>
    </section>
  </div>`;
}
function readyCopy() {
  return state.travelReady
    ? `<span class="ready-symbol">${icon("check")}</span><strong>You’ve read the Jaipur travel tips</strong><small>Read the tips again</small>`
    : `<strong>Tips for your Jaipur trip</strong><small>Read the travel tips ${icon("arrow-right")}</small>`;
}
function cityChoices() {
  return `<p>Jaipur is the only city available in this demo.</p>
    <ul class="city-list"><li class="city-current">${icon("location-dot")}<strong>Jaipur</strong><span>${icon("check")} Selected</span></li>
    ${["Delhi", "Mumbai", "Bengaluru", "Udaipur"].map((city) => `<li><button type="button" class="city-unavailable" disabled><strong>${city}</strong><span>${icon("lock")} Unavailable in this demo</span></button></li>`).join("")}</ul>`;
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
      ? "Enter your item’s details"
      : "Compare a souvenir price";
  const photoActions = `<div class="photo-actions">
    ${state.image ? `<button class="button secondary" id="take-photo">${icon("camera")}Take another photo</button>` : ""}
    <button class="button secondary" id="choose-photo">${icon("image")}${state.image ? "Choose a different photo" : "Choose a photo"}</button>
  </div>`;
  const form = `<form id="attributes-form">
    ${attributesForm(state.attributes, "", { detected: ready })}
    <div id="comparison-feedback" aria-live="polite"></div>
    <div class="task-actions"><button class="button primary full" type="submit" ${state.scanBusy ? "disabled" : ""}>Compare prices</button></div>
  </form>`;
  return `<section id="scan" class="${embedded ? "home-scan" : "scan-page"}" aria-labelledby="scan-title"><div class="page-heading scan-heading">
    ${
      embedded
        ? `<h2 id="scan-title">${h(title)}</h2><p>Take a photo or enter the item’s details to compare example prices for wooden elephants and bangles.</p>`
        : `
    <a class="back-link" data-up href="/">${icon("arrow-left")}Home</a>
    <h1 id="scan-title">${h(title)}</h1>`
    }
  </div>
  ${devMock ? notice("Photo identification uses test data on this page.") : ""}
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
          ? loading("Checking what is in your photo…")
          : state.scanError
            ? notice(h(state.scanError), "error")
            : ready
              ? '<span class="sr-only recognition">FairFare checked your photo. Review the suggested details and measure the item before you compare prices.</span>'
              : ""
      }</div>
      ${state.image && !state.scanBusy && !ready ? '<button class="button secondary" id="retry-identify">Check the photo again</button>' : ""}
      ${ready ? form : `<details class="confirmation-details" ${state.scanError || state.manual ? "open" : ""}>${disclosure("Enter details without a photo")}${form}</details>`}
      ${ready ? `<details class="recognition-details">${disclosure("What you still need to check")}<p>Check the suggested item type and design against the item you have.</p><p>Measure the item yourself. Ask the seller what it is made of and where it was made. A photo alone cannot confirm those details or tell you whether the item is genuine.</p></details>` : ""}
    </section>
  </div></section>`;
}
function comparison() {
  const r = state.result,
    a = state.attributes;
  if (!r)
    return empty(
      "Start with the item you want to compare",
      "Take a photo of a wooden elephant or bangles, or enter the item’s details yourself.",
      "/scan",
      "Compare a souvenir price",
    );
  const product = productFor(a.category_id);
  const bangles = a.category_id === "bangles";
  const finish = product?.finishes[a.finish];
  const unit = bangles ? packLabel(Number(a.pack_count)) : "";
  const alternativePanel =
    r.status === "alternatives"
      ? `
    <div class="range-options">
      <h2>${r.field === "material" ? "Price ranges by material" : `Price ranges by design`}</h2>
      <p class="small muted">These are example prices${bangles ? ` for ${h(unit)}` : ""}. Ask the seller to confirm the ${r.field === "material" ? "material" : "design"}, then choose the option that matches your item to compare the seller’s price.</p>
      ${r.alternatives.map(({ label, value, result }) => `<div class="range-option"><div><strong>${h(label)}</strong><span>${money(result.low)}–${money(result.high)}</span><small>${result.matches.length} prices compared${result.synthetic ? `. FairFare made up ${result.synthetic} of these prices for this demo.` : "."}</small></div><button type="button" class="button secondary" data-range-choice="${h(value)}" aria-label="Use ${h(label)}">Use these details</button></div>`).join("")}
    </div>`
      : "";
  return `<div class="result-layout"><div class="page-heading"><a class="back-link" data-up data-scan href="${state.scanReturn || "/"}">${icon("arrow-left")}Edit item details</a><div class="result-product">${state.image ? `<img src="${state.image.url}" alt="Your scanned product" width="68" height="68">` : icon("tag")}<div><h1>${h(productName(a.category_id))}</h1><p>${a.size_cm ? `${h(a.size_cm)} cm${bangles ? " inside" : " high"}` : ""}${unit ? ` · ${h(unit)}` : ""}${finish ? ` · ${h(finish)}` : ""} · ${h(sellingPlaces[a.segment] || a.segment)}</p></div></div></div><section class="price-panel panel${r.status === "ready" ? " price-found" : ""}">${r.status === "ready" ? `<p class="eyebrow">${icon("tag")} ${r.synthetic ? "Example price range" : "Price range for similar items"}</p><p class="price-range">${money(r.low)}<span>–</span>${money(r.high)}</p><p class="range-caption">${unit ? `${h(unit)} · ` : ""}${r.matches.length} prices compared${r.synthetic ? `. FairFare made up ${r.synthetic} of these prices for this demo.` : "."}</p>` : alternativePanel || `<div class="empty-result">${icon("scale-balanced")}<h2>We couldn’t find enough similar prices</h2><p>${h(r.reason)}</p><a href="${state.scanReturn || "/"}" data-up data-scan class="button secondary">Review details</a></div>`}</section>${r.status === "ready" ? sellerQuoteMarkup() : ""}${["ready", "alternatives"].includes(r.status) ? bargainingMarkup(a.segment, product?.tip) : ""}${r.status === "ready" ? `<div class="task-actions result-actions"><button class="button secondary full" id="report-purchase">Share the price you paid</button></div>` : ""}<div class="result-disclosures"><details>${disclosure(`See the similar prices we found`)}<p class="small muted">The photos and illustrations show what these kinds of items look like. The items that the prices came from may look different.</p><div class="comparables-grid">${r.matches.map(comparable).join("") || "FairFare found no prices for items with these details."}</div></details><details>${disclosure("See how we matched your item")}<dl class="attribute-list"><div><dt>Material</dt><dd>${h(product?.materials[a.material] || "Unconfirmed")}</dd></div>${bangles ? `<div><dt>Quantity</dt><dd>${h(unit)}</dd></div>` : `<div><dt>Carving</dt><dd>${h(a.carving_detail === "unknown" || !a.carving_detail ? "Not sure" : a.carving_detail === "simple" ? "Simple carving" : "Detailed carving")}</dd></div>`}<div><dt>Location</dt><dd>Jaipur</dd></div></dl><p>We compare the same type of item, material, design and kind of shop or stall. ${bangles ? "We look for the same number of bangles and allow a difference of up to 0.3 cm across the opening." : "We compare elephants close to your item’s height. We allow a difference of 2 cm, or 20% of the height if that is more than 2 cm. If you chose a carving style, we only use prices for that style."} We use prices from the past year. Ask the seller to confirm what the item is made of.</p></details><details>${disclosure("See where the prices come from")}<p>${h(r.method || "We need at least three prices for similar items to show a range. We show a separate range for each possible material or design.")}</p><p>${r.excluded ? `We left out ${r.excluded} unusually high or low prices. ` : ""}Each price shows whether a seller asked for that amount, a tag displayed it or a buyer paid it.</p><p>${r.synthetic ? "Some prices are made up for this demo. " : ""}Before you decide what to pay, check the item for damage and ask the seller what it is made of and where it was made.</p><a href="/about" class="text-link">About FairFare</a></details></div></div>`;
}
function bargainingMarkup(setting, productTip) {
  const advice = bargainingFor(setting);
  if (!advice) return "";
  const offer =
    advice.low === 0
      ? `Up to ${advice.high}%`
      : `${advice.low}–${advice.high}%`;
  return `<section class="bargaining-card" aria-labelledby="bargaining-heading">
    <div class="bargaining-head">${icon("handshake")}<div><h2 id="bargaining-heading">Bargaining in Jaipur</h2><small>${h(sellingPlaces[setting])}</small></div></div>
    <p><strong>${offer} below the price the seller asks for</strong> ${advice.low === 0 ? "if the seller is open to offers." : "as your first offer."}</p>
    <p class="bargaining-note">The seller can accept your offer or suggest a different price.</p>
    <p class="bargaining-tip">${h(advice.tip)}</p>
    <details>${disclosure("See how to decide what to offer")}${productTip ? `<p>${h(productTip)}</p>` : ""}<p>Decide how much you are willing to pay. If you cannot agree on a price, you can leave without buying.</p></details>
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
    <header class="desk-intro">${icon("clipboard-check")}<h1>Share a price from Jaipur</h1><p>Tell FairFare what you paid, what a seller asked you to pay or what you saw on a price tag. FairFare checks each report before using it in price comparisons.</p><a class="button primary full" href="/contribute/new">${icon("plus")}Share a price you saw</a></header>
    <section class="receipt-history" aria-labelledby="receipt-heading">
      <h2 id="receipt-heading">Reports saved on this device</h2>
      ${receipts.length ? `<ul>${receipts.map((receipt) => `<li><div><strong>${h(productName(receipt.category))}</strong><small>${receipt.kind === "purchase" ? "Price you paid" : "Price you saw"} · ${h(date(receipt.observed))}</small><small>Reference ${h(receipt.reference)} · Submitted for review</small></div><strong>${receiptMoney.format(receipt.price)}</strong></li>`).join("")}</ul><details>${disclosure("Manage your saved reports")}<p>This clears the saved list in this browser. FairFare keeps the reports you already sent.</p><button type="button" class="button secondary" data-dialog="clear-history">Clear saved reports</button></details>` : '<p class="receipt-empty">Reports you send from this browser will appear here.</p>'}
    </section>
    <details>${disclosure("See what you need to share a price")}<p>Have a clear photo of the item and its size in centimetres ready. You’ll also need the price, the date and the name of the area or market in Jaipur. Crop out faces, names and payment details before you upload a photo.</p></details>
  </div>`;
}
function confirmation() {
  return `<section class="confirmation panel">${devMock ? notice("This was a test. FairFare did not send or save the report.") : ""}<div class="success-mark">${icon("check")}</div><h1>We received your price report</h1><p>FairFare will check your report before it can be used in price comparisons.</p><div class="receipt-note"><span>Submission reference</span><strong>${h(state.submission.id.slice(0, 8))}</strong></div><a href="/contribute" class="button primary full">See your saved reports</a><a href="/" class="button secondary full">Back to home</a></section>`;
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
  const signal = controller.signal;
  let path = location.pathname.replace(/\/$/, "") || "/";
  if (path === "/taxis" || path === "/autos") {
    const url = new URL(location.href);
    url.pathname = "/fares";
    if (path === "/autos") url.searchParams.set("type", "auto");
    else url.searchParams.delete("type");
    history.replaceState(history.state, "", url);
    path = url.pathname;
  }
  const rideKind = new URLSearchParams(location.search).get("type") === "auto" ? "auto" : "taxi";
  if (scanRoutes.has(app.dataset.screen) && !scanRoutes.has(path)) resetScan();
  const returningToScan =
    path === "/" && (focusScan || app.dataset.screen === "/compare");
  focusScan = false;
  const pages = {
    "/": home,
    "/scan": scan,
    "/compare": comparison,
    "/fares": () => faresPage(rideKind),
    "/monuments": monumentsPage,
    "/contribute": contributorHome,
    "/contribute/new": () => flow.page(false),
    "/report": () => (state.result ? flow.page(true) : comparison()),
    "/submitted": () =>
      state.submission
        ? confirmation()
        : empty(
            "There is no price report to show",
            "Send a price report to get a confirmation. You can see reports from this browser on the Share page.",
            "/contribute",
            "Go to the Share page",
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
          "We couldn’t find this page",
          "Go to the home page to check prices or read travel tips.",
          "/",
          "Back to FairFare",
        ))
    )(),
    path,
  );
  document.title =
    ({
      "/": "Check prices in Jaipur",
      "/scan": "Compare a souvenir price",
      "/compare": "Your price comparison",
      "/fares": rideKind === "auto" ? "Fares for autos and taxis hired directly" : "Ride fares for app bookings",
      "/monuments": "Monument tickets",
      "/contribute": "Share a price",
      "/contribute/new": "Share a price you saw",
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
  if (path === "/compare") bindComparison(signal);
  if (path === "/fares") bindFares(app, rideKind);
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
  const [title, content] = type === "city"
    ? ["Choose a city", cityChoices()]
    : policies[type] || policies.pilot;
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
          "You’ve read all the Jaipur travel tips.";
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
          "FairFare couldn’t clear the saved reports because this browser blocked access.";
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
    : identify(image.data, signal).catch((error) => {
        throw new Error(
          error.status === 429
            ? "FairFare is handling too many photo requests. Wait a moment before trying again, or enter the item’s details yourself."
            : "FairFare couldn’t check this photo. Try another photo or enter the item’s details yourself.",
        );
      });
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
          ? "Enter your item’s details"
          : "Compare a souvenir price";
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
      target.innerHTML = loading("Getting your photo ready…");
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
      resetScan();
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
        `Choose a design or open “${state.analysis ? "Check or change the item details" : "Add material details"}” to choose what the item is made of.`,
        "error",
      );
      target.scrollIntoView({ block: "nearest" });
      return;
    }
    state.result = null;
    button.disabled = true;
    target.innerHTML = loading("Looking for prices for similar items…");
    try {
      const rows = product ? await getObservations(signal, attrs) : [];
      if (signal.aborted) return;
      state.result = compareObservations(state.attributes, rows);
      state.scanReturn = location.pathname === "/scan" ? "/scan" : "/";
      navigate("/compare");
    } catch {
      if (!signal.aborted) {
        target.innerHTML = notice(
          "FairFare couldn’t load prices for similar items. Check your internet connection and select Compare prices again.",
          "error",
        );
        button.disabled = false;
        target.scrollIntoView({ block: "nearest" });
      }
    }
  };
}
function resetScan() {
  scanVersion++;
  discardImage(state.image);
  Object.assign(state, {
    image: null,
    analysis: null,
    result: null,
    scanBusy: false,
    scanError: "",
    manual: false,
    attributes: defaults(),
  });
}
function bindComparison(signal) {
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
  bindSellerQuote(app, state.result, state.attributes, signal);
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
  resetScan();
  flow.clear();
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted) render();
});
window.addEventListener("offline", () => {
  document.querySelector("#announcer").textContent =
    "You are offline. Connect to the internet to check a photo or share a price.";
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
  if (
    (matchMedia("(display-mode: standalone)").matches ||
      navigator.standalone) &&
    startLaunchHandoff(splash, mark)
  )
    return;
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

function startLaunchHandoff(splash, mark) {
  const headerMark = document.querySelector(".brand img");
  const destination = headerMark?.getBoundingClientRect();
  if (!destination?.width || !mark.animate) return false;

  splash.classList.add("launch-handoff");
  const origin = mark.getBoundingClientRect();
  headerMark.setAttribute("data-launch-target", "");
  const timing = {
    duration: 320,
    easing: "cubic-bezier(.24,.78,.24,1)",
    fill: "both",
  };
  const flight = mark.animate(
    [
      { transform: "none" },
      {
        transform: `translate3d(${destination.left - origin.left}px,${destination.top - origin.top}px,0) scale(${destination.width / origin.width})`,
      },
    ],
    { ...timing, id: "fairfare-launch-handoff" },
  );
  const curtain = splash
    .querySelector(".launch-colours")
    .animate([{ opacity: 1 }, { opacity: 0 }], timing);
  void flight.finished
    .catch(() => {})
    .then(() => {
      headerMark.removeAttribute("data-launch-target");
      splash.hidden = true;
      flight.cancel();
      curtain.cancel();
    });
  return true;
}
