import { icon, escapeHTML as h, notice, loading, date, options } from "./ui.js";
import { getTicketPrices } from "./api.js";
import { bindDeck, swipeDeck } from "./decks.js";
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

const rides = {
  taxi: {
    title: "Ride-hailing fares",
    icon: "taxi",
    tone: "indigo",
    intro: "Check the car, route and payment before you set off.",
    group: "Payment method",
    modes: [
      [
        "In the app",
        "Check what the app will charge",
        `Check whether your card, wallet or UPI will be charged before paying again. ${cardTip}`,
      ],
      [
        "Cash / UPI to driver",
        "Confirm direct payment first",
        "Check that cash or UPI is selected in the booking. Confirm the final amount and the UPI recipient before paying.",
      ],
    ],
    checks: [
      "Number plate and driver match my booking",
      "Pickup and destination are correct",
      "Fare and payment method are clear",
      "I can follow the route in my map app",
    ],
    question:
      "The driver asks you to cancel in the app and go anyway. What do you check?",
    answers: [
      "What happens to ride tracking and support",
      "Only whether the driver accepts cash",
    ],
    explanation:
      "You may lose the booking’s tracking and support. Decide before getting in and share your trip details with someone you trust.",
    tips: [
      [
        "Check what the fare includes",
        "Review tolls, parking, waiting and airport charges before you confirm.",
      ],
      ["Keep an eye on the route", routeTip],
      [
        "Charged twice?",
        "Check the booking receipt and payment method. Use the ride app’s support if the receipt and payment do not match.",
      ],
    ],
  },
  auto: {
    title: "Auto & local taxi fares",
    icon: "car-side",
    tone: "turmeric",
    intro: "Agree the fare, then follow the ride.",
    group: "Fare arrangement",
    modes: [
      [
        "Agree a fare",
        "Ask for one total",
        "Say the destination and ask what the whole vehicle costs, including stops, tolls, parking and waiting.",
      ],
      ["Use the meter", "Check the meter before moving", meterTip],
    ],
    checks: [
      "The driver knows my destination and stops",
      "I know whether the price covers the whole vehicle",
      "Waiting, parking and return travel are agreed",
      "I have the route open on my phone",
    ],
    question:
      "The meter is off when you get in. What can you do before leaving?",
    answers: ["Agree a total first", "Wait until arrival to ask the cost"],
    explanation:
      "Ask for the total before the ride starts. Check whether it covers everyone, including any agreed stops or return travel.",
    tips: [
      ["Check the route as you go", routeTip],
      [
        "Check the amount before paying",
        "For UPI, check the name and amount. If paying cash, count the change before leaving.",
      ],
      [
        "Going to the airport or station?",
        "Compare a prepaid counter or ride app quote. Ask about the total, including any pickup or parking fees.",
      ],
    ],
  },
};

function ridePage(kind) {
  const r = rides[kind];
  return `<div class="ride-page tone-${r.tone}">
    <header class="ride-hero"><span class="ride-hero-icon">${icon(r.icon)}</span><h1>${r.title}</h1><p>${r.intro}</p></header>
    <section class="ride-mode" aria-label="${r.group}">
      <div class="ride-switch" role="group" aria-label="${r.group}">${r.modes.map(([label], i) => `<button type="button" data-ride-mode="${i}" aria-pressed="${i === 0}">${label}</button>`).join("")}</div>
      <div id="ride-advice" class="ride-advice" aria-live="polite"></div>
    </section>
    <section class="ride-check panel" aria-labelledby="ride-check-title">
      <div class="ride-check-head"><h2 id="ride-check-title">Before you get in</h2><output id="ride-progress" aria-live="polite"></output></div>
      <progress max="${r.checks.length}" value="0" aria-label="Ride checks completed"></progress>
      <div class="ride-meter" aria-hidden="true"><span></span></div>
      <div class="ride-checks">${r.checks.map((label, i) => `<label class="ride-check-row"><input type="checkbox" data-ride-check="${i}"><span>${label}</span></label>`).join("")}</div>
      <div class="ride-reset"><button type="button" class="text-link" id="ride-reset" hidden>Reset checks</button></div>
    </section>
    ${kind === "auto" ? fareReference() : `<div class="ride-providers">${external("https://www.uber.com/in/en/ride/", "Open Uber")}${external("https://www.olacabs.com/", "Open Ola")}<p class="small muted">Open a provider to see its fare and book.</p></div>`}
    <section class="ride-quiz tone-lac" aria-labelledby="ride-quiz-title">
      <h2 id="ride-quiz-title">${icon("comment-dots")} What would you do?</h2>
      <p>${r.question}</p>
      <div>${r.answers.map((answer, i) => `<button type="button" data-ride-answer="${i}" aria-pressed="false">${answer}</button>`).join("")}</div>
      <p id="ride-answer" aria-live="polite" hidden></p>
    </section>
    <section class="ride-tips" aria-labelledby="ride-tips-title"><h2 id="ride-tips-title">Good to know</h2>${r.tips.map(([title, body]) => `<details><summary>${title}</summary><p>${h(body)}</p></details>`).join("")}</section>
  </div>`;
}

