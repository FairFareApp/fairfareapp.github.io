import { icon, escapeHTML as h, notice, loading, date, options } from "./ui.js";
import { getGuidance, getTicketPrices } from "./api.js";
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
        ? "<h3>Use the method on your booking.</h3><p>Check whether your card, wallet or UPI will be charged before paying again.</p>"
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
export function autosPage() {
  return `${heading("Auto & local taxi fares")}<div class="fare-unavailable"><details><summary>Current official fare unavailable</summary><div id="auto-data">${loading("Checking source…")}</div></details></div><div class="work-grid"><section class="panel"><h2>Ride note</h2><div class="choice-row" role="group" aria-label="Fare arrangement"><button class="choice active" data-fare="negotiated" aria-pressed="true">Agree a fare</button><button class="choice" data-fare="meter" aria-pressed="false">Use the meter</button></div><div id="fare-advice" class="advice-block" aria-live="polite"></div><form id="ride-plan"><div class="field"><label for="ride-destination">Destination</label><input id="ride-destination" name="destination" maxlength="120" placeholder="Where are you going?" required></div><div class="field"><label for="ride-fare">Agreed total (₹)</label><input id="ride-fare" name="fare" type="number" min="1" max="100000" step="0.01" inputmode="decimal" placeholder="Whole ride, not per person" required></div><label class="check"><input type="checkbox" name="return"><span>Return journey included</span></label><button class="button primary full">Make a ride note</button><div id="ride-note" aria-live="polite"></div><p class="small muted ride-note-context" hidden>On this screen only · based on your agreement.</p></form></section><details class="travel-extra"><summary>Before paying</summary><ul class="plain-list"><li>Confirm whole vehicle or per passenger.</li><li>Agree waiting, stops, parking and return travel.</li><li>Check the UPI recipient and amount.</li><li>Keep valuables and the vehicle registration with you.</li></ul><details><summary>Other fare references</summary><p>No approved community or illustrative ride-price references are available. Handicraft demonstration prices are never used for transport.</p></details></details></div>`;
}
export function bindAutos(root, signal) {
  const choose = (mode) => {
    root.querySelector("#fare-advice").innerHTML =
      mode === "meter"
        ? "<p>Confirm the meter tariff and any extras.</p>"
        : "<p>Agree one total for passengers, stops and waiting.</p>";
    root.querySelectorAll("[data-fare]").forEach((b) => {
      b.classList.toggle("active", b.dataset.fare === mode);
      b.setAttribute("aria-pressed", String(b.dataset.fare === mode));
    });
  };
  root
    .querySelectorAll("[data-fare]")
    .forEach((b) => (b.onclick = () => choose(b.dataset.fare)));
  choose("negotiated");
  root.querySelector("#ride-plan").onsubmit = (e) => {
    e.preventDefault();
    const d = new FormData(e.target);
    root.querySelector(".ride-note-context").hidden = false;
    root.querySelector("#ride-note").innerHTML = notice(
      `<strong>Your ride note</strong><br>${h(d.get("destination"))} · ₹${h(d.get("fare"))} for the whole ride.<br>${d.has("return") ? "Return included." : "Return not included."} Confirm all extras.`,
    );
  };
  loadAutos(root, signal);
}
async function loadAutos(root, signal) {
  const target = root.querySelector("#auto-data");
  try {
    const rows = await getGuidance("autos", signal);
    if (signal.aborted) return;
    target.innerHTML = rows.length
      ? rows
          .map(
            (g) =>
              `<p>${h(g.content.note)}</p><p class="small muted">Source check attempted ${date(g.checked_at)}. Current tariff not verified.</p>${external(g.source_url, "Rajasthan fare notifications")}`,
          )
          .join("")
      : "<p>No current tariff is verified. Ask which meter tariff applies or agree a total before departure.</p>";
  } catch (e) {
    if (signal.aborted) return;
    target.innerHTML =
      notice(h(e.message), "error") +
      '<button class="button secondary">Retry source check</button>';
    target.querySelector("button").onclick = () => loadAutos(root, signal);
  }
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
