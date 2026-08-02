import { createFileRoute } from "@tanstack/react-router";
import { MomentsPage } from "@/features/theme/themes/fuwari/pages/moments/index";

export const Route = createFileRoute("/_public/moments/")({
  component: MomentsPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      date: search.date as string | undefined,
    };
  },
  pendingMs: 200,
});