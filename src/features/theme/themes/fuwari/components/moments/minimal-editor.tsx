// src/features/theme/themes/fuwari/components/moments/minimal-editor.tsx
import { useEffect, useCallback, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { ImageUpload } from "@/features/posts/editor/extensions/upload-image/index";
import { IframeExtension } from "@/features/posts/editor/extensions/iframe/index";
import { uploadMomentImage } from "@/features/moments/utils";
import { normalizeLinkHref } from "@/lib/links/normalize-link-href";
import type { JSONContent } from "@tiptap/react";
import {
  Bold, Italic, Strikethrough, LinkIcon, ImageIcon, Upload, Globe, Smile,
} from "lucide-react";
import { createPortal } from "react-dom";
import { EmojiPickerPopover } from "@/features/theme/themes/fuwari/components/comments/editor/emoji-picker-popover";

// ---------- 解析 iframe 代码 ----------
function parseIframeCode(code: string): Record<string, any> | null {
  try {
    const div = document.createElement("div");
    div.innerHTML = code.trim();
    const iframe = div.querySelector("iframe");
    if (!iframe) return null;
    const attrs: Record<string, any> = {};
    for (const attr of iframe.attributes) {
      attrs[attr.name] = attr.value;
    }
    // 标准化 allowfullscreen
    if (
      attrs.allowfullscreen === "" ||
      attrs.allowfullscreen === "true" ||
      attrs.allowfullscreen === "allowfullscreen"
    ) {
      attrs.allowFullscreen = true;
    }
    return attrs;
  } catch {
    return null;
  }
}

// ---------- 插入模态框 ----------
function InsertModal({
  type,
  onClose,
  onSubmit,
}: {
  type: "link" | "image" | "iframe";
  onClose: () => void;
  onSubmit: (url: string, extra?: Record<string, string>) => void;
}) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [width, setWidth] = useState("100%");
  const [height, setHeight] = useState("400");
  const [iframeCode, setIframeCode] = useState("");

  const handleSubmit = () => {
    if (type === "link") {
      const href = normalizeLinkHref(url);
      onSubmit(href);
    } else if (type === "image") {
      onSubmit(url, { alt });
    } else if (type === "iframe") {
      const attrs = parseIframeCode(iframeCode);
      if (!attrs || !attrs.src) {
        // 简单提示错误
        alert("请粘贴有效的 iframe 代码，且必须包含 src 属性");
        return;
      }
      onSubmit(attrs.src, attrs);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-(--fuwari-card-bg) p-5 rounded-lg shadow-xl w-80 space-y-3">
        <h3 className="font-bold text-sm">
          {type === "link"
            ? "插入链接"
            : type === "image"
              ? "插入图片 URL"
              : "插入嵌入代码"}
        </h3>

        {type === "iframe" ? (
          <textarea
            placeholder="粘贴完整的 iframe 标签代码"
            value={iframeCode}
            onChange={(e) => setIframeCode(e.target.value)}
            className="w-full h-32 text-sm border rounded px-2 py-1 resize-none"
            autoFocus
          />
        ) : (
          <input
            type="text"
            placeholder="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full text-sm border rounded px-2 py-1"
            autoFocus
          />
        )}

        {type === "image" && (
          <input
            type="text"
            placeholder="替代文本（可选）"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            className="w-full text-sm border rounded px-2 py-1"
          />
        )}

        {/* 链接/图片时不显示宽高，iframe 已不需要宽高输入，因为代码自带 */}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1 text-sm rounded border">
            取消
          </button>
          <button onClick={handleSubmit} className="px-3 py-1 text-sm rounded bg-blue-500 text-white">
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- 工具栏 ----------
function Toolbar({
  editor,
  onLink,
  onImageUrl,
  onIframe,
  onEmoji,
  onUploadImage,
}: {
  editor: any;
  onLink: () => void;
  onImageUrl: () => void;
  onIframe: () => void;
  onEmoji: (event: React.MouseEvent) => void;
  onUploadImage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  if (!editor) return null;
  const btnClass = "p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-sm";
  return (
    <div className="flex flex-wrap gap-1 px-2 py-1 border-b border-black/5 dark:border-white/5">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${btnClass} ${editor.isActive("bold") ? "bg-black/10 dark:bg-white/10" : ""}`}
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${btnClass} ${editor.isActive("italic") ? "bg-black/10 dark:bg-white/10" : ""}`}
      >
        <Italic size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`${btnClass} ${editor.isActive("strike") ? "bg-black/10 dark:bg-white/10" : ""}`}
      >
        <Strikethrough size={16} />
      </button>
      <span className="w-px bg-black/20 dark:bg-white/20 mx-1" />
      <button onClick={onLink} className={btnClass}>
        <LinkIcon size={16} />
      </button>
      <button onClick={onImageUrl} className={btnClass}>
        <ImageIcon size={16} />
      </button>
      <label className={`${btnClass} cursor-pointer`}>
        <Upload size={16} />
        <input type="file" accept="image/*" className="hidden" onChange={onUploadImage} />
      </label>
      <button onClick={onIframe} className={btnClass}>
        <Globe size={16} />
      </button>
      <button onClick={onEmoji} className={btnClass}>
        <Smile size={16} />
      </button>
    </div>
  );
}

// ---------- 主编辑器 ----------
interface MinimalEditorProps {
  onChange: (json: JSONContent) => void;
  placeholder?: string;
  initialContent?: JSONContent;
}

export function MinimalEditor({ onChange, placeholder, initialContent }: MinimalEditorProps) {
  const [modal, setModal] = useState<{ type: "link" | "image" | "iframe" } | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiPos, setEmojiPos] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        link: { openOnClick: false },
      }),
      Image.configure({ HTMLAttributes: { alt: "", title: "" } }),
      ImageUpload.configure({
        onUpload: async (file: File) => {
          const { url } = await uploadMomentImage(file);
          return { url };
        },
      }),
      IframeExtension,
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[120px] p-3",
        "data-placeholder": placeholder || "此刻的想法...",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    content: initialContent || "",
  });

  // 当 initialContent 变化时，动态更新编辑器内容（用于编辑回填）
  useEffect(() => {
    if (editor && initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  const handleEmojiClick = useCallback((e: React.MouseEvent) => {
    if (toolbarRef.current) {
      const rect = toolbarRef.current.getBoundingClientRect();
      setEmojiPos({ top: rect.bottom + 4, left: e.clientX - 100 });
    }
    setShowEmoji((prev) => !prev);
  }, []);

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      editor?.chain().focus().insertContent(emoji).run();
      setShowEmoji(false);
    },
    [editor],
  );

  const handleUploadImage = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;
      editor.commands.uploadImage(file);
      e.target.value = "";
    },
    [editor],
  );

  if (!editor) return <div className="min-h-[120px] border rounded" />;

  return (
    <div className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden bg-(--fuwari-card-bg)">
      <div ref={toolbarRef}>
        <Toolbar
          editor={editor}
          onLink={() => setModal({ type: "link" })}
          onImageUrl={() => setModal({ type: "image" })}
          onIframe={() => setModal({ type: "iframe" })}
          onEmoji={handleEmojiClick}
          onUploadImage={handleUploadImage}
        />
      </div>

      <EditorContent editor={editor} />

      {modal && (
        <InsertModal
          type={modal.type}
          onClose={() => setModal(null)}
          onSubmit={(url, extra) => {
            if (modal.type === "link") {
              if (url === "") {
                editor.chain().focus().extendMarkRange("link").unsetLink().run();
              } else {
                editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
              }
            } else if (modal.type === "image") {
              editor.chain().focus().setImage({ src: url, alt: extra?.alt || "" }).run();
            } else if (modal.type === "iframe") {
              // 传递解析后的所有属性给 insertIframe 命令
              editor.commands.insertIframe({
                src: url,                    // url 此时为 src
                width: extra?.width || "100%",
                height: extra?.height || "400",
                allowFullscreen: extra?.allowFullscreen !== undefined ? extra.allowFullscreen : true,
                title: extra?.title || "",
                loading: extra?.loading || "lazy",
                frameborder: extra?.frameborder || "0",
                ...extra,                   // 其他属性一并传入
              });
            }
            setModal(null);
          }}
        />
      )}

      {showEmoji &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: emojiPos.top,
              left: emojiPos.left,
              zIndex: 9999,
            }}
          >
            <EmojiPickerPopover
              onEmojiSelect={handleEmojiSelect}
              onClose={() => setShowEmoji(false)}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}