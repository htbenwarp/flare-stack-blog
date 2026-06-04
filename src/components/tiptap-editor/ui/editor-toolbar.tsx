import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo,
  Sigma,
  SquareFunction,
  Strikethrough,
  Table as TableIcon,
  Terminal,
  Underline as UnderlineIcon,
  Undo,
  Bookmark,
  ChevronRight,
  Highlighter,
  ExternalLink,
} from "lucide-react";
import type React from "react";
import { m } from "@/paraglide/messages";

interface EditorToolbarProps {
  editor: Editor | null;
  onLinkClick: () => void;
  onImageClick: () => void;
  onFormulaInlineClick: () => void;
  onFormulaBlockClick: () => void;
  onFootnoteClick: () => void;
  onDetailsClick: () => void;
  onEmphasisClick: () => void;
  onGitHubCardClick: () => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  icon: LucideIcon;
  label?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  isActive,
  icon: Icon,
  label,
}) => (
  <button
    onClick={onClick}
    className={clsx(
      "h-8 w-8 flex items-center justify-center transition-colors duration-200 group relative rounded-none",
      isActive
        ? "bg-foreground text-background"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/20",
    )}
    title={label}
    type="button"
  >
    <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
  </button>
);

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  onLinkClick,
  onImageClick,
  onFormulaInlineClick,
  onFormulaBlockClick,
  onFootnoteClick,
  onDetailsClick,
  onEmphasisClick,
  onGitHubCardClick,
}) => {
  const state = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) {
        return {
          isBold: false,
          isHeading2: false,
          isHeading3: false,
          isItalic: false,
          isUnderline: false,
          isStrike: false,
          isCode: false,
          isCodeBlock: false,
          isInlineMath: false,
          isBlockMath: false,
          isBulletList: false,
          isOrderedList: false,
          isBlockquote: false,
          isLink: false,
          isEmphasisCjk: false,
          isDetailsActive: false,
          isFootnoteActive: false,
        };
      }
      return {
        isBold: ctx.editor.isActive("bold"),
        isHeading2: ctx.editor.isActive("heading", { level: 2 }),
        isHeading3: ctx.editor.isActive("heading", { level: 3 }),
        isItalic: ctx.editor.isActive("italic"),
        isUnderline: ctx.editor.isActive("underline"),
        isStrike: ctx.editor.isActive("strike"),
        isCode: ctx.editor.isActive("code"),
        isCodeBlock: ctx.editor.isActive("codeBlock"),
        isInlineMath: ctx.editor.isActive("inlineMath"),
        isBlockMath: ctx.editor.isActive("blockMath"),
        isBulletList: ctx.editor.isActive("bulletList"),
        isOrderedList: ctx.editor.isActive("orderedList"),
        isBlockquote: ctx.editor.isActive("blockquote"),
        isLink: ctx.editor.isActive("link"),
        isEmphasisCjk: ctx.editor.isActive("emphasisCjk"),
        isDetailsActive: ctx.editor.isActive("detailsBlock"),
        isFootnoteActive: ctx.editor.isActive("footnoteTip"),
      };
    },
  }) || {
    isBold: false,
    isHeading2: false,
    isHeading3: false,
    isItalic: false,
    isUnderline: false,
    isStrike: false,
    isCode: false,
    isCodeBlock: false,
    isInlineMath: false,
    isBlockMath: false,
    isBulletList: false,
    isOrderedList: false,
    isBlockquote: false,
    isLink: false,
    isEmphasisCjk: false,
    isDetailsActive: false,
    isFootnoteActive: false,
  };

  return (
    <div className="sticky top-0 z-30 mb-8 py-2 bg-background border-b border-border/50 flex flex-wrap items-center gap-1 px-4">
      {/* Headings */}
      <ToolbarButton
        onClick={() =>
          editor?.chain().focus().toggleHeading({ level: 2 }).run()
        }
        isActive={state.isHeading2}
        icon={Heading2}
        label={m.editor_toolbar_heading2()}
      />
      <ToolbarButton
        onClick={() =>
          editor?.chain().focus().toggleHeading({ level: 3 }).run()
        }
        isActive={state.isHeading3}
        icon={Heading3}
        label={m.editor_toolbar_heading3()}
      />

      <div className="h-4 w-px bg-border/50 mx-2"></div>

      {/* Formatting */}
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleBold().run()}
        isActive={state.isBold}
        icon={Bold}
        label={m.editor_toolbar_bold()}
      />
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        isActive={state.isItalic}
        icon={Italic}
        label={m.editor_toolbar_italic()}
      />
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
        isActive={state.isUnderline}
        icon={UnderlineIcon}
        label={m.editor_toolbar_underline()}
      />
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleStrike().run()}
        isActive={state.isStrike}
        icon={Strikethrough}
        label={m.editor_toolbar_strike()}
      />
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleCode().run()}
        isActive={state.isCode}
        icon={Code}
        label={m.editor_toolbar_code()}
      />
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        isActive={state.isCodeBlock}
        icon={Terminal}
        label={m.editor_toolbar_code_block()}
      />
      <ToolbarButton
        onClick={onFormulaInlineClick}
        isActive={state.isInlineMath}
        icon={Sigma}
        label={m.editor_toolbar_formula_inline()}
      />
      <ToolbarButton
        onClick={onFormulaBlockClick}
        isActive={state.isBlockMath}
        icon={SquareFunction}
        label={m.editor_toolbar_formula_block()}
      />

      <div className="h-4 w-px bg-border/50 mx-2"></div>

      {/* Lists & Blocks */}
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        isActive={state.isBulletList}
        icon={List}
        label={m.editor_toolbar_bullet_list()}
      />
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        isActive={state.isOrderedList}
        icon={ListOrdered}
        label={m.editor_toolbar_ordered_list()}
      />
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        isActive={state.isBlockquote}
        icon={Quote}
        label={m.editor_toolbar_blockquote()}
      />
      <ToolbarButton
        onClick={() =>
          editor
            ?.chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
        isActive={editor?.isActive("table")}
        icon={TableIcon}
        label={m.editor_toolbar_table()}
      />

      <div className="h-4 w-px bg-border/50 mx-2"></div>

      {/* Inserts */}
      <ToolbarButton
        onClick={onLinkClick}
        isActive={state.isLink}
        icon={LinkIcon}
        label={m.editor_toolbar_link()}
      />
      <ToolbarButton
        onClick={onImageClick}
        isActive={false}
        icon={ImageIcon}
        label={m.editor_toolbar_image()}
      />

      {/* 扩展功能按钮 */}
      <ToolbarButton
        onClick={onEmphasisClick}
        isActive={state.isEmphasisCjk}
        icon={Highlighter}
        label={m.editor_toolbar_emphasis?.() ?? "着重号"}
      />
      <ToolbarButton
        onClick={onDetailsClick}
        isActive={state.isDetailsActive}
        icon={ChevronRight}
        label={m.editor_toolbar_details?.() ?? "折叠块"}
      />
      <ToolbarButton
        onClick={onFootnoteClick}
        isActive={state.isFootnoteActive}
        icon={Bookmark}
        label={m.editor_toolbar_footnote?.() ?? "脚注"}
      />
      <ToolbarButton
        onClick={onGitHubCardClick}
        isActive={false}
        icon={ExternalLink}
        label={m.editor_toolbar_github_card?.() ?? "GitHub卡片"}
      />

      <div className="ml-auto flex gap-1">
        <ToolbarButton
          onClick={() => editor?.chain().focus().undo().run()}
          icon={Undo}
          label={m.editor_toolbar_undo()}
        />
        <ToolbarButton
          onClick={() => editor?.chain().focus().redo().run()}
          icon={Redo}
          label={m.editor_toolbar_redo()}
        />
      </div>
    </div>
  );
};

export default EditorToolbar;