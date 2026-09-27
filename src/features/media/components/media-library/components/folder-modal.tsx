import { ClientOnly } from "@tanstack/react-router";
import { Folder as FolderIcon, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { m } from "@/paraglide/messages";

interface FolderModalProps {
  isOpen: boolean;
  mode: "create" | "rename";
  initialName?: string;
  /** Folder the action applies to, shown read-only for context. */
  parentLabel?: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
  isSubmitting?: boolean;
}

function FolderModalInternal({
  isOpen,
  mode,
  initialName = "",
  parentLabel,
  onClose,
  onSubmit,
  isSubmitting = false,
}: FolderModalProps) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) setName(initialName);
  }, [isOpen, initialName]);

  useEffect(() => {
    if (!isOpen) return;
    // Focus once the portal has actually rendered the input.
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const clean = name.replace(/^\/+|\/+$/g, "").trim();
  const hasSlash = clean.includes("/");
  const canSubmit = clean.length > 0 && !hasSlash && !isSubmitting;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(clean);
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center p-4 md:p-6 transition-all duration-300 ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/90 backdrop-blur-sm"
        onClick={isSubmitting ? undefined : onClose}
      />

      {/* Modal Content */}
      <div
        className={`
          relative w-full max-w-md bg-background border border-border/30
          flex flex-col transform transition-all duration-300
          ${isOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
        `}
      >
        {/* Header */}
        <div className="px-6 pt-8 pb-4 flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">
              [ {m.media_folder_new()} ]
            </p>
            <h2 className="text-2xl font-serif font-medium text-foreground">
              {mode === "create"
                ? m.media_folder_create_title()
                : m.media_folder_rename_title()}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 -mr-2 text-muted-foreground/50 hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-2 space-y-4">
          {parentLabel && (
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <FolderIcon size={12} strokeWidth={1.5} />
              <span className="truncate">{parentLabel}</span>
            </div>
          )}

          <Input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
              if (event.key === "Escape") onClose();
            }}
            placeholder={m.media_folder_create_placeholder()}
            className="h-10 bg-transparent border-border/30 hover:border-foreground/50 focus:border-foreground transition-all rounded-none font-sans text-sm shadow-none focus-visible:ring-0"
          />

          {hasSlash && (
            <p className="text-xs font-mono text-destructive">
              {m.media_folder_invalid_name()}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-xs font-mono uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors disabled:opacity-50"
          >
            {m.common_cancel()}
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-mono uppercase tracking-widest bg-foreground text-background hover:opacity-80 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 size={12} className="animate-spin" />}
            <span>
              {mode === "create"
                ? m.media_folder_create_btn()
                : m.media_folder_rename()}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function FolderModal(props: FolderModalProps) {
  return (
    <ClientOnly>
      <FolderModalInternal {...props} />
    </ClientOnly>
  );
}
