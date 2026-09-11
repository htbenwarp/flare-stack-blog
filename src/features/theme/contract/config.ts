export interface ThemeConfig {
  home: {
    recentPostsLimit: number;
    popularPostsLimit: number;
  };
  posts: {
    /** 首页（`/`）每页文章数，同时决定分页组件的一页大小。 */
    homePostsPerPage: number;
    /** 归档页（`/posts`）每页文章数，即无限滚动的每页大小。 */
    archivePostsPerPage: number;
  };
  post: {
    relatedPostsLimit: number;
  };
}
