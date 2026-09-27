import {
  generateKey,
  normalizeFolderPath,
} from "@/features/media/utils/media.utils";

export async function putToR2(env: Env, image: File, folder = "") {
  const key = generateKey(image.name, folder);
  const contentType = image.type;
  const url = `/images/${key}`;

  await env.R2.put(key, image.stream(), {
    httpMetadata: {
      contentType,
    },
    customMetadata: {
      originalName: image.name,
    },
  });

  return {
    key,
    url,
    fileName: image.name,
    mimeType: contentType,
    sizeInBytes: image.size,
  };
}

export async function deleteFromR2(env: Env, key: string) {
  await env.R2.delete(key);
}

export async function getFromR2(env: Env, key: string) {
  return await env.R2.get(key);
}

/* ======================= Virtual folder primitives ======================= */

export interface R2DirectoryListOptions {
  prefix?: string;
  cursor?: string;
  limit?: number;
}

/**
 * One level of a virtual directory: `objects` holds the files directly inside
 * `prefix`, `delimitedPrefixes` holds the sub-folders (R2 collapses everything
 * below `delimiter` into a single pseudo-entry).
 */
export async function listR2Directory(
  env: Env,
  options: R2DirectoryListOptions = {},
) {
  return await env.R2.list({
    prefix: options.prefix,
    delimiter: "/",
    cursor: options.cursor,
    limit: options.limit,
    include: ["httpMetadata", "customMetadata"],
  });
}

/** Recursively collect every key under `prefix` (no delimiter). */
export async function listAllKeys(
  env: Env,
  prefix: string,
): Promise<Array<string>> {
  const keys: Array<string> = [];
  let cursor: string | undefined;
  do {
    const res = await env.R2.list({ prefix, cursor, limit: 1000 });
    for (const obj of res.objects) keys.push(obj.key);
    cursor = res.truncated ? res.cursor : undefined;
  } while (cursor);
  return keys;
}

/**
 * An empty object whose key ends with `/` marks an otherwise empty folder so
 * that it still shows up in a delimited listing. It has no DB row and no URL,
 * which is why directory listing tolerates untracked keys.
 */
export async function createFolderMarker(env: Env, folderKey: string) {
  await env.R2.put(folderKey, "", { customMetadata: { isFolder: "1" } });
}

export async function copyObject(
  env: Env,
  sourceKey: string,
  targetKey: string,
): Promise<boolean> {
  const obj = await env.R2.get(sourceKey);
  if (!obj) return false;
  await env.R2.put(targetKey, obj.body, {
    httpMetadata: obj.httpMetadata,
    customMetadata: obj.customMetadata,
  });
  return true;
}

export async function deleteKeys(
  env: Env,
  keys: Array<string>,
): Promise<void> {
  if (keys.length === 0) return;
  await env.R2.delete(keys);
}

/** `"a/b"` → `"a/b/"`; `""` → `""` (root has no prefix). */
export function normalizeFolderKey(folder: string): string {
  const normalized = normalizeFolderPath(folder);
  return normalized ? `${normalized}/` : "";
}

/**
 * Upload a site asset (favicon, theme images) to R2 with a fixed key.
 * No DB record; overwrites in place on re-upload.
 */
export async function putSiteAsset(
  env: Env,
  file: File,
  assetPath: string,
): Promise<{ key: string; url: string }> {
  const key = `asset/${assetPath}`;
  await env.R2.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  });
  return { key, url: `/images/${key}` };
}
