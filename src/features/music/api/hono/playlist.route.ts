import { Hono } from "hono";
import { getDb } from "@/lib/db";
import { SystemConfigTable } from "@/lib/db/schema/config.table";

const app = new Hono<{ Bindings: Env }>();
const METING_API = "https://api.i-meto.com/meting/api";

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

    const url = `${METING_API}?server=netease&type=playlist&id=${playlistId}&size=1024`;
    const res = await fetch(url);
    const data = await res.json();

    // 🔑 核心修复：为每首歌解析真实图片链接并替换尺寸
    const processedData = await Promise.all(
      data.map(async (track: any) => {
        let pic = track.pic || "";
        if (pic) {
          try {
            // 请求代理地址，获取 302 重定向后的真实 CDN 链接
            const picRes = await fetch(pic, { redirect: "manual" });
            const location = picRes.headers.get("location");
            if (location) {
              // 替换真实链接中的尺寸参数
              pic = location.replace(/param=\d+y\d+/, "param=1024y1024");
            }
          } catch {
            // 获取失败则保持原样
          }
        }
        return { ...track, pic };
      })
    );

    c.header("Cache-Control", "no-cache, no-store, must-revalidate");
    return c.json(processedData);
  } catch (err) {
    console.error("[Music API] 错误:", err);
    return c.json({ error: "服务器内部错误" }, 500);
  }
});

export default app;
