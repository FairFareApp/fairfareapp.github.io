import { readBody, reply, handleError } from "../_shared/runtime.js";
import { collectTicketPrices } from "../_shared/tickets.js";

let cached;
let expires = 0;
Deno.serve(async (request) => {
  try {
    if (request.method === "OPTIONS") return reply(request, {});
    await readBody(request, 1000);
    if (!cached || Date.now() >= expires) {
      expires = Date.now() + 60_000;
      cached = collectTicketPrices().then((cards) => {
        // Retry upstream failures sooner than successful live reads.
        expires =
          Date.now() +
          (cards.every((card) => card.verification === "official")
            ? 30 * 60_000
            : 2 * 60_000);
        return cards;
      });
    }
    return reply(request, await cached);
  } catch (error) {
    return handleError(request, error);
  }
});
