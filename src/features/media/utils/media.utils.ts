export function getContentTypeFromKey(key: string): string | undefined {
  const extension = key.split(".").pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    avif: "image/avif",
  };
  return contentTypes[extension || ""];
}

export function generateKey(fileName: string): string {
  const uuid = crypto.randomUUID();
  const extension = fileName.split(".").pop()?.toLowerCase() || "bin";
  return `${uuid}.${extension}`;
}

export function extractImageKey(src: string): string | undefined {
  if (!src) return undefined;
  const prefix = "/images/";
  let pathname = "";
  try {
    const url = new URL(src, "http://dummy.com");
    pathname = url.pathname;
  } catch {
    pathname = src.split("?")[0];
  }
  if (pathname.startsWith(prefix)) {
    return pathname.replace(prefix, "");
  }
  return undefined;
}

/**
 * 获取原始图片 URL（无优化参数，灯箱使用）
 */
export function getOriginalImageUrl(key: string): string {
  return `/images/${key}`;
}

/**
 * 生成 Cloudflare Image Resizing 优化后的 URL
 * @param key - R2 key
 * @param width - 限制宽度（高度自动等比缩放）
 */
export function getOptimizedImageUrl(key: string, width: number = 800): string {
  const originalUrl = `/images/${key}`;
  // 使用 Cloudflare 原生端点，必须包含 width 或 height
  return `/cdn-cgi/image/width=${width},quality=80,format=auto/${originalUrl}`;
}

// buildTransformOptions 保留但不影响新逻辑
export function buildTransformOptions(
  searchParams: URLSearchParams,
  accept: string,
) {
  const transformOptions: Record<string, unknown> = { quality: 80 };
  if (searchParams.has("width")) {
    const width = Number.parseInt(searchParams.get("width")!, 10);
    if (!Number.isNaN(width) && width > 0) transformOptions.width = width;
  }
  if (searchParams.has("height")) {
    const height = Number.parseInt(searchParams.get("height")!, 10);
    if (!Number.isNaN(height) && height > 0) transformOptions.height = height;
  }
  if (searchParams.has("quality")) {
    const quality = Number.parseInt(searchParams.get("quality")!, 10);
    if (!Number.isNaN(quality) && quality > 0 && quality <= 100)
      transformOptions.quality = quality;
  }
  if (searchParams.has("fit")) transformOptions.fit = searchParams.get("fit");
  if (/image\/avif/.test(accept)) {
    transformOptions.format = "avif";
  } else if (/image\/webp/.test(accept)) {
    transformOptions.format = "webp";
  }
  return transformOptions;
}