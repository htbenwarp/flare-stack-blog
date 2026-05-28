import { queryOptions } from "@tanstack/react-query";
import { MusicPlaylistSchema } from "../schema";

export function musicPlaylistQueryOptions() {
  return queryOptions({
    queryKey: ["music", "playlist"],
    queryFn: async () => {
      const res = await fetch(`/api/music/playlist?_=${Date.now()}`);
      if (!res.ok) throw new Error("Failed to fetch playlist");
      const rawData = await res.json();

      const mappedData = rawData
        .filter((track: any) => track && (track.name || track.title))
        .map((track: any) => ({
          name: track.name || track.title || "未知歌曲",
          artist: track.singer || track.artist || track.author || "未知歌手",
          url: track.url || "",
          cover: (track.pic || track.cover || "").replace(
            /param=\d+y\d+/,
            "param=1024y1024"
          ),
          lrc: track.lrc || "",
        }));

      return MusicPlaylistSchema.parse(mappedData);
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}
