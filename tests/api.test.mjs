import test from "node:test";
import assert from "node:assert/strict";
import { request, getObservations } from "../js/api.js";
globalThis.location = { hostname: "test.invalid", search: "" };
test("API requests never cache data and carry only public credentials", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.equal(init.cache, "no-store");
    assert.ok(init.headers.apikey.startsWith("sb_publishable_"));
    assert.equal(init.headers.Authorization, undefined);
    return Response.json([{ status: "approved" }]);
  };
  try {
    assert.deepEqual(await request("/rest/v1/ff_observations"), [
      { status: "approved" },
    ]);
  } finally {
    globalThis.fetch = original;
  }
});

test("comparison queries filter before pagination and fetch beyond one page", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url) => {
    const q = new URL(url).searchParams;
    assert.equal(q.get("finish"), "eq.inlay");
    assert.equal(q.get("material"), "eq.wood");
    assert.equal(q.get("status"), "eq.approved");
    assert.equal(q.get("ff_markets.city"), "eq.Jaipur");
    assert.match(q.get("and"), /size_cm.gte.8,size_cm.lte.12/);
    assert.equal(q.get("offset"), String(calls * 500));
    calls++;
    return Response.json(
      Array.from({ length: calls === 1 ? 500 : 12 }, (_, i) => ({
        id: `${calls}-${i}`,
      })),
    );
  };
  try {
    const rows = await getObservations(undefined, {
      category_id: "wooden_elephant",
      material: "wood",
      finish: "inlay",
      segment: "shop",
      size_cm: 10,
    });
    assert.equal(rows.length, 512);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
  }
});
test("network and server errors produce useful messages without leaking internals", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw new TypeError("internal detail");
    };
    await assert.rejects(request("/test"), /Check your connection/);
    globalThis.fetch = async () =>
      Response.json({ error: "Please wait before retrying." }, { status: 429 });
    await assert.rejects(request("/test"), /Please wait/);
  } finally {
    globalThis.fetch = original;
  }
});
