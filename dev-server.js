#!/usr/bin/env node
/*
 * Zero-dependency dev server with live reload.
 *
 *   npm run dev         serve this folder and reload the browser on every file change
 *   npm run dev:sync    same, and also `git pull` every few seconds so changes pushed
 *                       to this branch (e.g. by Claude) show up automatically
 *
 * CSS edits are swapped in place (no reload, so the intro animation doesn't replay).
 * Any other change reloads the page. Options: PORT=3000 npm run dev
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8000;
const PULL = process.argv.includes("--pull");
const PULL_EVERY_MS = 5000;

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".mp4": "video/mp4",
};

const CLIENT = `<script>
(function () {
  var es = new EventSource("/__reload");
  es.onmessage = function (e) {
    if (e.data === "css") {
      document.querySelectorAll('link[rel="stylesheet"]').forEach(function (l) {
        var u = new URL(l.href); u.searchParams.set("_r", Date.now()); l.href = u.href;
      });
    } else { location.reload(); }
  };
})();
</script>`;

const clients = new Set();
function broadcast(kind) { clients.forEach((res) => res.write("data: " + kind + "\n\n")); }

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/__reload") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.write("retry: 500\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep) || /(^|[\\/])\.git([\\/]|$)/.test(rel)) { res.writeHead(403); return res.end("Forbidden"); }

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found: " + rel); }
    const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    res.setHeader("Cache-Control", "no-store");
    if (type.startsWith("text/html")) {
      const html = data.toString("utf8");
      const out = html.includes("</body>") ? html.replace("</body>", CLIENT + "</body>") : html + CLIENT;
      res.writeHead(200, { "Content-Type": type });
      return res.end(out);
    }
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
});

// Watch for changes (debounced so one save = one reload).
let timer = null, pendingKind = "css";
function onChange(file) {
  if (!file || /(^|[\\/])(\.git|node_modules)([\\/]|$)/.test(file)) return;
  if (!/\.css$/i.test(file)) pendingKind = "full";
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log("  changed: " + file + (pendingKind === "css" ? " (css swap)" : " (reload)"));
    broadcast(pendingKind);
    pendingKind = "css";
  }, 80);
}
// Poll file mtimes. It's cheap for a site this size, and unlike fs.watch it keeps
// working when an editor replaces a file on save, and behaves the same on every OS.
const POLL_MS = 300;
const SKIP = new Set([".git", "node_modules"]);
function snapshot(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const ent of entries) {
    if (SKIP.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) snapshot(full, out);
    else {
      try { const st = fs.statSync(full); out.set(path.relative(ROOT, full), st.mtimeMs + ":" + st.size); } catch (e) { /* removed mid-scan */ }
    }
  }
  return out;
}
let known = snapshot(ROOT, new Map());
setInterval(() => {
  const now = snapshot(ROOT, new Map());
  for (const [file, sig] of now) if (known.get(file) !== sig) onChange(file);
  for (const file of known.keys()) if (!now.has(file)) onChange(file);
  known = now;
}, POLL_MS);

if (PULL) {
  let busy = false;
  setInterval(() => {
    if (busy) return;
    busy = true;
    execFile("git", ["pull", "--ff-only", "--quiet"], { cwd: ROOT }, (err, _out, stderr) => {
      busy = false;
      if (err && !/Already up to date/i.test(stderr)) {
        console.warn("  git pull skipped: " + String(stderr || err.message).trim().split("\n")[0]);
      }
    });
  }, PULL_EVERY_MS);
}

server.listen(PORT, () => {
  console.log("Stoke Design dev server");
  console.log("  http://localhost:" + PORT);
  console.log("  live reload: on" + (PULL ? " | auto git pull: every " + PULL_EVERY_MS / 1000 + "s" : ""));
});