const rideProgress = { taxi: new Set(), auto: new Set() };

function bindRide(root, kind) {
  const r = rides[kind];
  const modes = [...root.querySelectorAll("[data-ride-mode]")];
  const advice = root.querySelector("#ride-advice");
  function choose(index) {
    const [, title, text] = r.modes[index];
    advice.innerHTML = `<h2>${h(title)}</h2><p>${h(text)}</p>`;
    modes.forEach((button, i) =>
      button.setAttribute("aria-pressed", String(i === index)),
    );
  }
  modes.forEach((button, i) => {
    button.onclick = () => choose(i);
  });
  choose(0);

  const checks = [...root.querySelectorAll("[data-ride-check]")];
  const progress = root.querySelector("#ride-progress");
  const bar = root.querySelector(".ride-check progress");
  const meter = root.querySelector(".ride-meter");
  const reset = root.querySelector("#ride-reset");
  const complete = rideProgress[kind];
  function showChecks() {
    const size = complete.size;
    progress.innerHTML =
      size === checks.length
        ? `${icon("check")} Ready to ride`
        : `${size} / ${checks.length}`;
    bar.value = size;
    meter.style.setProperty("--filled", size / checks.length);
    progress.classList.toggle("is-ready", size === checks.length);
    reset.hidden = size === 0;
  }
  checks.forEach((input, i) => {
    input.checked = complete.has(i);
    input.onchange = () => {
      if (input.checked) complete.add(i);
      else complete.delete(i);
      showChecks();
    };
  });
  reset.onclick = () => {
    complete.clear();
    checks.forEach((input) => {
      input.checked = false;
    });
    showChecks();
    checks[0].focus();
  };
  showChecks();

  const answers = [...root.querySelectorAll("[data-ride-answer]")];
  const answer = root.querySelector("#ride-answer");
  answers.forEach((button, i) => {
    button.onclick = () => {
      answers.forEach((choice) =>
        choice.setAttribute("aria-pressed", String(choice === button)),
      );
      answer.hidden = false;
      answer.textContent =
        i === 0
          ? `Good call. ${r.explanation}`
          : `Pause and check first. ${r.explanation}`;
    };
  });
}

