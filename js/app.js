import {
  icon,
  escapeHTML as h,
  money,
  date,
  today,
  notice,
  loading,
  attributesForm,
  readAttributes,
  field,
  options,
} from "./ui.js";
import { compressImage, discardImage } from "./images.js";
import { identify, getObservations, submitObservation } from "./api.js";
import { compareObservations } from "./matching.js";
import {
  taxiPage,
  bindTaxi,
  autosPage,
  bindAutos,
  monumentsPage,
  bindMonuments,
} from "./guidance.js";

const app = document.querySelector("#app");
const state = {
  image: null,
  attributes: {
    category_id: "wooden_elephant",
    material: "unknown",
    finish: "plain",
    segment: "shop",
  },
  analysis: null,
  result: null,
  submission: null,
  contributorImage: null,
  evidence: null,
};
const devMock =
  ["localhost", "127.0.0.1"].includes(location.hostname) &&
  new URLSearchParams(location.search).get("mock") === "1";
let controller = new AbortController(),
  installPrompt = null;
const restored = new URLSearchParams(location.search).get("__route");
if (restored && restored.startsWith("/") && !restored.startsWith("//"))
  history.replaceState({}, "", restored);
try {
  document.documentElement.dataset.theme =
    localStorage.getItem("fairfare-theme") || "light";
} catch {
  document.documentElement.dataset.theme = "light";
}

const touristNav = [
  ["/", "house", "Home"],
  ["/scan", "camera", "Scan"],
  ["/taxis", "taxi", "App taxis"],
  ["/autos", "car-side", "Autos"],
  ["/monuments", "landmark", "Visits"],
];
const link = (url, label, cls = "") =>
  `<a href="${url}" class="${cls}">${label}</a>`;
