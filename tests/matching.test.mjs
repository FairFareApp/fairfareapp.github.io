import test from "node:test";
import assert from "node:assert/strict";
import { compareObservations } from "../js/matching.js";
const now = new Date("2026-11-17T12:00:00Z");
const a = {
  category_id: "wooden_elephant",
  material: "wood",
  size_cm: 10,
  finish: "plain",
  segment: "shop",
};
const row = (price, extra = {}) => ({
  id: String(price),
  ...a,
  price_inr: price,
  observed_at: "2026-11-10",
  status: "approved",
  provenance: "synthetic",
  ff_markets: { city: "Jaipur", locality: "Pilot fixture" },
  ...extra,
});
test("matches only compatible approved Jaipur observations", () => {
  const r = compareObservations(
    a,
    [
      row(200),
      row(300),
      row(400),
      row(999, { status: "pending" }),
      row(999, { material: "sandalwood" }),
      row(999, { size_cm: 20 }),
      row(999, { finish: "painted" }),
      row(999, { segment: "boutique" }),
      row(999, { category_id: "other" }),
      row(999, { ff_markets: { city: "Delhi" } }),
      row(999, { observed_at: "2024-01-01" }),
      row(999, { observed_at: "2027-01-01" }),
    ],
    now,
  );
  assert.equal(r.status, "ready");
  assert.equal(r.matches.length, 3);
  assert.equal(r.low, 250);
  assert.equal(r.high, 350);
  assert.equal(r.synthetic, 3);
});
test("requires at least three comparisons and never broadens categories", () => {
  assert.equal(
    compareObservations(a, [row(200), row(300)], now).status,
    "insufficient",
  );
  assert.equal(
    compareObservations(
      { ...a, category_id: "unsupported" },
      [row(200), row(300), row(400)],
      now,
    ).status,
    "insufficient",
  );
});
test("missing bangle material gives separate pack prices with exact design, size and selling setting", () => {
  const b = {
    category_id: "bangles",
    size_cm: 5.8,
    finish: "patterned",
    segment: "shop",
    pack_count: 6,
  };
  const bRow = (price, material, extra = {}) =>
    row(price, {
      ...b,
      material,
      id: `${material}-${price}`,
      attributes: { pack_count: 6 },
      ...extra,
    });
  const rows = [
    ...[90, 100, 110].map((p) => bRow(p, "glass")),
    ...[285, 300, 315].map((p) => bRow(p, "lac", { size_cm: 6.1 })),
    bRow(1, "metal"),
    bRow(2, "metal"),
    bRow(800, "lac", { attributes: { pack_count: 12 } }),
    bRow(810, "lac", { finish: "plain" }),
    bRow(820, "lac", { status: "pending" }),
    bRow(830, "lac", { size_cm: 6.2 }),
    bRow(840, "lac", { segment: "street" }),
  ];
  const r = compareObservations(b, rows, now);
  assert.equal(r.status, "alternatives");
  assert.equal(r.field, "material");
  assert.deepEqual(
    r.alternatives.map((x) => [
      x.value,
      x.result.matches.length,
      x.result.low,
      x.result.high,
    ]),
    [
      ["lac", 3, 290, 310],
      ["glass", 3, 90, 110],
    ],
  );
});
test("prices are computed, not fixed, and extreme prices are excluded", () => {
  const r = compareObservations(
    a,
    [200, 220, 240, 260, 280, 10000].map((p) => row(p)),
    now,
  );
  assert.equal(r.excluded, 1);
  assert.equal(r.matches.length, 5);
  assert.equal(r.low, 220);
  assert.equal(r.high, 260);
  const shifted = compareObservations(
    a,
    [400, 420, 440, 460, 480].map((p) => row(p)),
    now,
  );
  assert.equal(shifted.low, 420);
  assert.equal(shifted.high, 460);
});
test("matches estimated size within defined tolerance only", () => {
  const r = compareObservations(
    a,
    [
      row(200, { size_cm: 8 }),
      row(300, { size_cm: 12 }),
      row(400),
      row(999, { size_cm: 12.1 }),
    ],
    now,
  );
  assert.equal(r.matches.length, 3);
});

test("repeated records cannot satisfy the three-observation minimum", () => {
  const one = row(200, { independence_key: "same-source" });
  const copies = [one, { ...one, id: "copy-2" }, { ...one, id: "copy-3" }];
  assert.equal(compareObservations(a, copies, now).status, "insufficient");
  assert.equal(
    compareObservations(a, [row(200), row(200), row(300)], now).status,
    "insufficient",
  );
});
test("selected carving detail is kept separate and pending detail matches are excluded", () => {
  const rows = [200, 220, 240].map((p) =>
    row(p, { attributes: { carving_detail: "simple" } }),
  );
  rows.push(
    ...[400, 420, 440].map((p) =>
      row(p, { attributes: { carving_detail: "detailed" } }),
    ),
    row(600, { status: "pending", attributes: { carving_detail: "simple" } }),
  );
  const r = compareObservations({ ...a, carving_detail: "simple" }, rows, now);
  assert.equal(r.matches.length, 3);
  assert.equal(r.high, 230);
  assert.ok(r.matches.every((o) => o.attributes.carving_detail === "simple"));
  assert.equal(
    compareObservations({ ...a, size_cm: 1 }, rows, now).status,
    "insufficient",
  );
  assert.equal(
    compareObservations({ ...a, size_cm: 31 }, rows, now).status,
    "insufficient",
  );
});
