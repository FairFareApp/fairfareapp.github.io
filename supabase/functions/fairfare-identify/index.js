import { HttpError, decodeImage } from "../_shared/validation.js";
import { readBody, reply, quota, handleError } from "../_shared/runtime.js";
import { buildVisionRequest, parseVisionResponse } from "../_shared/vision.js";

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return reply(req, {});
    const body = await readBody(req, 2200000);
    decodeImage(body?.image);
    const key = Deno.env.get("OPENROUTER_API_KEY"),
      model = Deno.env.get("OPENROUTER_MODEL");
    if (!key || !model)
      throw new HttpError(
        503,
        "Photo identification is not configured yet. You can still enter product details manually.",
      );
    await quota(req, "vision");
    let response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://fairfareapp.github.io",
          "X-Title": "FairFare Jaipur pilot",
        },
        body: JSON.stringify(buildVisionRequest(model, body.image)),
        signal: AbortSignal.timeout(50000),
      });
    } catch {
      throw new HttpError(
        504,
        "The photo service timed out. Try again later, or enter details manually.",
      );
    }
    if (response.status === 429)
      throw new HttpError(
        429,
        "The photo service is busy or its allowance is reached. Try later, or enter details manually.",
      );
    if (!response.ok)
      throw new HttpError(
        502,
        "The photo service is temporarily unavailable. Please enter details manually.",
      );
    const payload = await response.json().catch(() => null);
    const identification = parseVisionResponse(payload, (metadata) => {
      // Shape/status only: no image, model text, reasoning, key or request body.
      console.warn(JSON.stringify(metadata));
    });
    return reply(req, identification);
  } catch (error) {
    return handleError(req, error);
  }
});
