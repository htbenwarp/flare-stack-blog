// src/features/theme/themes/fuwari/components/page-header.tsx
import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

export interface PageHeaderProps {
  /** 页面主标题 */
  title: ReactNode;
  /** 页面副标题（可选） */
  subtitle?: ReactNode;
  /** 标题与副标题之后的额外内容（统计、按钮等），自动带间距 */
  children?: ReactNode;
  /** 是否包裹在卡片内（默认 true）；为 false 时仅保留标题排版 */
  asCard?: boolean;
  className?: string;
  /** 渐入延迟（毫秒），默认 150ms */
  animationDelay?: number;
  titleClassName?: string;
  subtitleClassName?: string;
}

/**
 * 统一的页面标题/副标题排版。
 *
 * 用于规范 fuwari 各页面的字号层级（画廊、友链、客邸、留言板等），
 * 使所有页面的标题使用同一比例、副标题使用同一比例，保持视觉一致性。
 *
 * - 标题：`text-2xl md:text-3xl font-bold fuwari-text-90`
 * - 副标题：`text-sm md:text-base fuwari-text-50`
 */
export function PageHeader({
  title,
  subtitle,
  children,
  asCard = true,
  className,
  animationDelay = 150,
  titleClassName,
  subtitleClassName,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "fuwari-onload-animation space-y-3",
        asCard && "fuwari-card-base p-6 md:p-8",
        className,
      )}
      style={{ animationDelay: `${animationDelay}ms` } as CSSProperties}
    >
      <h1
        className={cn(
          "text-2xl md:text-3xl font-bold fuwari-text-90 transition-colors",
          titleClassName,
        )}
      >
        {title}
      </h1>
      {subtitle ? (
        <p
          className={cn(
            "text-sm md:text-base fuwari-text-50 leading-relaxed transition-colors",
            subtitleClassName,
          )}
        >
          {subtitle}
        </p>
      ) : null}
      {children}
    </div>
  );
}
