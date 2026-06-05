import { createFileRoute } from "@tanstack/react-router";
import { GuestAuthorPage } from "@/features/theme/themes/fuwari/pages/guest-house/author";

export const Route = createFileRoute("/_public/guest-house/author/$slug")({
  component: GuestAuthorPage,
});