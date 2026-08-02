import { uploadImageFn } from "@/features/media/api/media.api";

/**
 * 上传动态图片到 R2，返回可访问的完整 URL
 */
export async function uploadMomentImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("image", file);
  const result = await uploadImageFn({ data: formData });

  // 打印一次返回结果，用于调试（可删除）
  console.log("Upload result:", result);

  // 情况1：直接包含 url 字段
  if (result && typeof result === "object" && "url" in result && result.url) {
    return { url: result.url as string };
  }

  // 情况2：包含 key 字段，拼接 /images/{key}
  if (result && typeof result === "object" && "key" in result && result.key) {
    const key = result.key as string;
    const url = `/images/${key}`;
    return { url };
  }

  // 情况3：result 本身可能是字符串 key
  if (typeof result === "string" && result.length > 0) {
    const url = `/images/${result}`;
    return { url };
  }

  // 情况4：嵌套在 data 中
  if (
    result &&
    typeof result === "object" &&
    "data" in result &&
    result.data &&
    typeof result.data === "object"
  ) {
    const data = result.data as Record<string, unknown>;
    if (data.url) return { url: data.url as string };
    if (data.key) return { url: `/images/${data.key}` };
  }

  console.error("Unexpected upload result format:", result);
  throw new Error("上传失败：未获取到图片地址");
}