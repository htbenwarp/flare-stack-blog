import { Hono } from "hono";
import { getDb } from "@/lib/db";
import { SystemConfigTable } from "@/lib/db/schema/config.table";

const app = new Hono<{ Bindings: Env }>();
// 更换为支持 size 参数的公共 API
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
    
    // 关键：在请求 URL 中添加 size=512 参数
    const url = `${METING_API}?server=netease&type=playlist&id=${playlistId}&size=1024`;
    const res = await fetch(url);
    const data = await res.json();
    
    c.header("Cache-Control", "no-cache, no-store, must-revalidate");
    return c.json(data);
  } catch (err) {
    console.error("[Music API] 错误:", err);
    return c.json({ error: "服务器内部错误" }, 500);
  }
});

export default app;