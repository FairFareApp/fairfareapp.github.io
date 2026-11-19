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
const out = resolve(
  ".local/browser-redesign" + (base.includes("github.io") ? "-production" : ""),
);
await mkdir(out, { recursive: true });
const browser = await Browser.launch(),
  page = await browser.newPage({ width: 390, height: 844, mobile: true });
const checks = [],
  requests = [];
let photoMode = "success",
  mockSubmissions = 0,
  mockIdentifications = 0;
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
    else mockSubmissions++;
  }
  const body = preflight
    ? {}
    : identifying
      ? photoMode === "success"
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
      : { id: "browser-test-not-saved", status: "pending" };
  await page.send("Fetch.fulfillRequest", {
    requestId: e.requestId,
    responseCode: preflight
      ? 200
      : identifying && photoMode !== "success"
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
const file = async (selector) => {
  const { root } = await page.send("DOM.getDocument");
  const { nodeId } = await page.send("DOM.querySelector", {
    nodeId: root.nodeId,
    selector,
  });
  await page.send("DOM.setFileInputFiles", {
    nodeId,
    files: [resolve("assets/references/plain.webp")],
  });
};
const shot = async (name) => {
  await page.eval(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(out, name + ".jpg"), fullPage: true });
};
const check = async (name, fn) => {
  await fn();
  checks.push({ name, status: "PASS" });
  console.log("PASS", name);
};
try {
  await page.goto(base);
  await check(
    "home has one prominent scan action and working navigation",
    async () => {
      await wait("document.querySelector('.scan-launch')");
      assert.ok(
        await page.eval(() => {
          const r = document
            .querySelector(".scan-launch")
            .getBoundingClientRect();
          return r.height >= 180 && r.bottom < innerHeight - 72;
        }),
      );
      await shot("home-mobile");
      await click(".scan-launch");
      await wait("location.pathname==='/scan'");
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
      await shot("result-mobile");
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
      await shot("comparables-mobile");
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
      await fill("#price", 400);
      await fill("#locality", "Bapu Bazaar");
      await click("#wizard-next");
      await wait("document.querySelector('#evidence-file')");
      await fill("#attach-scan", true);
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
      await shot("purchase-review");
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
      await page.goto(base + "/contribute/new");
      await click("#wizard-next");
      assert.match(
        await page.eval(
          () => document.querySelector("#submission-feedback").innerText,
        ),
        /photo/,
      );
      await file("#contributor-file");
      await wait("document.querySelector('.wizard-photo img')");
      await click("#wizard-next");
      await wait("document.querySelector('#s-size_cm')");
      await click("#contributor-identify");
      await wait(
        "document.querySelector('#contributor-ai').innerText.includes('Suggestions ready')",
      );
      await fill("#s-size_cm", 14);
      await fill("#s-finish", "inlay");
      await click("#wizard-next");
      await fill("#price", 900);
      await fill("#locality", "Johari Bazaar");
      await click("#wizard-back");
      assert.equal(
        await page.eval(() => document.querySelector("#s-finish").value),
        "inlay",
      );
      await click("#wizard-next");
      assert.equal(
        await page.eval(() => document.querySelector("#price").value),
        "900",
      );
      await click("#wizard-next");
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
      await shot("contributor-review");
      await fill("#honest-observation", true);
      await click("#wizard-next");
      await wait("location.pathname==='/submitted'");
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
  await check("transport controls and ride note work", async () => {
    await page.goto(base + "/taxis");
    await click('[data-payment="direct"]');
    assert.equal(
      await page.eval(() =>
        document
          .querySelector('[data-payment="direct"]')
          .getAttribute("aria-pressed"),
      ),
      "true",
    );
    await click("details summary");
    await click(".checklist input");
    assert.equal(
      await page.eval(() => document.querySelector(".checklist input").checked),
      true,
    );
    await page.goto(base + "/autos");
    await click('[data-fare="meter"]');
    await fill("#ride-destination", "City Palace");
    await fill("#ride-fare", 250);
    await click("#ride-plan button");
    await wait(
      "document.querySelector('#ride-note').innerText.includes('250')",
    );
    assert.match(
      await page.eval(
        () => document.querySelector(".fare-unavailable").innerText,
      ),
      /unavailable/,
    );
    await shot("autos-mobile");
  });
  await check(
    "monument photos, categories and source disclosures work",
    async () => {
      await page.goto(base + "/monuments");
      await wait("document.querySelectorAll('.monument-card').length===3");
      await fill("#visitor", "student");
      await click(".monument-card details>summary");
      assert.match(
        await page.eval(
          () => document.querySelector(".monument-card").innerText,
        ),
        /student ID/,
      );
      await wait(
        "[...document.querySelectorAll('.monument-photo')].every(i=>i.naturalWidth>0)",
      );
      await shot("monuments-mobile");
    },
  );
  await check("keyboard menu, dialogs and theme are usable", async () => {
    await click("#menu-toggle");
    assert.equal(
      await page.eval(() => document.querySelector("#mobile-menu").hidden),
      false,
    );
    await page.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Escape",
      code: "Escape",
    });
    await page.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Escape",
      code: "Escape",
    });
    assert.equal(
      await page.eval(() => document.querySelector("#mobile-menu").hidden),
      true,
    );
    await click("#theme-toggle");
    assert.equal(
      await page.eval(() => document.documentElement.dataset.theme),
      "dark",
    );
    await shot("monuments-dark-mobile");
    await click('.site-footer [data-dialog="privacy"]');
    await wait("document.querySelector('#info-dialog').open");
    await page.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Escape",
      code: "Escape",
    });
    await page.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Escape",
      code: "Escape",
    });
    assert.equal(
      await page.eval(() => document.querySelector("#info-dialog").open),
      false,
    );
  });
  await check(
    "all direct routes reflow at 320, 390, 768 and 1440px in both themes",
    async () => {
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewport({ width, height: 900, mobile: width < 768 });
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
          if (
            width === 1440 &&
            ["/", "/scan", "/contribute", "/monuments"].includes(route)
          )
            await shot(
              route === "/"
                ? "home-desktop-dark"
                : route.slice(1) + "-desktop-dark",
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
    checks,
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
