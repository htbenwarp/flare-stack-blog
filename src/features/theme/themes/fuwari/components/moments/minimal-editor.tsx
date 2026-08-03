// src/features/theme/themes/fuwari/components/moments/minimal-editor.tsx
import { useEffect, useCallback, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { IframeExtension } from "@/features/posts/editor/extensions/iframe/index";
import { uploadMomentImage } from "@/features/moments/utils";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";
import {
  Bold, Italic, Strikethrough, LinkIcon, ImageIcon, Upload, Globe, Smile, X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { EmojiPickerPopover } from "@/features/theme/themes/fuwari/components/comments/editor/emoji-picker-popover";
import { normalizeLinkHref } from "@/lib/links/normalize-link-href";

// ---------- 工具函数：从 JSON 中分离图片和文本 ----------
function extractImagesFromJSON(json?: JSONContent): {
  images: string[];
  contentWithoutImages: JSONContent;
} {
  const images: string[] = [];
  if (!json || !json.content) return { images, contentWithoutImages: json || {} };

  const contentWithoutImages = {
    ...json,
    content: json.content.filter((node: any) => {
      if (node.type === "image") {
        images.push(node.attrs?.src || "");
        return false;
      }
      return true;
    }),
  };

  return { images, contentWithoutImages };
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

  const handleSubmit = () => {
    if (type === "link") {
      const href = normalizeLinkHref(url);
      onSubmit(href);
    } else if (type === "image") {
      onSubmit(url, { alt });
    } else if (type === "iframe") {
      onSubmit(url, { width, height });
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
              : "插入嵌入页面"}
        </h3>
        <input
          type="text"
          placeholder="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full text-sm border rounded px-2 py-1"
          autoFocus
        />
        {type === "image" && (
          <input
            type="text"
            placeholder="替代文本（可选）"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            className="w-full text-sm border rounded px-2 py-1"
          />
        )}
        {type === "iframe" && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="宽度 (如 100%)"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="w-1/2 text-sm border rounded px-2 py-1"
            />
            <input
              type="text"
              placeholder="高度 (如 400)"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-1/2 text-sm border rounded px-2 py-1"
            />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm rounded border"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 py-1 text-sm rounded bg-blue-500 text-white"
          >
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
  const btnClass =
    "p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-sm";

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
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onUploadImage}
        />
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
  onChange: (data: { json: JSONContent; images: string[] }) => void;
  placeholder?: string;
  initialContent?: JSONContent;
}

export function MinimalEditor({
  onChange,
  placeholder,
  initialContent,
}: MinimalEditorProps) {
  const [modal, setModal] = useState<{
    type: "link" | "image" | "iframe";
  } | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiPos, setEmojiPos] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  // 图片状态：完全独立于编辑器
  const [images, setImages] = useState<string[]>(() => {
    if (!initialContent) return [];
    const { images: initImages } = extractImagesFromJSON(initialContent);
    return initImages;
  });

  // 编辑器初始内容（去除图片）
  const initialEditorContent = initialContent
    ? extractImagesFromJSON(initialContent).contentWithoutImages
    : "";

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        image: false, // 完全禁用图片节点
        link: { openOnClick: false },
      }),
      IframeExtension,
    ],
    editorProps: {
      attributes: {
        class:
          "max-w-none focus:outline-none text-base leading-relaxed min-h-[120px] p-3",
        "data-placeholder": placeholder || "此刻的想法...",
      },
    },
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onChange({ json, images });
    },
    content: initialEditorContent,
  });

  // 初始化标记（防止重复初始化）
  useEffect(() => {
    if (!isInitializedRef.current && editor && initialContent) {
      isInitializedRef.current = true;
    }
  }, [editor, initialContent]);

  // 图片变化时同步通知父组件
  useEffect(() => {
    if (editor) {
      onChange({ json: editor.getJSON(), images });
    }
  }, [images, editor, onChange]);

  // 删除图片
  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 表情处理
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

  // 图片上传
  const handleUploadImage = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const { url } = await uploadMomentImage(file);
        setImages((prev) => [...prev, url]);
        toast.success("图片上传成功");
      } catch (err) {
        console.error("Upload failed", err);
        toast.error("图片上传失败");
      } finally {
        e.target.value = "";
      }
    },
    [],
  );

  if (!editor) return <div className="min-h-[120px] border rounded" />;

  return (
    <div className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden bg-(--fuwari-card-bg)">
      {/* 工具栏 */}
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

      {/* 编辑区域 */}
      <div className="flex flex-col">
        {/* 文本编辑区 */}
        <div>
          <EditorContent editor={editor} />
        </div>

        {/* 图片展示区（带删除功能） */}
        {images.length > 0 && (
          <div className="p-3 border-t border-black/5 dark:border-white/5 space-y-3">
            {images.map((src, idx) => (
              <div
                key={`${idx}-${src.slice(-20)}`}
                className="relative group rounded-lg overflow-hidden"
              >
                <img
                  src={src}
                  alt={`图片 ${idx + 1}`}
                  className="w-full h-auto max-h-96 object-contain bg-black/5 dark:bg-white/5"
                />
                {/* 删除按钮 */}
                <button
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                  title="删除图片"
                >
                  <X size={14} />
                </button>
                {/* 图片序号 */}
                <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  {idx + 1}/{images.length}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 插入模态框 */}
      {modal && (
        <InsertModal
          type={modal.type}
          onClose={() => setModal(null)}
          onSubmit={(url, extra) => {
            if (modal.type === "link") {
              if (url === "")
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .unsetLink()
                  .run();
              else
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .setLink({ href: url })
                  .run();
            } else if (modal.type === "image") {
              setImages((prev) => [...prev, url]);
              toast.success("图片已添加");
            } else if (modal.type === "iframe") {
              editor.commands.insertIframe({
                src: url,
                width: extra?.width || "100%",
                height: extra?.height || "400",
              });
            }
            setModal(null);
          }}
        />
      )}

      {/* 表情选择器 */}
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