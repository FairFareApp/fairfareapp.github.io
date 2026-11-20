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
  await wait(
    `document.querySelector('.${kind}-deck [data-deck-count]')?.textContent.startsWith('${number} /')`,
  );
}
async function dragCard(kind, dx, capture) {
  const card = deckFace(kind);
  const target = `${card} .swipe-target`;
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
    await wait(`document.querySelector('${card}').style.transform !== ''`);
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
    "Home has an autoplaying brand carousel, embedded scan and Jaipur tips",
    async () => {
      await deckNumber("intro", 1);
      await shot("home", "#take-photo", [
        ".intro-deck [data-deck-autoplay]",
        "#choose-photo",
        ".ready-launch",
      ]);
      assert.ok(
        await page.eval(() => {
          const scan = document.querySelector("#scan").getBoundingClientRect();
          const tips = document
            .querySelector(".ready-launch")
            .getBoundingClientRect();
          return (
            scan.bottom <= tips.top &&
            document
              .querySelector("#scan")
              .innerText.includes("Jaipur pilot") &&
            !document.querySelector('.bottom-nav a[href="/scan"]')
          );
        }),
      );
      await deckNumber("intro", 2);
      await click(".intro-deck [data-deck-autoplay]");
      assert.equal(
        await page.eval(() =>
          document
            .querySelector("[data-deck-autoplay]")
            .getAttribute("aria-label"),
        ),
        "Play carousel",
      );
      await dragCard("intro", -92);
      await deckNumber("intro", 3);
      await dragCard("intro", -92);
      await deckNumber("intro", 1);
      await dragCard("intro", 92);
      await deckNumber("intro", 3);
      await dragCard("intro", 0);
      await deckNumber("intro", 1);
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
      assert.match(await text(), /Google Maps/);
      await shot("jaipur-flashcards", face);
      await dragCard("tips", -23);
      await deckNumber("tips", 1);
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
      assert.match(await text(), /authorised bank/);
      await shot("jaipur-flashcards-money", face, [`${front} .text-link`]);
      await click('.tips-deck [data-deck-step="-1"]');
      await deckNumber("tips", 4);
      await page.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
      for (let i = 4; i <= 7; i++) {
        await deckNumber("tips", i);
        await click(face);
      }
      await wait(
        "document.querySelector('.tips-deck [data-deck-count]').textContent === '7 tips complete'",
      );
      await click("[data-deck-first]");
      await deckNumber("tips", 1);
      await page.eval(() => (document.documentElement.dataset.theme = "dark"));
      await shot("jaipur-flashcards-dark", face);
      await page.eval(() => (document.documentElement.dataset.theme = "light"));
      await page.send("Emulation.setEmulatedMedia", { features: [] });
      await key("Escape", 27);
      await wait("!document.querySelector('#info-dialog').open");
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
      await click(".confirmation-details > summary");
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
      assert.match(
        await page.eval(() => document.querySelector(".price-panel").innerText),
        /synthetic/,
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
        /Local craft shop · Some room to ask[\s\S]*5–10% below asking/,
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
        /illustration/,
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
        "document.querySelector('#quote-context').innerText.includes('quote')",
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
        /consent/,
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
        /Pending review/,
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
        "document.querySelector('#contributor-ai').innerText.includes('Suggestions ready')",
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
        /diameter/,
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
        /Bought it\?/,
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
    "ride pages share selectors and provide checklists, scenarios and fare references",
    async () => {
      let activeFill;
      for (const route of ["/taxis", "/autos"]) {
        const taxi = route === "/taxis";
        await page.goto(base + route);
        if (taxi)
          assert.match(
            await page.eval(
              () => document.querySelector("#ride-advice").innerText,
            ),
            /international transactions/,
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
          taxi ? /UPI recipient/ : /looks faulty/,
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
        for (let i = 0; i < 4; i++) await click(`[data-ride-check="${i}"]`);
        assert.match(
          await page.eval(
            () => document.querySelector("#ride-progress").innerText,
          ),
          /Ready to ride/,
        );
        await click("#ride-reset");
        assert.match(
          await page.eval(
            () => document.querySelector("#ride-progress").innerText,
          ),
          /0 \/ 4/,
        );
        await click('[data-ride-answer="1"]');
        assert.match(
          await page.eval(
            () => document.querySelector("#ride-answer").innerText,
          ),
          /Pause and check/,
        );
        await click('[data-ride-answer="0"]');
        assert.match(
          await page.eval(
            () => document.querySelector("#ride-answer").innerText,
          ),
          /Good call/,
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
          taxi ? /airport charges/ : /Google Maps/,
        );
      }
      await click(".fare-reference summary");
      assert.match(
        await page.eval(
          () => document.querySelector("#fare-estimate").innerText,
        ),
        /₹51 · 2013/,
      );
      await fill("#fare-vehicle", "taxi-small");
      assert.match(
        await page.eval(
          () => document.querySelector("#fare-estimate").innerText,
        ),
        /₹160 · 2013/,
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
      assert.match(await fee(), /₹400 entry/);
      await wait(
        "[...document.querySelectorAll('.visits-deck img')].every(i=>i.naturalWidth>0)",
      );
      await shot("monuments", `${front} .text-link`, [
        "#visitor",
        ".visits-deck [data-deck-step='1']",
      ]);
      await dragCard("visits", -92, "monuments-drag");
      await deckNumber("visits", 2);
      await dragCard("visits", 92);
      await deckNumber("visits", 1);
      await dragCard("visits", 92);
      await deckNumber("visits", 3);
      assert.match(await fee(), /Free entry/);
      await shot("monuments-free", `${front} .text-link`);
      await dragCard("visits", 0);
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
        ["/privacy", "Privacy Policy", /short contribution receipts/],
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
      assert.ok(cache.some((u) => u.endsWith("/assets/brand/market.webp")));
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
