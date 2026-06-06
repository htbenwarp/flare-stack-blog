import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { GithubCardView } from "./GithubCardView";

export const GithubCard = Node.create({
  name: "githubCard",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      repoUrl: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "a.card-github" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      { class: "card-github", href: HTMLAttributes.repoUrl },
      ["div", { class: "gc-titlebar" }, "..."],
      ["div", { class: "gc-description" }, "Loading..."],
      ["div", { class: "gc-infobar" }, "..."],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GithubCardView);
  },

  addCommands() {
    return {
      setGithubCard:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});