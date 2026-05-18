import { useQuery } from "@tanstack/react-query";
import { getSiteStatsFn } from "@/features/pageview/api/pageview.api";

export function useSiteStats() {
  return useQuery({
    queryKey: ["site-stats"],
    queryFn: () => getSiteStatsFn(),
    refetchInterval: 30_000,    // 每 30 秒刷新一次 PV
    staleTime: 20_000,
  });
}
