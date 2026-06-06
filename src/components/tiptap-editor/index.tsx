import type {
  Extensions,
  JSONContent,
  Editor as TiptapEditor,
} from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { normalizeLinkHref } from "@/lib/links/normalize-link-href";
import { cn } from "@/lib/utils";
import type { FormulaModalPayload } from "./formula-modal-store";
import {
  addFormulaModalOpener,
  removeFormulaModalOpener,
  setActiveFormulaModalOpenerKey,
} from "./formula-modal-store";
import EditorToolbar from "./ui/editor-toolbar";
import type { FormulaMode } from "./ui/formula-modal";
import { FormulaModal } from "./ui/formula-modal";
import type { ModalType } from "./ui/insert-modal";
import InsertModal from "./ui/insert-modal";
import { TableBubbleMenu } from "./ui/table-bubble-menu";

interface EditorProps {
  content?: JSONContent | string;
  onChange?: (json: JSONContent) => void;
  onCreated?: (editor: TiptapEditor) => void;
  extensions: Extensions;
  editable?: boolean;
  className?: string;
  contentClassName?: string;
}

export const Editor = memo(function Editor({
  content,
  onChange,
  onCreated,
  extensions,
  editable = true,
  className,
  contentClassName,
}: EditorProps) {
  const formulaOpenerKeyRef = useRef(Symbol("formula-modal-opener"));
  const [modalOpen, setModalOpen] = useState<ModalType>(null);
  const [modalInitialUrl, setModalInitialUrl] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [formulaModalOpen, setFormulaModalOpen] = useState(false);
  const [formulaPayload, setFormulaPayload] = useState<{
    mode: FormulaMode;
    initialLatex: string;
    editContext: { pos: number; type: FormulaMode } | null;
  }>({ mode: "inline", initialLatex: "", editContext: null });

  const editor = useEditor({
    extensions,
    content,
    editable,
    onCreate: ({ editor: currentEditor }) => {
      onCreated?.(currentEditor);
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getJSON());
    },
    editorProps: {
      attributes: {
        class: cn(
          "max-w-none focus:outline-none text-lg leading-relaxed min-h-[500px] fuwari-custom-md-editor",
          !editable && "min-h-0 text-base leading-7",
          contentClassName,
        ),
      },
    },
    immediatelyRender: false,
  });

  const openLinkModal = useCallback(() => {
    const previousUrl = editor?.getAttributes("link").href;
    setModalInitialUrl(previousUrl || "");
    setModalOpen("LINK");
  }, [editor]);

  const openImageModal = useCallback(() => {
    setModalInitialUrl("");
    setModalOpen("IMAGE");
  }, []);

  const openFootnoteModal = useCallback(() => {
    if (!editor) return;
    const text = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to,
      " ",
    );
    setSelectedText(text || "");
    setModalOpen("FOOTNOTE");
  }, [editor]);

  const openGitHubCardModal = useCallback(() => {
    setModalOpen("GITHUB_CARD");
  }, []);

  const handleDetailsClick = useCallback(() => {
    editor?.chain().focus().setDetailsBlock({ summary: "折叠标题" }).run();
  }, [editor]);

  const handleEmphasisClick = useCallback(() => {
    editor?.chain().focus().toggleEmphasisCjk().run();
  }, [editor]);

  const openFormulaModal = useCallback((mode: FormulaMode) => {
    setFormulaPayload({
      mode,
      initialLatex: mode === "inline" ? "x^2+y^2=z^2" : "E = mc^2",
      editContext: null,
    });
    setFormulaModalOpen(true);
  }, []);

  useEffect(() => {
    if (!editable) return;
    const opener = (payload: FormulaModalPayload) => {
      setFormulaPayload({
        mode: payload.type,
        initialLatex: payload.latex,
        editContext: { pos: payload.pos, type: payload.type },
      });
      setFormulaModalOpen(true);
    };
    addFormulaModalOpener(formulaOpenerKeyRef.current, opener);
    return () => removeFormulaModalOpener(formulaOpenerKeyRef.current);
  }, [editable]);

  const markActiveFormulaOpener = useCallback(() => {
    if (!editable) return;
    setActiveFormulaModalOpenerKey(formulaOpenerKeyRef.current);
  }, [editable]);

  const handleFormulaApply = useCallback(
    (
      latex: string,
      mode: FormulaMode,
      editContext: { pos: number; type: FormulaMode } | null,
    ) => {
      if (!editor) return;
      if (editContext && editContext.type !== mode) {
        const chain = editor
          .chain()
          .setNodeSelection(editContext.pos)
          .deleteSelection();
        if (mode === "inline") {
          chain.insertInlineMath({ latex }).focus().run();
        } else {
          chain.insertBlockMath({ latex }).focus().run();
        }
      } else if (editContext) {
        if (editContext.type === "inline") {
          editor
            .chain()
            .setNodeSelection(editContext.pos)
            .updateInlineMath({ latex })
            .focus()
            .run();
        } else {
          editor
            .chain()
            .setNodeSelection(editContext.pos)
            .updateBlockMath({ latex })
            .focus()
            .run();
        }
      } else {
        if (mode === "inline") {
          editor.chain().focus().insertInlineMath({ latex }).run();
        } else {
          editor.chain().focus().insertBlockMath({ latex }).run();
        }
      }
      setFormulaModalOpen(false);
    },
    [editor],
  );

