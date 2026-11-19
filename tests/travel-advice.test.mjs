import test from "node:test";
import assert from "node:assert/strict";
import { historicalFare, bargainingFor } from "../js/travel-advice.js";

test("the dated auto reference uses a minimum and post-first-kilometre rate", () => {
  assert.equal(historicalFare("auto", 0.5), 15);
  assert.equal(historicalFare("auto", 1), 15);
  assert.equal(historicalFare("auto", 5), 51);
  assert.equal(historicalFare("auto", 5.5), 55.5);
  assert.equal(historicalFare("auto", 0), null);
  assert.equal(historicalFare("auto", NaN), null);
});

test("prepaid taxi references respect size classes, band boundaries and the last published distance", () => {
  assert.equal(historicalFare("taxi-small", 2), 100);
  assert.equal(historicalFare("taxi-small", 2.1), 130);
  assert.equal(historicalFare("taxi-large", 5), 230);
  assert.equal(historicalFare("taxi-large", 20), 510);
  assert.equal(historicalFare("taxi-large", 20.1), null);
  assert.equal(historicalFare("other", 5), null);
});

test("bargaining bands narrow as selling settings become more likely to have fixed prices", () => {
  assert.deepEqual(
    ["street", "shop", "boutique"].map((key) => {
      const { low, high } = bargainingFor(key);
      return [low, high];
    }),
    [
      [10, 20],
      [5, 10],
      [0, 5],
    ],
  );
  assert.equal(bargainingFor("unknown"), null);
});
