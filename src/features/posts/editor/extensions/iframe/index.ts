import { Node } from "@tiptap/core";

export interface IframeAttributes {
  src: string;
  width?: string | number;
  height?: string | number;
  allowFullscreen?: boolean;
  title?: string;
  loading?: "lazy" | "eager";
  frameborder?: string | number;
  border?: string | number;
  marginwidth?: string | number;
  marginheight?: string | number;
  scrolling?: string;
  sandbox?: string;
  allow?: string;
  referrerpolicy?: string;
}

export const IframeExtension = Node.create({
  name: "iframe",

  group: "block",

  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("src"),
        renderHTML: (attributes) => {
          if (!attributes.src) return {};
          return { src: attributes.src };
        },
      },
      width: {
        default: "100%",
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) => {
          // 如果用户设置了宽度，保留原值
          if (attributes.width) return { width: attributes.width };
          return {};
        },
      },
      height: {
        default: "400",
        parseHTML: (element) => element.getAttribute("height"),
        renderHTML: (attributes) => {
          if (attributes.height) return { height: attributes.height };
          return {};
        },
      },
      allowFullscreen: {
        default: true,
        parseHTML: (element) => element.hasAttribute("allowfullscreen"),
        renderHTML: (attributes) => {
          if (!attributes.allowFullscreen) return {};
          return { allowfullscreen: "true" };
        },
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute("title"),
        renderHTML: (attributes) => {
          if (!attributes.title) return {};
          return { title: attributes.title };
        },
      },
      loading: {
        default: "lazy",
        parseHTML: (element) => element.getAttribute("loading"),
        renderHTML: (attributes) => ({ loading: attributes.loading }),
      },
      // 新增属性支持
      frameborder: {
        default: "0",
        parseHTML: (element) => element.getAttribute("frameborder"),
        renderHTML: (attributes) => {
          if (attributes.frameborder !== undefined && attributes.frameborder !== null) {
            return { frameborder: String(attributes.frameborder) };
          }
          return {};
        },
      },
      border: {
        default: null,
        parseHTML: (element) => element.getAttribute("border"),
        renderHTML: (attributes) => {
          if (attributes.border !== undefined && attributes.border !== null) {
            return { border: String(attributes.border) };
          }
          return {};
        },
      },
      marginwidth: {
        default: null,
        parseHTML: (element) => element.getAttribute("marginwidth"),
        renderHTML: (attributes) => {
          if (attributes.marginwidth !== undefined && attributes.marginwidth !== null) {
            return { marginwidth: String(attributes.marginwidth) };
          }
          return {};
        },
      },
      marginheight: {
        default: null,
        parseHTML: (element) => element.getAttribute("marginheight"),
        renderHTML: (attributes) => {
          if (attributes.marginheight !== undefined && attributes.marginheight !== null) {
            return { marginheight: String(attributes.marginheight) };
          }
          return {};
        },
      },
      allow: {
        default: null,
        parseHTML: (element) => element.getAttribute("allow"),
        renderHTML: (attributes) => {
          if (attributes.allow) return { allow: attributes.allow };
          return {};
        },
      },
      sandbox: {
        default: null,
        parseHTML: (element) => element.getAttribute("sandbox"),
        renderHTML: (attributes) => {
          if (attributes.sandbox) return { sandbox: attributes.sandbox };
          return {};
        },
      },
      scrolling: {
        default: null,
        parseHTML: (element) => element.getAttribute("scrolling"),
        renderHTML: (attributes) => {
          if (attributes.scrolling) return { scrolling: attributes.scrolling };
          return {};
        },
      },
      referrerpolicy: {
        default: null,
        parseHTML: (element) => element.getAttribute("referrerpolicy"),
        renderHTML: (attributes) => {
          if (attributes.referrerpolicy) return { referrerpolicy: attributes.referrerpolicy };
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "iframe" }];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs: Record<string, any> = {};
    Object.entries(HTMLAttributes).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        attrs[key] = value;
      }
    });
    return ["iframe", attrs];
  },

  addCommands() {
    return {
      insertIframe:
        (attrs: Partial<IframeAttributes>) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: attrs.src,
              width: attrs.width || "100%",
              height: attrs.height || "400",
              allowFullscreen: attrs.allowFullscreen !== undefined ? attrs.allowFullscreen : true,
              title: attrs.title || "",
              loading: attrs.loading || "lazy",
              frameborder: attrs.frameborder || "0",
              border: attrs.border || null,
              marginwidth: attrs.marginwidth || null,
              marginheight: attrs.marginheight || null,
              allow: attrs.allow || null,
              sandbox: attrs.sandbox || null,
              scrolling: attrs.scrolling || null,
              referrerpolicy: attrs.referrerpolicy || null,
            },
          });
        },
    };
  },

  addNodeView() {
    return ({ node }) => {
      const wrapper = document.createElement("div");
      wrapper.className = "iframe-wrapper relative my-4";

      const iframe = document.createElement("iframe");
      const attrs = node.attrs;

      // 复制所有属性到 iframe
      Object.entries(attrs).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          if (key === "allowFullscreen") {
            if (value) iframe.setAttribute("allowfullscreen", "true");
          } else if (key === "src") {
            iframe.setAttribute("src", String(value));
          } else {
            iframe.setAttribute(key, String(value));
          }
        }
      });

      // 应用样式，但尊重用户设置的宽高
      if (attrs.width) {
        iframe.style.width = String(attrs.width).includes("%")
          ? String(attrs.width)
          : String(attrs.width) + "px";
      }
      if (attrs.height) {
        iframe.style.height = String(attrs.height).includes("%")
          ? String(attrs.height)
          : String(attrs.height) + "px";
      }

      iframe.className = "rounded-lg border border-border";

      wrapper.appendChild(iframe);
      return { dom: wrapper };
    };
  },
});