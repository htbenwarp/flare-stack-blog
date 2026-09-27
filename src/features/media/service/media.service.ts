import * as MediaRepo from "@/features/media/data/media.data";
import * as Storage from "@/features/media/data/media.storage";
import type {
  CreateMediaFolderInput,
  DeleteMediaFoldersInput,
  GetMediaDirectoryInput,
  GetMediaListInput,
  MoveMediaFilesInput,
  RenameMediaFolderInput,
  UpdateMediaNameInput,
} from "@/features/media/media.schema";
import { getImageDimensions } from "@/features/media/utils/image-dimensions";
import {
  buildTransformOptions,
  getBasename,
  getContentTypeFromKey,
  getParentFolder,
  joinFolderKey,
  normalizeFolderPath,
} from "@/features/media/utils/media.utils";
import * as PostMediaRepo from "@/features/posts/data/post-media.data";
import { CACHE_CONTROL } from "@/lib/constants";
import { err, ok, type Result } from "@/lib/errors";

export async function upload(
  context: DbContext & { executionCtx: ExecutionContext },
  input: { file: File; folder?: string },
) {
  const { file } = input;
  const folder = normalizeFolderPath(input.folder ?? "");

  const dimensions = getImageDimensions(await file.arrayBuffer());
  const width = dimensions?.width;
  const height = dimensions?.height;

  const uploaded = await Storage.putToR2(context.env, file, folder);

  try {
    const mediaRecord = await MediaRepo.insertMedia(context.db, {
      key: uploaded.key,
      url: uploaded.url,
      fileName: uploaded.fileName,
      mimeType: uploaded.mimeType,
      sizeInBytes: uploaded.sizeInBytes,
      width,
      height,
    });
    return ok(mediaRecord);
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "media db insert failed, rolling back r2 upload",
        key: uploaded.key,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    context.executionCtx.waitUntil(
      Storage.deleteFromR2(context.env, uploaded.key).catch((rollbackError) =>
        console.error(
          JSON.stringify({
            message: "r2 rollback delete failed",
            key: uploaded.key,
            error:
              rollbackError instanceof Error
                ? rollbackError.message
                : String(rollbackError),
          }),
        ),
      ),
    );
    return err({ reason: "MEDIA_RECORD_CREATE_FAILED" });
  }
}

export async function deleteImage(
  context: DbContext & { executionCtx: ExecutionContext },
  key: string,
) {
  // 后端兜底检查：防止删除正在被引用的媒体
  const inUse = await PostMediaRepo.isMediaInUse(context.db, key);
  if (inUse) {
    return err({ reason: "MEDIA_IN_USE" });
  }

  await MediaRepo.deleteMedia(context.db, key);
  context.executionCtx.waitUntil(
    Storage.deleteFromR2(context.env, key).catch((deleteError) =>
      console.error(
        JSON.stringify({
          message: "r2 delete failed",
          key,
          error:
            deleteError instanceof Error
              ? deleteError.message
              : String(deleteError),
        }),
      ),
    ),
  );

  return ok({ success: true });
}

export async function getMediaList(
  context: DbContext,
  data: GetMediaListInput,
) {
  return await MediaRepo.getMediaList(context.db, data);
}

/* ============================ Virtual folders ============================ */
/*
 * Folders are purely virtual: a folder is the shared R2 key prefix of the
 * objects inside it. Nothing here touches the `media` table shape, and R2's
 * delimiter listing already gives us one folder level per request.
 */

export interface MediaFolderEntry {
  key: string;
  name: string;
}

export interface MediaDirectoryEntry {
  key: string;
  fileName: string;
  url: string;
  mimeType: string;
  sizeInBytes: number;
  width: number | null;
  height: number | null;
  createdAt: Date | null;
  isLinked: boolean;
}

