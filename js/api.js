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
export const getObservations = (signal) =>
  request(
    "/rest/v1/ff_observations?select=id,category_id,material,size_cm,finish,segment,price_inr,price_type,observed_at,provenance,source_note,source_url,status,ff_markets(city,locality)&status=eq.approved&limit=1000",
    { signal },
  );
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
