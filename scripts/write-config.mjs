// Vercel のビルド時に、Vercel に登録した環境変数から app/config.js を作る。
// 使い方: node scripts/write-config.mjs [出力先]（省略時は app/config.js）
//
// 必要な環境変数（Vercel の管理画面で本人が登録する）:
//   SUPABASE_URL       … https://xxxx.supabase.co（/rest/v1 は付けない）
//   SUPABASE_ANON_KEY  … anon / publishable キー（service_role・secret キーは不可）

import { existsSync, writeFileSync } from "node:fs";

const out = process.argv[2] ?? "app/config.js";
const url = (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
const key = (process.env.SUPABASE_ANON_KEY ?? "").trim();

function fail(message) {
  console.error(`write-config: ${message}`);
  process.exit(1);
}

// 手元の PC では、本人が手で作った config.js を上書きしない
if (!process.env.VERCEL && out === "app/config.js" && existsSync(out)) {
  fail("app/config.js がすでにあるため上書きしません（Vercel 以外で実行しています）。");
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
  fail("環境変数 SUPABASE_URL が未設定か、https://xxxx.supabase.co の形になっていません。");
}
if (!key) {
  fail("環境変数 SUPABASE_ANON_KEY が未設定です。");
}

// すべての権限を持つキーが公開ページに埋め込まれるのを防ぐ
if (key.startsWith("sb_secret_")) {
  fail("SUPABASE_ANON_KEY に secret キーが設定されています。anon / publishable キーに変えてください。");
}
if (key.startsWith("eyJ")) {
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"));
    if (payload.role !== "anon") {
      fail(`SUPABASE_ANON_KEY の role が "${payload.role}" です。anon キーに変えてください。`);
    }
  } catch {
    fail("SUPABASE_ANON_KEY の形式を読み取れません。");
  }
}

const body = `// このファイルはビルド時に scripts/write-config.mjs が自動で作ります。編集しないでください。
window.APP_CONFIG = ${JSON.stringify({ SUPABASE_URL: url, SUPABASE_ANON_KEY: key }, null, 2)};
`;
writeFileSync(out, body, "utf8");
console.log(`write-config: ${out} を作成しました。`);
