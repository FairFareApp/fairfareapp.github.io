import { icon, escapeHTML as h, notice, loading, date, options } from "./ui.js";
import { getTicketPrices } from "./api.js";
import {
  cardTip,
  routeTip,
  meterTip,
  fareSources,
  historicalFare,
} from "./travel-advice.js";
const ticketMoney = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const external = (url, label) =>
  `<a class="text-link" href="${h(url)}" target="_blank" rel="noopener noreferrer">${label} ${icon("arrow-up-right-from-square")}</a>`;
const heading = (title) => `<div class="page-heading"><h1>${title}</h1></div>`;
export function taxiPage() {
  return `${heading("Ride-hailing fares")}<div class="work-grid"><section class="panel"><h2>How are you paying?</h2><div class="choice-row" role="group" aria-label="Payment method"><button class="choice active" data-payment="app" aria-pressed="true">In the app</button><button class="choice" data-payment="direct" aria-pressed="false">Cash / UPI to driver</button></div><div id="payment-advice" class="advice-block" aria-live="polite"></div><details><summary>Before the car arrives</summary><div class="checklist">${["Vehicle & number plate match", "Driver matches the booking", "Pickup & destination are correct", "Fare & payment method are clear"].map((text, i) => `<label class="check"><input type="checkbox" name="taxi-${i}"><span>${text}</span></label>`).join("")}</div><p class="small muted" id="taxi-progress" aria-live="polite">0 of 4 checked</p></details><div class="source-links">${external("https://www.uber.com/in/en/ride/", "Open Uber")}${external("https://www.olacabs.com/", "Open Ola")}</div></section><details class="travel-extra"><summary>Fare extras & ride safety</summary><ul class="plain-list"><li>Review tolls, parking, waiting and airport charges.</li><li>Check the payment method before paying twice.</li><li>Use your ride app’s tracking and support.</li></ul><details><summary>Asked to cancel the booking?</summary><p>Decide before starting. A trip outside the app may lose the original booking’s tracking and support.</p><p>Share the trip details with someone you trust.</p></details><p class="small muted">FairFare has no live app fares.</p></details></div>`;
}
export function bindTaxi(root) {
  const choose = (mode) => {
    root.querySelector("#payment-advice").innerHTML =
      mode === "app"
        ? `<h3>Use the method on your booking.</h3><p>Check whether your card, wallet or UPI will be charged before paying again.</p><p>${h(cardTip)}</p>`
        : "<h3>Confirm direct payment first.</h3><p>Make sure cash or UPI is selected in the booking. Check the final amount and recipient. Keep the receipt.</p>";
    root.querySelectorAll("[data-payment]").forEach((b) => {
      b.classList.toggle("active", b.dataset.payment === mode);
      b.setAttribute("aria-pressed", String(b.dataset.payment === mode));
    });
  };
  root
    .querySelectorAll("[data-payment]")
    .forEach((b) => (b.onclick = () => choose(b.dataset.payment)));
  choose("app");
  root.querySelectorAll(".checklist input").forEach(
    (i) =>
      (i.onchange = () => {
        const n = root.querySelectorAll(".checklist input:checked").length;
        root.querySelector("#taxi-progress").textContent =
          `${n} of 4 checked${n === 4 ? " · Check again when the car arrives." : ""}`;
      }),
  );
}
function fareReference() {
  return `<details class="fare-reference">
    <summary><span><strong>Local fare references</strong><small>₹51 for a 5 km auto ride · 2013 schedule</small></span></summary>
    <div class="fare-reference-body">
      <h2>Distance calculator</h2>
      <p class="small muted" id="fare-date-hint">Uses the published 2013 schedules. Check today’s total before boarding.</p>
      <div class="form-grid">
        <div class="field"><label for="fare-vehicle">Vehicle</label><select id="fare-vehicle">${options(
          [
            ["auto", "Auto rickshaw"],
            ["taxi-small", "Prepaid taxi · up to 5 seats"],
            ["taxi-large", "Prepaid taxi · over 5 seats"],
          ],
          "auto",
        )}</select></div>
        <div class="field"><label for="fare-distance">One-way distance (km)</label><input id="fare-distance" type="number" min="0.1" max="50" step="0.1" inputmode="decimal" value="5" aria-describedby="fare-date-hint"></div>
      </div>
      <p id="fare-estimate" role="status"></p>
      ${external(fareSources.auto, "2013 auto order")}<br>
      ${external(fareSources.taxi, "2013 prepaid taxi order")}<br>
      ${external(fareSources.index, "Rajasthan fare index")}
      <h2>Published provider examples</h2>
      <p><strong>₹177 average</strong> · Uber Auto, Jaipur airport to Jaipur. An app-based route average.</p>
      ${external(fareSources.autoProvider, "View Uber route figures")}
      <p><strong>From ₹649 + GST</strong> · PinkCityTours airport or railway sedan transfer. Its 4 hour / 40 km city package is ₹1,199 + GST.</p>
      ${external(fareSources.taxiProvider, "View the operator’s posted rates")}
      <p class="small muted">Sources checked 19 November 2026. Ask for the current total, including parking, tolls and waiting.</p>
    </div>
  </details>`;
}

