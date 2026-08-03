// src/features/theme/themes/fuwari/components/moments/image-extension.ts
import Image from "@tiptap/extension-image";

export const MomentImageExtension = Image.extend({
  // 不添加 NodeView，使用原生行为
  inline: false,           // 块级图片
  group: "block",         // 块组
  atom: true,             // 原子节点
  selectable: true,
  draggable: true,

  renderHTML({ HTMLAttributes }) {
    // 直接返回 img 标签，不加任何包裹
    return ["img", HTMLAttributes];
  },

  parseHTML() {
    return [{ tag: "img" }];
  },
});