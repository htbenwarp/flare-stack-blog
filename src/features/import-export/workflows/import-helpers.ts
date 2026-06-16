import type { JSONContent } from "@tiptap/react";
import type { PostEntry } from "@/features/import-export/import-export.schema";
import {
  normalizeFrontmatter,
  parseFrontmatter,
} from "@/features/import-export/utils/frontmatter";
import {
  extractMarkdownImages,
  rewriteImagePaths,
  rewriteMarkdownImagePaths,
} from "@/features/import-export/utils/image-rewriter";
import { markdownToJsonContent } from "@/features/import-export/utils/markdown-parser";
import {
  listDirectories,
  listFiles,
  readJsonFile,
  readTextFile,
} from "@/features/import-export/utils/zip";
import * as MediaRepo from "@/features/media/data/media.data";
import {
  generateKey,
  getContentTypeFromKey,
} from "@/features/media/utils/media.utils";
import { syncPostMedia } from "@/features/posts/data/post-media.data";
import * as PostRepo from "@/features/posts/data/posts.data";
import { NullableJsonContentSchema } from "@/features/posts/schema/json-content.schema";
import * as PostService from "@/features/posts/services/posts.service";
import { highlightCodeBlocks, slugify } from "@/features/posts/utils/content";
import * as TagRepo from "@/features/tags/data/tags.data";
import { getDb } from "@/lib/db";
import { PostTagsTable } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n";
import { m } from "@/paraglide/messages";

// --- Enumerate posts (pure — no env dependency) ---

export function enumerateNativePosts(
  zipFiles: Record<string, Uint8Array>,
): Array<PostEntry> {
  const dirs = listDirectories(zipFiles, "posts/");
  return dirs
    .map((dir) => {
      const mdContent = readTextFile(zipFiles, `posts/${dir}/index.md`);
      const parsed = mdContent ? parseFrontmatter(mdContent) : null;
      const normalized = parsed ? normalizeFrontmatter(parsed.data) : null;

      if (!normalized) return null;

      const entry: PostEntry = {
        dir,
        title: normalized.title || dir,
        prefix: `posts/${dir}`,
      };
      return entry;
    })
    .filter((e): e is PostEntry => e !== null);
}

export function enumerateMarkdownPosts(
  zipFiles: Record<string, Uint8Array>,
): Array<PostEntry> {
  const mdFiles = Object.keys(zipFiles).filter(
    (p) => p.endsWith(".md") && !p.startsWith("__MACOSX"),
  );
  return mdFiles
    .map((path) => {
      const dir = path.replace(/\.md$/, "").split("/").pop() || path;
      const mdContent = readTextFile(zipFiles, path);
      const parsed = mdContent ? parseFrontmatter(mdContent) : null;
      const normalized = parsed ? normalizeFrontmatter(parsed.data) : null;

      if (!normalized) return null;

      const entry: PostEntry = {
        dir,
        title: normalized.title || dir,
        prefix: path.substring(0, path.lastIndexOf("/")),
        mdPath: path,
      };
      return entry;
    })
    .filter((e): e is PostEntry => e !== null);
}

// --- Import single post (needs env for DB / R2) ---

