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

const campaign = [
  [
    "Travel with FairFare.",
    "A little local know-how for your next trip.",
    "fairfare",
  ],
  ["Know before you buy.", "Check what similar finds cost.", "price-check"],
  ["Feel ready to ride.", "Know what to ask before you get in.", "ride-ready"],
  ["Plan your next stop.", "Check entry prices before you go.", "entry"],
  ["Pass it on.", "Share a price to help the next traveller.", "pass-it-on"],
];

export function campaignMarkup() {
  const last = campaign.at(-1);
  return `<section class="campaign" data-campaign aria-label="Explore FairFare">
    <div class="campaign-viewport">
      <div class="campaign-track">
        ${[last, ...campaign, campaign[0]]
          .map(
            (
              [title, caption, image],
              slot,
            ) => `<article class="campaign-slide" ${slot === 1 ? "" : "inert"}>
          <img src="/assets/brand/${image}.webp" width="1100" height="620" alt="" ${slot === 1 ? 'fetchpriority="high"' : 'decoding="async"'}>
          <div class="campaign-copy"><h2>${h(title)}</h2><p>${h(caption)}</p></div>
        </article>`,
          )
          .join("")}
      </div>
      <button class="swipe-target" type="button" aria-label="Show next FairFare story"></button>
    </div>
  </section>`;
}

const wrap = (index, size) => (index + size) % size;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const horizontal = ["ArrowLeft", "ArrowRight"];

function bindSwipe(target, { pressed, drag, settle, tap }) {
  let pointer;
  let suppressClick = false;
  target.onpointerdown = (event) => {
    if (pointer || !event.isPrimary || event.button !== 0 || !pressed()) return;
    suppressClick = false;
    pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: event.timeStamp,
      dx: 0,
      dragging: false,
    };
    target.setPointerCapture(event.pointerId);
  };
  target.onpointermove = (event) => {
    if (pointer?.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (Math.abs(dx) > 9 && Math.abs(dx) > Math.abs(dy))
      pointer.dragging = true;
    if (!pointer.dragging) return;
    pointer.dx = dx;
    drag(dx);
  };
  function release(event) {
    if (pointer?.id !== event.pointerId) return;
    const { x, y, dx, time, dragging } = pointer;
    pointer = null;
    if (!dragging) {
      if (
        event.type === "pointerup" &&
        event.pointerType === "touch" &&
        Math.hypot(event.clientX - x, event.clientY - y) < 10
      ) {
        suppressClick = true;
        tap();
      }
      return;
    }
    suppressClick = true;
    const distance = Math.abs(dx);
    const fling =
      distance > 30 && distance / Math.max(1, event.timeStamp - time) > 0.48;
    settle(
      event.type === "pointerup" && (distance > 62 || fling)
        ? dx < 0
          ? 1
          : -1
        : 0,
    );
  }
  target.onpointerup = release;
  target.onpointercancel = release;
  target.onlostpointercapture = release;
  target.onclick = (event) => {
    if (!suppressClick || event.detail === 0) tap();
  };
}

const ease = "cubic-bezier(.2,.78,.26,1)";

async function animate(element, frames, duration) {
  if (reducedMotion.matches) return;
  const motion = element.animate(frames, {
    duration,
    easing: ease,
    fill: "forwards",
  });
  await motion.finished.catch(() => {});
  return motion;
}