const handleModalSubmit = useCallback(
  (
    url: string,
    attrs?: { width?: number; height?: number },
    nodeData?: { type: string; attrs?: Record<string, any>; content?: any[] },
  ) => {
    console.log("handleModalSubmit received:", { url, attrs, nodeData, modalOpen });

    if (modalOpen === "LINK") {
      if (url === "") {
        editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      } else {
        const href = normalizeLinkHref(url);
        editor?.chain().focus().extendMarkRange("link").setLink({ href }).run();
      }
    } else if (modalOpen === "IMAGE") {
      if (url) {
        editor
          ?.chain()
          .focus()
          .setImage({ src: url, ...attrs })
          .run();
      }
    } else if (modalOpen === "GITHUB_CARD") {
      // ✅ 关键修复：直接从 url 参数获取 GitHub URL，插入 githubCard 节点
      if (url && url.trim()) {
        editor?.chain().focus().insertContent({
          type: "githubCard",
          attrs: { repoUrl: url.trim() },
        }).run();
      }
    } else if (nodeData) {
      // 处理其他扩展节点（脚注、折叠块、着重号）
      if (nodeData.type === "emphasisCjk") {
        if (editor?.state.selection.empty && nodeData.attrs?.text) {
          editor
            .chain()
            .focus()
            .insertContent(nodeData.attrs.text)
            .setMark("emphasisCjk")
            .run();
        } else {
          editor?.chain().focus().toggleEmphasisCjk().run();
        }
      } else if (nodeData.type === "footnoteTip") {
        editor?.chain().focus().insertContent({
          type: "footnoteTip",
          attrs: nodeData.attrs,
        }).run();
      } else if (nodeData.type === "detailsBlock") {
        editor?.chain().focus().setDetailsBlock(nodeData.attrs).run();
      }
    }
    setModalOpen(null);
  },
  [editor, modalOpen],
);

  return (
    <div className={cn("relative flex flex-col group", className)}>
      {editable && (
        <EditorToolbar
          editor={editor}
          onLinkClick={openLinkModal}
          onImageClick={openImageModal}
          onFormulaInlineClick={() => openFormulaModal("inline")}
          onFormulaBlockClick={() => openFormulaModal("block")}
          onFootnoteClick={openFootnoteModal}
          onDetailsClick={handleDetailsClick}
          onEmphasisClick={handleEmphasisClick}
          onGitHubCardClick={openGitHubCardModal}
        />
      )}

      {editable && <TableBubbleMenu editor={editor} />}

      <div
        className="relative min-h-125"
        onMouseDownCapture={markActiveFormulaOpener}
        onFocusCapture={markActiveFormulaOpener}
      >
        <EditorContent editor={editor} />
      </div>

      {editable && (
        <InsertModal
          type={modalOpen}
          initialUrl={modalInitialUrl}
          initialText={selectedText}
          onClose={() => {
            setModalOpen(null);
            setSelectedText("");
          }}
          onSubmit={handleModalSubmit}
        />
      )}

      {editable && (
        <FormulaModal
          isOpen={formulaModalOpen}
          mode={formulaPayload.mode}
          initialLatex={formulaPayload.initialLatex}
          editContext={formulaPayload.editContext}
          onClose={() => setFormulaModalOpen(false)}
          onApply={handleFormulaApply}
        />
      )}
    </div>
  );
});