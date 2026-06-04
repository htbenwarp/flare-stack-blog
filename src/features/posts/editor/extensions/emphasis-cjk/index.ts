import { Mark } from "@tiptap/core";

export const EmphasisCjk = Mark.create({
  name: "emphasisCjk",

  parseHTML() {
    return [{ tag: "span.emphasis-cjk" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", { class: "emphasis-cjk" }, 0];
  },

  addCommands() {
    return {
      toggleEmphasisCjk:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
});