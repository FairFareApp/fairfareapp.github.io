import { HttpError } from "./validation.js";
import { PUBLISHABLE_KEY } from "./public-config.js";
const url = Deno.env.get("SUPABASE_URL");
const adminKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Object.values(JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"))[0];
const allowed = [
  "https://fairfareapp.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];
export function headers(req) {
  const origin = req.headers.get("origin");
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": allowed.includes(origin)
      ? origin
      : allowed[0],
    "Access-Control-Allow-Headers":
      "apikey, content-type, authorization, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}
export function reply(req, data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: headers(req) });
}
export async function readBody(req, max = 4500000) {
  if (req.method === "OPTIONS") return null;
  if (req.method !== "POST")
    throw new HttpError(405, "Use POST for this request.");
  const origin = req.headers.get("origin");
  if (origin && !allowed.includes(origin))
    throw new HttpError(403, "This origin is not enabled for the pilot.");
  if (req.headers.get("apikey") !== PUBLISHABLE_KEY)
    throw new HttpError(401, "A valid FairFare public API key is required.");
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Use a JSON request.");
  if (Number(req.headers.get("content-length")) > max)
    throw new HttpError(413, "This request is too large.");
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "A request body is required.");
  let total = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) {
      await reader.cancel();
      throw new HttpError(413, "This request is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, "The request is not valid JSON.");
  }
}
export async function admin(
  path,
  { method = "GET", body, raw, contentType, prefer } = {},
) {
  if (!url || !adminKey)
    throw new HttpError(503, "The backend is not configured yet.");
  const res = await fetch(url + path, {
    method,
    headers: {
      apikey: adminKey,
      Authorization: "Bearer " + adminKey,
      "Content-Type": contentType || "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: raw || (body ? JSON.stringify(body) : undefined),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok)
    throw new HttpError(
      503,
      "The observation service could not complete the request. Please try again.",
    );
  return res.status === 204 ? null : res.json().catch(() => null);
}
export async function quota(req, action) {
  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    "unknown";
  const day = new Date().toISOString().slice(0, 10);
  // Rotate the hash daily. Never retain the raw address or log request bodies.
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(adminKey + day + ip),
  );
  const hash = Array.from(new Uint8Array(digest))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  const take = (bucket, limit, seconds) =>
    admin("/rest/v1/rpc/ff_take_quota", {
      method: "POST",
      body: { p_bucket: bucket, p_limit: limit, p_window_seconds: seconds },
    });
  if (!(await take(action + ":ip:" + hash, action === "vision" ? 4 : 8, 900)))
    throw new HttpError(
      429,
      "Too many requests from this connection. Please wait 15 minutes before trying again.",
    );
  const cap =
    action === "vision"
      ? Math.max(
          1,
          Math.min(100, Number(Deno.env.get("VISION_DAILY_LIMIT") || 20)),
        )
      : 150;
  if (!(await take(action + ":global:" + day, cap, 86400)))
    throw new HttpError(
      429,
      "The pilot’s daily request allowance is used up. Please try again tomorrow or use manual product details.",
    );
}
export function handleError(req, error) {
  return reply(
    req,
    {
      error:
        error instanceof HttpError
          ? error.message
          : "The service could not complete this request. Please try again.",
    },
    error instanceof HttpError ? error.status : 500,
  );
}
