// src/features/theme/themes/fuwari/components/moments/minimal-editor.tsx
import { useEffect, useCallback, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { IframeExtension, IframeAttributes } from "@/features/posts/editor/extensions/iframe/index";
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

// ---------- 解析 iframe HTML 代码 ----------
function parseIframeHtml(html: string): Partial<IframeAttributes> | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const iframe = doc.querySelector("iframe");
    if (!iframe) return null;

    const attrs: Partial<IframeAttributes> = {};
    
    // 复制所有属性到 attrs
    for (const attr of iframe.attributes) {
      const name = attr.name;
      const value = attr.value;
      
      switch (name) {
        case "src":
          attrs.src = value;
          break;
        case "width":
          attrs.width = value;
          break;
        case "height":
          attrs.height = value;
          break;
        case "allowfullscreen":
          attrs.allowFullscreen = true;
          break;
        case "title":
          attrs.title = value;
          break;
        case "loading":
          attrs.loading = value as "lazy" | "eager";
          break;
        case "frameborder":
          attrs.frameborder = value;
          break;
        case "border":
          attrs.border = value;
          break;
        case "marginwidth":
          attrs.marginwidth = value;
          break;
        case "marginheight":
          attrs.marginheight = value;
          break;
        case "allow":
          attrs.allow = value;
          break;
        case "sandbox":
          attrs.sandbox = value;
          break;
        case "scrolling":
          attrs.scrolling = value;
          break;
        case "referrerpolicy":
          attrs.referrerpolicy = value;
          break;
        default:
          break;
      }
    }
    
    return attrs;
  } catch (error) {
    console.error("Error parsing iframe HTML:", error);
    return null;
  }
}

