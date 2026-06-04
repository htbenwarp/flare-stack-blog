import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState, useCallback } from "react";

export function DetailsBlockView(props: NodeViewProps) {
  const [summary, setSummary] = useState(props.node.attrs.summary || "折叠标题");

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newSummary = e.target.value;
      setSummary(newSummary);
      props.updateAttributes({ summary: newSummary });
    },
    [props],
  );

  return (
    <NodeViewWrapper className="details-block">
      <div className="details-summary-wrapper">
        <input
          className="details-summary-input"
          value={summary}
          onChange={handleChange}
          placeholder="折叠块标题"
        />
      </div>
      <div className="details-body">
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
}