import type { JSONContent } from "@tiptap/react";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import React from "react";
import { MathFormula } from "@/components/content/math-formula";
import { extensions } from "@/features/posts/editor/config";
import { CodeBlock } from "@/features/theme/themes/fuwari/components/content/code-block";
import { ImageDisplay } from "@/features/theme/themes/fuwari/components/content/image-display";
import { GithubCard } from "@/features/theme/themes/fuwari/components/content/github-card";

// 递归收集所有脚注节点
function collectFootnotes(
  content: JSONContent,
): Array<{ id: string; index: number; text: string; note: string }> {
  const footnotes: Array<{
    id: string;
    index: number;
    text: string;
    note: string;
  }> = [];
  let counter = 0;

  function walk(node: JSONContent | undefined | null) {
    if (!node) return;
    if (node.type === "footnoteTip") {
      counter++;
      const id = `fn-${counter}`;
      footnotes.push({
        id,
        index: counter,
        text: node.attrs?.text || "",
        note: node.attrs?.note || "",
      });
    }
    if (node.content) {
      node.content.forEach(walk);
    }
    if (node.marks) {
      node.marks.forEach(walk);
    }
    if (node.text && node.marks) {
      node.marks.forEach(walk);
    }
  }

  walk(content);
  return footnotes;
}

function findFootnoteIndex(
  footnotes: Array<{ id: string; index: number; text: string; note: string }>,
  text: string,
  note: string,
): number | undefined {
  const match = footnotes.find((fn) => fn.text === text && fn.note === note);
  return match?.index;
}