// ---------- 插入模态框 ----------
function InsertModal({
  type, onClose, onSubmit,
}: {
  type: "link" | "image" | "iframe";
  onClose: () => void;
  onSubmit: (url: string, extra?: Record<string, string>) => void;
}) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [iframeCode, setIframeCode] = useState("");

  const handleSubmit = () => {
    if (type === "link") {
      const href = normalizeLinkHref(url);
      onSubmit(href);
    } else if (type === "image") {
      onSubmit(url, { alt });
    } else if (type === "iframe") {
      // 直接提交 iframe 代码
      onSubmit(iframeCode);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div 
        className="bg-(--fuwari-card-bg) p-5 rounded-lg shadow-xl w-[520px] space-y-3 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-sm">
          {type === "link"
            ? "插入链接"
            : type === "image"
              ? "插入图片 URL"
              : "插入嵌入代码"}
        </h3>
        
        {type === "link" && (
          <input 
            type="text" 
            placeholder="URL" 
            value={url} 
            onChange={(e) => setUrl(e.target.value)} 
            className="w-full text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-700" 
            autoFocus 
            onKeyDown={handleKeyDown}
          />
        )}
        
        {type === "image" && (
          <>
            <input 
              type="text" 
              placeholder="图片 URL" 
              value={url} 
              onChange={(e) => setUrl(e.target.value)} 
              className="w-full text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-700" 
              autoFocus 
              onKeyDown={handleKeyDown}
            />
            <input 
              type="text" 
              placeholder="替代文本（可选）" 
              value={alt} 
              onChange={(e) => setAlt(e.target.value)} 
              className="w-full text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-700" 
              onKeyDown={handleKeyDown}
            />
          </>
        )}
        
        {type === "iframe" && (
          <>
            <textarea
              placeholder='粘贴完整的 iframe 代码，例如：&#10;&lt;iframe src="https://example.com" width="100%" height="400" allowfullscreen&gt;&lt;/iframe&gt;'
              value={iframeCode}
              onChange={(e) => setIframeCode(e.target.value)}
              className="w-full text-sm border rounded px-2 py-1 min-h-[120px] font-mono dark:bg-gray-800 dark:border-gray-700"
              autoFocus
              onKeyDown={handleKeyDown}
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div>💡 直接粘贴 iframe 标签，系统将自动提取属性</div>
              <div className="font-mono text-[10px] text-gray-400">支持属性: src, width, height, allowfullscreen, title, loading, frameborder, border, marginwidth, marginheight, allow, sandbox, scrolling, referrerpolicy</div>
            </div>
          </>
        )}
        
        <div className="flex justify-end gap-2 pt-2">
          <button 
            onClick={onClose} 
            className="px-3 py-1.5 text-sm rounded border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            取消
          </button>
          <button 
            onClick={handleSubmit} 
            className="px-3 py-1.5 text-sm rounded bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- 工具栏 ----------
function Toolbar({ editor, onLink, onImageUrl, onIframe, onEmoji, onUploadImage }: {
  editor: any;
  onLink: () => void;
  onImageUrl: () => void;
  onIframe: () => void;
  onEmoji: (event: React.MouseEvent) => void;
  onUploadImage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  if (!editor) return null;
  const btnClass = "p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-sm";

  return (
    <div className="flex flex-wrap gap-0.5 px-2 py-1 border-b border-black/5 dark:border-white/5">
      <button 
        onClick={() => editor.chain().focus().toggleBold().run()} 
        className={`${btnClass} ${editor.isActive("bold") ? "bg-black/10 dark:bg-white/10" : ""}`}
        title="加粗 (Ctrl+B)"
      >
        <Bold size={16} />
      </button>
      <button 
        onClick={() => editor.chain().focus().toggleItalic().run()} 
        className={`${btnClass} ${editor.isActive("italic") ? "bg-black/10 dark:bg-white/10" : ""}`}
        title="斜体 (Ctrl+I)"
      >
        <Italic size={16} />
      </button>
      <button 
        onClick={() => editor.chain().focus().toggleStrike().run()} 
        className={`${btnClass} ${editor.isActive("strike") ? "bg-black/10 dark:bg-white/10" : ""}`}
        title="删除线"
      >
        <Strikethrough size={16} />
      </button>
      
      <span className="w-px bg-black/20 dark:bg-white/20 mx-1" />
      
      <button onClick={onLink} className={btnClass} title="插入链接 (Ctrl+K)">
        <LinkIcon size={16} />
      </button>
      <button onClick={onImageUrl} className={btnClass} title="插入图片 URL">
        <ImageIcon size={16} />
      </button>
      <label className={`${btnClass} cursor-pointer`} title="上传图片">
        <Upload size={16} />
        <input type="file" accept="image/*" className="hidden" onChange={onUploadImage} />
      </label>
      <button onClick={onIframe} className={btnClass} title="插入嵌入代码">
        <Globe size={16} />
      </button>
      <button onClick={onEmoji} className={btnClass} title="插入表情">
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

export function MinimalEditor({ onChange, placeholder, initialContent }: MinimalEditorProps) {
  const [modal, setModal] = useState<{ type: "link" | "image" | "iframe" } | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiPos, setEmojiPos] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  // 稳定化 onChange
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // 图片状态独立管理
  const [images, setImages] = useState<string[]>(() => {
    if (!initialContent) return [];
    const { images: initImages } = extractImagesFromJSON(initialContent);
    return initImages;
  });

  const initialEditorContent = initialContent
    ? extractImagesFromJSON(initialContent).contentWithoutImages
    : "";

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        image: false, // 完全禁用图片
        link: { openOnClick: false },
      }),
      IframeExtension,
    ],
    editorProps: {
      attributes: {
        class: "max-w-none focus:outline-none text-base leading-relaxed min-h-[120px] p-3",
        "data-placeholder": placeholder || "此刻的想法...",
      },
    },
    immediatelyRender: false,
    content: initialEditorContent,
    onUpdate: ({ editor }) => {
      onChangeRef.current?.({ json: editor.getJSON(), images });
    },
  });

  // 当图片变化时通知父组件
  useEffect(() => {
    if (editor) {
      onChangeRef.current?.({ json: editor.getJSON(), images });
    }
  }, [images, editor]);

  // 删除图片
  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 表情
  const handleEmojiClick = useCallback((e: React.MouseEvent) => {
    if (toolbarRef.current) {
      const rect = toolbarRef.current.getBoundingClientRect();
      setEmojiPos({ top: rect.bottom + 4, left: e.clientX - 100 });
    }
    setShowEmoji((prev) => !prev);
  }, []);

  const handleEmojiSelect = useCallback((emoji: string) => {
    editor?.chain().focus().insertContent(emoji).run();
    setShowEmoji(false);
  }, [editor]);

  // 本地上传图片
  const handleUploadImage = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, []);

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

      <div className="flex flex-col">
        <div className="min-h-[120px]">
          <EditorContent editor={editor} />
        </div>

        {images.length > 0 && (
          <div className="p-3 border-t border-black/5 dark:border-white/5 space-y-3">
            {images.map((src, idx) => (
              <div key={`${idx}-${src.slice(-20)}`} className="relative group rounded-lg overflow-hidden bg-black/5 dark:bg-white/5">
                <img 
                  src={src} 
                  alt={`图片 ${idx + 1}`} 
                  className="w-full h-auto max-h-96 object-contain" 
                  loading="lazy"
                />
                <button 
                  onClick={() => handleRemoveImage(idx)} 
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                  title="删除图片"
                >
                  <X size={14} />
                </button>
                <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  {idx + 1}/{images.length}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <InsertModal
          type={modal.type}
          onClose={() => setModal(null)}
          onSubmit={(url, extra) => {
            if (modal.type === "link") {
              if (!url || url.trim() === "") {
                editor.chain().focus().extendMarkRange("link").unsetLink().run();
              } else {
                const href = normalizeLinkHref(url);
                editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
              }
            } else if (modal.type === "image") {
              if (url && url.trim() !== "") {
                setImages((prev) => [...prev, url]);
                toast.success("图片已添加");
              } else {
                toast.error("请输入图片 URL");
              }
            } else if (modal.type === "iframe") {
              // 解析用户输入的 iframe HTML 代码
              const attrs = parseIframeHtml(url);
              if (attrs && attrs.src) {
                editor.commands.insertIframe(attrs);
                toast.success("嵌入内容已添加");
              } else {
                toast.error("无法解析 iframe 代码，请检查格式是否正确");
              }
            }
            setModal(null);
          }}
        />
      )}

      {showEmoji && createPortal(
        <div 
          style={{ 
            position: "fixed", 
            top: emojiPos.top, 
            left: Math.min(emojiPos.left, window.innerWidth - 320),
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
