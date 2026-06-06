import { and, eq, count } from "drizzle-orm";
import type { DB } from "@/lib/db";
import { GuestAuthorsTable, PostsTable } from "@/lib/db/schema";

type BaseContext = { db: DB };

export async function listGuestAuthors(context: BaseContext) {
  const result = await context.db
    .select({
      id: GuestAuthorsTable.id,
      name: GuestAuthorsTable.name,
      slug: GuestAuthorsTable.slug,
      bio: GuestAuthorsTable.bio,
      avatar: GuestAuthorsTable.avatar,
      createdAt: GuestAuthorsTable.createdAt,
      updatedAt: GuestAuthorsTable.updatedAt,
      postCount: count(PostsTable.id).as("postCount"),
    })
    .from(GuestAuthorsTable)
    .leftJoin(
      PostsTable,
      and(
        eq(PostsTable.guestAuthorId, GuestAuthorsTable.id),
        eq(PostsTable.status, "published"),
        eq(PostsTable.isGuestPost, true)
      )
    )
    .groupBy(GuestAuthorsTable.id)
    .all();

  return result.map(({ postCount, ...rest }) => ({
    ...rest,
    postCount: Number(postCount),
  }));
}

export async function createGuestAuthor(
  context: BaseContext,
  input: { name: string; slug: string; bio?: string; avatar?: string }
) {
  try {
    const [author] = await context.db
      .insert(GuestAuthorsTable)
      .values({
        name: input.name,
        slug: input.slug,
        bio: input.bio ?? null,
        avatar: input.avatar ?? null,
      })
      .returning();
    return ok(author);
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      return err({ reason: "SLUG_ALREADY_EXISTS" });
    }
    throw error;
  }
}

export async function updateGuestAuthor(
  context: BaseContext,
  input: { id: number; name?: string; slug?: string; bio?: string; avatar?: string }
) {
  const { id, ...data } = input;
  await context.db
    .update(GuestAuthorsTable)
    .set(data)
    .where(eq(GuestAuthorsTable.id, id));
  const [author] = await context.db
    .select()
    .from(GuestAuthorsTable)
    .where(eq(GuestAuthorsTable.id, id));
  if (!author) return err({ reason: "AUTHOR_NOT_FOUND" });
  return ok(author);
}

export async function deleteGuestAuthor(context: BaseContext, id: number) {
  await context.db.delete(GuestAuthorsTable).where(eq(GuestAuthorsTable.id, id));
  return ok({ success: true });
}