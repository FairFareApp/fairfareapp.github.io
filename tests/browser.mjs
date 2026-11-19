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
const screens = [];
const phone = width < 761;
const shot = async (name, primary, required = []) => {
  await page.eval(() => window.scrollTo(0, 0));
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
      await shot("home", ".scan-launch");
      await click(".scan-launch");
      await wait("location.pathname==='/scan'");
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
        "#finish",
        "#segment",
        ".attribute-extra > summary",
      ]);
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
      await page.goto(base + "/contribute");
      await shot("contributor-desk", ".contribution-start .primary");
      await click(".contribution-start .primary");
      assert.equal(
        await page.eval(() => document.querySelector(".wizard-actions").hidden),
        true,
      );
      await shot("contributor-photo", "#contributor-camera", [
        "#contributor-gallery",
      ]);
      await file("#contributor-file");
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
      await fill("#s-size_cm", 14);
      await fill("#s-finish", "inlay");
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
        "inlay",
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
      await click("#wizard-next");
      await wait("location.pathname==='/submitted'");
      await shot("submitted", ".confirmation .primary");
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
  await check("transport controls and ride note work", async () => {
    await page.goto(base + "/taxis");
    await shot("taxis", '[data-payment="app"]', [".source-links a"]);
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
    await shot("autos", "#ride-plan button", [
      "#ride-destination",
      "#ride-fare",
    ]);
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
    await shot("autos-note");
  });
  await check(
    "monument photos, categories and source disclosures work",
    async () => {
      await page.goto(base + "/monuments");
      await wait("document.querySelectorAll('.monument-card').length===3");
      await shot(
        "monuments",
        ".monument-card .text-link",
        phone
          ? [".monument-card:nth-child(3) .text-link", "#visitor"]
          : ["#visitor"],
      );
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
      await shot("monument-details");
    },
  );
  await check("keyboard menu, dialogs and theme are usable", async () => {
    if (phone) {
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
    }
    await click("#theme-toggle");
    assert.equal(
      await page.eval(() => document.documentElement.dataset.theme),
      "dark",
    );
    await shot("monuments-dark");
    if (phone) await click("#menu-toggle");
    await click(
      phone
        ? '#mobile-menu [data-dialog="privacy"]'
        : '.site-footer [data-dialog="privacy"]',
    );
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
