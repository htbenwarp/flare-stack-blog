import { ClientOnly } from "@tanstack/react-router";
import { FolderInput, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { m } from "@/paraglide/messages";
import type { MediaFolder } from "../types";
import { FolderDropdown } from "./folder-dropdown";

interface MoveModalProps {
  isOpen: boolean;
  /** Number of files that will actually be moved. */
  fileCount: number;
  /** Folder entries in the selection; they cannot be moved and are skipped. */
  skippedFolderCount: number;
  folders: Array<MediaFolder>;
  /** Folder currently open; moving into it again is a no-op. */
  currentFolder: string;
  onCreateFolder?: (
    name: string,
    parent: string,
  ) => Promise<string | undefined>;
  isCreatingFolder?: boolean;
  startFolder?: string;
  loadFolders?: (folder: string) => Promise<Array<MediaFolder>>;
  onSubmit: (targetFolder: string) => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
}

function MoveModalInternal({
  isOpen,
  fileCount,
  skippedFolderCount,
  folders,
  currentFolder,
  onCreateFolder,
  isCreatingFolder,
  startFolder,
  loadFolders,
  onSubmit,
  onClose,
  isSubmitting = false,
}: MoveModalProps) {
  const [targetFolder, setTargetFolder] = useState("");

  useEffect(() => {
    if (isOpen) setTargetFolder("");
  }, [isOpen]);

  const noOp =
    targetFolder.replace(/\/+$/, "") === currentFolder.replace(/\/+$/, "");
  const canSubmit = fileCount > 0 && !noOp && !isSubmitting;

  const submit = async () => {
    if (!canSubmit) return;
    await onSubmit(targetFolder);
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
      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" onClick={onClose} />

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
              [ {m.media_toolbar_move()} ]
            </p>
            <h2 className="text-2xl font-serif font-medium text-foreground">
              {m.media_move_modal_title()}
            </h2>
            <p className="text-xs font-mono text-muted-foreground/60">
              {m.media_move_modal_desc()}
              {fileCount > 0 ? ` · ${fileCount}` : ""}
            </p>
            {skippedFolderCount > 0 && (
              <p className="text-xs font-mono text-muted-foreground/40">
                {m.media_move_modal_skip_folders()}
              </p>
            )}
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
        <div className="px-6 py-4 space-y-4">
          <FolderDropdown
            value={targetFolder}
            folders={folders}
            labelPrefix={m.media_upload_target_folder()}
            onChange={setTargetFolder}
            onCreateFolder={onCreateFolder}
            isCreatingFolder={isCreatingFolder}
            startFolder={startFolder}
            loadFolders={loadFolders}
          />
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
            {isSubmitting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <FolderInput size={12} />
            )}
            <span>{m.media_move_btn()}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function MoveModal(props: MoveModalProps) {
  return (
    <ClientOnly>
      <MoveModalInternal {...props} />
    </ClientOnly>
  );
}
