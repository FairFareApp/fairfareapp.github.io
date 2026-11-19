import { icon, escapeHTML as h } from "./ui.js";
import { fareSources, routeTip, cardTip, meterTip } from "./travel-advice.js";

const intro = [
  {
    icon: "tags",
    title: "Check a price before you buy",
    text: "Scan bangles or a wooden elephant to compare similar examples in the Jaipur demo.",
  },
  {
    icon: "route",
    title: "Get around with a plan",
    text: "Compare fare references, agree a total and keep a note of the ride.",
  },
  {
    icon: "landmark",
    title: "Check entry before you go",
    text: "See official entry prices for selected Jaipur venues and the free stop.",
  },
];
const tips = [
  {
    icon: "map-location-dot",
    title: "Follow your ride",
    text: routeTip,
    href: "/autos",
    link: "Auto & local taxi fares",
  },
  {
    icon: "gauge",
    title: "Check the meter first",
    text: meterTip,
    href: "/autos",
    link: "See fare references",
  },
  {
    icon: "handshake",
    title: "Ask for the whole price",
    text: "Compare the same material and quantity. Check whether the price is fixed before making a polite offer.",
  },
  {
    icon: "bag-shopping",
    title: "Keep valuables discreet",
    text: "Leave expensive jewellery somewhere secure before visiting crowded markets. Keep your phone and bag close.",
  },
  {
    icon: "money-bill-transfer",
    title: "Exchange money at authorised places",
    text: "Use an authorised bank or money changer. Check the rate and fees and keep the receipt.",
    href: fareSources.exchange,
    link: "Reserve Bank guidance",
  },
  {
    icon: "credit-card",
    title: "Get your travel card ready",
    text: cardTip,
    href: "/taxis",
    link: "Ride-hailing fares",
  },
  {
    icon: "ticket",
    title: "Check entry and extras",
    text: "Confirm your ticket category at the official venue. Guide fees, cameras and special events can be separate.",
    href: "/monuments",
    link: "See monument prices",
  },
];

function cardMarkup(card) {
  return `<span class="deck-icon">${icon(card.icon)}</span><div><h3>${h(card.title)}</h3><p>${h(card.text)}</p>${card.href ? `<a class="text-link" href="${h(card.href)}"${card.href.startsWith("https:") ? ' target="_blank" rel="noopener noreferrer"' : ""}>${h(card.link)}</a>` : ""}</div>`;
}

export function deckMarkup(kind) {
  const cards = kind === "intro" ? intro : tips;
  const name = kind === "intro" ? "About FairFare" : "Jaipur tip cards";
  return `<section class="card-deck ${kind}-deck" data-deck="${kind}" aria-label="${name}">
    <div class="deck-card" aria-live="polite">${cardMarkup(cards[0])}</div>
    <div class="deck-controls">
      <button type="button" class="icon-button" data-deck-prev aria-label="Previous card">${icon("chevron-left")}</button>
      <span data-deck-index>1 / ${cards.length}</span>
      <button type="button" class="icon-button" data-deck-next aria-label="Next card">${icon("chevron-right")}</button>
    </div>
  </section>`;
}

export function bindDeck(root) {
  const cards = root.dataset.deck === "intro" ? intro : tips;
  const body = root.querySelector(".deck-card");
  const index = root.querySelector("[data-deck-index]");
  let current = 0;
  const move = (delta) => {
    current = (current + delta + cards.length) % cards.length;
    body.innerHTML = cardMarkup(cards[current]);
    index.textContent = `${current + 1} / ${cards.length}`;
  };
  root.querySelector("[data-deck-prev]").onclick = () => move(-1);
  root.querySelector("[data-deck-next]").onclick = () => move(1);
  root.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    move(event.key === "ArrowRight" ? 1 : -1);
  });
  let start;
  body.addEventListener(
    "touchstart",
    (event) => {
      start = event.touches[0];
    },
    { passive: true },
  );
  body.addEventListener(
    "touchend",
    (event) => {
      if (!start) return;
      const end = event.changedTouches[0];
      const dx = end.clientX - start.clientX;
      const dy = end.clientY - start.clientY;
      if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy))
        move(dx < 0 ? 1 : -1);
      start = null;
    },
    { passive: true },
  );
}
