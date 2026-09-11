import type { ThemeConfig } from "@/features/theme/contract/config";

export const config: ThemeConfig = {
  home: {
    recentPostsLimit: 4,
    popularPostsLimit: 5,
  },
  posts: {
    // 首页每页文章数
    homePostsPerPage: 5,
    // 归档页（/posts）每页文章数
    archivePostsPerPage: 5,
  },
  post: {
    relatedPostsLimit: 3,
  },
};
