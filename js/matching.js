import { productFor, sizeTolerance, packCounts, sellingPlaces } from "./products.js";
export function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q,
    low = Math.floor(pos);
  return (
    sorted[low] +
    (sorted[Math.min(low + 1, sorted.length - 1)] - sorted[low]) * (pos - low)
  );
}
export function compareObservations(
  attributes,
  observations,
  now = new Date(),
) {
  const a = attributes;
  const product = productFor(a.category_id);
  const isBangles = a.category_id === "bangles";
  const size = Number(a.size_cm);
  if (
    !product ||
    !Number.isFinite(size) ||
    size < product.min ||
    size > product.max ||
    (isBangles && !packCounts.includes(Number(a.pack_count)))
  )
    return {
      status: "insufficient",
      matches: [],
      reason:
        "FairFare compares wooden elephants and fashion bangles. Enter the size and, for bangles, how many are sold together.",
    };
  const unknownMaterial = !a.material || a.material === "unknown";
  const unknownFinish = !a.finish || a.finish === "unknown";
  if (unknownMaterial && unknownFinish)
    return {
      status: "insufficient",
      matches: [],
      reason: `Choose the ${product.finishLabel.toLowerCase()} or material to narrow the comparison.`,
    };
  if (unknownMaterial || unknownFinish) {
    const field = unknownMaterial ? "material" : "finish";
    const choices = unknownMaterial ? product.materials : product.finishes;
    const alternatives = Object.entries(choices)
      .map(([value, label]) => ({
        label,
        value,
        result: compareObservations(
          { ...a, [field]: value },
          observations,
          now,
        ),
      }))
      .filter(({ result }) => result.status === "ready");
    if (!alternatives.length)
      return {
        status: "insufficient",
        matches: [],
        reason: "We couldn’t find enough prices for items with these details.",
      };
    return {
      status: "alternatives",
      field,
      alternatives,
      matches: alternatives.flatMap(({ result }) => result.matches),
      synthetic: alternatives.reduce(
        (sum, { result }) => sum + result.synthetic,
        0,
      ),
      excluded: alternatives.reduce(
        (sum, { result }) => sum + result.excluded,
        0,
      ),
    };
  }
  const seen = new Set(),
    seenIds = new Set();
  const matches = observations
    .filter((o) => {
      const key = o.independence_key || o.id;
      if (!key || seen.has(key) || seenIds.has(o.id)) return false;
      const age = (now - new Date(o.observed_at)) / (86400 * 1000);
      const eligible =
        o.status === "approved" &&
        o.category_id === a.category_id &&
        o.ff_markets?.city === "Jaipur" &&
        o.material === a.material &&
        o.segment === a.segment &&
        o.finish === a.finish &&
        (isBangles
          ? Number(o.attributes?.pack_count) === Number(a.pack_count)
          : !a.carving_detail ||
            a.carving_detail === "unknown" ||
            o.attributes?.carving_detail === a.carving_detail) &&
        Number.isFinite(Number(o.price_inr)) &&
        Number(o.price_inr) > 0 &&
        Math.abs(Number(o.size_cm) - size) <=
          sizeTolerance(a.category_id, size) + 1e-9 &&
        age >= -1 &&
        age <= 365;
      if (eligible) {
        seen.add(key);
        seenIds.add(o.id);
      }
      return eligible;
    })
    .map((o) => ({
      ...o,
      reasons: [
        `Same product and material`,
        `${o.size_cm} cm ${isBangles ? "across the opening" : "high"}, close to the size you entered`,
        `${product.finishes[o.finish] || o.finish} at a ${sellingPlaces[o.segment]?.toLowerCase() || o.segment}`,
        `Price from Jaipur in the past year`,
      ],
    }))
    .sort(
      (x, y) =>
        Math.abs(x.size_cm - a.size_cm) - Math.abs(y.size_cm - a.size_cm) ||
        Number(x.price_inr) - Number(y.price_inr),
    );
  if (matches.length < 3)
    return {
      status: "insufficient",
      matches,
      reason:
        "We need at least three prices for similar items to calculate a range.",
    };
  // Remove extreme tails using Tukey's fences before reporting the middle half.
  const prices = matches.map((m) => Number(m.price_inr)).sort((x, y) => x - y);
  const q1 = quantile(prices, 0.25),
    q3 = quantile(prices, 0.75),
    iqr = q3 - q1;
  const kept = matches.filter(
    (m) =>
      Number(m.price_inr) >= q1 - 1.5 * iqr &&
      Number(m.price_inr) <= q3 + 1.5 * iqr,
  );
  if (kept.length < 3)
    return {
      status: "insufficient",
      matches: kept,
      reason:
        "We found too few similar prices after leaving out unusually high or low prices.",
    };
  const p = kept.map((m) => Number(m.price_inr)).sort((x, y) => x - y);
  const synthetic = kept.filter((m) => m.provenance === "synthetic").length;
  return {
    status: "ready",
    matches: kept,
    low: Math.floor(quantile(p, 0.25) / 10) * 10,
    high: Math.ceil(quantile(p, 0.75) / 10) * 10,
    median: quantile(p, 0.5),
    synthetic,
    excluded: matches.length - kept.length,
    method:
      "We leave out unusually high or low prices, then take the middle half of the remaining prices. We round the lower end down and the upper end up to the nearest ₹10.",
  };
}
