import { Hono } from "hono";
import { getDb } from "@/lib/db";
import { SystemConfigTable } from "@/lib/db/schema/config.table";

const app = new Hono<{ Bindings: Env }>();
const METING_API = "https://api.i-meto.com/meting/api";

// 从代理地址解析真实高清图片链接，结果缓存到 KV（24 小时）
async function resolveHighResPic(picUrl: string, env: Env): Promise<string> {
  if (!picUrl) return "";

  // 1. 检查 KV 缓存
  const cacheKey = `music:pic:${picUrl}`;
  const cached = await env.KV.get(cacheKey);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const picRes = await fetch(picUrl, {
      redirect: "manual",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const location = picRes.headers.get("location");
    if (location) {
      const highRes = location.replace(/param=\d+y\d+/, "param=1024y1024");
      // 2. 写入 KV 缓存（24 小时后自动过期）
      await env.KV.put(cacheKey, highRes, { expirationTtl: 86400 });
      return highRes;
    }
  } catch {
    // 解析失败返回原始链接
  }
  return picUrl;
}

app.get("/", async (c) => {
  try {
    const db = getDb(c.env);
    const configs = await db.select().from(SystemConfigTable).limit(1);

    let playlistId = "";
    if (configs.length > 0 && configs[0].configJson) {
      const siteConfig = configs[0].configJson as any;
      playlistId = siteConfig?.site?.musicPlaylistId?.trim() || "";
    }

    if (!playlistId) {
      return c.json({ error: "未配置歌单ID，请在后台设置" }, 400);
    }

    const url = `${METING_API}?server=netease&type=playlist&id=${playlistId}`;
    const res = await fetch(url);
    const data = await res.json();

    // 并发处理所有歌曲封面（利用 Worker 并发能力）
    const processedData = await Promise.all(
      data.map(async (track: any) => ({
        ...track,
        pic: await resolveHighResPic(track.pic || "", c.env),
      }))
    );

    c.header("Cache-Control", "no-cache, no-store, must-revalidate");
    return c.json(processedData);
  } catch (err) {
    console.error("[Music API] 错误:", err);
    return c.json({ error: "服务器内部错误" }, 500);
  }
});

export default app;
