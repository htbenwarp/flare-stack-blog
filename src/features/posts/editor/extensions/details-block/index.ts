import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { DetailsBlockView } from "./DetailsBlockView";

export const DetailsBlock = Node.create({
  name: "detailsBlock",
  group: "block",
  content: "block+",
  atom: false,

  addAttributes() {
    return {
      summary: { default: "折叠标题" },
    };
  },

  parseHTML() {
    return [{ tag: "details.details-block" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "details",
      { class: "details-block", open: "open" },
      ["summary", { class: "details-summary" }, HTMLAttributes.summary],
      ["div", { class: "details-body" }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DetailsBlockView);
  },

  addCommands() {
    return {
      setDetailsBlock:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: " " }],
              },
            ],
          }),
    };
  },
});