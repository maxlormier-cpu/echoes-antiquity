import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml"
};

function safePath(url) {
  const clean = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const target = path.normalize(path.join(dist, clean));
  if (!target.startsWith(dist)) return null;
  return target;
}

createServer(async (req, res) => {
  try {
    let target = safePath(req.url);
    if (!target) throw Object.assign(new Error("Bad path"), { code: 400 });
    const info = await stat(target).catch(() => null);
    if (info?.isDirectory()) target = path.join(target, "index.html");
    const body = await readFile(target);
    res.writeHead(200, { "content-type": types[path.extname(target)] || "application/octet-stream" });
    res.end(body);
  } catch (error) {
    res.writeHead(error.code === 400 ? 400 : 404, { "content-type": "text/plain; charset=utf-8" });
    res.end(error.code === 400 ? "Bad request" : "Not found");
  }
}).listen(port, host, () => {
  console.log(`Echoes of Antiquity preview: http://${host}:${port}`);
});
