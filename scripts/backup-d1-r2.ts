// scripts/backup-d1-r2.ts
import { execSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join, dirname } from "path";
import { ZipWriter, BlobReader, Uint8ArrayWriter } from "@zip.js/zip.js";

const TEMP_DIR = "./temp_backup";
const ZIP_NAME = `blog_backup_${new Date().toISOString().slice(0, 10)}.zip`;

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
const D1_DATABASE_NAME = "blog-d1-demo";   // 你的 D1 绑定名
const R2_BUCKET_NAME = "blog-r2-demo";     // 你的 R2 桶名

async function main() {
  if (!ACCOUNT_ID || !API_TOKEN) {
    console.error("❌ 请设置 CLOUDFLARE_ACCOUNT_ID 和 CLOUDFLARE_API_TOKEN 环境变量");
    process.exit(1);
  }

  console.log("🚀 开始本地备份...");
  mkdirSync(TEMP_DIR, { recursive: true });

  // 1. 导出 D1 数据库
  console.log("📦 导出远程 D1 数据库...");
  try {
    execSync(
      `wrangler d1 export ${D1_DATABASE_NAME} --remote --output ${TEMP_DIR}/db.sql`,
      { stdio: "inherit" }
    );
  } catch (err) {
    console.error("❌ D1 导出失败，但继续备份 R2。");
  }

  // 2. 下载 R2 媒体文件
  console.log("📸 下载 R2 媒体文件...");
  const mediaDir = join(TEMP_DIR, "media");
  mkdirSync(mediaDir, { recursive: true });

  try {
    await downloadAllR2ObjectsViaApi(mediaDir);
  } catch (apiErr) {
    console.error("⚠️ API 下载失败，尝试 Wrangler 回退...");
    try {
      await downloadAllR2ObjectsViaWrangler(mediaDir);
    } catch (wrErr) {
      console.error("❌ Wrangler 下载也失败，仅备份数据库。");
    }
  }

  // 3. 打包 ZIP
  console.log("🗜️ 打包为 ZIP...");
  const dbSqlPath = join(TEMP_DIR, "db.sql");
  await createZip(dbSqlPath, mediaDir, ZIP_NAME);

  // 4. 清理临时文件
  console.log("🧹 清理临时文件...");
  rmSync(TEMP_DIR, { recursive: true, force: true });

  console.log(`✅ 备份完成：${ZIP_NAME}`);
}

// ---------- REST API 方式（修复：result 直接就是数组） ----------
async function downloadAllR2ObjectsViaApi(outputDir: string) {
  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${R2_BUCKET_NAME}/objects`;
  const headers = { Authorization: `Bearer ${API_TOKEN}` };

  let cursor: string | undefined;
  let totalDownloaded = 0;

  do {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const res = await fetch(baseUrl + query, { headers });
    const text = await res.text();
    console.log(`📋 API 列表请求状态: ${res.status}`);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    const data = JSON.parse(text);
    if (!data.success) {
      throw new Error(`API 错误: ${JSON.stringify(data.errors)}`);
    }

    // 修复：响应中对象数组就是 data.result
    const objects = data.result ?? [];
    console.log(`   本页对象数: ${objects.length}`);
    for (const obj of objects) {
      const key = obj.key;
      console.log(`  下载: ${key} (${obj.size} bytes)`);
      const fileUrl = `${baseUrl}/${encodeURIComponent(key)}`;
      const fileRes = await fetch(fileUrl, { headers });
      if (!fileRes.ok) {
        console.error(`  下载失败: ${key} (${fileRes.status})`);
        continue;
      }
      const buffer = await fileRes.arrayBuffer();
      const filePath = join(outputDir, key);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, new Uint8Array(buffer));
      totalDownloaded++;
    }
    cursor = data.result?.cursor;
  } while (cursor);

  console.log(`  ✅ API 方式共下载 ${totalDownloaded} 个对象`);
}

// ---------- Wrangler 回退 ----------
async function downloadAllR2ObjectsViaWrangler(outputDir: string) {
  let listOutput: string;
  try {
    listOutput = execSync(`wrangler r2 object list --bucket=${R2_BUCKET_NAME} --json`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
  } catch {
    listOutput = execSync(`wrangler r2 objects list ${R2_BUCKET_NAME} --json`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
  }

  let objects: Array<{ key: string }>;
  try {
    objects = JSON.parse(listOutput);
  } catch {
    throw new Error(`无法解析 Wrangler 输出: ${listOutput}`);
  }

  console.log(`📋 Wrangler 列出对象数: ${objects.length}`);
  for (const obj of objects) {
    const key = obj.key;
    console.log(`  下载: ${key}`);
    const destPath = join(outputDir, key);
    mkdirSync(dirname(destPath), { recursive: true });
    try {
      execSync(`wrangler r2 object get ${R2_BUCKET_NAME} ${key} --file ${destPath}`, { stdio: "pipe" });
    } catch (err) {
      console.error(`  下载失败: ${key}`);
    }
  }
  console.log(`  ✅ Wrangler 方式下载完成`);
}

// ---------- ZIP 打包 ----------
async function createZip(dbSqlPath: string, mediaDir: string, outputZip: string) {
  const zipWriter = new ZipWriter(new Uint8ArrayWriter(), { level: 5 });

  if (existsSync(dbSqlPath)) {
    const sqlContent = readFileSync(dbSqlPath);
    await zipWriter.add("db.sql", new BlobReader(new Blob([sqlContent])));
  }

  const fs = require("fs");
  const path = require("path");
  function addFilesFromDir(dir: string, basePath: string) {
    if (!existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const zipPath = path.join(basePath, entry.name);
      if (entry.isFile()) {
        const data = readFileSync(fullPath);
        zipWriter.add(zipPath, new BlobReader(new Blob([data])));
      } else if (entry.isDirectory()) {
        addFilesFromDir(fullPath, zipPath);
      }
    }
  }
  addFilesFromDir(mediaDir, "media");

  const result = await zipWriter.close();
  writeFileSync(outputZip, result);
}

main().catch(console.error);