export async function importSinglePost(
  env: Env,
  zipFiles: Record<string, Uint8Array>,
  entry: PostEntry,
  mode: "native" | "markdown",
  locale: Locale = "zh",
  authorSlugToId?: Record<string, number>, // ✅ 新增参数
): Promise<{
  title: string;
  slug: string;
  skipped?: boolean;
  warnings: Array<string>;
}> {
  const db = getDb(env);
  const context: DbContext = { db, env };
  const warnings: Array<string> = [];

  // 1. Parse content
  let contentJson: JSONContent | null = null;
  let metadata: Record<string, unknown> = {};

  if (mode === "native") {
    const rawJson = readJsonFile<JSONContent>(
      zipFiles,
      `${entry.prefix}/content.json`,
    );
    if (rawJson) {
      const parsed = NullableJsonContentSchema.safeParse(rawJson);
      if (parsed.success) {
        contentJson = parsed.data;
      } else {
        warnings.push(
          m.import_export_import_warning_content_json_invalid({}, { locale }),
        );
      }
    }

    const mdContent = readTextFile(zipFiles, `${entry.prefix}/index.md`);
    if (mdContent) {
      const { data, content } = parseFrontmatter(mdContent);
      metadata = data;

      if (!contentJson && content.trim()) {
        try {
          contentJson = await markdownToJsonContent(content);
        } catch (error) {
          warnings.push(
            m.import_export_import_warning_markdown_convert_failed(
              {
                error: error instanceof Error ? error.message : String(error),
              },
              { locale },
            ),
          );
        }
      }
    }
  } else {
    const mdPath = entry.mdPath || `${entry.prefix}/${entry.dir}.md`;
    const mdContent = readTextFile(zipFiles, mdPath);
    if (mdContent) {
      const { data, content } = parseFrontmatter(mdContent);
      metadata = data;

      if (content.trim()) {
        const mdDir = mdPath.substring(0, mdPath.lastIndexOf("/"));
        const imageResult = await uploadMarkdownImages(
          env,
          zipFiles,
          content,
          mdDir,
          locale,
        );
        warnings.push(...imageResult.warnings);

        try {
          contentJson = await markdownToJsonContent(
            imageResult.rewrittenMarkdown,
          );
        } catch (error) {
          warnings.push(
            m.import_export_import_warning_markdown_convert_failed(
              {
                error: error instanceof Error ? error.message : String(error),
              },
              { locale },
            ),
          );
        }
      }
    }
  }

  const normalized = normalizeFrontmatter(metadata);
  if (!normalized) {
    throw new Error(
      m.import_export_import_error_invalid_metadata({}, { locale }),
    );
  }
  const title = normalized.title || entry.dir || "Untitled";

  const candidateSlug = normalized.slug || title;
  const slugAlreadyExists = await PostRepo.slugExists(
    db,
    slugify(candidateSlug),
  );
  if (slugAlreadyExists) {
    return { title, slug: candidateSlug, skipped: true, warnings };
  }

  // 3. Upload images and rewrite paths (native mode only — markdown mode handles images pre-conversion)
  if (contentJson && mode === "native") {
    const imageResult = await uploadImages(env, zipFiles, entry, locale);
    warnings.push(...imageResult.warnings);
    if (imageResult.rewriteMap.size > 0) {
      contentJson = rewriteImagePaths(contentJson, imageResult.rewriteMap);
    }
  }

  // 4. Highlight code blocks
  if (contentJson) {
    try {
      contentJson = await highlightCodeBlocks(contentJson);
    } catch {
      // Non-critical, continue without highlighting
    }
  }

  // 5. Generate unique slug
  const { slug } = await PostService.generateSlug(context, {
    title: normalized.slug || title,
  });

  // 6. Resolve tags
  const tagIds: Array<number> = [];
  const uniqueTags = [...new Set(normalized.tags)];
  if (uniqueTags.length > 0) {
    for (const tagName of uniqueTags) {
      let tag = await TagRepo.findTagByName(db, tagName);
      if (!tag) {
        tag = await TagRepo.insertTag(db, { name: tagName });
      }
      tagIds.push(tag.id);
    }
  }

  // 7. Insert post (including encryption fields and guest author)
  // 安全处理 publishedAt：无效日期或空值设为 null
  let publishedAt: Date | null = null;
  if (normalized.publishedAt) {
    const parsedDate = new Date(normalized.publishedAt);
    publishedAt = isNaN(parsedDate.getTime()) ? null : parsedDate;
  }
  if (!publishedAt && normalized.status !== "draft") {
    publishedAt = new Date(); // 默认发布时间为当前时间
  }

  const isEncrypted = normalized.isEncrypted ?? false;
  const passwordHash = normalized.passwordHash ?? null;

  // ✅ 处理客邸作者关联
  let isGuestPost = false;
  let guestAuthorId: number | null = null;

  if (normalized.isGuestPost) {
    isGuestPost = true;

    // 优先使用 guestAuthorSlug（Markdown）映射到 ID
    if (normalized.guestAuthorSlug && authorSlugToId) {
      const id = authorSlugToId[normalized.guestAuthorSlug];
      if (id) {
        guestAuthorId = id;
      } else {
        warnings.push(
          m.import_export_import_warning_author_not_found?.(
            { slug: normalized.guestAuthorSlug },
            { locale },
          ) ?? `Author slug '${normalized.guestAuthorSlug}' not found, marking as non-guest.`,
        );
        isGuestPost = false; // 找不到作者则降级为非客邸
      }
    }
    // 其次尝试直接使用 guestAuthorId（原生格式）
    else if (normalized.guestAuthorId != null) {
      // 简单校验 ID 是否有效（可在导入的作者列表中）
      const id = Number(normalized.guestAuthorId);
      if (authorSlugToId && Object.values(authorSlugToId).includes(id)) {
        guestAuthorId = id;
      } else if (!authorSlugToId) {
        // 如果没有作者映射，仍保留原 ID，但风险是可能指向不存在的作者
        guestAuthorId = id;
      } else {
        warnings.push(
          `Author ID ${id} not found in imported authors, marking as non-guest.`,
        );
        isGuestPost = false;
      }
    } else {
      warnings.push(
        `Post marked as guest but no author identifier provided, marking as non-guest.`,
      );
      isGuestPost = false;
    }
  }

  const post = await PostRepo.insertPost(db, {
    title,
    slug,
    summary: normalized.summary ?? null,
    contentJson,
    status: normalized.status === "draft" ? "draft" : "published",
    readTimeInMinutes: normalized.readTimeInMinutes,
    publishedAt,
    isEncrypted,
    passwordHash,
    isGuestPost,
    guestAuthorId,
  });

  // 8. Link tags
  if (tagIds.length > 0) {
    await db
      .insert(PostTagsTable)
      .values(tagIds.map((tagId) => ({ postId: post.id, tagId })));
  }

  // 9. Sync post-media relationships
  if (contentJson) {
    await syncPostMedia(db, post.id, contentJson);
  }

  return { title: post.title, slug: post.slug, warnings };
}

