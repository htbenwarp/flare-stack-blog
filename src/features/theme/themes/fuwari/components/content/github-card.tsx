import { useEffect, useState } from "react";

interface GithubCardProps {
  repo: string; // 格式 "owner/repo"
}

export function GithubCard({ repo }: GithubCardProps) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!repo || !repo.includes("/")) {
      setError(true);
      return;
    }

    fetch(`https://api.github.com/repos/${repo}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.message) {
          setError(true);
          return;
        }
        setData(data);
      })
      .catch(() => setError(true));
  }, [repo]);

  if (error || !data) {
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
          {/* 使用简单的 SVG 图标代替 lucide-react */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
        </div>
        <div className="gc-description">
          {error ? "加载失败，请检查仓库名" : "正在加载..."}
        </div>
        <div className="gc-infobar">
          <span className="gc-stats">
            {/* 星标图标 */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg> …
          </span>
          <span className="gc-stats">
            {/* 叉子图标 */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="18" r="3"></circle>
              <circle cx="6" cy="6" r="3"></circle>
              <circle cx="18" cy="6" r="3"></circle>
              <path d="M18 9v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"></path>
              <path d="M12 12v3"></path>
            </svg> …
          </span>
          <span className="gc-stats">
            {/* 许可证图标 */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg> …
          </span>
        </div>
      </a>
    );
  }

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
                backgroundImage: `url(${data.owner.avatar_url})`,
                backgroundColor: "transparent",
              }}
            />
            <span className="gc-user">{repo.split("/")[0]}</span>
          </div>
          <span className="gc-divider">/</span>
          <span className="gc-repo">{repo.split("/")[1]}</span>
        </div>
        {/* GitHub 图标 */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
        </svg>
      </div>
      <div className="gc-description">
        {data.description || "无描述"}
      </div>
      <div className="gc-infobar">
        <span className="gc-stats">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg> {stars}
        </span>
        <span className="gc-stats">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="18" r="3"></circle>
            <circle cx="6" cy="6" r="3"></circle>
            <circle cx="18" cy="6" r="3"></circle>
            <path d="M18 9v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"></path>
            <path d="M12 12v3"></path>
          </svg> {forks}
        </span>
        <span className="gc-stats">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg> {license}
        </span>
      </div>
    </a>
  );
}