export function bindCampaign(root, signal) {
  const viewport = root.querySelector(".campaign-viewport");
  const track = root.querySelector(".campaign-track");
  const target = root.querySelector("button");
  const slides = [...track.children];
  let index = 0;
  let busy = false;
  let held = false;
  let autoplay = true;
  let lastMove = Date.now();
  const translate = (slot, dx = 0) =>
    `translate3d(calc(${slot * -100}% + ${dx}px),0,0)`;

  function show() {
    track.style.transform = translate(index + 1);
    root.dataset.index = index;
    slides.forEach((slide, i) => {
      slide.inert = i !== index + 1;
    });
    target.setAttribute(
      "aria-label",
      `${campaign[index][0]} ${campaign[index][1]} Show next FairFare story`,
    );
  }
  async function move(step, manual = true) {
    if (busy || held) return;
    if (manual) autoplay = false;
    busy = true;
    lastMove = Date.now();
    const dest = translate(index + 1 + step);
    const motion = await animate(
      track,
      [{ transform: getComputedStyle(track).transform }, { transform: dest }],
      step ? 465 : 240,
    );
    index = wrap(index + step, campaign.length);
    show();
    motion?.cancel();
    busy = false;
  }
  bindSwipe(target, {
    pressed() {
      if (busy) return false;
      autoplay = false;
      return true;
    },
    drag(dx) {
      held = true;
      if (!reducedMotion.matches)
        track.style.transform = translate(
          index + 1,
          Math.max(-viewport.clientWidth, Math.min(dx, viewport.clientWidth)),
        );
    },
    settle(step) {
      held = false;
      void move(step);
    },
    tap: () => void move(1),
  });
  root.onkeydown = (event) => {
    if (!horizontal.includes(event.key)) return;
    event.preventDefault();
    void move(event.key === "ArrowRight" ? 1 : -1);
  };
  const mouse = matchMedia("(hover: hover)");
  const timer = setInterval(() => {
    const rect = viewport.getBoundingClientRect();
    if (
      autoplay &&
      !reducedMotion.matches &&
      !document.hidden &&
      !root.matches(":focus-within") &&
      !(mouse.matches && root.matches(":hover")) &&
      Date.now() - lastMove >= 5700 &&
      rect.top >= 0 &&
      rect.bottom <= innerHeight &&
      !document.querySelector("dialog[open]")
    )
      void move(1, false);
  }, 250);
  signal.addEventListener("abort", () => clearInterval(timer), { once: true });
  show();
}

export function deckMarkup() {
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
    content: `<div class="tip-copy"><span class="deck-icon finish-stamp">${icon("check")}</span><h3>You’re ready for Jaipur</h3><p>Enjoy the trip. FairFare is here when you need a price check.</p><button class="button primary" type="button" data-deck-done>Done</button><button class="button secondary" type="button" data-deck-first>Read again</button></div>`,
  });
  return swipeDeck("tips", "Jaipur tip cards", cards, true);
}

export function swipeDeck(kind, title, cards, limited = false) {
  return `<section class="swipe-deck ${kind}-deck" data-deck="${kind}" ${limited ? "data-limited" : ""} aria-label="${h(title)}">
    <p class="deck-instruction">${icon("hand-pointer")} Swipe or tap to ${limited ? "turn the cards" : "explore"}</p>
    <div class="swipe-stage">
      ${cards
        .map(
          (
            card,
            i,
          ) => `<article class="swipe-card tone-${card.tone || "sage"}" data-label="${h(card.label)}" ${i ? "hidden inert" : 'data-depth="0"'}>
        <button class="swipe-target" type="button" aria-label="${h(card.label)}. ${limited && i === cards.length - 1 ? "Start again" : "Show next card"}"></button>
        ${kind === "visits" ? `<span class="swipe-peek" aria-hidden="true">${h(card.label)}</span>` : ""}
        ${card.content}
      </article>`,
        )
        .join("")}
    </div>
    <span class="sr-only" data-deck-status aria-live="polite"></span>
  </section>`;
}