export function autosPage() {
  return `${heading("Auto & local taxi fares")}${fareReference()}<div class="work-grid"><section class="panel"><h2>Ride note</h2><div class="choice-row" role="group" aria-label="Fare arrangement"><button class="choice active" data-fare="negotiated" aria-pressed="true">Agree a fare</button><button class="choice" data-fare="meter" aria-pressed="false">Use the meter</button></div><div id="fare-advice" class="advice-block" aria-live="polite"></div><form id="ride-plan"><div class="field"><label for="ride-destination">Destination</label><input id="ride-destination" name="destination" maxlength="120" placeholder="Where are you going?" required></div><div class="field"><label for="ride-fare">Agreed total (₹)</label><input id="ride-fare" name="fare" type="number" min="1" max="100000" step="0.01" inputmode="decimal" placeholder="Whole ride, not per person" required></div><label class="check"><input type="checkbox" name="return"><span>Return journey included</span></label><button class="button primary full">Make a ride note</button><div id="ride-note" aria-live="polite"></div><p class="small muted ride-note-context" hidden>On this screen only · based on your agreement.</p></form></section><details class="travel-extra"><summary>Route and payment tips</summary><ul class="plain-list"><li>${h(routeTip)}</li><li>Confirm whole vehicle or per passenger.</li><li>Agree waiting, stops, parking and return travel.</li><li>Check the UPI recipient and amount.</li><li>Keep valuables and the vehicle registration with you.</li></ul></details></div>`;
}

export function bindAutos(root) {
  const choose = (mode) => {
    root.querySelector("#fare-advice").textContent =
      mode === "meter"
        ? meterTip
        : "Agree one total for passengers, stops and waiting.";
    root.querySelectorAll("[data-fare]").forEach((button) => {
      button.classList.toggle("active", button.dataset.fare === mode);
      button.setAttribute("aria-pressed", String(button.dataset.fare === mode));
    });
  };
  root
    .querySelectorAll("[data-fare]")
    .forEach((button) => (button.onclick = () => choose(button.dataset.fare)));
  choose("negotiated");

  const vehicle = root.querySelector("#fare-vehicle");
  const distance = root.querySelector("#fare-distance");
  const estimate = root.querySelector("#fare-estimate");
  const update = () => {
    const km = distance.valueAsNumber;
    const validDistance = distance.validity.valid && Number.isFinite(km);
    const fare = validDistance ? historicalFare(vehicle.value, km) : null;
    estimate.textContent =
      fare === null
        ? vehicle.value === "auto" || !validDistance
          ? "Enter a distance from 0.1 to 50 km."
          : "The prepaid taxi schedule only lists distance bands up to 20 km."
        : `${ticketMoney.format(fare)} · 2013 distance reference. Extras may apply.`;
  };
  vehicle.addEventListener("change", update);
  distance.addEventListener("input", update);
  update();

  root.querySelector("#ride-plan").onsubmit = (event) => {
    event.preventDefault();
    const values = new FormData(event.target);
    const destination = String(values.get("destination")).trim();
    if (!destination) {
      event.target.elements.destination.focus();
      return;
    }
    const map =
      "https://www.google.com/maps/dir/?api=1&destination=" +
      encodeURIComponent(destination + ", Jaipur");
    root.querySelector(".ride-note-context").hidden = false;
    root.querySelector("#ride-note").innerHTML = notice(
      `<strong>Your ride note</strong><br>${h(destination)} · ₹${h(values.get("fare"))} for the whole ride.<br>${values.has("return") ? "Return included." : "Return not included."} Confirm all extras.<br>${external(map, "Follow the route in Google Maps")}`,
    );
  };
}