export const taxiPage = () => ridePage("taxi");
export const autosPage = () => ridePage("auto");
export const bindTaxi = (root) => bindRide(root, "taxi");
export function bindAutos(root) {
  bindRide(root, "auto");
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

const photos = {
  amber: {
    author: "Slyronit",
    source: "Panorama_of_Amber_Fort.jpg",
    alt: "Amber Fort and the hillside above Amer",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  hawa: {
    author: "Wander-earth",
    source: "Hawa_Mahal_in_Jaipur_India.jpg",
    alt: "Hawa Mahal in Jaipur",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  jantar: {
    author: "Swapnil.Karambelkar",
    source: "Full_view_of_jantar_mantar_,Jaipur.jpg",
    alt: "The stone instruments at Jantar Mantar in Jaipur",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
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
const visitGuides = [
  {
    id: "hawa",
    title: "Hawa Mahal",
    prices: { indian: 100, foreign: 600, student: 50, foreign_student: 300 },
    content: {
      locality: "Badi Chaupar",
      note: "Look for the latticed windows and jharokhas. These are general admission rates.",
    },
  },
  {
    id: "jantar",
    title: "Jantar Mantar",
    prices: { indian: 100, foreign: 600, student: 50, foreign_student: 300 },
    content: {
      locality: "Old Jaipur",
      note: "Leave time to look closely at the astronomical instruments. Guides may cost extra.",
    },
  },
  {
    id: "amber",
    title: "Amber Palace",
    prices: { indian: 200, foreign: 1000, student: 100, foreign_student: 500 },
    content: {
      locality: "Amer",
      note: "Allow time for the courtyards and palace interiors. Composite tickets are separate.",
    },
  },
].map((venue) => ({
  ...venue,
  source_url: "https://obms-tourist.rajasthan.gov.in/",
  verification: "published",
  checked_at: "2026-11-22",
}));
export function monumentsPage() {
  return `<div class="visits-page">${heading("Monuments")}<div class="monuments-toolbar"><label class="inline-label" for="visitor">Visitor category<select id="visitor">${options(
    [
      ["indian", "Indian resident"],
      ["foreign", "International visitor"],
      ["student", "Indian student"],
      ["foreign_student", "International student"],
    ],
    "indian",
  )}</select></label></div><div id="monument-data">${loading("Loading Jaipur visits…")}</div><details class="guide-note"><summary>Hiring a guide?</summary><p>Check identification. Agree the language, duration, places covered and total before starting. Guide services, transport, camera access and evening shows may be separate.</p><p>No guide-price estimate is available. Check any “mandatory” add-on with the official counter.</p><details><summary>Questions at the counter</summary><ul><li>Which visitor category and proof do I need?</li><li>Single-site or composite ticket?</li><li>Are special exhibits or evening visits separate?</li></ul></details></details></div>`;
}

export async function bindMonuments(root, signal) {
  const target = root.querySelector("#monument-data");
  const select = root.querySelector("#visitor");
  try {
    const live = await getTicketPrices(signal);
    if (signal.aborted) return;
    const rows = [
      ...live,
      ...visitGuides.filter(
        (guide) => !live.some((row) => row.id === guide.id),
      ),
    ];
    target.innerHTML =
      swipeDeck(
        "visits",
        "Jaipur monument cards",
        rows.map((g) => {
          const photo = photos[g.id];
          return {
            label: g.title,
            tone: "lac",
            content: `${photo ? `<img class="swipe-photo" src="/assets/monuments/${h(g.id)}.webp" alt="${h(photo.alt)}" width="720" height="420">` : ""}
        <div class="visit-copy"><p>${h(g.content.locality)}</p><h2>${h(g.title)}</h2><p class="availability"></p><div class="visit-link"></div></div>`,
          };
        }),
      ) +
      `<details class="visit-detail"><summary>Visit details & sources</summary><div class="visit-detail-body"></div></details>`;
    const deck = target.querySelector("[data-deck]");
    const details = target.querySelector(".visit-detail");
    const detailBody = details.querySelector(".visit-detail-body");
    const cards = [...deck.querySelectorAll(".swipe-card")];
    let current = 0;
    function update() {
      const cat = select.value;
      rows.forEach((row, i) => {
        const fee = row.prices?.[cat];
        const label =
          fee === 0
            ? "Free entry"
            : Number.isFinite(fee)
              ? `${ticketMoney.format(fee)} entry`
              : "Check entry fee";
        cards[i].querySelector(".availability").textContent =
          label + (row.verification === "snapshot" ? " · last verified" : "");
        cards[i].querySelector(".visit-link").innerHTML = external(
          row.source_url,
          !Number.isFinite(fee) || fee === 0
            ? "Official visitor info"
            : "Official ticket info",
        );
      });
      const row = rows[current];
      const photo = photos[row.id];
      detailBody.innerHTML = `<p>${h(row.content.note)}</p>
        ${cat.includes("student") && row.prices?.[cat] > 0 ? "<p>Carry valid student ID and confirm eligibility.</p>" : ""}
        ${row.checked_at ? `<p>${row.verification === "official" ? "Official site checked" : row.verification === "published" ? "Rajasthan ticket portal checked" : "Live source unavailable. Last verified"} ${date(row.checked_at)}.</p>` : ""}
        ${photo ? `<p>Photo: ${h(photo.author)}. Cropped and resized. ${external("https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(photo.source), "Original photo")} · ${external(photo.licenseUrl, photo.license)}</p>` : ""}`;
    }
    deck.addEventListener("cardchange", (event) => {
      if (current !== event.detail) details.open = false;
      current = event.detail;
      update();
    });
    select.onchange = update;
    bindDeck(deck);
    target.querySelectorAll("img").forEach((img) => {
      img.onerror = () => img.remove();
    });
  } catch (e) {
    if (signal.aborted) return;
    target.innerHTML =
      notice(h(e.message), "error") +
      '<button class="button secondary">Retry visits</button>';
    target.querySelector("button").onclick = () => bindMonuments(root, signal);
  }
}
