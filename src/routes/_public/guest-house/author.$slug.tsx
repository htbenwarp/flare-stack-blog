import { createFileRoute } from "@tanstack/react-router";
import { GuestAuthorPage } from "@/features/theme/themes/fuwari/pages/guest-house/author";
import { GuestHousePageSkeleton } from "@/features/theme/themes/fuwari/pages/guest-house/skeleton";

export const Route = createFileRoute("/_public/guest-house/author/$slug")({
  component: GuestAuthorPage,
  pendingComponent: GuestHousePageSkeleton,
  pendingMs: 0,
  loader: async ({ params, context }) => {
    const { guestAuthorBySlugQueryOptions, guestPostsInfiniteQueryOptions } = await import(
      "@/features/guest-authors/queries/public"
    );
    const { slug } = params;
    await context.queryClient.ensureQueryData(guestAuthorBySlugQueryOptions(slug));
    await context.queryClient.ensureInfiniteQueryData(
      guestPostsInfiniteQueryOptions({ authorSlug: slug, tagName: undefined, limit: 12 })
    );
  },
});