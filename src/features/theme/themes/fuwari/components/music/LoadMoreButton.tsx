import { useInfiniteQuery } from "@tanstack/react-query";
import { musicPlaylistInfiniteQueryOptions } from "@/features/music/hooks/music-playlist.query";

interface LoadMoreButtonProps {
  onLoadMore: (tracks: any[]) => void;
}

export function LoadMoreButton({ onLoadMore }: LoadMoreButtonProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery(musicPlaylistInfiniteQueryOptions());

  // 当数据加载完成时，通知父组件
  useEffect(() => {
    if (data) {
      const allTracks = data.pages.flatMap(page => page.data);
      onLoadMore(allTracks);
    }
  }, [data, onLoadMore]);

  if (status === "pending") {
    return <div className="text-center py-4 text-sm text-gray-500">加载中...</div>;
  }

  if (status === "error") {
    return <div className="text-center py-4 text-sm text-red-500">加载失败，请重试</div>;
  }

  if (!hasNextPage) {
    return (
      <div className="text-center py-4 text-sm text-gray-400">
        已加载全部 {data?.pages[0]?.pagination?.total || 0} 首歌曲
      </div>
    );
  }

  return (
    <div className="flex justify-center py-4">
      <button
        onClick={() => fetchNextPage()}
        disabled={isFetchingNextPage}
        className="px-6 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isFetchingNextPage ? "加载中..." : "加载更多"}
      </button>
    </div>
  );
}