function bindVisits(root) {
  const cards = [...root.querySelectorAll(".swipe-card")];
  const peeks = cards.map((card) => card.querySelector(".swipe-peek"));
  const status = root.querySelector("[data-deck-status]");
  const count = cards.length;
  const turnPoint = 0.48;
  const mix = (from, to, t) => from + (to - from) * t;
  const depthY = (depth) => -(depth <= 2 ? depth * 26 : 52 + (depth - 2) * 11);
  const label = (depth) => (depth === 1 || depth === 2 ? 1 : 0);
  let index = 0;
  let progress = 0;
  let direction = 1;
  let width = 0;
  let busy = false;

  // Travelling backwards plays the same card paths in reverse.
  function draw(step, amount) {
    const t = step === 1 ? amount : 1 - amount;
    const front = step === 1 ? index : wrap(index - 1, count);
    cards.forEach((card, i) => {
      const from = wrap(i - front, count);
      const to = wrap(from - 1, count);
      let x = 0;
      let y = mix(depthY(from), depthY(to), t);
      let tilt = 0;
      let scale = mix(1 - from * 0.024, 1 - to * 0.024, t);
      let layer = count - from + 1;
      if (from === 0) {
        const outbound = t <= turnPoint;
        const part = outbound
          ? t / turnPoint
          : (t - turnPoint) / (1 - turnPoint);
        const offset = width + 46;
        x = outbound ? -offset * part : -offset * (1 - part);
        y = outbound ? -10 * part : mix(-10, depthY(to), part);
        tilt = -12 * (outbound ? part : 1 - part);
        scale = outbound ? 1 : mix(1, 1 - to * 0.024, part);
        layer = outbound ? count + 2 : 1;
      }
      card.style.transform = `translate3d(${x}px,${y}px,0) rotate(${tilt}deg) scaleX(${scale})`;
      card.style.zIndex = layer;
      peeks[i].style.opacity = mix(label(from), label(to), t);
    });
  }

  function show(focus = false) {
    cards.forEach((card, i) => {
      const depth = wrap(i - index, count);
      card.hidden = false;
      card.inert = depth !== 0;
      card.dataset.depth = depth;
    });
    draw(1, 0);
    root.dataset.index = index;
    status.textContent = cards[index].dataset.label;
    root.dispatchEvent(new CustomEvent("cardchange", { detail: index }));
    if (focus)
      cards[index].querySelector("button").focus({ preventScroll: true });
  }

  function settle(step, focus = false) {
    if (busy || count < 2) return;
    busy = true;
    width = cards[index].offsetWidth;
    const start = progress;
    const end = step ? 1 : 0;
    const travel = step || direction;
    const duration = step ? 560 - start * 200 : 220;
    function finish() {
      progress = 0;
      busy = false;
      if (step) {
        index = wrap(index + step, count);
        show(focus);
      } else draw(1, 0);
    }
    if (reducedMotion.matches) {
      finish();
      return;
    }
    const started = performance.now();
    function frame(now) {
      if (!root.isConnected) return;
      const elapsed = Math.min(1, Math.max(0, (now - started) / duration));
      const eased = elapsed * elapsed * (3 - 2 * elapsed);
      draw(travel, mix(start, end, eased));
      if (elapsed < 1) requestAnimationFrame(frame);
      else finish();
    }
    requestAnimationFrame(frame);
  }

  cards.forEach((card, i) => {
    bindSwipe(card.querySelector(".swipe-target"), {
      pressed() {
        if (i !== index || busy) return false;
        width = card.offsetWidth;
        return true;
      },
      drag(dx) {
        direction = dx < 0 ? 1 : -1;
        progress = Math.min(0.9, (Math.abs(dx) * turnPoint) / (width + 46));
        if (!reducedMotion.matches) draw(direction, progress);
      },
      settle: (step) => settle(step, card.contains(document.activeElement)),
      tap() {
        if (i === index && !progress) settle(1, true);
      },
    });
  });
  root.onkeydown = (event) => {
    if (
      !horizontal.includes(event.key) ||
      event.target.closest("a") ||
      progress
    )
      return;
    event.preventDefault();
    settle(event.key === "ArrowRight" ? 1 : -1, true);
  };
  show();
}

