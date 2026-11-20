import { icon, escapeHTML as h } from "./ui.js";
import { fareSources, routeTip, cardTip, meterTip } from "./travel-advice.js";

const intro = [
  {
    icon: "tags",
    tone: "lac",
    title: "Check a price before you buy",
    text: "Scan bangles or a wooden elephant to compare similar examples in the Jaipur demo.",
  },
  {
    icon: "route",
    tone: "indigo",
    title: "Get around with a plan",
    text: "Compare fare references, agree a total and keep a note of the ride.",
  },
  {
    icon: "landmark",
    tone: "turmeric",
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

export function deckMarkup(kind) {
  if (kind === "intro")
    return `<section class="intro-deck" data-deck="intro" aria-label="What you can do with FairFare">
      <div class="intro-track" tabindex="0" aria-label="FairFare features">
        ${intro
          .map(
            (card) => `<article class="intro-card tone-${card.tone}">
          <span class="deck-icon">${icon(card.icon)}</span>
          <div><h2>${h(card.title)}</h2><p>${h(card.text)}</p></div>
        </article>`,
          )
          .join("")}
      </div>
      <div class="intro-dots">${intro.map((card, i) => `<button type="button" data-slide="${i}" aria-label="${h(card.title)}"${i === 0 ? ' aria-current="true"' : ""}><span></span></button>`).join("")}</div>
    </section>`;
  const tones = [
    "indigo",
    "turmeric",
    "lac",
    "sage",
    "indigo",
    "lac",
    "turmeric",
  ];
  return `<section class="tips-deck" data-deck="tips" aria-label="Jaipur tip cards">
    <div class="tip-progress">
      <span data-tip-count aria-live="polite" aria-atomic="true">1 of ${tips.length}</span>
      <div class="tip-segments" aria-hidden="true">${tips.map(() => "<span></span>").join("")}</div>
    </div>
    <div class="tip-stack">
      ${tips
        .map(
          (card, i) => `<article class="tip-card tone-${tones[i]}" hidden inert>
        <button type="button" class="tip-dismiss" aria-labelledby="tip-title-${i}" aria-describedby="tip-copy-${i} tip-gesture">
          <span class="deck-icon">${icon(card.icon)}</span>
          <strong id="tip-title-${i}">${h(card.title)}</strong>
          <span id="tip-copy-${i}">${h(card.text)}</span>
        </button>
        ${card.href ? `<a class="text-link tip-link" href="${h(card.href)}"${card.href.startsWith("https:") ? ' target="_blank" rel="noopener noreferrer"' : ""}>${h(card.link)} ${icon(card.href.startsWith("https:") ? "arrow-up-right-from-square" : "arrow-right")}</a>` : ""}
      </article>`,
        )
        .join("")}
      <div class="tip-complete tone-sage" hidden>
        <span class="deck-icon">${icon("check")}</span>
        <h3>You’re ready for Jaipur</h3>
        <button class="button primary" type="button" data-tip-done>Done</button>
        <button class="button secondary" type="button" data-tip-replay>Read again</button>
      </div>
    </div>
    <div class="tip-footer">
      <span id="tip-gesture">Swipe or tap the card for the next tip</span>
      <button type="button" data-tip-back disabled>${icon("rotate-left")} Previous tip</button>
    </div>
  </section>`;
}

export function bindDeck(root) {
  if (root.dataset.deck === "intro") bindIntro(root);
  else bindTips(root);
}

function bindIntro(root) {
  const track = root.querySelector(".intro-track");
  const dots = [...root.querySelectorAll("[data-slide]")];
  track.addEventListener(
    "scroll",
    () => {
      const current = Math.round(track.scrollLeft / track.clientWidth);
      dots.forEach((dot, i) => {
        if (i === current) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    },
    { passive: true },
  );
  dots.forEach((dot, i) => {
    dot.onclick = () => track.scrollTo({ left: track.clientWidth * i });
  });
}

function bindTips(root) {
  const cards = [...root.querySelectorAll(".tip-card")];
  const segments = [...root.querySelectorAll(".tip-segments span")];
  const count = root.querySelector("[data-tip-count]");
  const back = root.querySelector("[data-tip-back]");
  const complete = root.querySelector(".tip-complete");
  const done = root.querySelector("[data-tip-done]");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let current = 0;
  let gesture;
  let busy = false;

  function show(focus = false) {
    cards.forEach((card, i) => {
      const depth = i - current;
      card.hidden = depth < 0 || depth > 2;
      card.inert = depth !== 0;
      card.dataset.depth = depth;
      segments[i].classList.toggle("is-read", i <= current);
    });
    const finished = current === cards.length;
    complete.hidden = !finished;
    root.classList.toggle("is-complete", finished);
    back.disabled = current === 0;
    count.textContent = finished
      ? `${cards.length} tips complete`
      : `${current + 1} of ${cards.length}`;
    if (focus)
      (finished ? done : cards[current].querySelector("button")).focus({
        preventScroll: true,
      });
  }

  function transform(x) {
    const angle = Math.max(-14, Math.min(14, x / 16));
    return `translate3d(${x}px, -3px, 0) rotate(${angle}deg)`;
  }

  async function dismiss(card, direction, focus) {
    if (busy) return;
    busy = true;
    if (!reducedMotion.matches) {
      const flight = card.animate(
        [
          { transform: card.style.transform || "none", opacity: 1 },
          { transform: transform(direction * card.offsetWidth), opacity: 0 },
        ],
        {
          duration: 245,
          easing: "cubic-bezier(.2,.68,.35,1)",
          fill: "forwards",
        },
      );
      await flight.finished.catch(() => {});
      flight.cancel();
    }
    card.style.transform = "";
    current++;
    busy = false;
    show(focus);
  }

  root.querySelectorAll(".tip-dismiss").forEach((button, i) => {
    const card = cards[i];
    let ignoreClick = false;
    button.onpointerdown = (event) => {
      if (current !== i || busy || !event.isPrimary || event.button !== 0)
        return;
      ignoreClick = false;
      card.getAnimations().forEach((animation) => animation.cancel());
      gesture = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: event.timeStamp,
        dx: 0,
        dragging: false,
      };
      button.setPointerCapture(event.pointerId);
    };
    button.onpointermove = (event) => {
      if (gesture?.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      if (!gesture.dragging && Math.abs(dx) > 9 && Math.abs(dx) > Math.abs(dy))
        gesture.dragging = true;
      if (!gesture.dragging) return;
      gesture.dx = dx;
      if (!reducedMotion.matches) card.style.transform = transform(dx);
    };
    function finish(event) {
      if (gesture?.id !== event.pointerId) return;
      const { dx, time, dragging } = gesture;
      gesture = null;
      if (!dragging) return;
      ignoreClick = true;
      const distance = Math.abs(dx);
      const fling =
        distance > 32 && distance / Math.max(1, event.timeStamp - time) > 0.5;
      if (event.type === "pointerup" && (distance >= 65 || fling)) {
        void dismiss(
          card,
          Math.sign(dx),
          card.contains(document.activeElement),
        );
      } else {
        if (!reducedMotion.matches)
          card.animate(
            [{ transform: card.style.transform }, { transform: "none" }],
            { duration: 190, easing: "cubic-bezier(.2,.8,.35,1)" },
          );
        card.style.transform = "";
      }
    }
    button.onpointerup = finish;
    button.onpointercancel = finish;
    button.onlostpointercapture = finish;
    button.onclick = (event) => {
      if (current !== i || (ignoreClick && event.detail > 0)) return;
      void dismiss(card, -1, true);
    };
  });
  back.onclick = () => {
    if (busy || !current) return;
    current--;
    show(true);
  };
  done.onclick = () => done.closest("dialog")?.close();
  root.querySelector("[data-tip-replay]").onclick = () => {
    current = 0;
    show(true);
  };
  show();
}
