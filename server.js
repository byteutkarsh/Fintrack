import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Groq from "groq-sdk";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

loadEnvFile(path.join(__dirname, ".env"));

// The key and SDK client stay on the server. Never include this value in frontend code.
const groq = process.env.GROQ_API_KEY?.trim()
  ? new Groq({ apiKey: process.env.GROQ_API_KEY.trim() })
  : null;
const MAX_AI_BODY_BYTES = 16 * 1024;

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
    const pathname = new URL(req.url || "/", "http://localhost").pathname;

    if (pathname === "/api/ai") {
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return writeJson(res, 405, { error: "Method not allowed" });
      }
      if (!req.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
        return writeJson(res, 415, { error: "Content-Type must be application/json" });
      }
      if (!groq) {
        return writeJson(res, 503, { error: "AI service is not configured" });
      }

      const body = await readJsonBody(req, MAX_AI_BODY_BYTES);
      const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
      if (!prompt || prompt.length > 8000) {
        return writeJson(res, 400, { error: "prompt must be a non-empty string of at most 8000 characters" });
      }

      try {
        const result = await groq.chat.completions.create({
          model: "openai/gpt-oss-20b",
          messages: [{ role: "user", content: prompt }],
        });
        const text = result.choices?.[0]?.message?.content;
        if (typeof text !== "string" || !text.trim()) {
          return writeJson(res, 502, { error: "AI service returned an empty response" });
        }
        return writeJson(res, 200, { text });
      } catch (error) {
        console.error("Groq request failed:", error?.message);
        return writeJson(res, 502, { error: "AI request failed. Please try again." });
      }
    }

    if (pathname === "/api/insights") {
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return writeJson(res, 405, { error: "Method not allowed" });
      }
      if (!req.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
        return writeJson(res, 415, { error: "Content-Type must be application/json" });
      }
      if (!groq) {
        return writeJson(res, 503, { error: "AI service is not configured" });
      }

      const body = await readJsonBody(req, 48 * 1024);
      if (!Array.isArray(body?.transactions) || body.transactions.length === 0 || body.transactions.length > 50) {
        return writeJson(res, 400, { error: "transactions must be an array containing 1 to 50 entries" });
      }

      const transactionsForPrompt = [];
      for (const transaction of body.transactions) {
        if (!transaction || typeof transaction !== "object" || Array.isArray(transaction)
          || typeof transaction.amount !== "number" || !Number.isFinite(transaction.amount)
          || typeof transaction.text !== "string" || typeof transaction.category !== "string"
          || typeof transaction.date !== "string") {
          return writeJson(res, 400, { error: "Each transaction needs a date, description, category, and finite amount" });
        }
        transactionsForPrompt.push({
          date: transaction.date.slice(0, 32),
          description: transaction.text.slice(0, 200),
          category: transaction.category.slice(0, 100),
          amount: transaction.amount,
        });
      }

      const prompt = `Analyze the following financial transactions and provide three short, actionable budgeting insights or spending warnings.\n\nTransactions:\n${JSON.stringify(transactionsForPrompt)}`;
      try {
        const result = await groq.chat.completions.create({
          model: "openai/gpt-oss-20b",
          messages: [{ role: "user", content: prompt }],
        });
        const text = result.choices?.[0]?.message?.content;
        if (typeof text !== "string" || !text.trim()) {
          return writeJson(res, 502, { error: "AI service returned an empty response" });
        }
        return writeJson(res, 200, { text });
      } catch (error) {
        console.error("Groq insights request failed:", error?.message);
        return writeJson(res, 502, { error: "Could not generate insights. Please try again." });
      }
    }

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
    if (error?.statusCode === 413) {
      return writeJson(res, 413, { error: "Request body is too large" });
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

async function readJsonBody(req, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const error = new Error("Request body is too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function resolveStaticPath(urlPath) {
  const pathname = new URL(urlPath, "http://localhost").pathname;
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  // Never serve environment files from the static web root.
  if (relativePath.split(/[\\/]/).some((part) => /^\.env(?:\.|$)/i.test(part))) {
    return Promise.resolve(null);
  }
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
