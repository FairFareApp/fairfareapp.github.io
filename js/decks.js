import { icon, escapeHTML as h } from "./ui.js";
import { fareSources, routeTip, cardTip, meterTip } from "./travel-advice.js";

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

const intro = [
  {
    title: "Know what’s fair.",
    caption: "Compare Jaipur craft prices",
    image: "market",
    tone: "lac",
  },
  {
    title: "Ride with a plan.",
    caption: "Know what to check before you go",
    image: "ride",
    tone: "sage",
  },
  {
    title: "Step into Jaipur.",
    caption: "Find entry prices before you arrive",
    image: "visit",
    tone: "turmeric",
  },
];
let introAutoplay;

export function deckMarkup(kind) {
  if (kind === "intro")
    return swipeDeck(
      "intro",
      "Explore FairFare",
      intro.map((card) => ({
        label: card.title,
        tone: card.tone,
        content: `<img class="swipe-photo" src="/assets/brand/${card.image}.webp" alt="" width="1000" height="560" ${card.image === "market" ? 'fetchpriority="high"' : 'loading="lazy"'}><div class="brand-slide-copy"><h2>${h(card.title)}</h2><p>${h(card.caption)}</p></div>`,
      })),
      { autoplay: true },
    );
  const tones = [
    "indigo",
    "turmeric",
    "lac",
    "sage",
    "indigo",
    "lac",
    "turmeric",
  ];
  const cards = tips.map((card, i) => ({
    label: card.title,
    tone: tones[i],
    content: `<div class="tip-copy">
      <span class="deck-icon">${icon(card.icon)}</span>
      <h3>${h(card.title)}</h3><p>${h(card.text)}</p>
      ${card.href ? `<a class="text-link" href="${h(card.href)}"${card.href.startsWith("https:") ? ' target="_blank" rel="noopener noreferrer"' : ""}>${h(card.link)} ${icon("arrow-right")}</a>` : ""}
    </div>`,
  }));
  cards.push({
    tone: "sage",
    label: "You’re ready for Jaipur",
    content: `<div class="tip-copy"><span class="deck-icon">${icon("check")}</span><h3>You’re ready for Jaipur</h3><button class="button primary" type="button" data-deck-done>Done</button><button class="button secondary" type="button" data-deck-first>Read again</button></div>`,
  });
  return swipeDeck("tips", "Jaipur tip cards", cards, {
    limited: true,
    finale: true,
  });
}

export function swipeDeck(
  kind,
  title,
  cards,
  { autoplay = false, limited = false, finale = false } = {},
) {
  return `<section class="swipe-deck ${kind}-deck" data-deck="${kind}" ${limited ? "data-limited" : ""} ${finale ? "data-finale" : ""} aria-label="${h(title)}">
    <div class="swipe-stage">
      ${cards
        .map(
          (
            card,
            i,
          ) => `<article class="swipe-card tone-${card.tone || "sage"}" data-label="${h(card.label)}" ${i ? "hidden inert" : 'data-depth="0"'}>
        <button class="swipe-target" type="button" aria-label="${h(card.label)}. Show next card"></button>
        ${kind === "visits" ? `<span class="swipe-peek" aria-hidden="true">${h(card.label)}</span>` : ""}
        ${card.content}
      </article>`,
        )
        .join("")}
    </div>
    <div class="swipe-controls">
      <button class="icon-button" data-deck-step="-1" type="button" aria-label="Previous card">${icon("chevron-left")}</button>
      <span data-deck-count aria-live="${autoplay ? "off" : "polite"}"></span>
      <button class="icon-button" data-deck-step="1" type="button" aria-label="Next card">${icon("chevron-right")}</button>
      ${autoplay ? `<button class="icon-button deck-autoplay" type="button" data-deck-autoplay aria-label="Pause carousel">${icon("pause")}</button>` : ""}
    </div>
  </section>`;
}

