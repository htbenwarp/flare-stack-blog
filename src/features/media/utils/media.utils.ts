// src/features/media/utils/media.utils.ts

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

/**
 * 从图片 URL 中提取 R2 key
 * 支持格式：
 * - /images/${key}
 * - /images/${key}?quality=80&format=webp
 * - https://domain.com/images/${key}?quality=80
 * - /cdn-cgi/image/width=800,quality=80,format=auto/images/${key}
 */
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
 * 获取原始图片 URL（无任何优化参数，灯箱使用）
 * @param key - R2 key
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
  const originalPath = `/images/${key}`;
  // 正确的 Cloudflare Image Resizing URL 格式：单斜杠连接
  return `/cdn-cgi/image/width=${width},quality=80,format=auto${originalPath}`;
}

const VALID_FIT_VALUES = ['scale-down', 'contain', 'cover', 'crop', 'pad'];

/**
 * 构建 Cloudflare Image Resizing 的变换选项（用于 Workers 中的 cf:image 方式）
 * @param searchParams - URL 查询参数
 * @param accept - 浏览器 Accept 头，用于自动选择最佳格式
 */
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
    if (!Number.isNaN(quality) && quality > 0 && quality <= 100) {
      transformOptions.quality = quality;
    }
  }
  if (searchParams.has("fit")) {
    const fit = searchParams.get("fit")!;
    if (VALID_FIT_VALUES.includes(fit)) {
      transformOptions.fit = fit;
    }
  }

  // 根据 Accept 头选择最优格式
  if (/image\/avif/.test(accept)) {
    transformOptions.format = "avif";
  } else if (/image\/webp/.test(accept)) {
    transformOptions.format = "webp";
  }

  return transformOptions;
}
