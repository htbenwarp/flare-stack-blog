export interface ThemeConfig {
  home: {
    recentPostsLimit: number;
    popularPostsLimit: number;
  };
  posts: {
    postsPerPage: number;
  };
  post: {
    relatedPostsLimit: number;
  };
}
