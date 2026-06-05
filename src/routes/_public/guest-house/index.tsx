import { createFileRoute } from "@tanstack/react-router";
import { GuestHousePage } from "@/features/theme/themes/fuwari/pages/guest-house/index";

export const Route = createFileRoute("/_public/guest-house/")({
  component: GuestHousePage,
});