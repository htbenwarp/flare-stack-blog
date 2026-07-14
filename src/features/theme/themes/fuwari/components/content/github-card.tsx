import { useQuery } from "@tanstack/react-query";
import { getGitHubRepoFn } from "@/features/github/api/github.api";

interface GithubCardProps {
  repo: string; // 格式 "owner/repo"
}

export function GithubCard({ repo }: GithubCardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["github", repo],
    queryFn: () => getGitHubRepoFn({ data: { repo } }),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!repo && repo.includes("/"),
  });

  // 加载状态
  if (isLoading) {
    return (
      <a
        className="card-github fetch-waiting no-styling"
        href={`https://github.com/${repo}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="gc-titlebar">
          <div className="gc-titlebar-left">
            <div className="gc-owner">
              <div className="gc-avatar" />
              <span className="gc-user">{repo.split("/")[0]}</span>
            </div>
            <span className="gc-divider">/</span>
            <span className="gc-repo">{repo.split("/")[1]}</span>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
          </svg>
        </div>
        <div className="gc-description">加载中...</div>
        <div className="gc-infobar">
          <span className="gc-stats">★ …</span>
          <span className="gc-stats">⑂ …</span>
          <span className="gc-stats">⚖ …</span>
        </div>
      </a>
    );
  }

  // 错误状态
  if (error || data?.error) {
    const errMsg = data?.message || "加载失败";
    return (
      <a
        className="card-github fetch-waiting no-styling"
        href={`https://github.com/${repo}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="gc-titlebar">
          <div className="gc-titlebar-left">
            <div className="gc-owner">
              <div className="gc-avatar" />
              <span className="gc-user">{repo.split("/")[0]}</span>
            </div>
            <span className="gc-divider">/</span>
            <span className="gc-repo">{repo.split("/")[1]}</span>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
          </svg>
        </div>
        <div className="gc-description" style={{ color: "#f87171" }}>
          ⚠️ {errMsg}
        </div>
        <div className="gc-infobar">
          <span className="gc-stats">★ 0</span>
          <span className="gc-stats">⑂ 0</span>
          <span className="gc-stats">⚖ no-license</span>
        </div>
      </a>
    );
  }

  // 成功渲染
  const stars = Intl.NumberFormat("en-us", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(data.stargazers_count || 0);

  const forks = Intl.NumberFormat("en-us", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(data.forks_count || 0);

  const license = data.license?.spdx_id || "no-license";

  return (
    <a
      className="card-github no-styling"
      href={`https://github.com/${repo}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="gc-titlebar">
        <div className="gc-titlebar-left">
          <div className="gc-owner">
            <div
              className="gc-avatar"
              style={{
                backgroundImage: `url(${data.owner?.avatar_url || ""})`,
                backgroundColor: "transparent",
              }}
            />
            <span className="gc-user">{repo.split("/")[0]}</span>
          </div>
          <span className="gc-divider">/</span>
          <span className="gc-repo">{repo.split("/")[1]}</span>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
        </svg>
      </div>
      <div className="gc-description">{data.description || "无描述"}</div>
      <div className="gc-infobar">
        <span className="gc-stats">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>{" "}
          {stars}
        </span>
        <span className="gc-stats">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="18" r="3" />
            <circle cx="6" cy="6" r="3" />
            <circle cx="18" cy="6" r="3" />
            <path d="M18 9v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" />
            <path d="M12 12v3" />
          </svg>{" "}
          {forks}
        </span>
        <span className="gc-stats">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>{" "}
          {license}
        </span>
      </div>
    </a>
  );
}