export function bindDeck(root, signal) {
  const cards = [...root.querySelectorAll(".swipe-card")];
  const count = root.querySelector("[data-deck-count]");
  const arrows = [...root.querySelectorAll("[data-deck-step]")];
  const auto = root.querySelector("[data-deck-autoplay]");
  const limited = root.hasAttribute("data-limited");
  const finale = root.hasAttribute("data-finale");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const mouse = matchMedia("(hover: hover)");
  let index = 0;
  let gesture;
  let busy = false;
  let playing = Boolean(auto && !reduced.matches && (introAutoplay ?? true));
  let lastMove = Date.now();

  function destination(step) {
    return limited
      ? index + step
      : (index + step + cards.length) % cards.length;
  }

  function stack(direction = 1) {
    const neighbours = [
      index,
      destination(direction),
      destination(direction * 2),
    ];
    cards.forEach((card, i) => {
      const depth = neighbours.indexOf(i);
      card.hidden = depth < 0;
      card.inert = depth !== 0;
      card.dataset.depth = depth;
    });
  }

  function show(focus = false) {
    root.classList.remove("is-swiping");
    stack();
    const atEnd = finale && index === cards.length - 1;
    count.textContent = atEnd
      ? `${cards.length - 1} tips complete`
      : `${index + 1} / ${cards.length - Number(finale)}`;
    arrows[0].disabled = limited && index === 0;
    arrows[1].disabled = limited && index === cards.length - 1;
    if (focus)
      cards[index]
        .querySelector(atEnd ? "[data-deck-done]" : ".swipe-target")
        .focus({ preventScroll: true });
    root.dispatchEvent(new CustomEvent("cardchange", { detail: index }));
  }

  function transform(dx) {
    const angle = Math.max(-10, Math.min(10, dx / 24));
    return `translate3d(${dx}px, 0, 0) rotate(${angle}deg)`;
  }

  async function move(step, focus = false) {
    const next = destination(step);
    const card = cards[index];
    if (busy || gesture || !cards[next] || next === index) return;
    busy = true;
    root.classList.add("is-swiping");
    lastMove = Date.now();
    stack(step);
    if (!reduced.matches) {
      const flight = card.animate(
        [
          { transform: getComputedStyle(card).transform, opacity: 1 },
          { transform: transform(-step * card.offsetWidth), opacity: 0 },
        ],
        {
          duration: 265,
          easing: "cubic-bezier(.18,.72,.3,1)",
          fill: "forwards",
        },
      );
      await flight.finished.catch(() => {});
      flight.cancel();
    }
    card.style.transform = "";
    index = next;
    busy = false;
    show(focus && root.isConnected);
  }

  cards.forEach((card, i) => {
    const target = card.querySelector(".swipe-target");
    let suppressClick = false;
    const next = () => {
      if (finale && i === cards.length - 1) restart();
      else void move(1, true);
    };
    target.onpointerdown = (event) => {
      if (
        index !== i ||
        gesture ||
        busy ||
        !event.isPrimary ||
        event.button !== 0
      )
        return;
      suppressClick = false;
      lastMove = Date.now();
      card.getAnimations().forEach((animation) => animation.cancel());
      gesture = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: event.timeStamp,
        dx: 0,
        direction: 1,
        dragging: false,
      };
      target.setPointerCapture(event.pointerId);
    };
    target.onpointermove = (event) => {
      if (gesture?.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      if (!gesture.dragging && Math.abs(dx) > 9 && Math.abs(dx) > Math.abs(dy))
        gesture.dragging = true;
      if (!gesture.dragging) return;
      root.classList.add("is-swiping");
      gesture.dx = dx;
      const direction = dx > 0 ? -1 : 1;
      if (direction !== gesture.direction) stack(direction);
      gesture.direction = direction;
      if (!reduced.matches)
        card.style.transform = transform(
          cards[destination(direction)] ? dx : dx * 0.22,
        );
    };
    function release(event) {
      if (gesture?.id !== event.pointerId) return;
      const { x, y, dx, time, direction, dragging } = gesture;
      gesture = null;
      if (!dragging) {
        if (
          event.type === "pointerup" &&
          event.pointerType === "touch" &&
          Math.hypot(event.clientX - x, event.clientY - y) < 10
        ) {
          suppressClick = true;
          next();
        }
        return;
      }
      suppressClick = true;
      const distance = Math.abs(dx);
      const fling =
        distance > 32 && distance / Math.max(1, event.timeStamp - time) > 0.5;
      if (
        event.type === "pointerup" &&
        (distance >= 65 || fling) &&
        cards[destination(direction)]
      ) {
        void move(direction, card.contains(document.activeElement));
        return;
      }
      if (!reduced.matches)
        card.animate(
          [{ transform: card.style.transform }, { transform: "none" }],
          { duration: 190, easing: "ease-out" },
        );
      card.style.transform = "";
      stack();
      root.classList.remove("is-swiping");
    }
    target.onpointerup = release;
    target.onpointercancel = release;
    target.onlostpointercapture = release;
    target.onclick = (event) => {
      if (index !== i || (suppressClick && event.detail)) return;
      next();
    };
  });
  function restart() {
    if (busy) return;
    index = 0;
    show(true);
  }
  root.querySelector("[data-deck-first]")?.addEventListener("click", restart);
  root
    .querySelector("[data-deck-done]")
    ?.addEventListener("click", () => root.closest("dialog")?.close());
  arrows.forEach((button) => {
    button.onclick = () => void move(Number(button.dataset.deckStep));
  });
  root.addEventListener("keydown", (event) => {
    if (
      !["ArrowLeft", "ArrowRight"].includes(event.key) ||
      event.target.closest("a")
    )
      return;
    event.preventDefault();
    void move(event.key === "ArrowRight" ? 1 : -1, true);
  });
  if (auto) {
    function updateAuto() {
      auto.setAttribute(
        "aria-label",
        playing ? "Pause carousel" : "Play carousel",
      );
      auto.innerHTML = icon(playing ? "pause" : "play");
      count.setAttribute("aria-live", playing ? "off" : "polite");
    }
    auto.onclick = () => {
      playing = !playing;
      introAutoplay = playing;
      lastMove = Date.now();
      updateAuto();
    };
    reduced.addEventListener(
      "change",
      (event) => {
        if (event.matches) {
          playing = false;
          updateAuto();
        }
      },
      { signal },
    );
    updateAuto();
    const timer = setInterval(() => {
      if (
        !playing ||
        document.hidden ||
        (root.matches(":focus-within") && document.activeElement !== auto) ||
        (mouse.matches &&
          root.querySelector(".swipe-stage").matches(":hover")) ||
        Date.now() - lastMove < 6000
      )
        return;
      const rect = root.getBoundingClientRect();
      if (rect.top >= 0 && rect.bottom <= innerHeight) void move(1);
    }, 300);
    signal?.addEventListener("abort", () => clearInterval(timer), {
      once: true,
    });
  }
  show();
}
