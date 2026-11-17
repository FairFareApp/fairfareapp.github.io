import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
const source = await readFile(new URL("../sw.js", import.meta.url), "utf8");
function harness() {
  const events = {},
    responded = [];
  const context = {
    URL,
    self: {
      location: { origin: "https://fairfareapp.github.io" },
      addEventListener: (name, fn) => (events[name] = fn),
      skipWaiting() {},
      clients: { claim() {} },
    },
    caches: {
      match: async (path) => ({ cached: path }),
      open: async () => ({ put: async () => {} }),
    },
    fetch: async () => {
      throw new Error("Offline");
    },
  };
  vm.runInNewContext(source, context);
  return { events, responded };
}
test("service worker ignores cross-origin APIs, POSTs and unlisted photos", () => {
  const { events, responded } = harness();
  for (const [url, method] of [
    ["https://project.supabase.co/rest/v1/ff_observations", "GET"],
    ["https://fairfareapp.github.io/upload.jpg", "GET"],
    ["https://fairfareapp.github.io/scan", "POST"],
  ])
    events.fetch({
      request: { url, method, mode: "cors" },
      respondWith: (r) => responded.push(r),
    });
  assert.equal(responded.length, 0);
});
test("offline navigation restores app shell and never caches API data", async () => {
  const { events, responded } = harness();
  events.fetch({
    request: {
      url: "https://fairfareapp.github.io/scan",
      method: "GET",
      mode: "navigate",
    },
    respondWith: (r) => responded.push(r),
  });
  assert.equal((await responded[0]).cached, "/index.html");
});
test("404 fallback preserves unknown paths, query strings and fragments", async () => {
  const code = await readFile(
    new URL("../js/restore.js", import.meta.url),
    "utf8",
  );
  let redirected;
  vm.runInNewContext(code, {
    location: {
      pathname: "/missing/path",
      search: "?test=1",
      hash: "#detail",
      replace: (p) => (redirected = p),
    },
    encodeURIComponent,
  });
  assert.equal(
    new URL("https://fairfareapp.github.io" + redirected).searchParams.get(
      "__route",
    ),
    "/missing/path?test=1#detail",
  );
});
