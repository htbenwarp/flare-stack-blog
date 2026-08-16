import type { ThemeConfig } from "@/features/theme/contract/config";

export const config: ThemeConfig = {
  home: {
    recentPostsLimit: 5,
    popularPostsLimit: 3,
  },
  posts: {
    postsPerPage: 5,
  },
  post: {
    relatedPostsLimit: 4,
  },
};
