import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "..", "..");
const host = "127.0.0.1";
const port = 4173;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function resolvePathFromUrl(urlPathname) {
  const rawPath = decodeURIComponent(urlPathname.split("?")[0]);
  const normalized = rawPath === "/" ? "/public/index.html" : rawPath;
  const absolutePath = path.resolve(workspaceRoot, `.${normalized}`);

  if (!absolutePath.startsWith(workspaceRoot)) {
    return null;
  }

  if (!existsSync(absolutePath)) {
    return null;
  }

  const stats = statSync(absolutePath);
  if (stats.isDirectory()) {
    const indexPath = path.join(absolutePath, "index.html");
    return existsSync(indexPath) ? indexPath : null;
  }

  return absolutePath;
}

const server = createServer((request, response) => {
  const requestPath = request.url || "/";
  const filePath = resolvePathFromUrl(requestPath);

  if (!filePath) {
    response.statusCode = 404;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.end("Not found");
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  response.statusCode = 200;
  response.setHeader("Content-Type", mimeTypes[extension] || "application/octet-stream");
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  process.stdout.write(`Test server running at http://${host}:${port}\n`);
});
