import { createFileRoute } from "@tanstack/react-router";
import { GuestbookPage } from "@/features/theme/themes/fuwari/pages/guestbook/index";
import { GuestbookPageSkeleton } from "@/features/theme/themes/fuwari/pages/guestbook/skeleton";

export const Route = createFileRoute("/_public/guestbook/")({
  component: GuestbookPage,
  pendingComponent: GuestbookPageSkeleton,
  pendingMs: 200,
});