function shell(content, path) {
  const contributor = path.startsWith("/contribute");
  const nav = contributor
    ? [
        ["/contribute", "clipboard-list", "Contributor desk"],
        ["/contribute/new", "plus", "Add observation"],
      ]
    : touristNav;
  return `<header class="site-header"><div class="header-inner"><a href="${contributor ? "/contribute" : "/"}" class="brand" aria-label="FairFare ${contributor ? "contributor desk" : "home"}"><img src="/assets/brand-mark.png" alt="" width="46" height="46"><span>FairFare${contributor ? "<small>Contributor desk</small>" : ""}</span></a><nav class="desktop-nav" aria-label="${contributor ? "Contributor" : "Main"} navigation">${nav.map(([url, i, label]) => `<a href="${url}" ${url === path ? 'aria-current="page"' : ""}>${label}</a>`).join("")}</nav><div class="header-tools">${contributor ? link("/", "Tourist app", "quiet-link") : link("/contribute", `${icon("hand-holding-heart")}<span>Contribute</span>`, "quiet-link")}<button class="icon-button" id="theme-toggle" aria-label="Switch colour theme">${icon(document.documentElement.dataset.theme === "dark" ? "sun" : "moon")}</button><button class="icon-button mobile-menu-button" id="menu-toggle" aria-label="Open navigation menu" aria-expanded="false">${icon("bars")}</button></div></div><nav id="mobile-menu" class="mobile-menu" aria-label="More navigation" hidden>${nav.map(([url, i, label]) => link(url, icon(i) + label)).join("")}${link(contributor ? "/" : "/contribute", contributor ? "Tourist app" : "Contributor desk")}<button id="install-mobile" class="quiet-link">${icon("download")}Install FairFare</button></nav></header>
 <div class="location-bar"><div><span>${icon("location-dot")} Jaipur, Rajasthan</span><span>${contributor ? "Local knowledge, carefully collected." : "A little local knowledge."}</span><button class="pilot-link" data-dialog="pilot">Pilot ${icon("circle-info")}</button></div></div>
 <main id="main" class="main-content ${contributor ? "contributor-content" : ""}" tabindex="-1">${content}</main>
 <footer class="site-footer"><a href="/" class="footer-brand">FairFare<span>Know a little more. Enjoy Jaipur.</span></a><div class="footer-links"><button data-dialog="privacy">Privacy</button><button data-dialog="pilot">About this pilot</button><button id="install-button">${icon("download")} Install app</button></div><p>Jaipur demonstration pilot. Illustrative data, always labelled.</p></footer>
 ${!contributor ? `<nav class="bottom-nav" aria-label="Mobile main navigation">${touristNav.map(([url, i, label]) => `<a href="${url}" ${url === path ? 'aria-current="page"' : ""}>${icon(i)}<span>${label}</span></a>`).join("")}</nav>` : ""}
 <dialog id="info-dialog" class="dialog"><div class="dialog-top"><h2 id="dialog-title"></h2><button class="icon-button" id="close-dialog" aria-label="Close dialog">${icon("xmark")}</button></div><div id="dialog-body"></div></dialog>`;
}
function home() {
  return `<div class="home-heading"><div><h1>Bring home a story.<br>Know the price.</h1><p>A little price context for the things you find<br class="desktop-break"> and the journeys you take in Jaipur.</p></div><div class="city-stamp">${icon("location-dot")}<span>Your local companion<strong>Jaipur, India</strong></span></div></div>
<section class="scan-home panel"><div class="scan-home-copy"><span class="context-label">Handicrafts, with context</span><h2>Found something<br> you love?</h2><p>Photograph a wooden elephant, confirm a few details, and compare similar local observations.</p>${link("/scan", icon("camera") + "Scan a Product", "button primary")}<span class="privacy-note">${icon("shield-halved")}Your scan photo stays temporary.</span></div><div class="scan-home-visual"><div class="tag-motif"><img src="/assets/brand-mark.png" width="120" height="120" alt="FairFare price-tag logo"></div><div class="visual-caption"><strong>A fairer starting point.</strong><p>Same material. Similar size.<br>Evidence you can see.</p></div><span class="pilot-note">Wooden elephant pilot</span></div></section>
<div class="home-section-title"><h2>Around the Pink City</h2><span class="muted">A little preparation goes a long way.</span></div><section class="travel-links" aria-label="Jaipur travel guidance">${[
    [
      "/taxis",
      "taxi",
      "App-booked taxis",
      "Make sense of the fare in your app.",
    ],
    [
      "/autos",
      "car-side",
      "Autos & local taxis",
      "Agree the journey before the price.",
    ],
    [
      "/monuments",
      "landmark",
      "Monuments & guides",
      "Check tickets, categories and extras.",
    ],
  ]
    .map(
      ([url, i, title, text]) =>
        `<a class="travel-link" href="${url}"><div class="travel-link-head">${icon(i)}${icon("chevron-right")}</div><h3>${title}</h3><p>${text}</p></a>`,
    )
    .join("")}</section>
<div class="home-bottom"><div class="pilot-disclosure">${icon("circle-info")}<p><strong>A small pilot, an honest start.</strong> Price ranges currently use labelled synthetic observations. They are illustrative, not verified market prices.</p><button class="text-link" data-dialog="pilot">What’s included</button></div><div class="contribute-invite"><div><h3>Know Jaipur’s markets?</h3><p>Help build better local price references.</p></div>${link("/contribute", "Contribute a price " + icon("chevron-right"), "text-link")}</div></div>`;
}
function scan() {
  return `<div class="page-heading"><a class="back-link" href="/">${icon("arrow-left")} Back to Jaipur</a><h1>Let’s take a closer look.</h1><p>A photo is the beginning. You confirm the details that matter.</p></div>${devMock ? notice("Development mock enabled. Identification is a labelled test fixture; no AI request is made.") : ""}<div class="work-grid scan-grid"><section class="panel photo-panel"><div class="section-heading"><h2>Your find</h2><button class="text-link" id="clear-scan" ${state.image ? "" : "hidden"}>Clear photo</button></div><div id="photo-area">${photoPreview(state.image)}</div><div class="photo-actions"><button class="button primary" id="take-photo">${icon("camera")}Take a photo</button><button class="button secondary" id="choose-photo">${icon("image")}Choose a photo</button></div><input id="camera-input" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" tabindex="-1"><input id="gallery-input" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" tabindex="-1"><p class="small muted">JPEG, PNG or WebP, up to 20 MB. We resize it before analysis.</p><div id="photo-feedback" aria-live="polite"></div><div class="photo-privacy">${icon("shield-halved")}<p>FairFare does not save ordinary scans. A compressed copy is sent to the AI provider for identification. <button class="text-link" data-dialog="privacy">Photo privacy</button></p></div></section><section class="panel"><h2>Identify, then confirm</h2><p class="muted">The pilot covers small carved wooden elephants. Other products won’t be matched to unrelated prices.</p><button class="button secondary full" id="identify-button" ${state.image ? "" : "disabled"}>${icon("magnifying-glass")}Identify this product${devMock ? " (mock)" : ""}</button><div id="analysis-feedback" aria-live="polite">${analysisSummary()}</div><details class="manual-details" ${state.analysis ? "open" : ""}><summary>${state.analysis ? "Confirm the product details" : "Know the details? Enter them yourself"}</summary><form id="attributes-form">${attributesForm(state.attributes)}<button class="button primary full" type="submit">Compare local observations</button><p class="small muted">Illustrative pilot data. No photo is needed for manual comparison.</p></form></details></section></div>`;
}
function photoPreview(image) {
  return image
    ? `<img class="product-preview" src="${image.url}" alt="Your selected product photograph">`
    : `<div class="photo-empty"><div class="viewfinder">${icon("camera")}</div><h3>One object. A clear photo.</h3><p>Use natural light and show the whole figurine.<br>Keep faces and personal details out of frame.</p></div>`;
}
function analysisSummary() {
  if (!state.analysis) return "";
  const a = state.analysis;
  return `<div class="analysis-summary"><span class="status-label">${devMock ? "Mock identification" : "Photo identification"}</span><h3>${h(a.product_name)}</h3><p>${h(a.visible_characteristics)}</p><p class="small muted">${h(a.uncertainty)}</p>${a.category_id !== "wooden_elephant" ? notice("This product is outside the wooden elephant pilot. You can correct a misidentification below.") : ""}</div>`;
}
function comparison() {
  if (!state.result)
    return `<div class="empty-page"><span class="large-icon">${icon("scale-balanced")}</span><h1>A comparison starts with a find.</h1><p>Take a photo or enter the product details. We’ll look for compatible approved observations.</p>${link("/scan", "Check a product", "button primary")}</div>`;
  const r = state.result,
    a = state.attributes;
  return `<div class="page-heading"><a class="back-link" href="/scan">${icon("arrow-left")} Edit product details</a><h1>A little context for your find.</h1><p>Similar objects, with the evidence attached.</p></div><div class="comparison-grid"><section class="panel product-summary"><div class="comparison-photo">${state.image ? `<img class="product-preview" src="${state.image.url}" alt="Your scanned product, held temporarily">` : `<div class="manual-product">${icon("tag")}<span>Details entered manually</span></div>`}</div><h2>Carved wooden elephant</h2><dl class="attribute-list">${[
    ["Material", a.material === "wood" ? "Wood, species unknown" : a.material],
    ["Height", a.size_cm + " cm (your estimate)"],
    ["Finish", a.finish],
    ["Setting", a.segment],
    ["City", "Jaipur"],
  ]
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${h(v)}</dd></div>`)
    .join(
      "",
    )}</dl>${a.decoration ? `<p class="small">${h(a.decoration)}</p>` : ""}${link("/scan", "Adjust details", "button secondary full")}</section><div class="comparison-evidence"><section class="panel price-panel">${r.status === "ready" ? `<span class="status-label">${r.synthetic ? "Illustrative pilot range" : "Typical comparison range"}</span><p class="price-range">${money(r.low)} <span>to</span> ${money(r.high)}</p><p>Based on <strong>${r.matches.length} comparable observations</strong>, not an AI price estimate.</p>${r.synthetic ? notice(`${r.synthetic} of ${r.matches.length} comparisons are synthetic demonstration records. This range is illustrative, not a verified Jaipur market price.`) : ""}<div class="match-criteria"><span>${icon("check")}Same material</span><span>${icon("check")}Similar size</span><span>${icon("check")}Same finish & setting</span></div><details><summary>How this range is calculated</summary><p>${h(r.method)}</p><p class="small">Exact category, material, finish and market segment are required. Size tolerance is the greater of 2 cm or 20%. Observations must be in Jaipur and no more than a year old. ${r.excluded} extreme observations excluded. Decoration notes are descriptive and are not independently verified.</p></details><form id="quote-form" class="quote-form"><label for="quoted-price">Have a seller’s quote?</label><div class="input-action"><input type="number" id="quoted-price" name="quote" min="1" max="100000" inputmode="decimal" placeholder="Price in ₹" required><button class="button secondary" type="submit">Put it in context</button></div><div id="quote-context" aria-live="polite"></div></form>` : `<span class="large-icon">${icon("scale-balanced")}</span><h2>Not enough comparable data.</h2><p>${h(r.reason)}</p>${notice("We won’t substitute a different material, finish or market setting to produce a price.")}<a class="button secondary" href="/scan">Review product details</a>`}</section><section class="panel comparable-panel"><h2>The observations behind it</h2>${r.matches.length ? r.matches.map((o, i) => `<details class="comparable"><summary><span><strong>${h(o.ff_markets.locality)}</strong><small>${o.size_cm} cm · ${h(o.finish)} · ${h(o.segment)}</small></span><span class="comparable-price">${money(o.price_inr)}${icon("chevron-down")}</span></summary><div class="comparable-body"><span class="status-label">${o.provenance === "synthetic" ? "Synthetic demonstration" : h(o.provenance)}</span><p>${h(o.source_note)}</p><p class="small muted">${h(o.price_type)} price · ${date(o.observed_at)} · ${h(o.id.slice(0, 8))}</p><ul class="plain-list">${o.reasons.map((reason) => `<li>${h(reason)}</li>`).join("")}</ul></div></details>`).join("") : '<p class="muted">No compatible approved observations were found.</p>'}</section><section class="panel buying-advice"><h2>A good purchase is more than a price.</h2><p>Compare the finish, carving detail, stability and condition in person. Ask what the wood is; a photograph cannot verify sandalwood, origin or authenticity.</p><p>Ask for the total, make a respectful offer, and be comfortable walking away. A higher price alone is not evidence of unfair dealing.</p><div class="report-invite"><div><h3>Bought this? Report the price.</h3><p>Your observation enters review before it can inform a range.</p></div><button class="button primary" id="report-purchase">Report my purchase</button></div></section></div></div>`;
}
function contributorHome() {
  return `<div class="page-heading"><span class="context-label">Jaipur fieldwork</span><h1>Good context starts<br>with a good observation.</h1><p>Help visitors understand what makes a price comparable.<br>Every submission is reviewed before it can become a reference.</p></div><div class="work-grid"><section class="panel contribution-start"><h2>Record a local price</h2><p>The pilot is focused on small carved wooden elephants in Jaipur. Record what you saw, what was quoted or what you paid.</p>${link("/contribute/new", icon("plus") + "Add an observation", "button primary")}<div class="scope-list"><div><span>Where</span><strong>Jaipur, Rajasthan</strong></div><div><span>What</span><strong>Wooden elephant figurines, 2–30 cm</strong></div><div><span>Review</span><strong>Pending until a trusted review</strong></div></div></section><aside class="panel"><h2>What makes useful evidence?</h2><ul class="editorial-list"><li><strong>Show the object.</strong><p>Photograph the whole figurine and the details that distinguish it.</p></li><li><strong>Describe the setting.</strong><p>A street stall and a boutique offer different context. Record which one you visited.</p></li><li><strong>Name the price type.</strong><p>An asking price, an observed tag and your own purchase are different kinds of evidence.</p></li><li><strong>Leave out personal details.</strong><p>Crop faces, phone numbers, payment details and names from evidence.</p></li></ul></aside></div>`;
}
function contributionForm(purchase = false) {
  const a = purchase
    ? state.attributes
    : {
        category_id: "wooden_elephant",
        material: "wood",
        finish: "plain",
        segment: "shop",
      };
  return `<div class="page-heading"><a class="back-link" href="${purchase ? "/compare" : "/contribute"}">${icon("arrow-left")}${purchase ? "Back to comparison" : "Contributor desk"}</a><h1>${purchase ? "Report your purchase." : "Add a price observation."}</h1><p>${purchase ? "The details of your find are ready. Add what you paid." : "One specific product. One local observation. A clear source."}</p></div><form id="submission-form" class="submission-form" novalidate><div class="form-error" id="submission-feedback" tabindex="-1" aria-live="polite"></div><div class="work-grid"><div><section class="panel"><h2>The product</h2>${purchase ? `<p class="small muted">Reused from your confirmed product. Correct anything that changed.</p>` : `<div class="contributor-photo" id="contributor-preview">${photoPreview(state.contributorImage)}</div><label class="button secondary full file-label">${icon("image")}Choose product photo<input type="file" id="contributor-photo" accept="image/jpeg,image/png,image/webp" required></label><p class="small muted">JPEG, PNG or WebP, up to 20 MB. Required for contributor observations.</p><button type="button" class="button secondary full" id="contributor-identify" ${state.contributorImage ? "" : "disabled"}>${icon("magnifying-glass")}Suggest attributes from photo${devMock ? " (mock)" : ""}</button><div id="contributor-ai" aria-live="polite"></div>`}<div id="submission-attributes">${attributesForm(a, "s-")}</div></section><section class="panel"><h2>The observation</h2><div class="form-grid">${field("Price (₹)", "price", `<input type="number" id="price" name="price_inr" min="1" max="100000" step="0.01" inputmode="decimal" placeholder="Amount for one figurine" required>`)}${field(
    "Price type",
    "price-type",
    `<select id="price-type" name="price_type" ${purchase ? "disabled" : ""}>${options(
      [
        ["paid", "Price paid"],
        ["asking", "Seller’s asking price"],
        ["observed", "Displayed / observed price"],
      ],
      purchase ? "paid" : "asking",
    )}</select>`,
  )}${field("City", "city", '<input id="city" name="city" value="Jaipur" readonly>')}${field("Market or locality", "locality", '<input id="locality" name="locality" maxlength="120" minlength="2" placeholder="Market or neighbourhood" required>')}${field("Observation date", "observed", '<input type="date" id="observed" name="observed_at" min="2020-01-01" max="' + today() + '" value="' + today() + '" required>')}${field(
    "Source",
    "source-type",
    `<select id="source-type" name="source_type">${options(
      purchase
        ? [["own_purchase", "My own purchase"]]
        : [
            ["seller_quote", "Seller quote"],
            ["own_purchase", "My own purchase"],
            ["field_observation", "Field observation"],
            ["receipt", "Receipt"],
          ],
      purchase ? "own_purchase" : "seller_quote",
    )}</select>`,
  )}</div></section></div><aside><section class="panel"><h2>Evidence & consent</h2>${purchase && state.image ? '<label class="check"><input type="checkbox" id="attach-scan" name="attach_scan"><span>Attach my scan photo to this report. I consent to FairFare storing it for review.</span></label>' : ""}<div class="field"><label for="evidence-file">Optional receipt or evidence photo</label><input type="file" id="evidence-file" accept="image/jpeg,image/png,image/webp"><small>Crop personal and payment details. JPEG, PNG or WebP, up to 20 MB before compression.</small></div><div id="evidence-feedback" aria-live="polite"></div><label class="check"><input type="checkbox" id="image-consent" name="image_consent" ${purchase ? "" : "required"}><span>I consent to storing the selected product and evidence photos privately for review. ${purchase ? "Required if I attach any images." : "Required for the product photo."}</span></label><div class="field"><label for="notes">Notes (optional)</label><textarea id="notes" name="notes" maxlength="2000" rows="4" placeholder="Visible details, what the price includes, or uncertainty"></textarea></div><label class="check"><input type="checkbox" name="accurate" required><span>I’ve described this observation honestly and removed personal details from my evidence.</span></label>${notice("Pending submissions do not affect published price ranges. No account is needed.")}<button class="button primary full" type="submit" id="submit-observation">Submit for review</button><p class="small muted">By submitting, you agree to the <button type="button" class="text-link" data-dialog="terms">contribution terms</button> and <button type="button" class="text-link" data-dialog="privacy">privacy notice</button>.</p></section></aside></div></form>`;
}
function confirmation() {
  return `<section class="confirmation panel"><div class="success-mark">${icon("check")}</div><span class="status-label">Pending review</span><h1>Local knowledge,<br>a little better.</h1><p>Your observation was received. A trusted reviewer will check the details before it can become a reference.</p><div class="receipt-note"><span>Submission reference</span><strong>${h(state.submission?.id?.slice(0, 8) || "Received")}</strong></div><p class="small muted">This submission has not changed any published price range. No account or contact details were collected.</p><div class="actions">${link("/", "Back to Jaipur", "button primary")}${link("/contribute/new", "Add another observation", "button secondary")}</div></section>`;
}
function notFound() {
  return `<div class="empty-page"><img src="/assets/brand-mark.png" alt="" width="88" height="88"><span class="context-label">404 · A small detour</span><h1>This isn’t on our map.</h1><p>That page doesn’t exist. There’s still plenty to find in Jaipur.</p>${link("/", "Back to FairFare", "button primary")}</div>`;
}

function navigate(path) {
  history.pushState({}, "", path);
  render();
}
async function render() {
  controller.abort();
  controller = new AbortController();
  const signal = controller.signal;
  let path = location.pathname.replace(/\/$/, "") || "/";
  let content;
  if (path === "/") content = home();
  else if (path === "/scan") content = scan();
  else if (path === "/compare") content = comparison();
  else if (path === "/taxis") content = taxiPage();
  else if (path === "/autos") content = autosPage();
  else if (path === "/monuments") content = monumentsPage();
  else if (path === "/contribute") content = contributorHome();
  else if (path === "/contribute/new") content = contributionForm();
  else if (path === "/report")
    content = state.result ? contributionForm(true) : comparison();
  else if (path === "/submitted")
    content = state.submission ? confirmation() : notFound();
  else content = notFound();
  app.innerHTML = shell(content, path);
  document.title = `${{ "/": "A little local knowledge", "/scan": "Scan a product", "/compare": "Your comparison", "/taxis": "App-booked taxis", "/autos": "Autos & local taxis", "/monuments": "Monuments & guides", "/contribute": "Contributor desk", "/contribute/new": "Add an observation", "/report": "Report a purchase", "/submitted": "Observation received" }[path] || "Page not found"} | FairFare`;
  window.scrollTo(0, 0);
  document.querySelector("#main").focus({ preventScroll: true });
  bindShell();
  if (path === "/scan") bindScan(signal);
  if (path === "/compare") bindComparison();
  if (path === "/taxis") bindTaxi(app);
  if (path === "/autos") bindAutos(app, signal);
  if (path === "/monuments") bindMonuments(app, signal);
  if (path === "/contribute/new" || (path === "/report" && state.result))
    bindSubmission(path === "/report", signal);
  document.querySelector("#announcer").textContent = document.title;
}
function bindShell() {
  document
    .querySelector("#theme-toggle")
    .setAttribute(
      "aria-pressed",
      String(document.documentElement.dataset.theme === "dark"),
    );
  document.querySelector("#theme-toggle").onclick = () => {
    const theme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("fairfare-theme", theme);
    } catch {}
    document.querySelector("#theme-toggle").innerHTML = icon(
      theme === "dark" ? "sun" : "moon",
    );
    document
      .querySelector("#theme-toggle")
      .setAttribute("aria-pressed", String(theme === "dark"));
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
  document
    .querySelectorAll("[data-dialog]")
    .forEach((b) =>
      b.addEventListener("click", () => showInfo(b.dataset.dialog)),
    );
  document
    .querySelectorAll("#install-button,#install-mobile")
    .forEach((b) => b.addEventListener("click", install));
}
function showInfo(type) {
  const content = {
    pilot: [
      "A small pilot, an honest start.",
      `<p>FairFare is a demonstration pilot for Jaipur. Product matching currently covers small carved wooden elephants.</p><p>The initial reference observations are synthetic, created to test the comparison workflow. They are not verified purchases, researched market quotations or records of named merchants. Every affected range and listing is labelled.</p><p>The algorithm selects compatible approved records and calculates a range from them. Pending public submissions are excluded. A price is context, not a verdict about a seller.</p><p>Current monument fees and auto tariffs are unavailable until they can be verified from official sources.</p>`,
    ],
    privacy: [
      "Your photo, your choice.",
      `<p>Ordinary scan photos live in this browser tab’s memory only. FairFare does not put them in its database, Storage, browser storage or service-worker cache. Closing or reloading the page clears them.</p><p>When you choose identification, a compressed image is sent through FairFare’s Supabase function to OpenRouter and its selected model provider. Their processing and retention policies apply; FairFare cannot promise provider-level zero retention.</p><p>Only photos explicitly attached with consent to a submitted observation are stored in a private evidence bucket. Remove faces, receipt identifiers and payment details first.</p><p>Submissions contain product details, price, location, date and any evidence you choose. Trusted reviewers can inspect them; there is no public submission history. Evidence is not automatically made public on approval.</p><p>A short-lived, salted hash of network information is used to limit abuse. FairFare stores a theme preference locally. It uses no analytics or advertising cookies.</p><p>For this pilot, evidence should be deleted after review or within 90 days by the operator. Keep your submission reference if you need to contact the pilot operator directly.</p>`,
    ],
    terms: [
      "Contribution terms",
      `<p>Submit your own observations and photos, or evidence you have permission to share. Do not include personal information, confidential documents or accusations about identifiable sellers.</p><p>You give the pilot operator permission to store and review your submission and to publish the product, price and location as a reference after verification. Photos remain private unless separate permission is obtained.</p><p>Submissions may be rejected or deleted. Illustrative ranges are not appraisals, authenticity checks, fare guarantees or instructions to pay a particular amount.</p>`,
    ],
    install: [
      "Keep FairFare close.",
      `<p>On Android, open the browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p><p>On iPhone or iPad, open FairFare in Safari, tap Share, then <strong>Add to Home Screen</strong>.</p><p>On desktop, use the install icon in your browser’s address bar when available.</p><p>The app shell and basic guidance can work offline. Identification, comparisons and submissions need a connection.</p>`,
    ],
  };
  const [title, body] = content[type] || content.pilot;
  document.querySelector("#dialog-title").textContent = title;
  document.querySelector("#dialog-body").innerHTML = body;
  document.querySelector("#info-dialog").showModal();
}
async function install() {
  if (installPrompt) {
    await installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
  } else showInfo("install");
}
function errorAt(target, error) {
  target.innerHTML = notice(h(error.message || error), "error");
}
async function mockIdentification() {
  return {
    category_id: "wooden_elephant",
    product_name: "Wooden elephant (development fixture)",
    material: "wood",
    finish: "plain",
    decoration: "Brown carved surface",
    visible_characteristics:
      "Elephant-shaped figurine. Fixture response for interface testing.",
    uncertainty:
      "Mock response, not image recognition. Size, species, authenticity and quality are unknown.",
  };
}
function bindScan(signal) {
  const summary = document.querySelector(".analysis-summary");
  if (summary && state.analysis) {
    const attributes = [
      ["Shape", state.analysis.shape],
      ["Colour and pattern", state.analysis.colour_pattern],
      ["Decorative style", state.analysis.decorative_style],
    ].filter(([, v]) => v);
    if (attributes.length)
      summary.insertAdjacentHTML(
        "beforeend",
        `<dl class="attribute-list">${attributes.map(([label, value]) => `<div><dt>${label}</dt><dd>${h(value)}</dd></div>`).join("")}</dl>`,
      );
  }
  const camera = document.querySelector("#camera-input"),
    gallery = document.querySelector("#gallery-input");
  document.querySelector("#take-photo").onclick = () => camera.click();
  document.querySelector("#choose-photo").onclick = () => gallery.click();
  async function select(file) {
    const feedback = document.querySelector("#photo-feedback");
    feedback.innerHTML = loading("Preparing your photo…");
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
      state.attributes = {
        category_id: "wooden_elephant",
        material: "unknown",
        finish: "plain",
        segment: "shop",
      };
      render();
    } catch (e) {
      if (!signal.aborted) errorAt(feedback, e);
    }
  }
  [camera, gallery].forEach((el) =>
    el.addEventListener("change", () => {
      if (el.files[0]) select(el.files[0]);
      el.value = "";
    }),
  );
  document.querySelector("#clear-scan").onclick = () => {
    discardImage(state.image);
    state.image = null;
    state.analysis = null;
    state.result = null;
    render();
  };
  document.querySelector("#identify-button").onclick = async () => {
    const button = document.querySelector("#identify-button"),
      feedback = document.querySelector("#analysis-feedback");
    button.disabled = true;
    feedback.innerHTML = loading(
      "Looking at material, shape and visible details…",
    );
    try {
      const result = devMock
        ? await mockIdentification()
        : await identify(state.image.data, signal);
      if (signal.aborted) return;
      state.analysis = result;
      state.attributes = { ...state.attributes, ...result };
      render();
      document
        .querySelector(".manual-details")
        .scrollIntoView({ block: "nearest", behavior: "smooth" });
    } catch (e) {
      if (!signal.aborted) {
        errorAt(feedback, e);
        button.disabled = false;
      }
    }
  };
  document.querySelector("#attributes-form").onsubmit = async (e) => {
    e.preventDefault();
    state.attributes = readAttributes(e.target);
    state.result = null;
    const button = e.target.querySelector("button");
    button.disabled = true;
    const feedback = document.querySelector("#analysis-feedback");
    feedback.innerHTML = loading("Finding compatible approved observations…");
    try {
      const data = await getObservations(signal);
      if (signal.aborted) return;
      state.result = compareObservations(state.attributes, data);
      navigate("/compare");
    } catch (error) {
      if (!signal.aborted) {
        errorAt(feedback, error);
        button.disabled = false;
      }
    }
  };
}
function bindComparison() {
  if (
    state.attributes.category_id !== "wooden_elephant" &&
    document.querySelector(".product-summary h2")
  ) {
    document.querySelector(".product-summary h2").textContent =
      "Product outside this pilot";
    document.querySelector(".buying-advice")?.remove();
  }
  const form = document.querySelector("#quote-form");
  if (form) {
    form.elements.quote.step = "0.01";
    form.onsubmit = (e) => {
      e.preventDefault();
      const q = Number(new FormData(form).get("quote")),
        r = state.result;
      const text =
        q < r.low
          ? "This quote is below the illustrative range. Check the product and what is included."
          : q > r.high
            ? "This quote is above the illustrative range. Differences in carving, finish, setting or the seller’s offer may explain it."
            : "This quote falls within the illustrative range. Check the actual object and what is included.";
      document.querySelector("#quote-context").innerHTML = notice(
        text + " This does not establish a correct price or seller conduct.",
      );
    };
  }
  const report = document.querySelector("#report-purchase");
  if (report)
    report.onclick = () => {
      state.evidence = null;
      navigate("/report");
    };
}
function bindSubmission(purchase, signal) {
  const form = document.querySelector("#submission-form"),
    feedback = document.querySelector("#submission-feedback");
  form.querySelector('[name="accurate"]').id = "honest-observation";
  if (devMock)
    form.insertAdjacentHTML(
      "afterbegin",
      notice(
        "Development mock mode. Submitting this form tests the interface only; no observation or photograph will be stored.",
      ),
    );
  let pendingFiles = 0;
  const requestId = crypto.randomUUID();
  state.evidence = null;
  const product = document.querySelector("#contributor-photo");
  if (product) {
    product.required = false;
    product.onchange = async () => {
      if (!product.files[0]) return;
      pendingFiles++;
      const button = document.querySelector("#contributor-identify");
      button.disabled = true;
      try {
        const image = await compressImage(product.files[0]);
        if (signal.aborted) {
          discardImage(image);
          return;
        }
        discardImage(state.contributorImage);
        state.contributorImage = image;
        document.querySelector("#contributor-preview").innerHTML =
          photoPreview(image);
        button.disabled = false;
        document.querySelector("#contributor-ai").innerHTML = "";
      } catch (e) {
        if (!signal.aborted)
          errorAt(document.querySelector("#contributor-ai"), e);
      } finally {
        pendingFiles--;
      }
    };
  }
  const ai = document.querySelector("#contributor-identify");
  if (ai)
    ai.onclick = async () => {
      const feedback = document.querySelector("#contributor-ai");
      ai.disabled = true;
      feedback.innerHTML = loading("Reading visible product details…");
      try {
        const a = devMock
          ? await mockIdentification()
          : await identify(state.contributorImage.data, signal);
        if (signal.aborted) return;
        document.querySelector("#submission-attributes").innerHTML =
          attributesForm(a, "s-");
        feedback.innerHTML = notice(
          h(a.uncertainty) +
            (a.category_id !== "wooden_elephant"
              ? " This appears outside the pilot."
              : ""),
        );
      } catch (e) {
        if (!signal.aborted) errorAt(feedback, e);
      } finally {
        if (!signal.aborted) ai.disabled = false;
      }
    };
  document.querySelector("#evidence-file").onchange = async (e) => {
    const target = document.querySelector("#evidence-feedback");
    discardImage(state.evidence);
    state.evidence = null;
    document.querySelector("#remove-evidence").hidden = true;
    if (!e.target.files[0]) {
      target.innerHTML = "";
      return;
    }
    pendingFiles++;
    target.innerHTML = loading("Preparing evidence…");
    try {
      const image = await compressImage(e.target.files[0]);
      if (signal.aborted) {
        discardImage(image);
        return;
      }
      state.evidence = image;
      document.querySelector("#remove-evidence").hidden = false;
      target.innerHTML = notice(
        "Evidence is ready. It will only be stored if you consent and submit.",
      );
    } catch (error) {
      if (!signal.aborted) {
        errorAt(target, error);
        e.target.value = "";
      }
    } finally {
      pendingFiles--;
    }
  };
  const removeEvidence = document.createElement("button");
  removeEvidence.id = "remove-evidence";
  removeEvidence.hidden = true;
  removeEvidence.type = "button";
  removeEvidence.className = "text-link";
  removeEvidence.textContent = "Remove evidence photo";
  removeEvidence.onclick = () => {
    discardImage(state.evidence);
    state.evidence = null;
    document.querySelector("#evidence-file").value = "";
    document.querySelector("#evidence-feedback").textContent =
      "Evidence photo removed. Nothing has been uploaded.";
    removeEvidence.hidden = true;
  };
  document.querySelector("#evidence-file").parentElement.append(removeEvidence);
  form.onsubmit = async (e) => {
    e.preventDefault();
    feedback.innerHTML = "";
    form.querySelectorAll(".field-error").forEach((el) => el.remove());
    for (const el of form.elements) {
      if (el.getAttribute?.("aria-describedby")) {
        const described = el
          .getAttribute("aria-describedby")
          .split(" ")
          .filter((id) => !id.endsWith("-error"))
          .join(" ");
        if (described) el.setAttribute("aria-describedby", described);
        else el.removeAttribute("aria-describedby");
      }
    }
    form.elements.category_id.setCustomValidity(
      form.elements.category_id.value === "wooden_elephant"
        ? ""
        : "This pilot accepts carved wooden elephants only.",
    );
    form.elements.finish.setCustomValidity(
      ["plain", "painted", "inlay", "openwork"].includes(
        form.elements.finish.value,
      )
        ? ""
        : "Choose the visible finish before submitting, or wait until you can check the object.",
    );
    const errors = [];
    for (const el of form.elements) {
      if (el.willValidate && !el.validity.valid) {
        const label = el.labels?.[0]?.textContent || el.name;
        errors.push({
          id: el.id,
          text: label.trim() + ": " + el.validationMessage,
        });
        el.setAttribute("aria-invalid", "true");
      } else el.removeAttribute?.("aria-invalid");
    }
    if (!purchase && !state.contributorImage)
      errors.push({
        id: "contributor-photo",
        text: "Choose a product photograph.",
      });
    if (pendingFiles)
      errors.push({
        id: "evidence-file",
        text: "Wait for photo preparation to finish.",
      });
    const d = new FormData(form),
      attach = purchase && d.has("attach_scan");
    const productImage = purchase
      ? attach
        ? state.image
        : null
      : state.contributorImage;
    if (
      (productImage || state.evidence) &&
      !d.has("image_consent") &&
      !errors.some((error) => error.id === "image-consent")
    )
      errors.push({
        id: "image-consent",
        text: "Consent is required to store attached photos.",
      });
    if (errors.length) {
      for (const error of errors) {
        const input = document.getElementById(error.id);
        if (input) {
          input.setAttribute("aria-invalid", "true");
          const errorId = error.id + "-error";
          input.setAttribute(
            "aria-describedby",
            [
              input.getAttribute("aria-describedby")?.replace(/\S+-error/g, ""),
              errorId,
            ]
              .filter(Boolean)
              .join(" "),
          );
          const label =
            input.type === "checkbox" ? input.closest("label") : input;
          label.insertAdjacentHTML(
            "afterend",
            `<small class="field-error" id="${h(errorId)}">${h(error.text)}</small>`,
          );
        }
      }
      feedback.innerHTML = notice(
        "<strong>Please check the following:</strong><ul>" +
          errors
            .map((x) => `<li><a href="#${h(x.id)}">${h(x.text)}</a></li>`)
            .join("") +
          "</ul>",
        "error",
      );
      feedback.focus();
      return;
    }
    const a = readAttributes(form),
      button = document.querySelector("#submit-observation");
    button.disabled = true;
    feedback.innerHTML = loading("Sending your observation for review…");
    const body = {
      request_id: requestId,
      kind: purchase ? "purchase" : "contributor",
      ...a,
      city: "Jaipur",
      locality: String(d.get("locality")).trim(),
      price_inr: Number(d.get("price_inr")),
      price_type: purchase ? "paid" : d.get("price_type"),
      observed_at: d.get("observed_at"),
      source_type: d.get("source_type"),
      notes: String(d.get("notes") || "").trim(),
      image_consent: d.has("image_consent"),
      product_image: productImage?.data || null,
      evidence_image: state.evidence?.data || null,
      accurate: d.has("accurate"),
    };
    try {
      const result = devMock
        ? { id: "mock-observation-not-saved", status: "pending" }
        : await submitObservation(body, signal);
      if (signal.aborted) return;
      state.submission = result;
      discardImage(state.image);
      discardImage(state.contributorImage);
      discardImage(state.evidence);
      state.image = state.contributorImage = state.evidence = null;
      state.analysis = null;
      state.result = null;
      navigate("/submitted");
      if (devMock)
        document
          .querySelector(".confirmation")
          .insertAdjacentHTML(
            "afterbegin",
            notice(
              "Development mock confirmation. Nothing was submitted or stored.",
            ),
          );
    } catch (error) {
      if (!signal.aborted) {
        errorAt(feedback, error);
        feedback.focus();
        button.disabled = false;
      }
    }
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
    const menu = document.querySelector("#mobile-menu");
    if (menu && !menu.hidden) {
      menu.hidden = true;
      document
        .querySelector("#menu-toggle")
        .setAttribute("aria-expanded", "false");
      document
        .querySelector("#menu-toggle")
        .setAttribute("aria-label", "Open navigation menu");
      document.querySelector("#menu-toggle").focus();
    }
  }
});
window.addEventListener("popstate", render);
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
});
window.addEventListener("pagehide", () => {
  discardImage(state.image);
  discardImage(state.contributorImage);
  discardImage(state.evidence);
  state.image = state.contributorImage = state.evidence = null;
  state.analysis = null;
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
