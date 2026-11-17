import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};
const allowed = (p) =>
  [
    "/index.html",
    "/404.html",
    "/manifest.webmanifest",
    "/sw.js",
    "/offline.html",
  ].includes(p) || /^\/(?:js|css|assets)\/[a-zA-Z0-9_./%()-]+$/.test(p);
http
  .createServer(async (req, res) => {
    let p;
    try {
      p = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (p.includes("..")) {
      res.writeHead(403).end();
      return;
    }
    if (!path.extname(p)) p = "/index.html";
    if (!allowed(p)) {
      res.writeHead(404).end("Not found");
      return;
    }
    try {
      const body = await readFile(path.join(root, p));
      res.writeHead(200, {
        "Content-Type": mime[path.extname(p)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch {
      res.writeHead(404).end("Not found");
    }
  })
  .listen(4173, "0.0.0.0", () =>
    console.log("FairFare: http://localhost:4173"),
  );
