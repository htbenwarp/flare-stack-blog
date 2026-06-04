import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { ExternalLink } from "lucide-react";

export function GithubCardView(props: NodeViewProps) {
  const [url, setUrl] = useState(props.node.attrs.repoUrl || "");
  const [editing, setEditing] = useState(false);

  const handleDoubleClick = () => setEditing(true);

  const handleSave = () => {
    props.updateAttributes({ repoUrl: url });
    setEditing(false);
  };

  return (
    <NodeViewWrapper className="card-github" onDoubleClick={handleDoubleClick}>
      {editing ? (
        <div className="flex items-center gap-2 p-2">
          <input
            className="flex-1 border-b border-primary bg-transparent px-1 text-sm"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={handleSave}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="https://github.com/user/repo"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2 text-sm">
          <ExternalLink size={14} className="text-(--fuwari-primary)" />
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--fuwari-primary) underline truncate"
            >
              {url}
            </a>
          ) : (
            <span className="text-muted-foreground">未设置仓库 URL，请双击编辑</span>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
}