import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { FootnoteTipView } from "./FootnoteTipView";

export const FootnoteTip = Node.create({
  name: "footnoteTip",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      text: { default: "" },
      note: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "span.fn-tip-wrap" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { text, note } = HTMLAttributes;
    return [
      "span",
      { class: "fn-tip-wrap" },
      text,
      ["span", { class: "fn-tip" }, note],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FootnoteTipView);
  },
});