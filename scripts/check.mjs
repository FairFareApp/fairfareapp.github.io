import { readdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = dir + "/" + entry.name;
    if (entry.isDirectory()) await walk(p);
    else files.push(p);
  }
}
for (const d of ["js", "css", "scripts", "tests", "supabase/functions"])
  await walk(d);
let checks = 0;
for (const p of files) {
  const t = await readFile(p, "utf8");
  if (/\.(?:js|mjs)$/.test(p)) {
    execFileSync(process.execPath, ["--check", p], { stdio: "pipe" });
    checks++;
  }
  assert.ok(
    !/sk-or-v1-[a-z0-9]{20}|sb_secret_[a-zA-Z0-9_-]{15}|sbp_[a-z0-9]{20}/.test(
      t,
    ),
    `Privileged credential in ${p}`,
  );
  if (p.startsWith("js/") || p.startsWith("css/"))
    assert.ok(!t.includes("\u2014"), `Em dash in ${p}`);
}
const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split(
  "\n",
);
assert.ok(
  !tracked.includes("supa.txt") && !tracked.includes("openrouter.txt"),
  "Credential files must be untracked",
);
const manifest = JSON.parse(await readFile("manifest.webmanifest", "utf8"));
assert.equal(manifest.start_url, "/");
assert.equal(manifest.scope, "/");
const sw = await readFile("sw.js", "utf8");
assert.ok(sw.includes("e.request.method!=='GET'"));
assert.ok(!sw.includes("cache.put(e.request"));
const pair = (fg, bg) => {
  const lum = (hex) => {
    const c = hex
      .match(/[0-9a-f]{2}/gi)
      .map((x) => parseInt(x, 16) / 255)
      .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const a = lum(fg),
    b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
const themes = {
  light: {
    ink: "252c28",
    muted: "60665f",
    surface: "ffffff",
    ground: "faf9f6",
    soft: "f0efea",
    green: "e9eee8",
    sage: "425b47",
    accent: "a3492d",
    onAccent: "ffffff",
    boundary: "818980",
    error: "a72c27",
    errorBg: "fff0ec",
  },
  dark: {
    ink: "f4f3ec",
    muted: "b7beb5",
    surface: "222522",
    ground: "171917",
    soft: "2e322e",
    green: "29382c",
    sage: "bfd3bf",
    accent: "f0a184",
    onAccent: "211a17",
    boundary: "8b968b",
    error: "ffb5ab",
    errorBg: "402622",
  },
};
const contrasts = [];
const css = await readFile("css/app.css", "utf8");
for (const [theme, t] of Object.entries(themes)) {
  for (const fg of ["ink", "muted", "accent"])
    for (const bg of ["surface", "ground", "soft"]) {
      const ratio = pair(t[fg], t[bg]);
      assert.ok(ratio >= 4.5, `${theme} ${fg}/${bg} = ${ratio}`);
      contrasts.push({ theme, pair: fg + "/" + bg, ratio: ratio.toFixed(2) });
    }
  for (const [fg, bg, min] of [
    ["sage", "green", 4.5],
    ["boundary", "surface", 3],
    ["boundary", "soft", 3],
    ["error", "errorBg", 4.5],
  ]) {
    const ratio = pair(t[fg], t[bg]);
    assert.ok(ratio >= min, `${theme} ${fg}/${bg} = ${ratio}`);
    contrasts.push({ theme, pair: fg + "/" + bg, ratio: ratio.toFixed(2) });
  }
  const selector = theme === "light" ? ":root {" : ':root[data-theme="dark"] {';
  const tokens = css.split(selector)[1].split("}")[0];
  for (const [fg, bg] of [
    ["lac-ink", "lac"],
    ["leaf-ink", "leaf"],
    ["indigo-ink", "indigo"],
    ["turmeric-ink", "turmeric"],
    ["muted", "leaf"],
    ["muted", "indigo"],
    ["muted", "turmeric"],
    ["ink", "lac"],
    ["ink", "leaf"],
  ]) {
    const colors = [fg, bg].map(
      (name) => tokens.match(new RegExp(`--${name}: #([a-f0-9]{6});`))[1],
    );
    const ratio = pair(...colors);
    assert.ok(ratio >= 4.5, `${theme} ${fg}/${bg} = ${ratio}`);
    contrasts.push({ theme, pair: fg + "/" + bg, ratio: ratio.toFixed(2) });
  }
}
assert.ok(pair("ffffff", "a3492d") >= 4.5);
assert.ok(pair("211a17", "f0a184") >= 4.5);
console.log(
  JSON.stringify(
    {
      syntaxFiles: checks,
      secretScan: "pass",
      credentialTracking: "pass",
      contrastPairs: contrasts,
    },
    null,
    2,
  ),
);