export interface MediaDirectory {
  folder: string;
  folders: Array<MediaFolderEntry>;
  files: Array<MediaDirectoryEntry>;
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Turn raw R2 keys into display entries.
 *
 * Keys without a DB row (folder markers, objects written by other features)
 * still need to render, so they fall back to values derived from the key
 * itself. Trailing-slash keys are folder markers and never returned.
 */
async function enrichDirectoryFiles(
  context: DbContext,
  keys: Array<string>,
): Promise<Array<MediaDirectoryEntry>> {
  const fileKeys = keys.filter((key) => key.length > 0 && !key.endsWith("/"));
  if (fileKeys.length === 0) return [];

  const [rows, linkedKeys] = await Promise.all([
    MediaRepo.getMediaByKeys(context.db, fileKeys),
    PostMediaRepo.getLinkedMediaKeys(context.db, fileKeys),
  ]);

  const rowByKey = new Map(rows.map((row) => [row.key, row]));
  const linked = new Set<string>(linkedKeys);

  return fileKeys.map((key): MediaDirectoryEntry => {
    const row = rowByKey.get(key);

    if (!row) {
      return {
        key,
        fileName: getBasename(key),
        url: `/images/${key}`,
        mimeType: getContentTypeFromKey(key) || "application/octet-stream",
        sizeInBytes: 0,
        width: null,
        height: null,
        createdAt: null,
        isLinked: linked.has(key),
      };
    }

    return {
      key,
      fileName: row.fileName,
      url: row.url,
      mimeType: row.mimeType,
      sizeInBytes: row.sizeInBytes,
      width: row.width,
      height: row.height,
      createdAt: row.createdAt,
      isLinked: linked.has(key),
    };
  });
}

export async function getMediaDirectory(
  context: DbContext,
  data: GetMediaDirectoryInput,
): Promise<MediaDirectory> {
  const folder = normalizeFolderPath(data.folder ?? "");
  const prefix = folder ? `${folder}/` : "";
  const search = data.search?.trim().toLowerCase();

  let directory: MediaDirectory;

  if (search) {
    // A search spans the whole subtree, so paging does not apply.
    const keys = await Storage.listAllKeys(context.env, prefix);
    const files = await enrichDirectoryFiles(context, keys);

    directory = {
      folder,
      folders: [],
      files: files.filter((file) =>
        file.fileName.toLowerCase().includes(search),
      ),
      nextCursor: null,
      hasMore: false,
    };
  } else {
    const result = await Storage.listR2Directory(context.env, {
      prefix,
      cursor: data.cursor,
      limit: data.limit ?? 50,
    });

    const files = await enrichDirectoryFiles(
      context,
      result.objects.map((object) => object.key),
    );

    const folders: Array<MediaFolderEntry> = result.delimitedPrefixes
      .filter((key) => key.endsWith("/") && !key.includes("//"))
      .map((key) => ({ key, name: getBasename(key) }));

    directory = {
      folder,
      folders,
      files,
      nextCursor: result.truncated ? result.cursor : null,
      hasMore: result.truncated,
    };
  }

  if (data.unusedOnly) {
    return {
      ...directory,
      files: directory.files.filter((file) => !file.isLinked),
    };
  }

  return directory;
}

export async function createFolder(
  context: DbContext,
  data: CreateMediaFolderInput,
): Promise<Result<{ key: string; name: string }, { reason: string }>> {
  const name = data.name.trim();
  if (name.length === 0 || name.includes("/")) {
    return err({ reason: "MEDIA_INVALID_FOLDER_NAME" });
  }

  const key = joinFolderKey(data.parent, name);
  await Storage.createFolderMarker(context.env, key);

  return ok({ key, name });
}

export async function renameFolder(
  context: DbContext & { executionCtx: ExecutionContext },
  data: RenameMediaFolderInput,
): Promise<Result<{ key: string }, { reason: string }>> {
  const oldKey = Storage.normalizeFolderKey(data.key);
  const name = data.name.trim();

  if (name.length === 0 || name.includes("/")) {
    return err({ reason: "MEDIA_INVALID_FOLDER_NAME" });
  }

  const newKey = joinFolderKey(getParentFolder(oldKey), name);
  if (newKey === oldKey) {
    return ok({ key: newKey });
  }

  const keys = await Storage.listAllKeys(context.env, oldKey);

  // Every object must land at its new key before anything is deleted, so a
  // failure halfway leaves the original folder intact.
  const copiedKeys: Array<string> = [];
  for (const key of keys) {
    const targetKey = newKey + key.slice(oldKey.length);
    const copied = await Storage.copyObject(context.env, key, targetKey);
    if (!copied) {
      await Storage.deleteKeys(context.env, copiedKeys).catch(() => undefined);
      return err({ reason: "MEDIA_FOLDER_RENAME_FAILED" });
    }
    copiedKeys.push(targetKey);
  }

  await MediaRepo.updateMediaKeyPrefix(context.db, oldKey, newKey);

  if (keys.length > 0) {
    context.executionCtx.waitUntil(
      Storage.deleteKeys(context.env, keys).catch((deleteError) =>
        console.error(
          JSON.stringify({
            message: "folder rename cleanup failed",
            oldKey,
            error:
              deleteError instanceof Error
                ? deleteError.message
                : String(deleteError),
          }),
        ),
      ),
    );
  }

  return ok({ key: newKey });
}

export async function deleteFolders(
  context: DbContext & { executionCtx: ExecutionContext },
  data: DeleteMediaFoldersInput,
): Promise<
  Result<
    { deletedFolders: number; deletedFiles: number; skippedFiles: number },
    { reason: string }
  >
> {
  let deletedFolders = 0;
  let deletedFiles = 0;
  let skippedFiles = 0;

  for (const folderKey of data.keys) {
    const prefix = Storage.normalizeFolderKey(folderKey);
    if (!prefix) continue;

    const keys = await Storage.listAllKeys(context.env, prefix);
    const fileKeys = keys.filter((key) => !key.endsWith("/"));

    const linked = new Set<string>(
      fileKeys.length > 0
        ? await PostMediaRepo.getLinkedMediaKeys(context.db, fileKeys)
        : [],
    );

    // Folder markers are always removable; a file survives when a post still
    // references it, so the folder is emptied rather than broken.
    const toDelete = keys.filter(
      (key) => key.endsWith("/") || !linked.has(key),
    );
    const deletableFileKeys = toDelete.filter((key) => !key.endsWith("/"));

    if (toDelete.length > 0) {
      context.executionCtx.waitUntil(
        Storage.deleteKeys(context.env, toDelete).catch((deleteError) =>
          console.error(
            JSON.stringify({
              message: "folder delete cleanup failed",
              folderKey: prefix,
              error:
                deleteError instanceof Error
                  ? deleteError.message
                  : String(deleteError),
            }),
          ),
        ),
      );
    }

    if (deletableFileKeys.length > 0) {
      await MediaRepo.deleteMediaByKeys(context.db, deletableFileKeys);
    }

    deletedFolders += 1;
    deletedFiles += deletableFileKeys.length;
    skippedFiles += fileKeys.length - deletableFileKeys.length;
  }

  return ok({ deletedFolders, deletedFiles, skippedFiles });
}

export async function moveMediaFiles(
  context: DbContext & { executionCtx: ExecutionContext },
  data: MoveMediaFilesInput,
): Promise<Result<{ moved: number; skipped: number }, { reason: string }>> {
  const target = normalizeFolderPath(data.targetFolder);

  let moved = 0;
  let skipped = 0;

  try {
    for (const key of data.keys) {
      // Folder entries are not files: moving would require rewriting every
      // descendant key, so they are skipped and reported as such.
      if (key.endsWith("/")) {
        skipped += 1;
        continue;
      }

      const fileName = getBasename(key);
      const newKey = target ? `${target}/${fileName}` : fileName;
      if (newKey === key) continue;

      const copied = await Storage.copyObject(context.env, key, newKey);
      if (!copied) {
        skipped += 1;
        continue;
      }

      // `url` mirrors the key, so it is rewritten with the key in one update.
      await MediaRepo.updateMediaKeyAndUrl(context.db, key, newKey);

      context.executionCtx.waitUntil(
        Storage.deleteFromR2(context.env, key).catch((deleteError) =>
          console.error(
            JSON.stringify({
              message: "move cleanup failed",
              key,
              error:
                deleteError instanceof Error
                  ? deleteError.message
                  : String(deleteError),
            }),
          ),
        ),
      );

      moved += 1;
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "media move failed",
        targetFolder: target,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return err({ reason: "MEDIA_MOVE_FAILED" });
  }

  return ok({ moved, skipped });
}

export async function isMediaInUse(context: DbContext, key: string) {
  return await PostMediaRepo.isMediaInUse(context.db, key);
}

export async function getLinkedPosts(context: DbContext, key: string) {
  return await PostMediaRepo.getPostsByMediaKey(context.db, key);
}

export async function getLinkedMediaKeys(
  context: DbContext,
  keys: Array<string>,
) {
  return await PostMediaRepo.getLinkedMediaKeys(context.db, keys);
}

export async function getTotalMediaSize(context: DbContext) {
  return await MediaRepo.getTotalMediaSize(context.db);
}

export async function updateMediaName(
  context: DbContext,
  data: UpdateMediaNameInput,
) {
  return await MediaRepo.updateMediaName(context.db, data.key, data.name);
}

export async function handleImageRequest(
  env: Env,
  key: string,
  request: Request,
) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const serveOriginal = async () => {
    const object = await env.R2.get(key);
    if (!object) {
      return new Response("Image not found", { status: 404 });
    }

    const contentType =
      object.httpMetadata?.contentType ||
      getContentTypeFromKey(key) ||
      "application/octet-stream";

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", contentType);
    headers.set("ETag", object.httpEtag);

    return new Response(object.body, { headers });
  };

  // 1. 防止循环调用 & 显式请求原图
  const viaHeader = request.headers.get("via");
  const isLoop = viaHeader && /image-resizing/.test(viaHeader);
  const wantsOriginal = searchParams.get("original") === "true";

  if (isLoop || wantsOriginal) {
    return await serveOriginal();
  }

  // 2. 构建 Cloudflare Image Resizing 参数
  const transformOptions = buildTransformOptions(
    searchParams,
    request.headers.get("Accept") || "",
  );

  // 3. 尝试进行图片处理
  try {
    const origin = url.origin;
    const sourceImageUrl = `${origin}/images/${key}?original=true`;

    const subRequestHeaders = new Headers();

    const headersToKeep = ["user-agent", "accept"];
    for (const [k, v] of request.headers.entries()) {
      if (headersToKeep.includes(k.toLowerCase())) {
        subRequestHeaders.set(k, v);
      }
    }

    const imageRequest = new Request(sourceImageUrl, {
      headers: subRequestHeaders,
    });

    // 调用 Cloudflare Images 变换
    const response = await fetch(imageRequest, {
      cf: { image: transformOptions },
    });

    // 如果变换失败 (如格式不支持)，降级回原图
    if (!response.ok) {
      console.error(
        JSON.stringify({
          message: "image transform failed",
          key,
          status: response.status,
          statusText: response.statusText,
        }),
      );
      return await serveOriginal();
    }

    // 4. 返回处理后的图片
    // 使用 new Response(response.body, response) 保持状态码和其它优化头信息
    const newResponse = new Response(response.body, response);

    // 覆盖/补充必要的缓存头
    newResponse.headers.set("Vary", "Accept");
    Object.entries(CACHE_CONTROL.immutable).forEach(([k, v]) => {
      newResponse.headers.set(k, v);
    });

    return newResponse;
  } catch (e) {
    console.error(
      JSON.stringify({
        message: "image transform error",
        key,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return await serveOriginal();
  }
}
