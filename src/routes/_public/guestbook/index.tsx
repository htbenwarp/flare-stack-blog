import { createFileRoute } from "@tanstack/react-router";
import { GuestbookPage } from "@/features/theme/themes/fuwari/pages/guestbook/index";

export const Route = createFileRoute("/_public/guestbook/")({
  component: GuestbookPage,
  pendingMs: 200,
});