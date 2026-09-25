// Dev-only API админки: чтение/запись src/data/{stages,objects,routes}.json и загрузка фото в public/photos.
// Работает только в `vite` (apply: 'serve'), в сборку не попадает.
// Безопасность — своими проверками: встроенные CORS/allowedHosts Vite выполняются ПОСЛЕ наших middleware
// (docs: configureServer, «pre» middleware), поэтому на них не полагаемся:
//  - только запросы с самого ноутбука (loopback), даже если dev-сервер открыт в LAN через --host;
//  - изменяющие запросы — только с заголовком X-Admin: 1 (чужая страница не пошлёт его без CORS-preflight, а preflight мы отклоняем);
//  - лимиты размера, строгий шаблон имени фото и проверка сигнатуры JPEG, проверка структуры JSON, атомарная запись.

import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "src/data");
const PHOTOS = path.join(ROOT, "public/photos");
const FILES = ["stages", "objects", "routes"] as const;
const MAX_JSON = 5 * 1024 * 1024;
const MAX_PHOTO = 15 * 1024 * 1024;

function isLoopback(req: IncomingMessage) {
  const a = req.socket.remoteAddress ?? "";
  return a === "127.0.0.1" || a === "::1" || a === "::ffff:127.0.0.1";
}

function send(res: ServerResponse, code: number, body: unknown) {
  res.statusCode = code;
  res.setHeader("Content-Type", typeof body === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function readBody(req: IncomingMessage, max: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > max) {
        reject(new Error("слишком большой запрос"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function writeAtomic(file: string, data: string | Buffer) {
  const tmp = `${file}.tmp-${process.pid}`;
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, file);
}

/** Минимальная проверка структуры, чтобы битое сохранение не сломало игру */
function validate(c: unknown): string | null {
  const x = c as Record<string, unknown>;
  if (!x || !Array.isArray(x.stages) || !Array.isArray(x.objects) || !Array.isArray(x.routes)) return "нужны массивы stages, objects, routes";
  const ids = new Set<string>();
  for (const o of x.objects as Record<string, unknown>[]) {
    if (typeof o.id !== "string" || !/^[a-z0-9-]+$/.test(o.id)) return `неверный id объекта: ${String(o.id)}`;
    if (ids.has(o.id)) return `повтор id объекта: ${o.id}`;
    ids.add(o.id);
    if (typeof o.name !== "string" || !Array.isArray(o.sources)) return `объект ${o.id}: нужны name и sources`;
    for (const p of (o.photos as Record<string, unknown>[] | undefined) ?? [])
      if (typeof p.src !== "string" || !/^photos\/[a-z0-9-]+\.jpg$/.test(p.src)) return `объект ${o.id}: неверный путь фото ${String(p.src)}`;
  }
  for (const s of x.stages as Record<string, unknown>[]) {
    if (!Array.isArray(s.hints) || s.hints.length !== 3) return `этап ${String(s.id)}: нужно ровно 3 подсказки`;
    if (!Array.isArray(s.objectIds) || !Array.isArray(s.zones)) return `этап ${String(s.id)}: нужны objectIds и zones`;
    for (const id of s.objectIds as string[]) if (!ids.has(id)) return `этап ${String(s.id)}: нет объекта ${id}`;
  }
  return null;
}

export function adminApi(): Plugin {
  return {
    name: "sotri-admin-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__admin", async (req, res) => {
        try {
          if (!isLoopback(req)) return send(res, 403, "админка доступна только с этого компьютера");
          const url = new URL(req.url ?? "/", "http://localhost");
          if (req.method !== "GET" && req.headers["x-admin"] !== "1") return send(res, 403, "нет заголовка X-Admin");

          if (url.pathname === "/content" && req.method === "GET") {
            const out: Record<string, unknown> = {};
            for (const f of FILES) out[f] = JSON.parse(await fs.readFile(path.join(DATA, `${f}.json`), "utf8"));
            return send(res, 200, out);
          }

          if (url.pathname === "/content" && req.method === "PUT") {
            if (!String(req.headers["content-type"]).startsWith("application/json")) return send(res, 415, "нужен JSON");
            const body = JSON.parse((await readBody(req, MAX_JSON)).toString("utf8"));
            const err = validate(body);
            if (err) return send(res, 400, err);
            for (const f of FILES) await writeAtomic(path.join(DATA, `${f}.json`), JSON.stringify(body[f], null, 2) + "\n");
            return send(res, 200, { ok: true });
          }

          if (url.pathname === "/photo" && req.method === "POST") {
            const name = url.searchParams.get("name") ?? "";
            if (!/^[a-z0-9-]{1,80}\.jpg$/.test(name)) return send(res, 400, "неверное имя файла");
            const buf = await readBody(req, MAX_PHOTO);
            if (buf.length < 3 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) return send(res, 400, "это не JPEG");
            const file = path.join(PHOTOS, name);
            if (path.dirname(file) !== PHOTOS) return send(res, 400, "неверный путь");
            await writeAtomic(file, buf);
            return send(res, 200, { src: `photos/${name}` });
          }

          return send(res, 404, "нет такого метода");
        } catch (e) {
          return send(res, 500, `ошибка: ${(e as Error).message}`);
        }
      });
    },
  };
}
