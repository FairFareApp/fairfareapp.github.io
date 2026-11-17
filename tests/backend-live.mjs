// Deliberate integration check. Never invokes the vision model.
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { SUPABASE_URL, PUBLISHABLE_KEY } from "../js/config.js";
const headers = { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" };
const results = [];
async function call(path, method = "GET", body) {
  const r = await fetch(SUPABASE_URL + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}
const refs = await call("/rest/v1/ff_observations?select=id,status,provenance");
assert.equal(refs.status, 200);
assert.ok(refs.body.length >= 3);
assert.ok(refs.body.every((x) => x.status === "approved"));
results.push({
  test: "approved references readable",
  pass: true,
  count: refs.body.length,
});
for (const table of ["ff_submissions", "ff_evidence"]) {
  const r = await call("/rest/v1/" + table + "?select=*");
  assert.ok(r.status >= 400);
  results.push({
    test: table + " private read denied",
    status: r.status,
    pass: true,
  });
}
for (const method of ["POST", "PATCH", "DELETE"]) {
  const r = await call(
    "/rest/v1/ff_observations?id=eq.00000000-0000-4000-8000-000000000000",
    method,
    method === "DELETE" ? undefined : { status: "approved" },
  );
  assert.ok(r.status >= 400);
  results.push({
    test: "direct " + method + " trusted reference denied",
    status: r.status,
    pass: true,
  });
}
for (const fn of ["ff_take_quota", "ff_insert_submission"]) {
  const r = await call(
    "/rest/v1/rpc/" + fn,
    "POST",
    fn === "ff_take_quota"
      ? { p_bucket: "qa", p_limit: 1, p_window_seconds: 1 }
      : { p_record: {}, p_evidence: [] },
  );
  assert.ok(r.status >= 400);
  results.push({
    test: "privileged RPC " + fn + " denied",
    status: r.status,
    pass: true,
  });
}
const fixture = await readFile(".local/qa-fixture.png");
const image = "data:image/png;base64," + fixture.toString("base64");
const common = {
  category_id: "wooden_elephant",
  city: "Jaipur",
  locality: "QA validation fixture, not a market observation",
  material: "wood",
  size_cm: 10,
  finish: "plain",
  segment: "shop",
  price_inr: 123,
  price_type: "paid",
  observed_at: new Date().toISOString().slice(0, 10),
  source_type: "own_purchase",
  accurate: true,
  notes:
    "AUTOMATED QA FIXTURE. Synthetic test only. Reject; never publish as a reference.",
};
const ids = [];
for (const kind of ["purchase", "contributor"]) {
  const body = {
    ...common,
    kind,
    request_id: crypto.randomUUID(),
    image_consent: kind === "contributor",
    ...(kind === "contributor"
      ? { product_image: image, evidence_image: image }
      : {}),
  };
  const r = await call("/functions/v1/fairfare-submit", "POST", body);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.status, "pending");
  ids.push(r.body.id);
  results.push({
    test: kind + " submission pending",
    id: r.body.id,
    pass: true,
  });
  if (kind === "contributor") {
    const retry = await call("/functions/v1/fairfare-submit", "POST", body);
    assert.equal(retry.status, 200);
    assert.equal(retry.body.id, r.body.id);
    results.push({ test: "retry idempotent", pass: true });
  }
}
const after = await call("/rest/v1/ff_observations?select=id");
assert.equal(after.body.length, refs.body.length);
results.push({
  test: "pending submissions excluded from reference dataset",
  pass: true,
});
await writeFile(
  ".local/backend-results.json",
  JSON.stringify({ ids, results }, null, 2),
);
console.log(JSON.stringify({ results, liveInferenceCalls: 0 }, null, 2));
