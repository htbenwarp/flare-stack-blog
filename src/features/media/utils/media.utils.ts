// src/features/media/utils/media.utils.ts

const isDev = process.env.NODE_ENV === "development";

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

export function getOriginalImageUrl(key: string): string {
  if (isDev) {
    return `https://picsum.photos/seed/${encodeURIComponent(key)}/1920/1440`;
  }
  return `/images/${key}`;
}

export function getOptimizedImageUrl(key: string, width: number = 800): string {
  const originalPath = `/images/${key}`;
  if (isDev) {
    const height = Math.floor(width * 0.75);
    return `https://picsum.photos/seed/${encodeURIComponent(key)}/${width}/${height}`;
  }
  return `/cdn-cgi/image/width=${width},quality=80,format=auto${originalPath}`;
}

export function getResponsiveSrcSet(
  key: string,
  widths: number[] = [200, 400, 600, 800]
): string | undefined {
  if (isDev) {
    return undefined;
  }
  return widths
    .map((w) => `${getOptimizedImageUrl(key, w)} ${w}w`)
    .join(", ");
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

  if (/image\/avif/.test(accept)) {
    transformOptions.format = "avif";
  } else if (/image\/webp/.test(accept)) {
    transformOptions.format = "webp";
  }

  return transformOptions;
}