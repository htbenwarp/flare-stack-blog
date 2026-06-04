import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

export function FootnoteTipView(props: NodeViewProps) {
  const handleDoubleClick = () => {
    const oldText = props.node.attrs.text || "";
    const oldNote = props.node.attrs.note || "";
    const newText = window.prompt("编辑提示文本", oldText);
    if (newText !== null) {
      const newNote = window.prompt("编辑脚注内容", oldNote);
      if (newNote !== null) {
        props.updateAttributes({ text: newText, note: newNote });
      } else {
        props.updateAttributes({ text: newText });
      }
    }
  };

  return (
    <NodeViewWrapper
      as="span"
      className="fn-tip-wrap"
      style={{ display: "inline", borderBottom: "2px dotted var(--fuwari-primary)", cursor: "pointer" }}
      onDoubleClick={handleDoubleClick}
    >
      {props.node.attrs.text}
    </NodeViewWrapper>
  );
}