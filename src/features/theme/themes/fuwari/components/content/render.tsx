import type { JSONContent } from "@tiptap/react";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { MathFormula } from "@/components/content/math-formula";
import { extensions } from "@/features/posts/editor/config";
import { CodeBlock } from "@/features/theme/themes/fuwari/components/content/code-block";
import { ImageDisplay } from "@/features/theme/themes/fuwari/components/content/image-display";
import { GithubCard } from "@/features/theme/themes/fuwari/components/content/github-card";

export function renderReact(content: JSONContent) {
  return renderToReactElement({
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
            (attrs.alt && attrs.alt !== "null" ? attrs.alt : null) ||
            "blog image";
          const width =
            typeof attrs.width === "string"
              ? parseInt(attrs.width)
              : attrs.width;
          const height =
            typeof attrs.height === "string"
              ? parseInt(attrs.height)
              : attrs.height;
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
          return (
            <span className="fn-tip-wrap">
              {attrs.text}
              <span className="fn-tip">{attrs.note}</span>
            </span>
          );
        },
        detailsBlock: ({ node, children }) => {
          const attrs = node.attrs as { summary?: string };
          return (
            <details className="details-block">
              <summary className="details-summary">
                {attrs.summary || ""}
              </summary>
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
      },
    },
  });
}