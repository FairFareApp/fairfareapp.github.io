// Read-only coverage check against actual approved Supabase rows. No vision calls or writes.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { getObservations } from "../js/api.js";
import { compareObservations } from "../js/matching.js";
globalThis.location = { hostname: "test.invalid", search: "" };
const rows = await getObservations();
assert.ok(
  rows.length >= 1469,
  "Expanded reference data must be reachable beyond the original 1000-row cap.",
);
assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
assert.equal(new Set(rows.map((r) => r.independence_key)).size, rows.length);
assert.ok(
  rows.every(
    (r) => r.status === "approved" && r.category_id === "wooden_elephant",
  ),
);
assert.ok(
  rows.every(
    (r) =>
      r.image_kind === "illustration" &&
      r.image_path === `elephants/${r.finish}.webp` &&
      r.image_alt &&
      r.image_credit &&
      r.image_license,
  ),
);
const cases = [];
for (const material of ["wood", "sandalwood"])
  for (const finish of ["plain", "painted", "inlay", "openwork"])
    for (const segment of ["street", "shop", "boutique"])
      for (const carving_detail of ["unknown", "simple", "detailed"])
        for (let heightTick = 20; heightTick <= 300; heightTick++) {
          const size_cm = heightTick / 10;
          const a = {
            category_id: "wooden_elephant",
            material,
            finish,
            segment,
            carving_detail,
            size_cm,
          };
          const r = compareObservations(
            a,
            rows,
            new Date("2026-11-19T12:00:00Z"),
          );
          assert.equal(r.status, "ready", JSON.stringify(a));
          assert.ok(r.matches.length >= 3 && r.synthetic === r.matches.length);
          assert.ok(r.high >= r.low && r.low > 0);
          assert.ok(
            r.matches.every(
              (o) =>
                o.material === material &&
                o.finish === finish &&
                o.segment === segment,
            ),
          );
          cases.push({
            ...a,
            count: r.matches.length,
            low: r.low,
            high: r.high,
          });
        }
assert.equal(
  compareObservations(
    {
      category_id: "other",
      material: "wood",
      size_cm: 10,
      finish: "plain",
      segment: "shop",
    },
    rows,
  ).status,
  "insufficient",
);
const filtered = await getObservations(undefined, {
  category_id: "wooden_elephant",
  material: "wood",
  finish: "inlay",
  segment: "street",
  size_cm: 14,
});
assert.ok(
  filtered.length >= 3 &&
    filtered.every(
      (o) =>
        o.finish === "inlay" &&
        o.segment === "street" &&
        o.material === "wood" &&
        Math.abs(o.size_cm - 14) <= 2.8,
    ),
);
const result = {
  at: new Date().toISOString(),
  records: rows.length,
  cases: cases.length,
  minComparables: Math.min(...cases.map((c) => c.count)),
  maxComparables: Math.max(...cases.map((c) => c.count)),
  representative: cases.filter(
    (c) =>
      [4, 10, 16, 25, 30].includes(c.size_cm) &&
      c.carving_detail === "detailed" &&
      c.segment === "shop",
  ),
};
await mkdir(".local", { recursive: true });
await writeFile(
  ".local/reference-coverage.json",
  JSON.stringify({ summary: result, cases }, null, 2),
);
await writeFile(".local/reference-snapshot.json", JSON.stringify(rows));
console.log(
  JSON.stringify(
    { ...result, representative: result.representative.slice(0, 4) },
    null,
    2,
  ),
);
