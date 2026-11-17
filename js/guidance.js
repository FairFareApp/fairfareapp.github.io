import { icon, escapeHTML as h, notice, loading, date, options } from "./ui.js";
import { getGuidance } from "./api.js";
const sourceLink = (url, label) =>
  `<a class="text-link" href="${h(url)}" target="_blank" rel="noopener noreferrer">${label} ${icon("arrow-up-right-from-square")}</a>`;
export function taxiPage() {
  return `<div class="page-heading"><a class="back-link" href="/">${icon("arrow-left")} Jaipur guide</a><h1>App-booked taxis</h1><p>A quoted fare is a starting point. Keep the booking, payment and trip details together.</p></div>
<div class="work-grid"><section class="panel"><div class="section-heading"><h2>Before you ride</h2>${icon("taxi")}</div>
<div class="choice-row" role="group" aria-label="Payment method"><button class="choice active" data-payment="app" aria-pressed="true">Pay through the app</button><button class="choice" data-payment="direct" aria-pressed="false">Pay the driver directly</button></div>
<div id="payment-advice" class="advice-block"></div>
<h3>Your booking check</h3><div class="checklist">${[
    ["plate", "Vehicle and number plate match the booking"],
    ["driver", "Driver details match the app"],
    ["destination", "Destination and pickup point are correct"],
    ["fare", "Fare breakdown and payment method are clear"],
  ]
    .map(
      ([id, label]) =>
        `<label class="check"><input type="checkbox" name="${id}"><span>${label}</span></label>`,
    )
    .join(
      "",
    )}</div><p id="taxi-progress" class="small muted" aria-live="polite">Check these details in your ride-hailing app.</p></section>
<aside class="panel"><h2>Check the fare breakdown</h2><div class="prose"><p>Demand, route, waiting time, tolls, parking and airport charges may affect the final amount. Read the terms shown for your booking.</p><p>If the driver asks you to cancel and pay outside the app, decide before starting. The original booking’s tracking and support may no longer cover that ride.</p><p>Share trip details with someone you trust. Use the original app’s safety and support features if you need help.</p></div>${notice("FairFare has no live ride-hailing connection and does not calculate or guarantee app fares.")}<div class="source-links">${sourceLink("https://www.uber.com/in/en/ride/", "Open Uber")}${sourceLink("https://www.olacabs.com/", "Open Ola")}</div></aside></div>`;
}
export function bindTaxi(root) {
  const render = (mode) => {
    root.querySelector("#payment-advice").innerHTML =
      mode === "app"
        ? "<h3>Follow the payment method on your booking.</h3><p>Check whether your app will charge a card, wallet or UPI method. Confirm the completed trip before paying a second time.</p>"
        : "<h3>Confirm cash or UPI before starting.</h3><p>Make sure direct payment is the method selected in your booking. Check the final fare, recipient name and amount before confirming a transfer. Keep the receipt.</p>";
    root.querySelectorAll("[data-payment]").forEach((b) => {
      const active = b.dataset.payment === mode;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
  };
  root
    .querySelectorAll("[data-payment]")
    .forEach((b) =>
      b.addEventListener("click", () => render(b.dataset.payment)),
    );
  render("app");
  root.querySelectorAll(".checklist input").forEach((b) =>
    b.addEventListener("change", () => {
      const n = root.querySelectorAll(".checklist input:checked").length;
      root.querySelector("#taxi-progress").textContent =
        `${n} of 4 booking details checked. ${n === 4 ? "Confirm these again when your vehicle arrives." : "Continue in your ride-hailing app."}`;
    }),
  );
}
export function autosPage() {
  return `<div class="page-heading"><a class="back-link" href="/">${icon("arrow-left")} Jaipur guide</a><h1>Autos & local taxis</h1><p>A clear agreement before departure makes for a better journey.</p></div><div class="work-grid"><section class="panel"><h2>Agree your ride</h2><div class="choice-row" role="group" aria-label="Fare arrangement"><button class="choice active" data-fare="negotiated" aria-pressed="true">Negotiated fare</button><button class="choice" data-fare="meter" aria-pressed="false">Metered ride</button></div><div id="fare-advice" class="advice-block"></div><form id="ride-plan"><div class="form-grid">${["Destination", "Total agreed fare (₹)"].map((s, i) => `<div class="field"><label for="ride-${i}">${s}</label><input id="ride-${i}" name="${i ? "fare" : "destination"}" ${i ? 'type="number" min="1" max="100000" inputmode="decimal"' : 'maxlength="120"'} required placeholder="${i ? "Amount for the whole ride" : "Where are you going?"}"></div>`).join("")}</div><label class="check"><input type="checkbox" name="return"><span>Return journey is included</span></label><button class="button secondary" type="submit">Make a ride note</button><div id="ride-note" aria-live="polite"></div><p class="small muted">This note stays on this screen. It is your agreement, not an official fare estimate.</p></form></section><aside class="panel"><h2>Local fare references</h2><div id="auto-data">${loading("Checking Jaipur fare references…")}</div><h3>Before paying</h3><ul class="plain-list"><li>Confirm whether the amount is for the vehicle or per passenger.</li><li>Ask about waiting, stops, luggage, parking and return travel.</li><li>Check the UPI recipient and amount. Keep your own payment confirmation.</li><li>Keep valuables with you and note the vehicle registration.</li></ul></aside></div>`;
}
export async function bindAutos(root, signal) {
  const render = (mode) => {
    root.querySelector("#fare-advice").innerHTML =
      mode === "meter"
        ? "<h3>Check the meter starts correctly.</h3><p>Ask which tariff applies and what extras are excluded. If the meter is not being used, agree a total before departure.</p>"
        : "<h3>Agree the whole journey, not just the headline fare.</h3><p>Say the destination, number of passengers and any stops. Confirm a total and whether waiting or a return is included.</p>";
    root.querySelectorAll("[data-fare]").forEach((b) => {
      const active = b.dataset.fare === mode;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
  };
  root
    .querySelectorAll("[data-fare]")
    .forEach((b) => b.addEventListener("click", () => render(b.dataset.fare)));
  render("negotiated");
  root.querySelector("#ride-plan").addEventListener("submit", (e) => {
    e.preventDefault();
    const d = new FormData(e.target);
    root.querySelector("#ride-note").innerHTML = notice(
      `<strong>Your ride note</strong><br>${h(d.get("destination"))}: ₹${h(d.get("fare"))} for the whole ride. ${d.has("return") ? "Return included." : "Return not included."} Confirm all extras with the driver.`,
    );
  });
  const target = root.querySelector("#auto-data");
  try {
    const data = await getGuidance("autos", signal);
    if (signal.aborted) return;
    target.innerHTML = data.length
      ? data
          .map(
            (g) =>
              `${notice(h(g.content.note))}<p class="small muted">Official source index checked ${date(g.checked_at)}. Current tariff unavailable.</p>${sourceLink(g.source_url, "View Rajasthan fare notifications")}`,
          )
          .join("")
      : notice(
          "No verified local tariff is available. Confirm the meter or agree the fare before departure.",
        );
  } catch (e) {
    if (signal.aborted) return;
    target.innerHTML =
      notice(h(e.message), "error") +
      '<button class="button secondary" id="retry-guidance">Retry fare references</button>';
    target.querySelector("button").onclick = () => bindAutosData(root, signal);
  }
}
async function bindAutosData(root, signal) {
  const target = root.querySelector("#auto-data");
  target.innerHTML = loading("Checking Jaipur fare references…");
  try {
    const data = await getGuidance("autos", signal);
    if (!signal.aborted)
      target.innerHTML = data.length
        ? data
            .map(
              (g) =>
                notice(h(g.content.note)) +
                sourceLink(g.source_url, "View official fare index"),
            )
            .join("")
        : notice("No current tariff is verified.");
  } catch (e) {
    if (!signal.aborted) {
      target.innerHTML =
        notice(h(e.message), "error") +
        '<button class="button secondary">Retry fare references</button>';
      target.querySelector("button").onclick = () =>
        bindAutosData(root, signal);
    }
  }
}
export function monumentsPage() {
  return `<div class="page-heading"><a class="back-link" href="/">${icon("arrow-left")} Jaipur guide</a><h1>Monuments & guides</h1><p>Choose the right ticket. Keep the guide’s fee separate.</p></div><div class="work-grid"><section class="panel"><div class="section-heading"><h2>Jaipur visits</h2><label class="inline-label" for="visitor">Visitor category <select id="visitor">${options(
    [
      ["indian", "Indian visitor"],
      ["foreign", "Foreign visitor"],
      ["student", "Student"],
    ],
    "indian",
  )}</select></label></div><div id="monument-data">${loading("Loading Jaipur visitor information…")}</div></section><aside class="panel"><h2>A guide is a separate choice</h2><div class="prose"><p>Ask to see the guide’s identification and agree the language, duration, places covered and total price before you begin.</p><p>A monument ticket may not include a guide, transport, camera access or an evening show. Ask for each part of a package in writing.</p><p>Avoid paying for a “mandatory” add-on until the official counter confirms it is required.</p></div><details><summary>What should I ask at the counter?</summary><ul class="plain-list"><li>Which visitor category applies to me?</li><li>What proof do students need?</li><li>Is this a single-site or composite ticket?</li><li>Are special exhibits or evening visits separate?</li></ul></details>${notice("No guide-price estimate is available in this pilot. Compare scope as well as price.")}</aside></div>`;
}
export async function bindMonuments(root, signal) {
  const target = root.querySelector("#monument-data");
  try {
    const data = await getGuidance("monuments", signal);
    if (signal.aborted) return;
    const render = () => {
      const cat = root.querySelector("#visitor").value;
      target.innerHTML = data.length
        ? data
            .map(
              (g) =>
                `<article class="monument-row"><div class="monument-title">${icon("landmark")}<div><h3>${h(g.title)}</h3><p class="small muted">${h(g.content.locality)}</p></div></div><p class="availability">Current fee unavailable</p><p>${h(g.content.note)}</p><p class="small muted">${cat === "student" ? "Carry valid student identification; eligibility must be checked." : cat === "foreign" ? "Check the foreign visitor category and any passport requirements." : "Check the Indian visitor category and required proof."}</p>${sourceLink(g.source_url, "Check official tickets")}<p class="small muted">Source check attempted ${date(g.checked_at)}. Fee not verified.</p></article>`,
            )
            .join("")
        : notice(
            "No visitor records are published yet. Check the official ticket counter.",
          );
    };
    root.querySelector("#visitor").addEventListener("change", render);
    render();
  } catch (e) {
    if (signal.aborted) return;
    target.innerHTML =
      notice(h(e.message), "error") +
      '<button class="button secondary">Retry visitor information</button>';
    target.querySelector("button").onclick = () => bindMonuments(root, signal);
  }
}
