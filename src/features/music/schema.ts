import { z } from "zod";

export const MusicTrackSchema = z.object({
  name: z.string(),
  artist: z.string(),
  url: z.string(),
  cover: z.string().optional(),
  lrc: z.string().optional(),
});

export const MusicPlaylistSchema = z.array(MusicTrackSchema);

export type MusicTrack = z.infer<typeof MusicTrackSchema>;