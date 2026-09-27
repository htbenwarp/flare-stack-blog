// 从 DB schema 推断类型，避免重复定义
export type { Media as MediaAsset } from "@/features/media/data/media.data";

export interface UploadItem {
  id: string;
  name: string;
  size: string;
  progress: number;
  status: "WAITING" | "UPLOADING" | "COMPLETE" | "ERROR";
  log: string;
  file?: File;
  /** Target R2 key prefix ("virtual folder") this item uploads into. */
  folder?: string;
}

/** A virtual folder: an R2 key prefix, e.g. `key: "moments/"`, `name: "moments"`. */
export interface MediaFolder {
  key: string;
  name: string;
}

/**
 * A file as returned by the directory listing. Superset of the fields the
 * existing cards/modals read, so it is directly usable as a `MediaAsset`.
 */
export interface MediaDirectoryFile {
  key: string;
  fileName: string;
  url: string;
  mimeType: string;
  sizeInBytes: number;
  width: number | null;
  height: number | null;
  createdAt: Date | null;
  isLinked: boolean;
}
