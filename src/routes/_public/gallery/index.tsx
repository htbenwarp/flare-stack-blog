import { createFileRoute } from "@tanstack/react-router";
import { GalleryPage } from "@/features/theme/themes/fuwari/pages/gallery/index";

export const Route = createFileRoute("/_public/gallery/")({
  component: GalleryPage,
});