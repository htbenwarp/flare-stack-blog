// src/features/github/api/github.api.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dbMiddleware } from "@/lib/middlewares";

export const getGitHubRepoFn = createServerFn()
  .middleware([dbMiddleware]) // 与项目其他 API 保持一致
  .inputValidator(
    z.object({
      repo: z.string().regex(/^[\w-]+\/[\w.-]+$/, "格式应为 owner/repo"),
    })
  )
  .handler(async ({ data, context }) => {
    const { repo } = data; // ✅ data 就是 { repo }
    const token = process.env.GH_TOKEN;

    console.log("🔍 GitHub API 服务端收到:");
    console.log("  - repo:", repo);
    console.log("  - GH_TOKEN 是否存在:", !!token);

    try {
      const response = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "FlareStackBlog/1.0",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        cf: {
          cacheTtl: 3600,
          cacheKey: `github-repo-${repo}`,
        },
      });

      if (response.status === 403) {
        return {
          error: true,
          message: "GitHub API 暂时不可用，请稍后刷新",
          owner: { avatar_url: "" },
          name: repo.split("/")[1],
          full_name: repo,
          description: "服务繁忙，请稍后再试",
          stargazers_count: 0,
          forks_count: 0,
          license: null,
        };
      }

      if (response.status === 404) {
        return {
          error: true,
          message: `仓库 ${repo} 不存在或已被删除`,
          owner: { avatar_url: "" },
          name: repo.split("/")[1],
          full_name: repo,
          description: "仓库未找到",
          stargazers_count: 0,
          forks_count: 0,
          license: null,
        };
      }

      if (!response.ok) {
        return {
          error: true,
          message: `GitHub API 错误 (${response.status})`,
          owner: { avatar_url: "" },
          name: repo.split("/")[1],
          full_name: repo,
          description: "加载失败，请稍后重试",
          stargazers_count: 0,
          forks_count: 0,
          license: null,
        };
      }

      const result = await response.json();
      return { error: false, ...result };
    } catch (error) {
      console.error("GitHub proxy error:", error);
      return {
        error: true,
        message: "网络异常，请检查网络连接",
        owner: { avatar_url: "" },
        name: repo.split("/")[1],
        full_name: repo,
        description: "网络错误，请稍后重试",
        stargazers_count: 0,
        forks_count: 0,
        license: null,
      };
    }
  });