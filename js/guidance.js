import { icon, escapeHTML as h, notice, loading, date, options, disclosure } from "./ui.js";
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
    title: "Book in an app",
    description: "Use Uber or Ola",
    guideTitle: "Rides booked in an app",
    tone: "indigo",
    intro: "Check the app’s price for your pickup and drop-off points before you book. The price can change depending on the route and time.",
    group: "How will you pay?",
    modes: [
      [
        "Pay in the app",
        "Check what the app will charge",
        `Check the app to see if you already paid by card, wallet or UPI. If the app shows that you paid, show the driver the receipt if they ask for payment. ${cardTip}`,
      ],
      [
        "Pay the driver",
        "Check how much to pay the driver",
        "Check that your booking says to pay the driver. Before you send money by UPI, check the fare and the name on the UPI screen.",
      ],
    ],
    checks: [
      "The number plate and driver match the booking in the app",
      "The app shows the right pickup and drop-off points",
      "I know the fare and how I will pay",
      "I can follow the route in my map app",
    ],
    question:
      "The driver asks you to cancel the booking and ride without the app. What should you check?",
    answers: [
      "Whether I can still track the ride and get help",
      "Only whether the driver accepts cash",
    ],
    explanation:
      "If you cancel, you may lose ride tracking and help from the app. You can keep the booking or book another ride. You can also share your trip details with someone you trust.",
    tips: [
      [
        "Check what is included in the fare",
        "Before you book, check whether the app’s price includes tolls, parking, waiting time and airport charges.",
      ],
      ["If your driver changes route", routeTip],
      [
        "What to do if you are charged twice",
        "Compare the trip receipt with your bank, wallet or UPI payments. If you paid twice for the same trip, open that trip in the ride app and contact Help or Support.",
      ],
    ],
  },
  auto: {
    title: "Hire an auto or taxi",
    description: "Speak to the driver directly",
    guideTitle: "Rides hired in person",
    tone: "turmeric",
    intro: "If you are taking an auto-rickshaw or local taxi without an app, agree on a total with the driver or ask the driver to use the meter before the ride starts.",
    group: "How will the driver set the fare?",
    modes: [
      [
        "Agree on a price",
        "Ask for the full price before you get in",
        "Tell the driver where you want to go and where you want to stop. Ask for one price for everyone in your group, including any tolls, parking fees and waiting time.",
      ],
      ["Use the meter", "Ask the driver to start the meter", meterTip],
    ],
    checks: [
      "The driver knows where I am going and where I need to stop",
      "I know whether the fare covers everyone in my group or is per person",
      "I know the cost of waiting, parking and any return trip",
      "I have the route open on my phone",
    ],
    question:
      "The meter is off when you get in. What can you do before leaving?",
    answers: ["Agree on a fare with the driver before the ride starts", "Ask what it costs when I get there"],
    explanation:
      "Before the ride starts, ask the driver for the full fare. Check whether it covers everyone in your group, any stops and a return trip if you need one.",
    tips: [
      ["If your driver changes route", routeTip],
      [
        "Check the amount before paying",
        "If you pay by UPI, check the name of the person you are paying and the amount you are sending. If you pay in cash, count your change before you leave.",
      ],
      [
        "Compare fares at the airport or station",
        "Ask for a price at the prepaid taxi counter and compare it with the price in a ride app. Check whether each price includes pickup and parking fees.",
      ],
    ],
  },
};

