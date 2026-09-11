import type { Media } from "@/features/media/data/media.data";
import { findMediaByIds } from "@/features/media/data/media.data";
import type {
  AdminPostCover,
  PublicPostCover,
} from "@/features/posts/schema/posts.schema";

/**
 * Post covers are stored as `posts.cover_media_id` and resolved into these
 * shapes at read time, the same way the post's other metadata is read live
 * (only the body content uses the published snapshot).
 */
export function toPublicCover(
  media: Pick<Media, "key" | "url" | "width" | "height"> | null | undefined,
): PublicPostCover | null {
  if (!media) return null;
  return {
    key: media.key,
    url: media.url,
    width: media.width ?? null,
    height: media.height ?? null,
  };
}

export function toAdminCover(media: Media): AdminPostCover {
  return {
    id: media.id,
    key: media.key,
    url: media.url,
    fileName: media.fileName,
    width: media.width ?? null,
    height: media.height ?? null,
  };
}

/**
 * Attaches `cover` to every row carrying a `coverMediaId`, using a single
 * media lookup per batch. Rows without a cover, or whose media disappeared,
 * get `cover: null`.
 */
export async function attachPublicCovers<
  T extends { coverMediaId?: number | null },
>(db: DB, items: Array<T>): Promise<Array<T & { cover: PublicPostCover | null }>> {
  const coverIds = [
    ...new Set(
      items
        .map((item) => item.coverMediaId)
        .filter((id): id is number => typeof id === "number"),
    ),
  ];

  const mediaById = new Map<number, Media>();
  if (coverIds.length > 0) {
    for (const media of await findMediaByIds(db, coverIds)) {
      mediaById.set(media.id, media);
    }
  }

  return items.map((item) => ({
    ...item,
    cover: toPublicCover(
      item.coverMediaId != null ? mediaById.get(item.coverMediaId) : null,
    ),
  }));
}
