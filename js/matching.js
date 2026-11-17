export const PILOT_CATEGORY = "wooden_elephant";
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
  if (
    a.category_id !== PILOT_CATEGORY ||
    !Number.isFinite(Number(a.size_cm)) ||
    !["wood", "sandalwood"].includes(a.material)
  )
    return {
      status: "insufficient",
      matches: [],
      reason:
        "Confirm a wooden elephant, its material and approximate size to find a useful comparison.",
    };
  const matches = observations
    .filter((o) => {
      const age = (now - new Date(o.observed_at)) / (86400 * 1000);
      return (
        o.status === "approved" &&
        o.category_id === a.category_id &&
        o.ff_markets?.city === "Jaipur" &&
        o.material === a.material &&
        o.segment === a.segment &&
        o.finish === a.finish &&
        Math.abs(Number(o.size_cm) - Number(a.size_cm)) <=
          Math.max(2, Number(a.size_cm) * 0.2) &&
        age >= -1 &&
        age <= 365
      );
    })
    .map((o) => ({
      ...o,
      reasons: [
        `Same product and material`,
        `${o.size_cm} cm, within the size tolerance`,
        `${o.finish} finish, ${o.segment} setting`,
        `Jaipur, observed within the last year`,
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
        "Fewer than three compatible approved observations. We won’t widen the match to a different product.",
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
        "Too few comparable observations remain after removing extreme prices.",
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
      "The middle 50% of compatible prices, rounded outward to ₹10, after excluding extreme outliers. This is context, not a correct or guaranteed price.",
  };
}
