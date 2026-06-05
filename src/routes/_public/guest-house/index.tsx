import { createFileRoute } from "@tanstack/react-router";
import { GuestHousePage } from "@/features/theme/themes/fuwari/pages/guest-house/index";
import { GuestHousePageSkeleton } from "@/features/theme/themes/fuwari/pages/guest-house/skeleton";

export const Route = createFileRoute("/_public/guest-house/")({
  component: GuestHousePage,
  pendingComponent: GuestHousePageSkeleton,
  pendingMs: 0, // 可调整为主题默认值
  loader: async ({ context }) => {
    // 可选：预取数据加速渲染，但不是必须
    const { guestAuthorsQueryOptions, guestPostsInfiniteQueryOptions } = await import(
      "@/features/guest-authors/queries/public"
    );
    await context.queryClient.ensureQueryData(guestAuthorsQueryOptions());
    await context.queryClient.ensureInfiniteQueryData(
      guestPostsInfiniteQueryOptions({ tagName: undefined, limit: 12 })
    );
  },
});