export function faresPage(kind) {
  const r = rides[kind];
  return `<div class="ride-page tone-${r.tone}">
    <header class="ride-hero">
      <h1>Ride fares</h1>
      <p>Choose how you’ll get your ride.</p>
    </header>
    <div>
      <nav class="fare-choices" aria-label="How to get a ride">
        ${Object.entries(rides).map(([key, ride]) => `<a href="${key === "auto" ? "/fares?type=auto" : "/fares"}" aria-controls="ride-guide" ${key === kind ? 'aria-current="page"' : ""}><strong>${ride.title}</strong><span>${ride.description}</span></a>`).join("")}
      </nav>
      <section class="ride-guide" id="ride-guide" aria-labelledby="ride-guide-title">
        <div class="ride-guide-lead">
          <h2 id="ride-guide-title">${r.guideTitle}</h2>
          <p class="ride-intro">${r.intro}</p>
          <section class="ride-mode" aria-labelledby="ride-mode-title">
            <h3 id="ride-mode-title">${r.group}</h3>
            <div class="ride-switch" role="group" aria-labelledby="ride-mode-title">${r.modes.map(([label], i) => `<button type="button" data-ride-mode="${i}" aria-controls="ride-advice" aria-pressed="${i === 0}">${label}</button>`).join("")}</div>
            <div id="ride-advice" class="ride-advice" aria-live="polite"></div>
          </section>
        </div>
        <div class="ride-guide-body">
          <section class="ride-check panel" aria-labelledby="ride-check-title">
            <div class="ride-check-head"><h3 id="ride-check-title">Before you get in</h3><output id="ride-progress" aria-live="polite"></output></div>
            <progress max="${r.checks.length}" value="0" aria-label="Ride checks completed"></progress>
            <div class="ride-meter" aria-hidden="true"><span></span></div>
            <div class="ride-checks">${r.checks.map((label, i) => `<label class="ride-check-row"><input type="checkbox" data-ride-check="${i}"><span>${label}</span></label>`).join("")}</div>
            <div class="ride-reset"><button type="button" class="text-link" id="ride-reset" hidden>Reset checks</button></div>
          </section>
          ${kind === "auto" ? fareReference() : `<div class="ride-providers">${external("https://www.uber.com/in/en/ride/", "Open Uber")}${external("https://www.olacabs.com/", "Open Ola")}<p class="small muted">Check the current fare and book on Uber or Ola.</p></div>`}
          <section class="ride-quiz" aria-labelledby="ride-quiz-title">
            <h3 id="ride-quiz-title">${icon("comment-dots")} What would you do on this ride?</h3>
            <p>${r.question}</p>
            <div>${r.answers.map((answer, i) => `<button type="button" data-ride-answer="${i}" aria-pressed="false">${answer}</button>`).join("")}</div>
            <p id="ride-answer" aria-live="polite" hidden></p>
          </section>
          <section class="ride-tips" aria-labelledby="ride-tips-title"><h3 id="ride-tips-title">More tips for your ride</h3>${r.tips.map(([title, body]) => `<details>${disclosure(h(title))}<p>${h(body)}</p></details>`).join("")}</section>
        </div>
      </section>
    </div>
  </div>`;
}

const rideProgress = { taxi: new Set(), auto: new Set() };

function bindRide(root, kind) {
  const r = rides[kind];
  const modes = [...root.querySelectorAll("[data-ride-mode]")];
  const advice = root.querySelector("#ride-advice");
  function choose(index) {
    const [, title, text] = r.modes[index];
    advice.innerHTML = `<h4>${h(title)}</h4><p>${h(text)}</p>`;
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
        ? `${icon("check")} All checks done`
        : `${size} of ${checks.length} done`;
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
      answer.textContent = `${i === 0 ? "You picked the better option." : "Here is what to check before the ride."} ${r.explanation}`;
    };
  });
}

export function bindFares(root, kind) {
  bindRide(root, kind);
  if (kind !== "auto") return;
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
          : "This calculator covers prepaid taxi trips up to 20 km. Ask the taxi counter what a longer trip costs."
        : `The estimated fare is ${ticketMoney.format(fare)}.`;
  };
  vehicle.addEventListener("change", update);
  distance.addEventListener("input", update);
  update();
}

