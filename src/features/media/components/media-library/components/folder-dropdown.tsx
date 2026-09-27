import {
  Check,
  ChevronDown,
  ChevronRight,
  Folder as FolderIcon,
  FolderPlus,
  Home,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { MediaFolder } from "../types";
import { PortalPanel } from "./portal-panel";

interface FolderDropdownProps {
  /** Currently selected folder (relative path, may carry a trailing slash); `""` = root. */
  value: string;
  /** Sub-folders shown when the panel is not in drill-down mode. */
  folders: Array<MediaFolder>;
  onChange: (folder: string) => void;
  /** Inline folder creation; resolves to the new folder key, or a falsy value on failure. */
  onCreateFolder?: (
    name: string,
    parent: string,
  ) => Promise<string | undefined>;
  isCreatingFolder?: boolean;
  disabled?: boolean;
  /** Browses children of this folder first (usually the folder currently open). */
  startFolder?: string;
  /** Loads the children of a folder; supplying it enables drill-down navigation. */
  loadFolders?: (folder: string) => Promise<Array<MediaFolder>>;
  /** Trigger prefix text, e.g. "Upload to" / "Move to". */
  labelPrefix?: string;
}

const stripSlashes = (path: string) => path.replace(/^\/+|\/+$/g, "");

export function FolderDropdown({
  value,
  folders,
  onChange,
  onCreateFolder,
  isCreatingFolder,
  disabled = false,
  startFolder,
  loadFolders,
  labelPrefix,
}: FolderDropdownProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [viewPath, setViewPath] = useState("");
  const [viewFolders, setViewFolders] = useState<Array<MediaFolder>>([]);
  const [loading, setLoading] = useState(false);

  const drilldown = Boolean(loadFolders);
  const valueLabel = value ? `/${stripSlashes(value)}` : "/";
  const shownFolders = drilldown ? viewFolders : folders;

  const openPanel = () => {
    setIsOpen(true);
    setViewPath(startFolder ?? "");
    setViewFolders(folders);
    setCreateOpen(false);
    setCreateName("");
    setLoading(false);
  };

  const navTo = async (path: string) => {
    setViewPath(path);
    if (!loadFolders) return;
    setLoading(true);
    try {
      const result = await loadFolders(path);
      setViewFolders(result ?? []);
    } catch {
      setViewFolders([]);
    } finally {
      setLoading(false);
    }
  };

  const selectCurrent = () => {
    onChange(viewPath === "" ? "" : viewPath);
    setIsOpen(false);
  };

  const submitCreate = async () => {
    const name = stripSlashes(createName).trim();
    if (!name || !onCreateFolder || isCreatingFolder) return;
    if (name.includes("/")) return;

    const key = await onCreateFolder(name, viewPath);
    if (key) {
      onChange(key);
      setCreateOpen(false);
      setCreateName("");
      setIsOpen(false);
    }
  };

  const rowClass = (active: boolean) =>
    cn(
      "flex items-center gap-2 w-full px-3 py-2 text-left transition-all text-xs font-mono",
      active ? "bg-foreground text-background" : "hover:bg-muted/20 text-foreground",
    );

  const breadcrumbParts = stripSlashes(viewPath).split("/").filter(Boolean);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={isOpen ? () => setIsOpen(false) : openPanel}
        className="w-full flex items-center gap-2 transition-colors border border-border/30 bg-muted/5 px-3 py-2 hover:bg-muted/10 disabled:opacity-40"
      >
        <FolderPlus
          size={12}
          strokeWidth={1.5}
          className="shrink-0 text-muted-foreground"
        />
        <span className="truncate flex-1 text-left text-xs font-mono text-muted-foreground">
          {labelPrefix ? `${labelPrefix}: ` : ""}
          {valueLabel}
        </span>
        <ChevronDown
          size={12}
          className={cn(
            "shrink-0 transition-transform text-muted-foreground",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <PortalPanel
          triggerRef={triggerRef}
          onClose={() => setIsOpen(false)}
          minWidth={240}
          className="max-h-64 overflow-y-auto custom-scrollbar border border-border/30 bg-background shadow-md"
        >
          {/* Breadcrumb, only meaningful while drilling down. */}
          {drilldown && (
            <div className="px-3 py-2 mb-1 flex items-center gap-1 text-xs font-mono text-muted-foreground">
              <button
                type="button"
                onClick={() => navTo("")}
                title={m.media_folder_root()}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Home size={11} strokeWidth={1.5} />
                <span className="max-w-16 truncate">{m.media_folder_root()}</span>
              </button>
              {breadcrumbParts.map((part, index) => {
                const prefix = `${breadcrumbParts.slice(0, index + 1).join("/")}/`;
                const active = index === breadcrumbParts.length - 1;
                return (
                  <span
                    key={`${part}-${index}`}
                    className="flex items-center gap-1 min-w-0"
                  >
                    <ChevronRight
                      size={12}
                      className="shrink-0 text-muted-foreground/50"
                    />
                    <button
                      type="button"
                      onClick={() => navTo(prefix)}
                      className={cn(
                        "truncate hover:text-foreground",
                        active && "text-foreground",
                      )}
                    >
                      {part}
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Selecting the folder currently being browsed. */}
          {drilldown && (
            <button
              type="button"
              onClick={selectCurrent}
              className={cn(
                rowClass(
                  value !== "" &&
                    stripSlashes(value) === stripSlashes(viewPath),
                ),
                "border-t border-border/30",
              )}
            >
              <Check size={12} strokeWidth={2} />
              <span className="truncate">{m.media_folder_select_here()}</span>
            </button>
          )}

          {/* Root shortcut when not drilling down. */}
          {!drilldown && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className={rowClass(value === "")}
            >
              <Home size={12} strokeWidth={1.5} />
              <span className="truncate">{m.media_folder_root()}</span>
            </button>
          )}

          {onCreateFolder && !createOpen && (
            <button
              type="button"
              onClick={() => {
                setCreateOpen(true);
                requestAnimationFrame(() => createInputRef.current?.focus());
              }}
              className={cn(
                rowClass(false),
                "border-t border-border/30 mt-1.5 pt-2",
              )}
            >
              <Plus size={12} strokeWidth={1.5} />
              <span>{m.media_folder_new()}</span>
            </button>
          )}

          {shownFolders.map((folder) => (
            <button
              key={folder.key}
              type="button"
              onClick={() => {
                if (drilldown) {
                  navTo(folder.key);
                } else {
                  onChange(folder.key);
                  setIsOpen(false);
                }
              }}
              className={rowClass(
                value !== "" &&
                  stripSlashes(value) === stripSlashes(folder.key),
              )}
            >
              <FolderIcon size={12} strokeWidth={1.5} />
              <span className="truncate">/{folder.name}</span>
            </button>
          ))}

          {drilldown && loading && (
            <div className="px-3 py-2 flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <Loader2 size={12} className="animate-spin" />
              <span>{m.media_folder_loading()}</span>
            </div>
          )}

          {onCreateFolder && createOpen && (
            <div className="flex items-center gap-2 px-2 py-2 border-t border-border/30 mt-1.5">
              <Input
                ref={createInputRef}
                type="text"
                value={createName}
                placeholder={m.media_folder_create_placeholder()}
                onChange={(event) => setCreateName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submitCreate();
                  if (event.key === "Escape") {
                    setCreateOpen(false);
                    setCreateName("");
                  }
                }}
                className="flex-1 h-8 text-xs font-mono rounded-none bg-transparent border-border/30"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => void submitCreate()}
                disabled={isCreatingFolder || !createName.trim()}
                className="h-8 w-8 shrink-0 rounded-none"
                title={m.media_folder_create_btn()}
              >
                {isCreatingFolder ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  setCreateOpen(false);
                  setCreateName("");
                }}
                className="h-8 w-8 shrink-0 rounded-none"
              >
                <X size={14} />
              </Button>
            </div>
          )}

          {shownFolders.length === 0 && !loading && (
            <div className="px-3 py-2 text-xs font-mono text-muted-foreground/60">
              {m.media_folder_empty()}
            </div>
          )}
        </PortalPanel>
      )}
    </>
  );
}
