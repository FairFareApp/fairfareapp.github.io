import test from "node:test";
import assert from "node:assert/strict";
import { request } from "../js/api.js";
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
