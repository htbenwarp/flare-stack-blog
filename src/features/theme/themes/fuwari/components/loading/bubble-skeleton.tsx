// src/features/theme/themes/fuwari/components/loading/bubble-skeleton.tsx
import { cn } from "@/lib/utils";
import type { CSSProperties, HTMLAttributes } from "react";

/**
 * 冒泡加载（Bubbling Loading）—— fuwari 主题统一的加载占位方案。
 *
 * 与通用 `<Skeleton />`（灰色 `bg-muted/30 + animate-pulse`）不同，
 * 这里使用与 fuwari 卡片背景同色系的柔和圆角块面（--fuwari-skeleton-bg），
 * 并支持渐入 + 气泡高光上浮 + 错落延迟。
 *
 * 通过 `--fuwari-bubble-delay` 实现错落：相邻项依次递增即可形成队列感。
 */
export interface BubbleSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** 在组内的位置序号，用于错落延迟：delay = baseDelay + index * interval */
  index?: number;
  /** 相邻占位之间的延迟间隔（毫秒），默认 80ms */
  interval?: number;
  /** 附加的基准延迟（毫秒），叠加在 index * interval 之前 */
  baseDelay?: number;
  /**
   * 静态块面：仅为占位，不启用渐入/气泡动画。
   * 适合头像、小圆点等微元素，避免气泡高光在小元素上显得突兀。
   */
  isStatic?: boolean;
}

export function BubbleSkeleton({
  className,
  style,
  index = 0,
  interval = 80,
  baseDelay = 0,
  isStatic = false,
  ...props
}: BubbleSkeletonProps) {
  const delay = baseDelay + index * interval;

  return (
    <div
      className={cn(
        "fuwari-bubble",
        isStatic && "fuwari-bubble--static",
        className,
      )}
      style={
        {
          ...style,
          "--fuwari-bubble-delay": `${delay}ms`,
        } as CSSProperties
      }
      {...props}
    />
  );
}

export interface BubbleSkeletonStackProps
  extends HTMLAttributes<HTMLDivElement> {
  /** 占位行/块数量，默认 3 */
  count?: number;
  /** 整组首块的序号，用于嵌套分组时的全局错落 */
  startIndex?: number;
  /** 相邻块之间的延迟间隔（毫秒），默认 80ms */
  interval?: number;
  /** 整组的基准延迟（毫秒） */
  baseDelay?: number;
  /** 每个占位块的附加类（如高度、宽度） */
  itemClassName?: string;
  /** 每个占位块是否启用气泡动画 */
  itemStatic?: boolean;
}

/** 一批纵向堆叠的冒泡占位块，自动分配错落延迟。 */
export function BubbleSkeletonStack({
  count = 3,
  startIndex = 0,
  interval = 80,
  baseDelay = 0,
  className,
  itemClassName,
  itemStatic = false,
  ...props
}: BubbleSkeletonStackProps) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {Array.from({ length: count }).map((_, i) => (
        <BubbleSkeleton
          key={i}
          index={startIndex + i}
          interval={interval}
          baseDelay={baseDelay}
          isStatic={itemStatic}
          className={itemClassName}
        />
      ))}
    </div>
  );
}

export interface PageHeaderSkeletonProps {
  /** 整组首块序号（用于与页面其它占位协同错落） */
  index?: number;
  interval?: number;
  baseDelay?: number;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

/** 页面头部（标题 + 副标题）的冒泡占位。 */
export function PageHeaderSkeleton({
  index = 0,
  interval = 60,
  baseDelay = 0,
  className,
  titleClassName,
  subtitleClassName,
}: PageHeaderSkeletonProps) {
  return (
    <div className={cn("fuwari-card-base p-6 md:p-8 space-y-3", className)}>
      <BubbleSkeleton
        index={index}
        interval={interval}
        baseDelay={baseDelay}
        className={cn("h-8 w-44", titleClassName)}
      />
      <BubbleSkeleton
        index={index + 1}
        interval={interval}
        baseDelay={baseDelay}
        className={cn("h-4 w-72 max-w-full", subtitleClassName)}
      />
    </div>
  );
}
