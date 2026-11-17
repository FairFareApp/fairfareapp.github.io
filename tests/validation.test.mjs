import test from "node:test";
import assert from "node:assert/strict";
import {
  validateSubmission,
  normalizeIdentification,
  decodeImage,
} from "../supabase/functions/_shared/validation.js";
const now = new Date("2026-11-17T12:00:00Z");
const input = {
  request_id: "01a1e98a-e5b4-4e32-ae30-0019f44b4f90",
  kind: "purchase",
  category_id: "wooden_elephant",
  city: "Jaipur",
  locality: "QA fixture",
  material: "wood",
  size_cm: 10,
  finish: "plain",
  segment: "shop",
  price_inr: 300,
  price_type: "paid",
  observed_at: "2026-11-17",
  source_type: "own_purchase",
  accurate: true,
};
test("all anonymous submissions are pending and extra privileged fields are discarded", () => {
  const { record } = validateSubmission(
    {
      ...input,
      status: "approved",
      reviewed_at: "2026-11-17",
      published_observation_id: "bad",
    },
    now,
  );
  assert.equal(record.status, "pending");
  assert.equal(record.reviewed_at, undefined);
  assert.equal(record.published_observation_id, undefined);
});
test("rejects future, impossible dates, non-pilot products and invalid prices", () => {
  for (const change of [
    { observed_at: "2026-11-18" },
    { observed_at: "2026-02-30" },
    { category_id: "stone_elephant" },
    { city: "Delhi" },
    { price_inr: -1 },
    { price_inr: NaN },
    { price_inr: 3.333 },
    { size_cm: 0 },
    { size_cm: 31 },
    { accurate: false },
    { source_type: "invented" },
    { price_type: "asking" },
  ])
    assert.throws(() => validateSubmission({ ...input, ...change }, now));
});
test("does not persist images without explicit consent", () => {
  assert.throws(
    () =>
      validateSubmission(
        { ...input, product_image: "data:image/jpeg;base64,/9j/AA==" },
        now,
      ),
    /consent/,
  );
});
test("contributor photo required; forged file types rejected", () => {
  assert.throws(
    () => validateSubmission({ ...input, kind: "contributor" }, now),
    /photograph/,
  );
  assert.throws(() => decodeImage("data:image/png;base64,SGVsbG8="), /format/);
  assert.throws(() => decodeImage("https://example.com/photo.jpg"), /Only/);
});
test("normalizes untrusted model output and drops prices and physical dimensions", () => {
  const r = normalizeIdentification({
    category_id: "wooden_elephant",
    product_name: "Wooden elephant",
    material: "wood",
    finish: "plain",
    price: 100,
    size_cm: 10,
    quality: "excellent",
  });
  assert.equal(r.price, undefined);
  assert.equal(r.size_cm, undefined);
  assert.equal(r.quality, undefined);
  assert.ok(r.unknown_attributes.includes("authenticity"));
});
test("rejects malformed model structure; marks uncertain finish", () => {
  for (const v of [
    null,
    [],
    {},
    "text",
    {
      category_id: "wooden_elephant",
      product_name: "x",
      material: "gold",
      finish: "plain",
    },
  ])
    assert.throws(() => normalizeIdentification(v));
  assert.equal(
    normalizeIdentification({
      category_id: "unsupported",
      product_name: "Unclear object",
      material: "unknown",
      finish: "unknown",
    }).finish_uncertain,
    true,
  );
});