function fareReference() {
  return `<details class="fare-reference">
    ${disclosure('<strong>2026 fare calculator</strong><small>Sample fares for comparison. Ask the driver for today’s fare.</small>')}
    <div class="fare-reference-body">
      <h3>Enter your trip distance</h3>
      <p class="small muted" id="fare-date-hint">These estimates use Rajasthan’s fare tables published in 2013.</p>
      <div class="form-grid">
        <div class="field"><label for="fare-vehicle">Vehicle</label><select id="fare-vehicle">${options(
          [
            ["auto", "Auto rickshaw"],
            ["taxi-small", "Prepaid taxi with up to 5 seats"],
            ["taxi-large", "Prepaid taxi with more than 5 seats"],
          ],
          "auto",
        )}</select></div>
        <div class="field"><label for="fare-distance">One-way distance (km)</label><input id="fare-distance" type="number" min="0.1" max="50" step="0.1" inputmode="decimal" value="5" aria-describedby="fare-date-hint"></div>
      </div>
      <p id="fare-estimate" role="status"></p>
      ${external(fareSources.auto, "Rajasthan fare table for autos")}<br>
      ${external(fareSources.taxi, "Rajasthan fare table for prepaid taxis")}<br>
      ${external(fareSources.index, "All published Rajasthan fare rates")}
      <h3>Example fares from ride companies</h3>
      <p><strong>₹177 average</strong> for an Uber Auto from Jaipur airport to the city, as published by Uber.</p>
      ${external(fareSources.autoProvider, "See Uber’s fares for this route")}
      <p><strong>From ₹649 plus tax</strong> for a PinkCityTours car from the airport or railway station. The company lists ₹1,199 plus tax for a 4-hour, 40 km city trip.</p>
      ${external(fareSources.taxiProvider, "See PinkCityTours fares")}
      <p class="small muted">FairFare checked these prices on 19 November 2026. Before you book, ask the ride company what the trip will cost today, including parking, tolls and waiting time.</p>
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
    alt: "The stone instruments used to study the sky at Jantar Mantar",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  "city-palace": {
    author: "Miniondo",
    source: "City_palace,_Jaipur.jpg",
    alt: "City Palace in Jaipur",
    ticketNote: "The museum ticket includes the courtyards and galleries. Royal tours and tickets that cover several places cost extra. The museum uses its discounted youth ticket for the student prices shown here.",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  jaigarh: {
    author: "Viraj Mulki",
    source: "Jaigarh_Fort_Jaipur.jpg",
    alt: "Jaigarh Fort in Jaipur",
    ticketNote: "The entry ticket includes the fort, museum, cannons and Sculpture Park. Ask the ticket counter whether a guide or permission to take photos costs extra.",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
  "jawahar-kala": {
    author: "Meena Kadri",
    source: "Central_courtyard,_Jawahar_Kala_Kendra,_Jaipur,_Rajasthan.jpg",
    alt: "Central courtyard at Jawahar Kala Kendra",
    ticketNote: "You can enter the cultural centre for free. Ask the centre whether the event you want to attend has a separate ticket.",
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
      note: "The price shown is for entry to Hawa Mahal. Inside, look for the carved window screens and balconies.",
    },
  },
  {
    id: "jantar",
    title: "Jantar Mantar",
    prices: { indian: 100, foreign: 600, student: 50, foreign_student: 300 },
    content: {
      locality: "Old Jaipur",
      note: "You can see the stone instruments once you enter. Ask the ticket counter what a guided tour costs.",
    },
  },
  {
    id: "amber",
    title: "Amber Palace",
    prices: { indian: 200, foreign: 1000, student: 100, foreign_student: 500 },
    content: {
      locality: "Amer",
      note: "The price shown is for Amber Palace. If you want to visit several monuments, ask the counter for a ticket that covers them together.",
    },
  },
].map((venue) => ({
  ...venue,
  source_url: "https://obms-tourist.rajasthan.gov.in/",
  verification: "published",
  checked_at: "2026-11-22",
}));
export function monumentsPage() {
  const ticketTypes = [
    ["indian", "Indian resident"],
    ["foreign", "Foreigner"],
    ["student", "Indian student"],
    ["foreign_student", "Foreign student"],
  ];
  return `<div class="visits-page">${heading("Monument tickets")}<p class="ticket-intro">Choose the option that describes you to see your ticket price. Swipe left or tap the photo to see the next place.</p>
    <fieldset id="visitor" class="ticket-types">
      <legend>Ticket type</legend>
      ${ticketTypes.map(([value, label]) => `<label><input type="radio" name="visitor" value="${value}"${value === "indian" ? " checked" : ""}>${label}</label>`).join("")}
    </fieldset>
    <div id="monument-data">${loading("Loading monument ticket prices…")}</div><details class="guide-note">${disclosure("See what to ask before hiring a guide")}<p>Ask the guide to show their ID. Before you start, confirm with the guide which language they will speak, where they will take you, how long the tour will last and what you will pay. Ask the guide if transport, taking photos or evening shows cost extra.</p><details>${disclosure("See what to ask at the ticket counter")}<ul><li>Which ticket should I buy, and what ID do I need?</li><li>Can I buy one ticket for several places?</li><li>Do special exhibits or evening visits cost extra?</li></ul></details></details></div>`;
}

export async function bindMonuments(root, signal) {
  const target = root.querySelector("#monument-data");
  const visitor = root.querySelector("#visitor");
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
      `<details class="visit-detail">${disclosure("See what the ticket covers")}<div class="visit-detail-body"></div></details>`;
    const deck = target.querySelector("[data-deck]");
    const details = target.querySelector(".visit-detail");
    const detailBody = details.querySelector(".visit-detail-body");
    const cards = [...deck.querySelectorAll(".swipe-card")];
    let current = 0;
    function update() {
      const cat = visitor.querySelector(":checked").value;
      rows.forEach((row, i) => {
        const fee = row.prices?.[cat];
        const label =
          fee === 0
            ? "Free entry"
            : Number.isFinite(fee)
              ? `${ticketMoney.format(fee)} entry`
              : "Ask the venue for the entry fee";
        cards[i].querySelector(".availability").textContent =
          label + (row.verification === "snapshot" ? " (last checked price)" : "");
        cards[i].querySelector(".visit-link").innerHTML = external(
          row.source_url,
          !Number.isFinite(fee) || fee === 0
            ? "Check visiting hours and entry information"
            : "Check the official ticket price",
        );
      });
      const row = rows[current];
      const photo = photos[row.id];
      detailBody.innerHTML = `<p>${h(photo?.ticketNote || row.content.note)}</p>
        ${cat.includes("student") && row.prices?.[cat] > 0 ? "<p>Bring your student ID. Ask at the ticket counter if it qualifies you for the student price.</p>" : ""}
        ${row.checked_at ? `<p>${row.verification === "official" ? "FairFare checked the venue’s website on" : row.verification === "published" ? "FairFare checked Rajasthan’s ticket website on" : "FairFare last checked this ticket price on"} ${date(row.checked_at)}.</p>` : ""}
        ${photo ? `<p>Photo: ${h(photo.author)}. Cropped and resized. ${external("https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(photo.source), "Original photo")} · ${external(photo.licenseUrl, photo.license)}</p>` : ""}`;
    }
    deck.addEventListener("cardchange", (event) => {
      if (current !== event.detail) details.open = false;
      current = event.detail;
      update();
    });
    visitor.onchange = update;
    bindDeck(deck);
    target.querySelectorAll("img").forEach((img) => {
      img.onerror = () => img.remove();
    });
  } catch {
    if (signal.aborted) return;
    target.innerHTML =
      notice("FairFare couldn’t load ticket prices. Check your internet connection, then try again.", "error") +
      '<button class="button secondary">Try loading ticket prices again</button>';
    target.querySelector("button").onclick = () => bindMonuments(root, signal);
  }
}
