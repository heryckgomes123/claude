// Servidor do controle do ar: serve a interface do celular e recebe os comandos.
// Sem dependências: só módulos nativos do Node 18+.
//
// Uso:
//   AC_TOKEN=troque-por-um-segredo node server.mjs
//   PORT=8080 (padrão)
//
// O envio real fica em `driver`. Troque o driver "log" pelo que conversa com o seu aparelho
// (IR via hub, API da marca, Home Assistant etc.). Ele recebe o estado completo e deve
// lançar erro se o comando falhar.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extname, join } from "node:path";

const PORT = Number(process.env.PORT ?? 8080);
const TOKEN = process.env.AC_TOKEN;
if (!TOKEN) {
  console.error("Defina AC_TOKEN antes de iniciar. Ex.: AC_TOKEN=$(openssl rand -hex 16) node server.mjs");
  process.exit(1);
}

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const STATIC_FILES = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/manifest.webmanifest": ["manifest.webmanifest", "application/manifest+json"],
};

const MODES = new Set(["cool", "heat", "fan", "dry", "auto"]);
const FANS = new Set(["auto", "low", "medium", "high"]);

// Driver de envio. Substitua `send` pela integração real do seu aparelho.
const driver = {
  name: "log",
  async send(state) {
    console.log(new Date().toISOString(), "->", JSON.stringify(state));
  },
};

function validate(body) {
  if (typeof body !== "object" || body === null) return "Corpo inválido";
  const { power, mode, temp, fan } = body;
  if (typeof power !== "boolean") return "power deve ser boolean";
  if (!MODES.has(mode)) return "mode inválido";
  if (!FANS.has(fan)) return "fan inválido";
  if (!Number.isInteger(temp) || temp < 16 || temp > 30) return "temp deve ser inteiro entre 16 e 30";
  return null;
}

function json(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

// Comparação em tempo constante para não vazar o token por tempo de resposta.
function authorized(req) {
  const header = req.headers.authorization ?? "";
  const expected = `Bearer ${TOKEN}`;
  if (header.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

async function readBody(req, limit = 4096) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("payload grande demais");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "GET" && STATIC_FILES[url.pathname]) {
    const [file, type] = STATIC_FILES[url.pathname];
    try {
      const data = await readFile(join(ROOT, file));
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
      res.end(data);
    } catch {
      json(res, 404, { error: "não encontrado" });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/ac") {
    if (!authorized(req)) return json(res, 401, { error: "token inválido" });

    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch (err) {
      return json(res, 400, { error: err.message === "payload grande demais" ? err.message : "JSON inválido" });
    }

    const problem = validate(body);
    if (problem) return json(res, 422, { error: problem });

    try {
      await driver.send(body);
      json(res, 200, { ok: true, driver: driver.name });
    } catch (err) {
      console.error("Falha no driver:", err);
      json(res, 502, { error: "aparelho não respondeu" });
    }
    return;
  }

  json(res, 404, { error: "não encontrado" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Controle do ar em http://0.0.0.0:${PORT} (driver: ${driver.name})`);
});
