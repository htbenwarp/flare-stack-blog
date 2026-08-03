// src/features/theme/themes/fuwari/components/moments/image-block.tsx
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";

export function MomentImageBlock({ node, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper className="my-2 relative">
      <div
        className={`relative overflow-hidden rounded-lg border-2 ${
          selected ? "border-blue-500" : "border-transparent"
        }`}
      >
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || ""}
          className="w-full h-auto max-h-96 object-contain"
        />
      </div>
    </NodeViewWrapper>
  );
}