import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("assets", { recursive: true });
// Preserve the supplied artwork and background; crop empty outer space.
const source = await sharp("assets/logo.png")
  .extract({ left: 135, top: 175, width: 1040, height: 920 })
  .resize(512, 512, { fit: "contain", background: "#faf5f0" })
  .png()
  .toBuffer();
for (const [name, size] of [
  ["brand-mark", 192],
  ["favicon-32", 32],
  ["icon-192", 192],
  ["icon-512", 512],
]) {
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="white"/></svg>`,
  );
  await sharp(source)
    .resize(size, size)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toFile(`assets/${name}.png`);
}
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#faf5f0" },
})
  .composite([
    {
      input: await sharp(source).resize(360, 360).toBuffer(),
      left: 76,
      top: 76,
    },
  ])
  .png()
  .toFile("assets/icon-maskable.png");
console.log("Created rounded logo icons and safe-area maskable icon.");
