import {
  ChevronRight,
  Folder as FolderIcon,
  FolderUp,
  Plus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { getParentFolder } from "@/features/media/utils/media.utils";
import { formatBytes } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  FolderModal,
  MediaGrid,
  MediaPreviewModal,
  MediaToolbar,
  MoveModal,
  UploadModal,
} from "./components";
import { useMediaLibrary, useMediaUpload } from "./hooks";
import type { MediaDirectoryFile } from "./types";

export function MediaLibrary() {
  // Logic Hooks
  const {
    mediaItems,
    files,
    folders,
    folder: currentFolder,
    setFolder,
    searchQuery,
    setSearchQuery,
    unusedOnly,
    setUnusedOnly,
    selectedIds,
    toggleSelection,
    selectAll,
    deleteTarget,
    deleteTargetHasFolders,
    isDeleting,
    requestDelete,
    confirmDelete,
    cancelDelete,
    loadMore,
    hasMore,
    isLoadingMore,
    isPending,
    refetch,
    totalMediaSize,
    updateAsset,
    linkedMediaIds,
    loadFolders,
    createFolder,
    createFolderInline,
    renameFolderByKey,
    renameFolder,
    moveFiles,
  } = useMediaLibrary();

  // View State
  const [previewAsset, setPreviewAsset] = useState<MediaDirectoryFile | null>(
    null,
  );
  // Upload target folder defaults to the folder currently being browsed.
  const [uploadFolder, setUploadFolder] = useState(currentFolder);
  const [folderModal, setFolderModal] = useState<{
    mode: "create" | "rename";
    key?: string;
    name?: string;
  } | null>(null);
  const [isMoveOpen, setIsMoveOpen] = useState(false);

  const {
    isOpen: isUploadOpen,
    setIsOpen: setIsUploadOpen,
    queue: uploadQueue,
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    processFiles,
    reset: resetUpload,
  } = useMediaUpload({ folder: uploadFolder });

  useEffect(() => {
    if (isUploadOpen) setUploadFolder(currentFolder);
  }, [isUploadOpen, currentFolder]);

  const breadcrumbParts = currentFolder
    ? currentFolder.split("/").filter(Boolean)
    : [];

  const selectedFileKeys = useMemo(
    () => [...selectedIds].filter((key) => !key.endsWith("/")),
    [selectedIds],
  );
  const selectedFolderKeys = useMemo(
    () => [...selectedIds].filter((key) => key.endsWith("/")),
    [selectedIds],
  );
  const canRenameFolder = selectedFolderKeys.length === 1;

  const handleDeleteRequest = () => {
    requestDelete(Array.from(selectedIds));
  };

  const handleOpenRenameFolder = () => {
    const key = selectedFolderKeys[0];
    if (!key) return;
    const name =
      folders.find((folder) => folder.key === key)?.name ??
      key.replace(/\/+$/, "").split("/").pop() ??
      "";
    setFolderModal({ mode: "rename", key, name });
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex justify-between items-end animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both border-b border-border/30 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-medium tracking-tight">
            {m.media_title()}
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              {m.media_stats_assets({
                count: mediaItems.length,
                size: formatBytes(totalMediaSize ?? 0),
              })}
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsUploadOpen(true)}
          className="h-10 px-6 text-[11px] uppercase tracking-[0.2em] font-medium rounded-none gap-2 bg-foreground text-background hover:bg-foreground/90 transition-all border border-foreground"
        >
          <Plus size={14} />
          {m.media_upload_btn()}
        </Button>
      </div>

      <div className="animate-in fade-in duration-1000 delay-100 fill-mode-both space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center flex-wrap gap-2 text-[11px] font-mono uppercase tracking-widest">
          {currentFolder && (
            <button
              onClick={() => setFolder(getParentFolder(currentFolder))}
              className="flex items-center gap-1 mr-2 px-2 py-1 border border-border/30 text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-all"
            >
              <FolderUp size={12} strokeWidth={1.5} />
              {m.media_folder_up()}
            </button>
          )}

          <button
            onClick={() => setFolder("")}
            className={`flex items-center gap-1 transition-colors ${
              currentFolder
                ? "text-muted-foreground hover:text-foreground"
                : "text-foreground"
            }`}
          >
            <FolderIcon size={12} strokeWidth={1.5} />
            {m.media_folder_root()}
          </button>

          {breadcrumbParts.map((part, index) => {
            const prefix = breadcrumbParts.slice(0, index + 1).join("/");
            const isLast = index === breadcrumbParts.length - 1;
            return (
              <span key={prefix} className="flex items-center gap-2">
                <ChevronRight size={12} className="opacity-40" />
                <button
                  onClick={() => setFolder(prefix)}
                  className={`transition-colors ${
                    isLast
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {part}
                </button>
              </span>
            );
          })}
        </div>

        {/* Toolbar */}
        <MediaToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          unusedOnly={unusedOnly}
          onUnusedOnlyChange={setUnusedOnly}
          selectedCount={selectedIds.size}
          totalCount={folders.length + files.length}
          onSelectAll={selectAll}
          onDelete={handleDeleteRequest}
          onNewFolder={() => setFolderModal({ mode: "create" })}
          onMove={() => setIsMoveOpen(true)}
          canMoveFiles={selectedFileKeys.length > 0}
          onRenameFolder={handleOpenRenameFolder}
          canRenameFolder={canRenameFolder}
        />

        {/* Media Grid / Partial Skeleton */}
        {isPending ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col space-y-4 animate-pulse">
                <div className="aspect-square bg-muted rounded-none" />
                <div className="space-y-2 px-1">
                  <div className="h-3 w-3/4 bg-muted rounded-none" />
                  <div className="flex justify-between">
                    <div className="h-2 w-1/4 bg-muted rounded-none opacity-50" />
                    <div className="h-2 w-1/4 bg-muted rounded-none opacity-50" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <MediaGrid
            media={mediaItems}
            folders={folders}
            onOpenFolder={setFolder}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelection}
            onPreview={setPreviewAsset}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            linkedMediaIds={linkedMediaIds}
            onRefetch={refetch}
          />
        )}
      </div>

      {/* --- Upload Modal --- */}
      <UploadModal
        isOpen={isUploadOpen}
        queue={uploadQueue}
        isDragging={isDragging}
        onClose={resetUpload}
        onFileSelect={processFiles}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        folder={uploadFolder}
        folders={folders}
        onFolderChange={setUploadFolder}
        onCreateFolder={createFolderInline}
        isCreatingFolder={createFolder.isPending}
        loadFolders={loadFolders}
        isUploading={uploadQueue.some(
          (item) => item.status === "WAITING" || item.status === "UPLOADING",
        )}
      />

      {/* --- Create / Rename Folder Modal --- */}
      <FolderModal
        isOpen={!!folderModal}
        mode={folderModal?.mode ?? "create"}
        initialName={folderModal?.name ?? ""}
        parentLabel={
          folderModal?.mode === "rename"
            ? folderModal.key
            : currentFolder
              ? `/${currentFolder}`
              : "/"
        }
        onClose={() => setFolderModal(null)}
        onSubmit={(name) => {
          if (!folderModal) return;
          if (folderModal.mode === "create") {
            createFolder.mutate({ name, parent: currentFolder });
          } else if (folderModal.key) {
            renameFolderByKey(folderModal.key, name);
          }
          setFolderModal(null);
        }}
        isSubmitting={createFolder.isPending || renameFolder.isPending}
      />

      {/* --- Move Files Modal --- */}
      <MoveModal
        isOpen={isMoveOpen}
        fileCount={selectedFileKeys.length}
        skippedFolderCount={selectedFolderKeys.length}
        folders={folders}
        currentFolder={currentFolder}
        onCreateFolder={createFolderInline}
        isCreatingFolder={createFolder.isPending}
        startFolder={currentFolder}
        loadFolders={loadFolders}
        onSubmit={async (targetFolder) => {
          await moveFiles.mutateAsync({
            keys: selectedFileKeys,
            targetFolder,
          });
          setIsMoveOpen(false);
        }}
        onClose={() => setIsMoveOpen(false)}
        isSubmitting={moveFiles.isPending}
      />

      {/* --- Delete Confirmation Modal --- */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title={m.media_delete_confirm_title()}
        message={
          deleteTargetHasFolders
            ? m.media_folder_delete_confirm()
            : m.media_delete_confirm_desc({
                count: deleteTarget?.length ?? 0,
              })
        }
        confirmLabel={m.media_delete_confirm_btn()}
        isDanger={true}
        isLoading={isDeleting}
      />

      {/* --- Preview Modal --- */}
      <MediaPreviewModal
        asset={previewAsset}
        onClose={() => setPreviewAsset(null)}
        onUpdateName={async (key, name) => {
          await updateAsset.mutateAsync({ data: { key, name } });
        }}
        onDelete={async (key) => {
          const allowed = await requestDelete([key]);
          if (allowed.length > 0) {
            confirmDelete(allowed);
          }
        }}
      />
    </div>
  );
}