export function bindDeck(root) {
  if (root.classList.contains("visits-deck")) return bindVisits(root);
  const cards = [...root.querySelectorAll(".swipe-card")];
  const status = root.querySelector("[data-deck-status]");
  const limited = root.hasAttribute("data-limited");
  const spacing = 9;
  let index = 0;
  let direction = 1;
  let busy = false;

  const next = (step) =>
    limited ? index + step : wrap(index + step, cards.length);
  const pose = (depth) => ({
    x: 0,
    y: spacing * depth,
    scale: 1 - 0.036 * depth,
    turn: 0,
  });
  const transform = ({ x, y, scale, turn }) =>
    `translate3d(${x}px,${y}px,0) rotate(${turn}deg) scale(${scale})`;
  const displaced = (dx) => ({
    ...pose(0),
    x: dx,
    y: -Math.min(12, Math.abs(dx) * 0.06),
    turn: Math.max(-13, Math.min(13, dx / 16)),
  });

  function layer(order) {
    cards.forEach((card, i) => {
      const depth = order.indexOf(i);
      card.hidden = depth < 0;
      card.inert = depth !== 0;
      card.dataset.depth = depth;
      if (depth >= 0) card.style.transform = transform(pose(depth));
    });
  }
  function show(focus = false) {
    direction = 1;
    layer([index, next(1), next(2)]);
    root.dataset.index = index;
    status.textContent = cards[index].dataset.label;
    root.dispatchEvent(new CustomEvent("cardchange", { detail: index }));
    if (focus)
      (
        cards[index].querySelector("[data-deck-done]") ??
        cards[index].querySelector("button")
      ).focus({ preventScroll: true });
  }
  function prepare(step) {
    if (direction === step) return;
    direction = step;
    layer([index, next(step), next(step * 2)]);
  }

  async function settle(step, focus) {
    if (busy) return;
    const active = cards[index];
    const incoming = cards[next(step)];
    if (!step || !incoming || active === incoming) {
      busy = true;
      const settling = cards
        .filter((card) => !card.hidden)
        .map(async (card) => {
          const final = transform(pose(Number(card.dataset.depth)));
          const motion = await animate(
            card,
            [{ transform: card.style.transform }, { transform: final }],
            240,
          );
          card.style.transform = final;
          motion?.cancel();
        });
      await Promise.all(settling);
      busy = false;
      return;
    }

    busy = true;
    prepare(step);
    const width = active.offsetWidth;
    const side = transform(displaced(-step * (width + 45)));
    const order = [next(step), next(step + 1), next(step + 2)];
    const moving = new Set([
      active,
      incoming,
      ...order.map((i) => cards[i]).filter(Boolean),
      ...cards.filter((card) => !card.hidden),
    ]);
    const motions = await Promise.all(
      [...moving].map(async (card) => {
        const depth = order.indexOf(cards.indexOf(card));
        if (card === active) {
          const from = card.style.transform;
          if (limited && depth < 0)
            return animate(
              card,
              [{ transform: from }, { transform: side }],
              450,
            );
          const rear = transform(pose(depth >= 0 ? depth : 2));
          return animate(
            card,
            [
              { transform: from, zIndex: 5, offset: 0 },
              { transform: side, zIndex: 5, offset: 0.48 },
              { transform: side, zIndex: 0, offset: 0.49 },
              { transform: rear, zIndex: 0, offset: 1 },
            ],
            560,
          );
        }
        if (card.hidden && depth >= 0) {
          card.hidden = false;
          card.inert = true;
          card.dataset.depth = 3;
          card.style.transform = transform(pose(3));
        }
        return animate(
          card,
          [
            { transform: card.style.transform },
            { transform: transform(pose(depth < 0 ? 3 : depth)) },
          ],
          450,
        );
      }),
    );
    index = next(step);
    show(focus && root.isConnected);
    motions.forEach((motion) => motion?.cancel());
    busy = false;
  }

  cards.forEach((card, i) => {
    const target = card.querySelector(".swipe-target");
    bindSwipe(target, {
      pressed: () => !busy && i === index,
      drag(dx) {
        const step = dx < 0 ? 1 : -1;
        prepare(step);
        const incoming = cards[next(step)];
        if (reducedMotion.matches) return;
        card.style.transform = transform(displaced(incoming ? dx : dx * 0.2));
        if (incoming && incoming !== card) {
          const depth =
            1 - Math.min(0.88, Math.abs(dx) / (card.offsetWidth * 0.75));
          incoming.style.transform = transform(pose(depth));
        }
      },
      settle: (step) =>
        void settle(step, card.contains(document.activeElement)),
      tap() {
        if (index !== i || busy) return;
        if (limited && i === cards.length - 1) restart();
        else void settle(1, true);
      },
    });
  });
  function restart() {
    if (busy) return;
    index = 0;
    show(true);
  }
  root.querySelector("[data-deck-first]")?.addEventListener("click", restart);
  root.querySelector("[data-deck-done]")?.addEventListener("click", () => {
    root.dispatchEvent(new CustomEvent("readycomplete", { bubbles: true }));
    root.closest("dialog")?.close();
  });
  root.onkeydown = (event) => {
    if (!horizontal.includes(event.key) || event.target.closest("a")) return;
    event.preventDefault();
    void settle(event.key === "ArrowRight" ? 1 : -1, true);
  };
  show();
}