const photos = {
  "city-palace": {
    author: "Miniondo",
    source: "City_palace,_Jaipur.jpg",
    alt: "City Palace in Jaipur",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  jaigarh: {
    author: "Viraj Mulki",
    source: "Jaigarh_Fort_Jaipur.jpg",
    alt: "Jaigarh Fort in Jaipur",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
  "jawahar-kala": {
    author: "Meena Kadri",
    source: "Central_courtyard,_Jawahar_Kala_Kendra,_Jaipur,_Rajasthan.jpg",
    alt: "Central courtyard at Jawahar Kala Kendra",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
};
export function monumentsPage() {
  return `${heading("Monuments")}<div class="monuments-toolbar"><label class="inline-label" for="visitor">Visitor category<select id="visitor">${options(
    [
      ["indian", "Indian resident"],
      ["foreign", "International visitor"],
      ["student", "Indian student"],
      ["foreign_student", "International student"],
    ],
    "indian",
  )}</select></label></div><div id="monument-data" class="monument-grid">${loading("Loading Jaipur visits…")}</div><details class="guide-note"><summary>Hiring a guide?</summary><p>Check identification. Agree the language, duration, places covered and total before starting. Guide services, transport, camera access and evening shows may be separate.</p><p>No guide-price estimate is available. Check any “mandatory” add-on with the official counter.</p><details><summary>Questions at the counter</summary><ul><li>Which visitor category and proof do I need?</li><li>Single-site or composite ticket?</li><li>Are special exhibits or evening visits separate?</li></ul></details></details>`;
}
export async function bindMonuments(root, signal) {
  const target = root.querySelector("#monument-data");
  try {
    const rows = await getTicketPrices(signal);
    if (signal.aborted) return;
    const draw = () => {
      const cat = root.querySelector("#visitor").value;
      target.innerHTML = rows.length
        ? rows
            .map((g) => {
              const photo = photos[g.id];
              const fee = g.prices?.[cat];
              const ticketLabel =
                fee === 0
                  ? "Free entry"
                  : Number.isFinite(fee)
                    ? `${ticketMoney.format(fee)} entry`
                    : "Check entry fee";
              return `<article class="monument-card">${photo ? `<img class="monument-photo" src="/assets/monuments/${g.id}.webp" alt="${photo.alt}" width="720" height="420" loading="lazy">` : ""}<div class="monument-card-body"><h2>${h(g.title)}</h2><p class="locality">${h(g.content.locality)}</p><p class="availability">${ticketLabel}${g.verification === "snapshot" ? " · last verified" : ""}</p>${external(g.source_url, fee === 0 ? "Official visitor info" : "Official ticket info")}<details><summary>Visit details & sources</summary><p>${h(g.content.note)}</p><p>${cat.includes("student") && fee !== 0 ? "Carry valid student ID; check eligibility." : ""}</p><p class="small muted">${g.verification === "official" ? "Official site checked" : "Live source unavailable. Last verified"} ${date(g.checked_at)}.</p>${photo ? `<p class="small muted">Photo: ${h(photo.author)}. Cropped, resized to WebP.<br>${external("https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(photo.source), "Original photo")}${external(photo.licenseUrl, h(photo.license))}</p>` : ""}</details></div></article>`;
            })
            .join("")
        : notice(
            "No visitor records are published. Check the official counter.",
          );
      target.querySelectorAll("img").forEach(
        (img) =>
          (img.onerror = () => {
            const placeholder = document.createElement("div");
            placeholder.className = "monument-photo image-fallback";
            placeholder.textContent = "Photo unavailable";
            img.replaceWith(placeholder);
          }),
      );
    };
    root.querySelector("#visitor").onchange = draw;
    draw();
  } catch (e) {
    if (signal.aborted) return;
    target.innerHTML =
      notice(h(e.message), "error") +
      '<button class="button secondary">Retry visits</button>';
    target.querySelector("button").onclick = () => bindMonuments(root, signal);
  }
}
