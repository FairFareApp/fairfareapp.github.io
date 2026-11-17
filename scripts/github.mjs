import { execFileSync } from "node:child_process";
const credentials = execFileSync("git", ["credential", "fill"], {
  input: "protocol=https\nhost=github.com\n\n",
  encoding: "utf8",
  stdio: ["pipe", "pipe", "ignore"],
});
const credential = Object.fromEntries(
  credentials
    .trim()
    .split("\n")
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
if (!credential.password)
  throw new Error("GitHub credentials are unavailable.");
const base = "https://api.github.com/repos/FairFareApp/fairfareapp.github.io";
async function api(path = "", method = "GET", body) {
  const r = await fetch(base + path, {
    method,
    headers: {
      Authorization: "Bearer " + credential.password,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok && r.status !== 404)
    throw new Error(
      `GitHub API ${r.status}: ${data.message || "request failed"}`,
    );
  return { status: r.status, data };
}
const action = process.argv[2] || "inspect";
if (action === "inspect") {
  const { status, data: d } = await api();
  console.log(
    JSON.stringify({
      status,
      repo: d.full_name,
      private: d.private,
      default_branch: d.default_branch,
      permissions: d.permissions,
      has_pages: d.has_pages,
    }),
  );
  const p = await api("/pages");
  console.log(
    JSON.stringify({
      pages_status: p.status,
      ...(p.status === 200
        ? {
            url: p.data.html_url,
            build_type: p.data.build_type,
            status: p.data.status,
            source: p.data.source,
          }
        : {}),
    }),
  );
} else if (action === "pages") {
  const p = await api("/pages");
  const result = await api("/pages", p.status === 404 ? "POST" : "PUT", {
    build_type: "legacy",
    source: { branch: "main", path: "/" },
  });
  console.log(
    JSON.stringify({
      status: result.status,
      url: result.data.html_url || "https://fairfareapp.github.io",
      build_type: result.data.build_type || "legacy",
    }),
  );
} else if (action === "build") {
  const r = await api("/pages/builds/latest");
  console.log(
    JSON.stringify({
      status: r.status,
      build_status: r.data.status,
      error: r.data.error?.message,
      commit: r.data.commit,
      url: r.data.url,
    }),
  );
} else throw new Error("Unknown action.");
