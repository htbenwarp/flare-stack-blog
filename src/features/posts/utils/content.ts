import type { JSONContent } from "@tiptap/react";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { extractImageKey } from "@/features/media/utils/media.utils";
import { highlight } from "@/lib/shiki";
import { CodeBlockExtension } from "@/features/posts/editor/extensions/code-block/index";
import { DetailsBlock } from "@/features/posts/editor/extensions/details-block/index";
import { EmphasisCjk } from "@/features/posts/editor/extensions/emphasis-cjk/index";
import { FootnoteTip } from "@/features/posts/editor/extensions/footnote-tip/index";
import { GithubCard } from "@/features/posts/editor/extensions/github-card/index";
import { IframeExtension } from "@/features/posts/editor/extensions/iframe/index";
import { ImageUpload as UploadImage } from "@/features/posts/editor/extensions/upload-image/index";
import { BlockQuoteExtension } from "@/features/posts/editor/extensions/typography/block-quote";
import { HeadingExtension } from "@/features/posts/editor/extensions/typography/heading";
import { TableBlockExtension } from "@/features/posts/editor/extensions/table/index";

// ============================================================
// Slug 生成
// ============================================================

export function slugify(text: string | null | undefined) {
  if (!text) return "untitled-log";

  const cleaned = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\-\u4E00-\u9FA5]+/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

  return cleaned || "untitled-log";
}

// ============================================================
// 图片提取
// ============================================================

export function extractAllImageKeys(doc: JSONContent | null): Array<string> {
  const keys: Array<string> = [];

  function traverse(node: JSONContent) {
    if (node.type === "image" && node.attrs?.src) {
      const key = extractImageKey(node.attrs.src);
      if (key) keys.push(key);
    }
    if (node.content) node.content.forEach(traverse);
  }

  if (doc) traverse(doc);
  return Array.from(new Set(keys));
}

// ============================================================
// 代码高亮
// ============================================================

export async function highlightCodeBlocks(
  doc: JSONContent,
): Promise<JSONContent> {
  const cloned = structuredClone(doc);

  async function traverse(node: JSONContent) {
    if (node.type === "codeBlock") {
      const code = node.content?.map((n) => n.text || "").join("") || "";
      const lang = node.attrs?.language || "text";
      try {
        const html = await highlight(code.trim(), lang);
        node.attrs = { ...node.attrs, highlightedHtml: html };
      } catch (e) {
        console.warn(
          JSON.stringify({
            event: "code_highlight_failed",
            lang,
            error: e instanceof Error ? e.message : String(e),
          }),
        );
      }
    }
    if (node.content) {
      await Promise.all(node.content.map(traverse));
    }
  }

  await traverse(cloned);
  return cloned;
}

// ============================================================
// JSON → 纯文本
// ============================================================

export function convertToPlainText(doc: JSONContent | null): string {
  if (!doc) return "";
  const textParts: Array<string> = [];

  function traverse(node: JSONContent) {
    if (node.type === "text" && node.text) {
      textParts.push(node.text);
    } else if (node.type === "image" && node.attrs?.alt) {
      textParts.push(` ${node.attrs.alt} `);
    }

    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }

    const isBlock = [
      "paragraph",
      "heading",
      "codeBlock",
      "blockquote",
      "listItem",
      "bulletList",
      "orderedList",
    ].includes(node.type || "");

    if (isBlock) {
      textParts.push("\n");
    }
  }

  traverse(doc);
  return textParts.join("").replace(/\n+/g, "\n").trim();
}

// ============================================================
// 内容预览
// ============================================================

export function buildContentPreview(
  doc: JSONContent | null,
  maxLength = 1500,
): string {
  const preview = convertToPlainText(doc).trim();
  if (!preview) return "";
  return preview.slice(0, maxLength);
}

// ============================================================
// JSON → HTML（用于 RSS 等）
// ============================================================

function getEditorExtensions() {
  return [
    StarterKit.configure({
      codeBlock: false, // 使用自定义 CodeBlock
    }),
    Image,
    Link.configure({ openOnClick: false }),

    // 表格扩展（自定义组合）
    ...TableBlockExtension,

    // 其他自定义扩展
    CodeBlockExtension,
    DetailsBlock,
    EmphasisCjk,
    FootnoteTip,
    GithubCard,
    IframeExtension,
    UploadImage,
    BlockQuoteExtension,
    HeadingExtension,
  ];
}

export function convertToHtml(doc: JSONContent | null): string {
  if (!doc) return "";
  try {
    const extensions = getEditorExtensions();
    return generateHTML(doc, extensions);
  } catch (error) {
    console.error("Failed to generate HTML from TipTap JSON:", error);
    return convertToPlainText(doc);
  }
}