export function renderReact(content: JSONContent) {
  const footnotes = collectFootnotes(content);

  const element = renderToReactElement({
    extensions,
    content,
    options: {
      markMapping: {
        emphasisCjk: ({ children }) => {
          return <span className="emphasis-cjk">{children}</span>;
        },
      },
      nodeMapping: {
        image: ({ node }) => {
          const attrs = node.attrs as {
            src: string;
            alt?: string | null;
            width?: number | string;
            height?: number | string;
          };
          const alt =
            attrs.alt && attrs.alt !== "null" ? attrs.alt : "";
          const width =
            typeof attrs.width === "string" ? parseInt(attrs.width) : attrs.width;
          const height =
            typeof attrs.height === "string" ? parseInt(attrs.height) : attrs.height;
          return (
            <ImageDisplay
              src={attrs.src}
              alt={alt}
              width={width || undefined}
              height={height || undefined}
            />
          );
        },
        codeBlock: ({ node }) => {
          const code = node.textContent || "";
          const attrs = node.attrs as {
            language?: string | null;
            highlightedHtml?: string;
          };
          return (
            <CodeBlock
              code={code}
              language={attrs.language || null}
              highlightedHtml={attrs.highlightedHtml}
            />
          );
        },
        tableCell: ({ node, children }) => {
          const attrs = node.attrs as {
            colspan?: number;
            rowspan?: number;
            colwidth?: Array<number>;
            style?: string;
          };
          return (
            <td
              colSpan={attrs.colspan}
              rowSpan={attrs.rowspan}
              style={attrs.style ? { width: attrs.style } : undefined}
            >
              {children}
            </td>
          );
        },
        tableHeader: ({ node, children }) => {
          const attrs = node.attrs as {
            colspan?: number;
            rowspan?: number;
            colwidth?: Array<number>;
            style?: string;
          };
          return (
            <th
              colSpan={attrs.colspan}
              rowSpan={attrs.rowspan}
              style={attrs.style ? { width: attrs.style } : undefined}
            >
              {children}
            </th>
          );
        },
        inlineMath: ({ node }) => {
          const latex = (node.attrs as { latex?: string }).latex ?? "";
          return <MathFormula latex={latex} mode="inline" />;
        },
        blockMath: ({ node }) => {
          const latex = (node.attrs as { latex?: string }).latex ?? "";
          return <MathFormula latex={latex} mode="block" />;
        },
        footnoteTip: ({ node }) => {
          const attrs = node.attrs as { text?: string; note?: string };
          const text = attrs.text || "";
          const note = attrs.note || "";
          const index = findFootnoteIndex(footnotes, text, note) ?? 0;
          const refId = `fn-${index}`;
          return (
            <span className="fn-tip-wrap">
              {text}
              <sup id={`fnref-${index}`} className="footnote-sup">
                <a href={`#${refId}`} className="footnote-ref no-styling">
                  [{index}]
                </a>
                <span className="fn-tip">{note}</span>
              </sup>
            </span>
          );
        },
        detailsBlock: ({ node, children }) => {
          const attrs = node.attrs as { summary?: string };
          return (
            <details className="details-block">
              <summary className="details-summary">{attrs.summary || ""}</summary>
              <div className="details-body">{children}</div>
            </details>
          );
        },
        githubCard: ({ node }) => {
          const attrs = node.attrs as { repoUrl?: string };
          const match = attrs.repoUrl?.match(/github\.com\/([^\/]+)\/([^\/]+)/);
          const repo = match ? `${match[1]}/${match[2]}` : "";
          return <GithubCard repo={repo} />;
        },
        iframe: ({ node }) => {
          const attrs = node.attrs as {
            src: string;
            width?: string | number;
            height?: string | number;
            allowFullscreen?: boolean;
            title?: string;
            loading?: string;
            frameborder?: string | number;
            border?: string | number;
            marginwidth?: string | number;
            marginheight?: string | number;
            scrolling?: string;
            allow?: string;
            sandbox?: string;
            referrerpolicy?: string;
          };

          const iframeProps: any = {
            src: attrs.src,
            title: attrs.title || "",
            loading: attrs.loading || "lazy",
            className: "rounded-lg border border-border",
            style: {
              border: "none",
            },
          };

          // 保留用户设置的宽高
          if (attrs.width) {
            iframeProps.width = attrs.width;
            iframeProps.style.width = String(attrs.width).includes("%")
              ? String(attrs.width)
              : String(attrs.width) + "px";
          }
          if (attrs.height) {
            iframeProps.height = attrs.height;
            iframeProps.style.height = String(attrs.height).includes("%")
              ? String(attrs.height)
              : String(attrs.height) + "px";
          }

          // 其他属性
          if (attrs.frameborder !== undefined && attrs.frameborder !== null) {
            iframeProps.frameborder = String(attrs.frameborder);
          }
          if (attrs.border !== undefined && attrs.border !== null) {
            iframeProps.border = String(attrs.border);
          }
          if (attrs.marginwidth !== undefined && attrs.marginwidth !== null) {
            iframeProps.marginwidth = String(attrs.marginwidth);
          }
          if (attrs.marginheight !== undefined && attrs.marginheight !== null) {
            iframeProps.marginheight = String(attrs.marginheight);
          }
          if (attrs.scrolling) iframeProps.scrolling = attrs.scrolling;
          if (attrs.allow) iframeProps.allow = attrs.allow;
          if (attrs.sandbox) iframeProps.sandbox = attrs.sandbox;
          if (attrs.referrerpolicy) iframeProps.referrerpolicy = attrs.referrerpolicy;
          if (attrs.allowFullscreen) iframeProps.allowFullscreen = true;

          return <iframe {...iframeProps} />;
        },
      },
    },
  });

  if (footnotes.length > 0) {
    const footnotesList = (
      <div className="footnotes" key="footnotes-block">
        <hr className="footnotes-sep" />
        <ol className="footnotes-list">
          {footnotes.map((fn) => (
            <li key={fn.id} id={fn.id} className="footnote-item">
              <span className="footnote-text">{fn.note}</span>
              <a href={`#fnref-${fn.index}`} className="footnote-backref">
                ↩
              </a>
            </li>
          ))}
        </ol>
      </div>
    );
    return React.createElement(React.Fragment, null, element, footnotesList);
  }

  return element;
}