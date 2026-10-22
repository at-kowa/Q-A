// 手元の PC で画面を確認するための簡易サーバ（npm 不要。Node.js だけで動く）
// 使い方: node scripts/serve.mjs  → Edge で http://localhost:5173 を開く
// 画面は複数のファイル（js/ フォルダ）に分かれているため、index.html を直接開くのではなく、このサーバ経由で開く。

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve("app");
const port = Number(process.env.PORT ?? 5173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let file = normalize(join(root, urlPath));
    // app フォルダの外は見せない
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("見つかりません");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`情シス質問箱: http://localhost:${port} を Edge で開いてください（止めるときは Ctrl + C）`);
});
