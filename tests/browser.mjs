// Real Chrome/Edge integration checks. Uses the installed design inspector's CDP driver.
// No OpenRouter calls or public submission writes: only those two endpoints are intercepted.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
const driver =
  process.env.TASTE_CDP_PATH ||
  join(
    process.env.USERPROFILE || process.env.HOME,
    ".agents/skills/design-taste-frontend/scripts/lib/cdp.mjs",
  );
const { Browser } = await import(pathToFileURL(driver));
const base = process.env.TEST_BASE_URL || "http://localhost:4173";
const [width, height] = (process.env.FAIRFARE_VIEWPORT || "375x812")
  .split("x")
  .map(Number);
const out = resolve(
  process.env.FAIRFARE_SCREENSHOTS ||
    `.local/browser-${width}x${height}${base.includes("github.io") ? "-production" : ""}`,
);
await mkdir(out, { recursive: true });
const browser = await Browser.launch(),
  page = await browser.newPage({ width, height, mobile: width < 761 });
const checks = [],
  requests = [],
  submissionBodies = [];
let photoMode = "success",
  mockSubmissions = 0,
  mockIdentifications = 0,
  slowSubmission = false;
browser.on(page.sessionId, "Network.requestWillBeSent", (e) =>
  requests.push({ url: e.request.url, method: e.request.method }),
);
await page.send("Network.enable");
await page.send("Fetch.enable", {
  patterns: [
    { urlPattern: "*functions/v1/fairfare-identify*" },
    { urlPattern: "*functions/v1/fairfare-submit*" },
  ],
});
browser.on(page.sessionId, "Fetch.requestPaused", async (e) => {
  const identifying = e.request.url.includes("fairfare-identify"),
    preflight = e.request.method === "OPTIONS";
  if (!preflight) {
    if (identifying) mockIdentifications++;
    else {
      mockSubmissions++;
      submissionBodies.push(JSON.parse(e.request.postData || "{}"));
    }
  }
  const body = preflight
    ? {}
    : identifying
      ? photoMode === "bangles"
        ? {
            category_id: "bangles",
            product_name: "Patterned bangles",
            finish: "patterned",
            visible_characteristics: "Patterned rigid bangles.",
            uncertainty: "Material is uncertain.",
          }
        : photoMode === "success"
          ? {
              category_id: "wooden_elephant",
              product_name: "Wooden elephant",
              material: "wood",
              finish: "plain",
              visible_characteristics: "Carved wood. Browser-test fixture.",
              uncertainty:
                "Photo cannot verify size, species, origin or quality.",
            }
          : {
              error:
                "Test photo service unavailable. Enter details manually or retry.",
            }
      : {
          id: String(mockSubmissions).padStart(8, "0") + "-browser-test",
          status: "pending",
        };
  if (slowSubmission && !identifying && !preflight)
    await new Promise((resolve) => setTimeout(resolve, 600));
  await page.send("Fetch.fulfillRequest", {
    requestId: e.requestId,
    responseCode: preflight
      ? 200
      : identifying && photoMode === "error"
        ? 502
        : 200,
    responseHeaders: [
      { name: "Content-Type", value: "application/json" },
      { name: "Access-Control-Allow-Origin", value: base },
      { name: "Access-Control-Allow-Headers", value: "apikey,content-type" },
      { name: "Access-Control-Allow-Methods", value: "POST,OPTIONS" },
    ],
    body: Buffer.from(JSON.stringify(body)).toString("base64"),
  });
});
const wait = async (expression) => {
  const until = Date.now() + 20000;
  while (Date.now() < until) {
    if (await page.eval(expression)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Timed out: " + expression);
};
const click = async (selector) => {
  const p = await page.eval((s) => {
    const el = document.querySelector(s);
    if (!el) throw Error("Missing " + s);
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, selector);
  await page.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    button: "left",
    clickCount: 1,
    ...p,
  });
  await page.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    button: "left",
    clickCount: 1,
    ...p,
  });
};
const fill = async (selector, value) =>
  page.eval(
    ({ selector, value }) => {
      const e = document.querySelector(selector);
      if (!e) throw Error("Missing " + selector);
      if (e.type === "checkbox") e.checked = Boolean(value);
      else e.value = String(value);
      e.dispatchEvent(new Event("input", { bubbles: true }));
      e.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { selector, value },
  );
const file = async (selector, asset = "plain.webp") => {
  const { root } = await page.send("DOM.getDocument");
  const { nodeId } = await page.send("DOM.querySelector", {
    nodeId: root.nodeId,
    selector,
  });
  await page.send("DOM.setFileInputFiles", {
    nodeId,
    files: [resolve("assets/references", asset)],
  });
};
const screens = [];
const phone = width < 761;
const shot = async (name, primary, required = []) => {
  await page.eval(() => {
    if (
      location.pathname === "/" &&
      document.querySelector(
        "#scan :is(.photo-selected,.confirmation-details[open])",
      )
    )
      document.querySelector("#scan").scrollIntoView({ block: "start" });
    else window.scrollTo(0, 0);
  });
  if (primary) {
    const metrics = await page.eval(
      ({ primary, required }) => {
        const controls = [primary, ...required].map((selector) => {
          const el = document.querySelector(selector);
          const rect = el.getBoundingClientRect();
          const inView =
            rect.height > 0 && rect.top >= 0 && rect.bottom <= innerHeight;
          const target = inView
            ? document.elementFromPoint(
                rect.x + rect.width / 2,
                rect.y + rect.height / 2,
              )
            : null;
          return {
            selector,
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            height: Math.round(rect.height),
            unobscured: Boolean(target && el.contains(target)),
          };
        });
        return {
          controls,
          scrollHeight: document.documentElement.scrollHeight,
        };
      },
      { primary, required },
    );
    for (const control of metrics.controls) {
      assert.ok(
        control.unobscured,
        `${name}: ${control.selector} obscured at ${width}×${height} (${JSON.stringify(control)})`,
      );
      if (phone)
        assert.ok(control.height >= 44, `${name}: touch target below 44px`);
    }
    screens.push({ name, ...metrics });
  }
  await page.screenshot({ path: join(out, name + ".jpg"), quality: 88 });
};
const check = async (name, fn) => {
  await fn();
  checks.push({ name, status: "PASS" });
  console.log("PASS", name);
};

function deckFace(kind) {
  return `.${kind}-deck .swipe-card[data-depth="0"]`;
}
async function deckNumber(kind, number) {
  const selector = kind === "intro" ? ".campaign" : `.${kind}-deck`;
  await wait(
    `document.querySelector('${selector}')?.dataset.index === '${number - 1}'`,
  );
}
async function dragCard(kind, dx, capture) {
  const intro = kind === "intro";
  const card = intro ? ".campaign-track" : deckFace(kind);
  const target = intro ? ".campaign .swipe-target" : `${card} .swipe-target`;
  const resting = await page.eval(
    (s) => document.querySelector(s).style.transform,
    card,
  );
  const nextResting =
    kind === "visits"
      ? await page.eval(
          () =>
            document.querySelector('.visits-deck [data-depth="1"]').style
              .transform,
        )
      : null;
  const start = await page.eval((selector) => {
    const { x, y, width, height } = document
      .querySelector(selector)
      .getBoundingClientRect();
    return { x: Math.round(x + width / 2), y: Math.round(y + height * 0.34) };
  }, target);
  if (!phone)
    await page.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      ...start,
    });
  const sendPointer = (phase, offset) => {
    const x = start.x + offset;
    const y = start.y;
    return phone
      ? page.send("Input.dispatchTouchEvent", {
          type: { down: "touchStart", move: "touchMove", up: "touchEnd" }[
            phase
          ],
          touchPoints: phase === "up" ? [] : [{ x, y }],
        })
      : page.send("Input.dispatchMouseEvent", {
          type: {
            down: "mousePressed",
            move: "mouseMoved",
            up: "mouseReleased",
          }[phase],
          button: phase === "move" ? "none" : "left",
          buttons: phase === "up" ? 0 : 1,
          clickCount: 1,
          x,
          y,
        });
  };
  await sendPointer("down", 0);
  if (dx) {
    await sendPointer("move", dx);
    await wait(
      `document.querySelector('${card}').style.transform !== ${JSON.stringify(resting)}`,
    );
    if (kind === "visits") {
      assert.notEqual(
        await page.eval(
          () =>
            document.querySelector('.visits-deck [data-depth="1"]').style
              .transform,
        ),
        nextResting,
      );
    }
    if (capture) await shot(capture);
  }
  await sendPointer("up", dx);
}
async function key(name, code) {
  await page.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: name,
    code: name,
    windowsVirtualKeyCode: code,
    nativeVirtualKeyCode: code,
    ...(name === "Enter" ? { text: "\r" } : {}),
  });
  await page.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: name,
    code: name,
    windowsVirtualKeyCode: code,
  });
}
try {
  await page.goto(base);
  await check(
    "browser launch animates and installed launch hands the logo to the header",
    async () => {
      assert.deepEqual(
        await page.eval(async () => {
          const manifest = await fetch("/manifest.webmanifest").then(
            (response) => response.json(),
          );
          return [
            manifest.background_color,
            manifest.theme_color,
            document.querySelector('meta[name="theme-color"]').content,
          ];
        }),
        ["#f4dfc6", "#f4dfc6", "#f4dfc6"],
      );
      const { identifier } = await page.send(
        "Page.addScriptToEvaluateOnNewDocument",
        {
          source: `
        document.addEventListener("animationstart", event => {
          if (event.animationName !== "launch-mark") return;
          const splash = document.querySelector("#launch-splash");
          const colours = getComputedStyle(splash.querySelector(".launch-colours"));
          window.fairfareLaunchCount = (window.fairfareLaunchCount || 0) + 1;
          window.fairfareLaunchFrame = [
            getComputedStyle(splash).display,
            colours.backgroundImage.startsWith("linear-gradient"),
            colours.opacity,
          ];
        }, true);
        const observer = new MutationObserver(() => {
          const splash = document.querySelector(".launch-handoff");
          const flight = splash?.querySelector(".launch-mark").getAnimations()
            .find(animation => animation.id === "fairfare-launch-handoff");
          if (!flight) return;
          window.fairfareHandoff = [
            flight.effect.getTiming().duration,
            Boolean(document.querySelector(".brand img[data-launch-target]")),
            getComputedStyle(splash.querySelector(".launch-colours")).backgroundImage.startsWith("linear-gradient"),
          ];
          observer.disconnect();
        });
        observer.observe(document, { subtree: true, attributes: true, attributeFilter: ["class", "data-launch-target"] });`,
        },
      );
      await page.goto(base, { settleMs: 0 });
      await wait("window.fairfareLaunchCount === 1");
      assert.deepEqual(await page.eval(() => window.fairfareLaunchFrame), [
        "grid",
        true,
        "1",
      ]);
      const installed = await page.send(
        "Page.addScriptToEvaluateOnNewDocument",
        {
          source:
            'Object.defineProperty(navigator, "standalone", { value: true });',
        },
      );
      await page.send("Emulation.setEmulatedMedia", {
        features: [{ name: "display-mode", value: "standalone" }],
      });
      await page.goto(base, { settleMs: 0 });
      await wait("window.fairfareHandoff");
      assert.deepEqual(await page.eval(() => window.fairfareHandoff), [
        320,
        true,
        true,
      ]);
      if (
        await page.eval(() => !document.querySelector("#launch-splash").hidden)
      )
        await shot("installed-handoff");
      await wait(
        "document.querySelector('#launch-splash').hidden && !document.querySelector('[data-launch-target]') && document.querySelector('#take-photo')",
      );
      await page.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
      await page.goto(base, { settleMs: 0 });
      await wait("document.querySelector('#launch-splash').hidden");
      assert.equal(await page.eval(() => window.fairfareLaunchCount ?? 0), 0);
      assert.equal(await page.eval(() => window.fairfareHandoff ?? null), null);
      await page.send("Emulation.setEmulatedMedia", { features: [] });
      await page.send("Page.removeScriptToEvaluateOnNewDocument", {
        identifier,
      });
      await page.send("Page.removeScriptToEvaluateOnNewDocument", installed);
      await page.goto(base);
    },
  );
  await check(
    "Home explains FairFare before the photo tools and resets the carousel on return",
    async () => {
      await deckNumber("intro", 1);
      await shot("home", "#take-photo", ["#choose-photo", ".city-trigger"]);
      assert.ok(
        await page.eval(() => {
          const scan = document.querySelector("#scan").getBoundingClientRect();
          const tips = document
            .querySelector(".ready-launch")
            .getBoundingClientRect();
          return (
            scan.bottom <= tips.top &&
            document
              .querySelector("#main section")
              .classList.contains("home-intro") &&
            document.querySelectorAll(".bottom-nav a").length === 4 &&
            !document.querySelector('.bottom-nav a[href="/scan"]')
          );
        }),
      );
      assert.ok(
        await page.eval(() => {
          const photo = document
            .querySelector("#take-photo")
            .getBoundingClientRect();
          const picker = document.querySelector("#scan .photo-card");
          const gallery = document
            .querySelector("#choose-photo")
            .getBoundingClientRect();
          return (
            Math.abs(photo.width - picker.clientWidth) < 1 &&
            photo.height >= 80 &&
            gallery.top >= photo.bottom &&
            document.querySelector(".ready-launch").getBoundingClientRect()
              .height >= 136 &&
            document.querySelectorAll(".campaign-slide").length === 7 &&
            document
              .querySelector(".campaign-slide:not([inert]) h2")
              .textContent.includes("FairFare") &&
            !document.querySelector('#main a[href="/privacy"]') &&
            Boolean(document.querySelector('footer a[href="/privacy"]'))
          );
        }),
      );
      await page.eval(() =>
        document.querySelector(".campaign").scrollIntoView({ block: "center" }),
      );
      await deckNumber("intro", 2);
      for (const index of [3, 4, 5, 1]) {
        await dragCard("intro", -92);
        await deckNumber("intro", index);
      }
      await dragCard("intro", 92);
      await deckNumber("intro", 5);
      await dragCard("intro", 0);
      await deckNumber("intro", 1);
      await click(".campaign .swipe-target");
      await deckNumber("intro", 2);
      await click('.intro-links a[href="/fares"]');
      await wait("location.pathname === '/fares'");
      await page.eval(() => history.back());
      await deckNumber("intro", 1);
    },
  );
  await check(
    "the city selector shows Jaipur and disables every other city",
    async () => {
      assert.match(
        await page.eval(() => document.querySelector(".city-trigger").innerText),
        /Jaipur\s+Change city/,
      );
      await click(".city-trigger");
      await wait("document.querySelector('#info-dialog').open");
      assert.match(
        await page.eval(() => document.querySelector("#dialog-body").innerText),
        /Jaipur is the only city available in this demo/,
      );
      assert.ok(
        await page.eval(() => {
          const otherCities = [...document.querySelectorAll(".city-list button")];
          return (
            otherCities.length >= 2 &&
            otherCities.every((button) => button.disabled) &&
            document.querySelector(".city-current").innerText.includes("Selected")
          );
        }),
      );
      await shot("choose-city", "#close-dialog");
      await key("Escape", 27);
      await wait(
        "!document.querySelector('#info-dialog').open && document.activeElement.classList.contains('city-trigger')",
      );
    },
  );
  await check(
    "Jaipur tips share both swipe directions, tap and keyboard navigation",
    async () => {
      await click(".ready-launch");
      await wait("document.querySelector('#info-dialog').open");
      const front = deckFace("tips");
      const face = `${front} .swipe-target`;
      const text = () =>
        page.eval((s) => document.querySelector(s).innerText, front);
      await deckNumber("tips", 1);
      const routeAdvice = /ask the driver, “Is there a reason we’re going this way\? Will it cost more\?”/;
      assert.match(await text(), routeAdvice);
      await shot("jaipur-flashcards", face);
      await dragCard("tips", -23);
      await wait(
        "document.querySelector('.tips-deck').getAnimations({subtree:true}).length === 0",
      );
      await dragCard("tips", -92, "jaipur-flashcards-drag");
      await deckNumber("tips", 2);
      await dragCard("tips", 92);
      await deckNumber("tips", 1);
      await dragCard("tips", 0);
      await deckNumber("tips", 2);
      await key("Enter", 13);
      await deckNumber("tips", 3);
      await click(face);
      await deckNumber("tips", 4);
      await click(face);
      await deckNumber("tips", 5);
      assert.match(await text(), /bank or a licensed money changer/);
      await shot("jaipur-flashcards-money", face, [`${front} .text-link`]);
      await dragCard("tips", 92);
      await deckNumber("tips", 4);
      await page.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
      for (let i = 4; i <= 7; i++) {
        await deckNumber("tips", i);
        await click(face);
      }
      await deckNumber("tips", 8);
      await click("[data-deck-first]");
      await deckNumber("tips", 1);
      await page.eval(() => (document.documentElement.dataset.theme = "dark"));
      await shot("jaipur-flashcards-dark", face);
      await page.eval(() => (document.documentElement.dataset.theme = "light"));
      for (let i = 1; i <= 7; i++) {
        await deckNumber("tips", i);
        await click(face);
      }
      await deckNumber("tips", 8);
      await page.send("Emulation.setEmulatedMedia", { features: [] });
      await click("[data-deck-done]");
      await wait("!document.querySelector('#info-dialog').open");
      await wait("document.querySelector('.ready-launch.is-ready')");
      assert.equal(
        await page.eval(
          () => document.querySelector(".confirmation-details").open,
        ),
        false,
      );
      await shot("scan-photo", "#take-photo", [
        "#choose-photo",
        ".confirmation-details > summary",
      ]);
      const disclosureAction = () => page.eval(() =>
        document.querySelector(".confirmation-details .disclosure-action").innerText,
      );
      assert.equal(await disclosureAction(), "Show");
      await click(".confirmation-details > summary");
      assert.equal(await disclosureAction(), "Hide");
      await shot("scan-manual", '#attributes-form button[type="submit"]');
      await click(".confirmation-details > summary");
    },
  );

  await check(
    "gallery automatically identifies; confirmation leads to real database range",
    async () => {
      await file("#gallery-input");
      await wait("document.querySelector('.recognition')");
      assert.match(
        await page.eval(() => document.querySelector("#photo-area img").src),
        /^blob:/,
      );
      await shot("scan-confirm", '#attributes-form button[type="submit"]', [
        "#size_cm",
        "#segment",
        ".attribute-extra > summary",
      ]);
      assert.ok(
        await page.eval(
          () =>
            !document.querySelector("#finish").checkVisibility() &&
            document
              .querySelector(".inferred-detail")
              .innerText.includes("plain"),
        ),
      );
      await click(".attribute-extra > summary");
      await fill("#material", "wood");
      await click(".attribute-extra > summary");
      await fill('[name="size_cm"]', 10);
      await click('#attributes-form button[type="submit"]');
      await wait("location.pathname==='/compare'");
      assert.ok(await page.eval(() => document.querySelector(".price-range")));
      assert.equal(
        await page.eval(
          () =>
            getComputedStyle(
              document.querySelector(".price-found .price-range"),
            ).animationName,
        ),
        "price-unfold",
      );
      assert.match(
        await page.eval(() => document.querySelector(".price-panel").innerText),
        /FairFare made up \d+ of these prices for this demo/,
      );
      assert.ok(
        requests.every(
          (r) => !r.url.includes("/storage/v1/object/") || r.method === "GET",
        ),
      );
      assert.match(
        await page.eval(
          () => document.querySelector(".bargaining-card").innerText,
        ),
        /Local craft shop[\s\S]*5–10% below the price the seller asks for/,
      );
      await shot("result", "#report-purchase");
    },
  );
  await check(
    "comparable images, details and price quote disclosure work",
    async () => {
      await click(".result-disclosures>details:first-child>summary");
      await wait(
        "[...document.querySelectorAll('.reference-image img')].some(i=>i.complete&&i.naturalWidth>0)",
      );
      await page.eval(async () => {
        document.querySelectorAll(".reference-image img").forEach((img) => {
          img.loading = "eager";
        });
        await Promise.all(
          [...document.querySelectorAll(".reference-image img")].map((img) =>
            img.decode().catch(() => {}),
          ),
        );
      });
      assert.ok(
        await page.eval(() =>
          [...document.querySelectorAll(".reference-image img")].every(
            (i) => i.naturalWidth > 0,
          ),
        ),
      );
      await click(".comparable details>summary");
      assert.match(
        await page.eval(() => document.querySelector(".comparable").innerText),
        /This picture shows what this style can look like/,
      );
      if (phone) {
        assert.equal(
          await page.eval(
            () =>
              getComputedStyle(document.querySelector(".result-actions"))
                .position,
          ),
          "fixed",
        );
        assert.ok(await page.eval(() => window.scrollY > 0));
        assert.ok(
          await page.eval(() => {
            const button = document.querySelector("#report-purchase"),
              rect = button.getBoundingClientRect();
            return button.contains(
              document.elementFromPoint(
                rect.x + rect.width / 2,
                rect.y + rect.height / 2,
              ),
            );
          }),
        );
      }
      await page.screenshot({
        path: join(out, "comparables.jpg"),
        quality: 88,
      });
      await click(".result-disclosures>details:last-child>summary");
      await fill("#quoted-price", 600);
      await click("#quote-form button");
      await wait(
        "document.querySelector('#quote-context').innerText.includes('price the seller asks for')",
      );
    },
  );
  await check(
    "quick purchase reuses details, retains draft and requires explicit consent",
    async () => {
      await click("#report-purchase");
      await wait("location.pathname==='/report'");
      await shot("purchase-price", "#wizard-next", ["#price", "#locality"]);
      await fill("#price", 400);
      await fill("#locality", "Bapu Bazaar");
      await click("#wizard-next");
      await wait("document.querySelector('#evidence-file')");
      assert.equal(
        await page.eval(() => document.querySelector("#photo-consent").hidden),
        true,
      );
      await shot("purchase-evidence", "#wizard-next");
      await fill("#attach-scan", true);
      assert.equal(
        await page.eval(() => document.querySelector("#photo-consent").hidden),
        false,
      );
      await click("#wizard-next");
      assert.match(
        await page.eval(
          () => document.querySelector("#submission-feedback").innerText,
        ),
        /Tick the box to let FairFare keep the photos privately/,
      );
      await fill("#image-consent", true);
      await click("#wizard-next");
      await wait("document.querySelector('.review-list')");
      await click("#wizard-back");
      await click("#wizard-back");
      assert.equal(
        await page.eval(() => document.querySelector("#price").value),
        "400",
      );
      assert.equal(
        await page.eval(() => document.querySelector("#locality").value),
        "Bapu Bazaar",
      );
      await click("#wizard-next");
      await click("#wizard-next");
      await fill("#honest-observation", true);
      await shot("purchase-review", "#wizard-next", [".honest-check"]);
      await click("#wizard-next");
      await wait("location.pathname==='/submitted'");
      assert.match(
        await page.eval(
          () => document.querySelector(".confirmation").innerText,
        ),
        /FairFare will check your report/,
      );
    },
  );
  await check(
    "contributor five-step flow validates, retains drafts and submits pending",
    async () => {
      photoMode = "bangles";
      await page.goto(base + "/contribute");
      await shot("contributor-desk", ".desk-intro .primary");
      await click(".desk-intro .primary");
      assert.equal(
        await page.eval(() => document.querySelector(".wizard-actions").hidden),
        true,
      );
      await shot("contributor-photo", "#contributor-camera", [
        "#contributor-gallery",
      ]);
      await file("#contributor-file", "bangles/lac-patterned.webp");
      await wait("document.querySelector('.wizard-photo img')");
      await shot("contributor-preview", "#wizard-next");
      await click("#wizard-next");
      await wait("document.querySelector('#s-size_cm')");
      await shot("contributor-details", "#wizard-next", [
        "#s-size_cm",
        "#s-finish",
        "#s-segment",
      ]);
      await click("#contributor-identify");
      await wait(
        "document.querySelector('#contributor-ai').innerText.includes('FairFare filled in some details from your photo')",
      );
      await fill("#s-size_cm", 5.6);
      await fill("#s-pack_count", 6);
      await click(".attribute-extra > summary");
      await fill("#s-finish", "stonework");
      await click(".attribute-extra > summary");
      await click("#wizard-next");
      await shot("contributor-price", "#wizard-next", [
        "#price",
        "#price-type",
        "#locality",
      ]);
      await fill("#price-type", "observed");
      assert.equal(
        await page.eval(() => document.querySelector("#source-type").value),
        "field_observation",
      );
      await fill("#price", 900);
      await fill("#locality", "Johari Bazaar");
      await click("#wizard-back");
      assert.equal(
        await page.eval(() => document.querySelector("#s-finish").value),
        "stonework",
      );
      await click("#wizard-next");
      assert.equal(
        await page.eval(() => document.querySelector("#price").value),
        "900",
      );
      await click("#wizard-next");
      await shot("contributor-evidence", "#wizard-next", [
        "#evidence-file",
        "#photo-consent",
      ]);
      await file("#evidence-file");
      await wait("document.querySelector('#remove-evidence')");
      await click("#remove-evidence");
      assert.equal(
        await page.eval(() =>
          Boolean(document.querySelector("#evidence-preview img")),
        ),
        false,
      );
      await fill("#image-consent", true);
      await click("#wizard-next");
      await wait("document.querySelector('.review-list')");
      await shot("contributor-review", "#wizard-next", [".honest-check"]);
      await fill("#honest-observation", true);
      slowSubmission = true;
      await click("#wizard-next");
      await wait(
        "document.querySelector('#wizard-next')?.textContent.includes('Sending')",
      );
      assert.equal(
        await page.eval(() =>
          document.querySelector("#wizard-next")?.getAttribute("aria-busy"),
        ),
        "true",
      );
      await wait("location.pathname==='/submitted'");
      slowSubmission = false;
      assert.equal(
        await page.eval(
          () =>
            getComputedStyle(document.querySelector(".success-mark"))
              .animationName,
        ),
        "receipt-stamp",
      );
      await shot("submitted", ".confirmation .primary");
      assert.equal(submissionBodies.at(-1).category_id, "bangles");
      assert.equal(submissionBodies.at(-1).pack_count, 6);
    },
  );
  await check(
    "identification errors recover through manual details and retry",
    async () => {
      photoMode = "error";
      await page.goto(base + "/scan");
      await file("#gallery-input");
      await wait("document.querySelector('#retry-identify')");
      assert.ok(
        await page.eval(
          () => document.querySelector(".confirmation-details").open,
        ),
      );
      await shot("scan-recovery", '#attributes-form button[type="submit"]', [
        "#retry-identify",
      ]);
      photoMode = "success";
      await click("#retry-identify");
      await wait("document.querySelector('.recognition')");
      await click("#clear-scan");
      assert.equal(
        await page.eval(() =>
          Boolean(document.querySelector("#photo-area img")),
        ),
        false,
      );
    },
  );
  await check(
    "bangle confirmation uses diameter and quantity, and Back follows the task hierarchy",
    async () => {
      photoMode = "bangles";
      await page.goto(base);
      await file("#gallery-input", "bangles/lac-patterned.webp");
      await wait("document.querySelector('.recognition')");
      assert.equal(
        await page.eval(
          () => document.querySelector("#scan-title").textContent,
        ),
        "Bangles",
      );
      assert.match(
        await page.eval(
          () => document.querySelector('label[for="size_cm"]').textContent,
        ),
        /across the opening/,
      );
      assert.ok(
        await page.eval(
          () =>
            !document.querySelector("#finish").checkVisibility() &&
            !document.querySelector("#carving_detail"),
        ),
      );
      await shot("bangle-confirm", '#attributes-form button[type="submit"]', [
        "#size_cm",
        "#pack_count",
        "#segment",
      ]);
      await fill("#size_cm", 5.6);
      await fill("#pack_count", 6);
      await click('#attributes-form button[type="submit"]');
      await wait("location.pathname==='/compare'");
      await wait("document.querySelectorAll('.range-option').length===3");
      await shot("bangle-material-ranges", '[data-range-choice="lac"]');
      await click('[data-range-choice="lac"]');
      await shot("bangle-result", "#report-purchase");
      await click(".result-disclosures>details:first-child>summary");
      await wait(
        "[...document.querySelectorAll('.reference-image img')].some(i=>i.complete&&i.naturalWidth>0&&i.src.includes('bangles/lac-patterned'))",
      );
      await click(".result-layout .back-link");
      await wait("location.pathname==='/'");
      assert.equal(
        await page.eval(() => document.querySelector("#pack_count").value),
        "6",
      );
      await fill("#pack_count", 2);
      await click('#attributes-form button[type="submit"]');
      await wait("location.pathname==='/compare'");
      assert.match(
        await page.eval(
          () => document.querySelector(".range-caption").textContent,
        ),
        /2 bangles/,
      );
      await page.eval(() => history.back());
      await wait("document.activeElement.id==='scan-title'");
      await wait("location.pathname==='/'");
      assert.ok(
        await page.eval(() => document.querySelector("#photo-area img")),
      );
      const nav = phone ? ".bottom-nav" : ".desktop-nav";
      await click(`${nav} a[href="/fares"]`);
      await wait("location.pathname === '/fares'");
      await click(`${nav} a[href="/"]`);
      await wait(
        "location.pathname === '/' && !document.querySelector('#photo-area img')",
      );
      photoMode = "success";
    },
  );
  await check(
    "contribution receipts survive reload and can be cleared on this device",
    async () => {
      await page.goto(base + "/contribute");
      await wait("document.querySelectorAll('.receipt-history li').length===2");
      assert.match(
        await page.eval(
          () => document.querySelector(".receipt-history").innerText,
        ),
        /Price you paid/,
      );
      assert.match(
        await page.eval(
          () => document.querySelector(".receipt-history").innerText,
        ),
        /Bangles/,
      );
      assert.ok(
        await page.eval(() =>
          JSON.parse(
            localStorage.getItem("fairfare-contribution-receipts"),
          ).every(
            (receipt) =>
              Object.keys(receipt).length === 5 &&
              !("notes" in receipt) &&
              !("product_image" in receipt),
          ),
        ),
      );
      await shot("your-contributions", ".desk-intro .primary");
      await click(".receipt-history summary");
      await click('[data-dialog="clear-history"]');
      await click("#clear-device-history");
      await wait("document.querySelector('.receipt-empty')");
      await page.goto(base + "/contribute");
      assert.ok(
        await page.eval(
          () => !localStorage.getItem("fairfare-contribution-receipts"),
        ),
      );
    },
  );

  await check(
    "one ride page offers both ride types, checklists, scenarios and fare references",
    async () => {
      let activeFill;
      await page.goto(base + "/taxis");
      await wait("location.pathname === '/fares' && !location.search");
      for (const taxi of [true, false]) {
        if (!taxi) {
          await click('.fare-choices a[href="/fares?type=auto"]');
          await wait("location.pathname === '/fares' && location.search === '?type=auto'");
        }
        assert.match(
          await page.eval(() => document.querySelector(".fare-choices [aria-current]").innerText),
          taxi ? /Book in an app/ : /Hire an auto or taxi/,
        );
        if (taxi)
          assert.match(
            await page.eval(
              () => document.querySelector("#ride-advice").innerText,
            ),
            /ask your bank whether you can use the card in India/,
          );
        const sw = '[data-ride-mode="1"]';
        await shot(taxi ? "taxis" : "autos", sw, [".ride-check-row"]);
        await click(sw);
        assert.equal(
          await page.eval(
            (s) => document.querySelector(s).getAttribute("aria-pressed"),
            sw,
          ),
          "true",
        );
        assert.match(
          await page.eval(
            () => document.querySelector("#ride-advice").innerText,
          ),
          taxi ? /name on the UPI screen/ : /agree on the full fare with the driver/,
        );
        await wait(
          `document.querySelector('${sw}').getAnimations().every(a => a.playState !== 'running')`,
        );
        const fill = await page.eval(
          (s) => getComputedStyle(document.querySelector(s)).backgroundColor,
          sw,
        );
        if (taxi) activeFill = fill;
        else assert.equal(fill, activeFill);
        await click('[data-ride-check="0"]');
        assert.deepEqual(
          await page.eval(() => {
            const meter = document.querySelector(".ride-meter");
            return [
              meter.style.getPropertyValue("--filled"),
              getComputedStyle(meter.firstElementChild).transitionDuration,
            ];
          }),
          ["0.25", "0.4s"],
        );
        for (let i = 1; i < 4; i++) await click(`[data-ride-check="${i}"]`);
        assert.match(
          await page.eval(
            () => document.querySelector("#ride-progress").innerText,
          ),
          /All checks done/,
        );
        await click("#ride-reset");
        assert.match(
          await page.eval(
            () => document.querySelector("#ride-progress").innerText,
          ),
          /0 of 4 done/,
        );
        await click('[data-ride-answer="1"]');
        assert.match(
          await page.eval(
            () => document.querySelector("#ride-answer").innerText,
          ),
          /Here is what to check before the ride/,
        );
        await click('[data-ride-answer="0"]');
        assert.match(
          await page.eval(
            () => document.querySelector("#ride-answer").innerText,
          ),
          /You picked the better option/,
        );
        await page.screenshot({
          path: join(out, taxi ? "taxis-scenario.jpg" : "autos-scenario.jpg"),
          quality: 88,
        });
        await click(".ride-tips summary");
        assert.match(
          await page.eval(
            () => document.querySelector(".ride-tips details[open]").innerText,
          ),
          taxi ? /airport charges/ : /ask the driver,/,
        );
      }
      await click(".fare-reference summary");
      assert.match(
        await page.eval(
          () => document.querySelector("#fare-estimate").innerText,
        ),
        /₹51 based on 2013 rates/,
      );
      await fill("#fare-vehicle", "taxi-small");
      assert.match(
        await page.eval(
          () => document.querySelector("#fare-estimate").innerText,
        ),
        /₹160 based on 2013 rates/,
      );
      await fill("#fare-distance", 22);
      assert.match(
        await page.eval(
          () => document.querySelector("#fare-estimate").innerText,
        ),
        /up to 20 km/,
      );
      await fill("#fare-distance", 5);
    },
  );
  await check(
    "monument stack reverses, keeps visitor selection and shows official sources",
    async () => {
      await page.goto(base + "/monuments");
      await deckNumber("visits", 1);
      const front = deckFace("visits");
      const fee = () =>
        page.eval(
          (s) => document.querySelector(s + " .availability").textContent,
          front,
        );
      const checkTiers = async (amounts) => {
        const categories = ["indian", "foreign", "student", "foreign_student"];
        for (const [i, value] of categories.entries()) {
          await fill("#visitor", value);
          assert.equal(
            await fee(),
            `₹${amounts[i].toLocaleString("en-IN")} entry`,
          );
        }
        await fill("#visitor", "indian");
      };
      assert.match(await fee(), /₹400 entry/);
      await wait(
        "[...document.querySelectorAll('.visits-deck img')].every(i=>i.naturalWidth>0)",
      );
      await shot("monuments", `${front} .text-link`, ["#visitor"]);
      assert.deepEqual(
        await page.eval(() => {
          const stack = [
            ...document.querySelectorAll(
              ".visits-deck .swipe-card:not([hidden])",
            ),
          ];
          const tops = new Set(
            stack.map((card) => Math.round(card.getBoundingClientRect().top)),
          );
          const labels = document.querySelectorAll(
            ".visits-deck :is(.swipe-peek, .deck-instruction)",
          );
          return [stack.length, tops.size, labels.length];
        }),
        [6, 6, 0],
      );
      await dragCard("visits", -92, "monuments-drag");
      await deckNumber("visits", 2);
      await dragCard("visits", 92);
      await deckNumber("visits", 1);
      await dragCard("visits", 92);
      await deckNumber("visits", 6);
      await checkTiers([200, 1000, 100, 500]);
      await dragCard("visits", 92);
      await deckNumber("visits", 5);
      await checkTiers([100, 600, 50, 300]);
      await shot("monuments-jantar", `${front} .text-link`);
      await dragCard("visits", 92);
      await deckNumber("visits", 4);
      await checkTiers([100, 600, 50, 300]);
      await dragCard("visits", 92);
      await deckNumber("visits", 3);
      assert.match(await fee(), /Free entry/);
      await shot("monuments-free", `${front} .text-link`);
      await dragCard("visits", 0);
      await deckNumber("visits", 4);
      await dragCard("visits", -92);
      await deckNumber("visits", 5);
      await dragCard("visits", -92);
      await deckNumber("visits", 6);
      await dragCard("visits", -92);
      await deckNumber("visits", 1);
      await fill("#visitor", "foreign_student");
      assert.match(await fee(), /₹600 entry/);
      await dragCard("visits", -92);
      await deckNumber("visits", 2);
      assert.equal(
        await page.eval(() => document.querySelector("#visitor").value),
        "foreign_student",
      );
      await dragCard("visits", 92);
      await deckNumber("visits", 1);
      assert.match(await fee(), /₹600 entry/);
      await click(".visit-detail summary");
      assert.match(
        await page.eval(
          () => document.querySelector(".visit-detail").innerText,
        ),
        /student ID/,
      );
      await shot("monument-details");
    },
  );
  await check(
    "More links open full pages and keep both the active page and navigation highlighted",
    async () => {
      const menu = phone ? ".mobile-more" : ".desktop-more";
      await click(menu);
      assert.deepEqual(
        await page.eval(() =>
          [...document.querySelector("#mobile-menu").children].map((el) =>
            el.textContent.trim(),
          ),
        ),
        [
          "App Installation Guide",
          "Privacy Policy",
          "About FairFare",
          "Story Behind FairFare",
        ],
      );
      await shot("menu");
      for (const [url, title, body] of [
        ["/story", "Story Behind FairFare", /I went to Jaipur/],
        ["/install", "App Installation Guide", /Add to Home Screen/],
        ["/privacy", "Privacy Policy", /a short record of the reports you sent/],
        ["/about", "About FairFare", /demo travel guide/],
      ]) {
        await click(`#mobile-menu a[href="${url}"]`);
        await wait(`location.pathname==='${url}'`);
        assert.equal(
          await page.eval(() => document.querySelector("#main h1").textContent),
          title,
        );
        assert.match(
          await page.eval(() => document.querySelector(".info-copy").innerText),
          body,
        );
        assert.equal(
          await page.eval(
            (s) => document.querySelector(s).getAttribute("aria-current"),
            menu,
          ),
          "location",
        );
        assert.equal(
          await page.eval(() => document.querySelector("#info-dialog").open),
          false,
        );
        await click(menu);
        assert.equal(
          await page.eval(
            () =>
              document.querySelector("#mobile-menu [aria-current]").pathname,
          ),
          url,
        );
      }
      await key("Escape", 27);
      assert.ok(
        await page.eval(() => document.querySelector("#mobile-menu").hidden),
      );
      await click("#theme-toggle");
      assert.equal(
        await page.eval(() => document.documentElement.dataset.theme),
        "dark",
      );
      await shot("about-dark");
      const nav = phone ? ".bottom-nav" : ".desktop-nav";
      await click(`${nav} [href="/contribute"]`);
      await wait("location.pathname==='/contribute'");
      await shot("contributors", ".desk-intro .button");
      await click(`${nav} [href="/"]`);
      await wait("location.pathname==='/'");
    },
  );

  await check(
    "all direct routes fit this viewport in both themes",
    async () => {
      for (const route of [
        "/",
        "/scan",
        "/compare",
        "/taxis",
        "/autos",
        "/fares",
        "/fares?type=auto",
        "/monuments",
        "/contribute",
        "/contribute/new",
        "/report",
        "/submitted",
        "/install",
        "/privacy",
        "/about",
        "/story",
        "/not-a-page",
      ]) {
        await page.goto(base + route, { settleMs: 250 });
        await wait("document.querySelector('#main h1')");
        assert.equal(
          await page.eval(() =>
            Boolean(document.querySelector('.site-footer a[href="/privacy"]')),
          ),
          route === "/",
        );
        for (const theme of ["light", "dark"]) {
          await page.eval(
            (t) => (document.documentElement.dataset.theme = t),
            theme,
          );
          assert.ok(
            await page.eval(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            `${width} ${route} ${theme} overflows`,
          );
        }
      }
    },
  );
  await check(
    "PWA shell reopens offline without caching photos or APIs",
    async () => {
      await page.goto(base);
      await page.eval(async () => {
        await navigator.serviceWorker.ready;
      });
      await page.goto(base);
      await wait("navigator.serviceWorker.controller!==null");
      const cache = await page.eval(async () => {
        const keys = await caches.keys();
        const urls = [];
        for (const k of keys)
          for (const r of await (await caches.open(k)).keys()) urls.push(r.url);
        return urls;
      });
      assert.ok(cache.some((u) => u.endsWith("/js/contribution.js")));
      assert.ok(cache.some((u) => u.endsWith("/assets/monuments/hawa.webp")));
      assert.ok(cache.some((u) => u.endsWith("/assets/brand/fairfare.webp")));
      assert.ok(
        cache.every(
          (u) =>
            new URL(u).origin === locationOrigin(base) && !u.includes("blob:"),
        ),
      );
      function locationOrigin(x) {
        return new URL(x).origin;
      }
      await page.send("Network.emulateNetworkConditions", {
        offline: true,
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0,
      });
      await page.goto(base + "/scan", { settleMs: 200 });
      await wait("document.querySelector('#take-photo')");
      await shot("offline-scan");
      await page.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      });
    },
  );
  assert.equal(page.consoleErrors.length, 0, page.consoleErrors.join("\n"));
  assert.ok(mockSubmissions === 2 && mockIdentifications >= 4);
  const report = {
    at: new Date().toISOString(),
    base,
    viewport: { width, height },
    checks,
    screens,
    mockIdentifications,
    mockSubmissions,
    consoleErrors: page.consoleErrors,
    realVisionCalls: 0,
    realSubmissionWrites: 0,
  };
  await writeFile(join(out, "report.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      checks: checks.length,
      mockIdentifications,
      mockSubmissions,
      realVisionCalls: 0,
      realSubmissionWrites: 0,
    }),
  );
} catch (e) {
  await shot("failure").catch(() => {});
  await writeFile(
    join(out, "failure.json"),
    JSON.stringify(
      { message: e.message, checks, consoleErrors: page.consoleErrors },
      null,
      2,
    ),
  );
  throw e;
} finally {
  await browser.close();
}