// --- Image upload (needs env for R2) ---

export async function uploadImages(
  env: Env,
  zipFiles: Record<string, Uint8Array>,
  entry: PostEntry,
  locale: Locale,
): Promise<{ rewriteMap: Map<string, string>; warnings: Array<string> }> {
  const rewriteMap = new Map<string, string>();
  const warnings: Array<string> = [];
  const imagePrefix = `${entry.prefix}/images/`;
  const imageFiles = listFiles(zipFiles, imagePrefix);

  for (const imagePath of imageFiles) {
    if (!(imagePath in zipFiles)) continue;
    const imageData = zipFiles[imagePath];
    if (imageData.length === 0) continue;

    const oldKey = imagePath.slice(imagePrefix.length);
    const newKey = generateKey(oldKey);

    const mimeType =
      getContentTypeFromKey(oldKey) || "application/octet-stream";

    try {
      await env.R2.put(newKey, imageData, {
        httpMetadata: { contentType: mimeType },
        customMetadata: { originalName: oldKey },
      });

      await MediaRepo.insertMedia(getDb(env), {
        key: newKey,
        url: `/images/${newKey}`,
        fileName: oldKey,
        mimeType,
        sizeInBytes: imageData.length,
      });

      rewriteMap.set(oldKey, newKey);
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "image upload failed during import",
          imagePath,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      warnings.push(
        m.import_export_import_warning_image_upload_failed(
          { name: oldKey },
          { locale },
        ),
      );
    }
  }

  return { rewriteMap, warnings };
}

// --- Markdown image upload (resolves relative paths from .md location) ---

export function resolveRelativePath(base: string, relative: string): string {
  const cleaned = relative.replace(/^\.\//, "");
  if (!base) return cleaned;

  const parts = base.split("/");
  for (const segment of cleaned.split("/")) {
    if (segment === "..") {
      parts.pop();
    } else if (segment !== ".") {
      parts.push(segment);
    }
  }
  return parts.join("/");
}

async function uploadMarkdownImages(
  env: Env,
  zipFiles: Record<string, Uint8Array>,
  markdown: string,
  mdDir: string,
  locale: Locale,
): Promise<{ rewrittenMarkdown: string; warnings: Array<string> }> {
  const warnings: Array<string> = [];

  const images = extractMarkdownImages(markdown);
  const relativeImages = images.filter((img) => img.type === "relative");

  if (relativeImages.length === 0) {
    return { rewrittenMarkdown: markdown, warnings };
  }

  const rewriteMap = new Map<string, string>();

  for (const img of relativeImages) {
    const resolvedPath = resolveRelativePath(mdDir, img.original);

    if (!(resolvedPath in zipFiles)) {
      warnings.push(
        m.import_export_import_warning_image_missing(
          { name: img.original },
          { locale },
        ),
      );
      continue;
    }

    const imageData = zipFiles[resolvedPath];
    if (imageData.length === 0) continue;

    const fileName = resolvedPath.split("/").pop() || resolvedPath;
    const newKey = generateKey(fileName);
    const mimeType =
      getContentTypeFromKey(fileName) || "application/octet-stream";

    try {
      await env.R2.put(newKey, imageData, {
        httpMetadata: { contentType: mimeType },
        customMetadata: { originalName: fileName },
      });

      await MediaRepo.insertMedia(getDb(env), {
        key: newKey,
        url: `/images/${newKey}`,
        fileName,
        mimeType,
        sizeInBytes: imageData.length,
      });

      rewriteMap.set(img.original, `/images/${newKey}?quality=80`);
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "markdown image upload failed during import",
          resolvedPath,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      warnings.push(
        m.import_export_import_warning_image_upload_failed(
          { name: img.original },
          { locale },
        ),
      );
    }
  }

  const rewrittenMarkdown =
    rewriteMap.size > 0
      ? rewriteMarkdownImagePaths(markdown, rewriteMap)
      : markdown;

  return { rewrittenMarkdown, warnings };
}