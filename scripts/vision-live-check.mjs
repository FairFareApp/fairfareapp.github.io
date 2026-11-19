// Run once deliberately, never as part of npm test. No key is read or printed.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { SUPABASE_URL, PUBLISHABLE_KEY } from "../js/config.js";
const filename = process.argv[2];
if (!filename) throw new Error("Provide a non-sensitive test photograph path.");
const data = await sharp(await readFile(filename))
  .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
  .jpeg({ quality: 70 })
  .toBuffer();
const r = await fetch(SUPABASE_URL + "/functions/v1/fairfare-identify", {
  method: "POST",
  headers: { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({
    image: "data:image/jpeg;base64," + data.toString("base64"),
  }),
  signal: AbortSignal.timeout(65000),
});
const result = await r.json();
await mkdir(".local", { recursive: true });
await writeFile(
  ".local/vision-response.json",
  JSON.stringify({ status: r.status, result }, null, 2),
);
console.log(
  JSON.stringify({
    status: r.status,
    validResponse:
      r.ok &&
      ["wooden_elephant", "bangles", "unsupported"].includes(
        result.category_id,
      ),
    category: result.category_id,
    error: result.error,
    intentionalLiveInferenceCalls: 1,
  }),
);
