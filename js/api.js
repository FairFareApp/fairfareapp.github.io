import { SUPABASE_URL, PUBLISHABLE_KEY } from "./config.js";
export async function request(path, { method = "GET", body, signal } = {}) {
  if (
    ["localhost", "127.0.0.1"].includes(location.hostname) &&
    new URLSearchParams(location.search).get("mock") === "network-error"
  )
    throw new Error(
      "Development network-error fixture. Retry after removing ?mock=network-error. No request was sent.",
    );
  let response;
  try {
    response = await fetch(SUPABASE_URL + path, {
      method,
      headers: { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: signal || AbortSignal.timeout(65000),
    });
  } catch (e) {
    if (e.name === "AbortError" || e.name === "TimeoutError")
      throw new Error(
        "This is taking too long. Please try again on a stable connection.",
      );
    throw new Error(
      "Could not connect to FairFare. Check your connection and try again.",
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      data.error || "Could not complete this request. Please try again.",
    );
  return data;
}
export async function getObservations(signal, attributes = {}) {
  const tolerance = Math.max(2, Number(attributes.size_cm) * 0.2);
  const query = new URLSearchParams({
    select:
      "id,category_id,material,size_cm,finish,segment,price_inr,price_type,observed_at,attributes,provenance,source_note,source_url,status,image_path,image_alt,image_kind,image_credit,image_license,independence_key,ff_markets!inner(city,locality)",
    status: "eq.approved",
    "ff_markets.city": "eq.Jaipur",
    order: "id.asc",
    limit: "500",
  });
  for (const key of ["category_id", "material", "finish", "segment"])
    if (attributes[key]) query.set(key, "eq." + attributes[key]);
  if (Number.isFinite(tolerance))
    query.set(
      "and",
      `(size_cm.gte.${Math.max(2, Number(attributes.size_cm) - tolerance)},size_cm.lte.${Math.min(30, Number(attributes.size_cm) + tolerance)})`,
    );
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    query.set("offset", String(offset));
    const page = await request("/rest/v1/ff_observations?" + query, { signal });
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}
export const getGuidance = (module, signal) =>
  request(
    `/rest/v1/ff_guidance?select=*&module=eq.${module}&published=eq.true&order=id`,
    { signal },
  );
export const identify = (image, signal) =>
  request("/functions/v1/fairfare-identify", {
    method: "POST",
    body: { image },
    signal,
  });
export const submitObservation = (body, signal) =>
  request("/functions/v1/fairfare-submit", { method: "POST", body, signal });
