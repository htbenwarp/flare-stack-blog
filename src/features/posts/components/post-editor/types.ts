import type { JSONContent } from "@tiptap/react";
import type { PostStatus } from "@/lib/db/schema";

/** Resolved cover shown in the editor; `coverMediaId` is what gets saved. */
export interface PostEditorCover {
  id: number;
  key: string;
  url: string;
  fileName: string;
  width: number | null;
  height: number | null;
}

export interface PostEditorData {
  title: string;
  summary: string;
  slug: string;
  status: PostStatus;
  readTimeInMinutes: number;
  contentJson: JSONContent | null;
  publishedAt: Date | null;
  pinnedAt: Date | null;
  tagIds: Array<number>;
  isSynced: boolean;
  hasPublicCache: boolean;
  isEncrypted: boolean;
  password: string;
  isGuestPost: boolean;
  guestAuthorId: number | null;
  coverMediaId: number | null;
  cover: PostEditorCover | null;
}

export interface PostEditorProps {
  initialData: PostEditorData & { id: number };
  onSave: (data: PostEditorData) => Promise<void>;
}

export type SaveStatus = "SYNCED" | "SAVING" | "PENDING" | "ERROR";

export const defaultPostData: PostEditorData = {
  title: "",
  summary: "",
  slug: "",
  status: "draft",
  readTimeInMinutes: 1,
  contentJson: null,
  publishedAt: null,
  pinnedAt: null,
  tagIds: [],
  isSynced: true,
  hasPublicCache: false,
  isEncrypted: boolean,
  password: string,
  isGuestPost: false,
  guestAuthorId: null,
  coverMediaId: null,
  cover: null,
};
