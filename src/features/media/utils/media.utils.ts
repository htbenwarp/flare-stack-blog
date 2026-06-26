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
  // 移除协议和域名，只保留路径部分
  const pathname = src.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  if (pathname.startsWith(prefix)) {
    return pathname.replace(prefix, "");
  }
  return undefined;
}

/**
 * 生成优化后的图片 URL
 * @param key - R2 key
 * @param width - 可选的宽度限制，最大 1600px
 */
export function getOptimizedImageUrl(key: string, width?: number) {
  const MAX_WIDTH = 1600;
  const effectiveWidth = width ? Math.min(width, MAX_WIDTH) : 800;
  // format 由 Worker 根据 Accept 头动态决定
  return `/images/${key}?quality=80&width=${effectiveWidth}`;
}

const VALID_FIT_VALUES = ['scale-down', 'contain', 'cover', 'crop', 'pad'];

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