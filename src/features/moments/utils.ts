// src/features/moments/utils.ts
import { uploadImageFn } from "@/features/media/api/media.api";

export async function uploadMomentImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("image", file);
  const result = await uploadImageFn({ data: formData });

  let key = "";

  if (result && typeof result === "object" && "key" in result && result.key) {
    key = result.key as string;
  } else if (typeof result === "string" && result.length > 0) {
    key = result;
  } else if (
    result &&
    typeof result === "object" &&
    "data" in result &&
    result.data &&
    typeof result.data === "object"
  ) {
    const data = result.data as Record<string, unknown>;
    if (data.key) key = data.key as string;
    else if (data.url) return { url: data.url as string };
  } else if (result && typeof result === "object" && "url" in result && result.url) {
    return { url: result.url as string };
  }

  if (!key) {
    console.error("Unexpected upload result format:", result);
    throw new Error("上传失败：未获取到图片地址");
  }

  const url = `${window.location.origin}/images/${key}`;
  return { url };
}