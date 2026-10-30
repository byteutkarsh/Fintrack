import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

loadEnvFile(path.join(__dirname, ".env"));

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return writeJson(res, 405, { error: "Method not allowed" });
    }

    const safePath = await resolveStaticPath(req.url || "/");
    if (!safePath) {
      return writeJson(res, 404, { error: "Not found" });
    }

    const file = await readFile(safePath);
    const ext = path.extname(safePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    res.end(file);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return writeJson(res, 404, { error: "Not found" });
    }
    if (error instanceof SyntaxError) {
      return writeJson(res, 400, { error: "Invalid JSON body" });
    }
    return writeJson(res, 500, {
      error: error instanceof Error ? error.message : "Unexpected server error",
    });
  }
});

server.listen(PORT, () => {
  console.log(`FinTrack running at http://localhost:${PORT}`);
});

function writeJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function resolveStaticPath(urlPath) {
  const pathname = new URL(urlPath, "http://localhost").pathname;
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const normalized = path.normalize(relativePath);
  const fullPath = path.join(__dirname, normalized);

  const relativeToRoot = path.relative(__dirname, fullPath);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return Promise.resolve(null);
  }

  return stat(fullPath)
    .then((info) => (info.isDirectory() ? path.join(fullPath, "index.html") : fullPath));
}

function loadEnvFile(filePath) {
  try {
    const contents = readFileSyncSafe(filePath);
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separator = trimmed.indexOf("=");
      if (separator === -1) {
        continue;
      }
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // Local development can still run without a .env file, but the API route will report it clearly.
  }
}

function readFileSyncSafe(filePath) {
  return readFileSync(filePath, "utf8");
}
