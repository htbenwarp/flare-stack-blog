import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import theme from "@theme";
import { z } from "zod";
import { siteDomainQuery } from "@/features/config/queries";
import {
  pinnedPostsQuery,
  popularPostsQuery,
  publicPostsPageQuery,
} from "@/features/posts/queries";
import { buildCanonicalUrl, canonicalLink } from "@/lib/seo";

const { postsPerPage } = theme.config.posts;
const { popularPostsLimit } = theme.config.home;

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/_public/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ context, deps }) => {
    const currentPage = Number(deps.page) || 1;
    const offset = (currentPage - 1) * postsPerPage;

    const popularPosts = await context.queryClient.ensureQueryData(
      popularPostsQuery(popularPostsLimit),
    );
    const excludeIds = popularPosts.map((p) => p.id);

    const [, domain] = await Promise.all([
      context.queryClient.ensureQueryData(
        publicPostsPageQuery({ offset, limit: postsPerPage, excludeIds }),
      ),
      context.queryClient.ensureQueryData(siteDomainQuery),
      context.queryClient.ensureQueryData(pinnedPostsQuery),
      context.queryClient.ensureQueryData(popularPostsQuery(popularPostsLimit)),
    ]);

    return {
      canonicalHref: buildCanonicalUrl(domain, "/"),
      popularExcludeIds: excludeIds,
    };
  },
  head: ({ loaderData }) => ({
    links: [canonicalLink(loaderData?.canonicalHref ?? "/")],
  }),
  pendingComponent: HomePageSkeleton,
  component: HomeRoute,
});

function HomeRoute() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { page } = Route.useSearch();
  const currentPage = Number(page) || 1;
  const offset = (currentPage - 1) * postsPerPage;
  const { popularExcludeIds } = Route.useLoaderData();

  const { data: pageData } = useSuspenseQuery(
    publicPostsPageQuery({
      offset,
      limit: postsPerPage,
      excludeIds: popularExcludeIds,
    }),
  );
  const { data: pinnedPosts } = useSuspenseQuery(pinnedPostsQuery);
  const { data: popularPosts } = useSuspenseQuery(
    popularPostsQuery(popularPostsLimit),
  );

  const handlePageChange = (nextPage: number) => {
    navigate({
      search: { page: nextPage > 1 ? nextPage : undefined },
    });
  };

  return (
    <theme.HomePage
      posts={pageData.items}
      pinnedPosts={currentPage === 1 ? pinnedPosts : []}
      popularPosts={currentPage === 1 ? popularPosts : []}
      page={currentPage}
      pageSize={postsPerPage}
      total={pageData.total}
      hasPrevPage={pageData.hasPrevPage}
      hasNextPage={pageData.hasNextPage}
      onPageChange={handlePageChange}
    />
  );
}

function HomePageSkeleton() {
  return <theme.HomePageSkeleton />;
}