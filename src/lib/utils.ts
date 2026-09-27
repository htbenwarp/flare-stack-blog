import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { m } from "@/paraglide/messages";

export const isSSR = typeof window === "undefined";

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs));
}

export function formatDate(
  date: Date | undefined | null | string | number,
  options: { includeTime?: boolean } = {},
) {
  if (!date) return "";
  const d = new Date(date);
  if (options.includeTime) {
    return m.format_datetime({ date: d });
  }
  return m.format_date({ date: d });
}

export function formatTime(date: Date | undefined | null | string | number) {
  if (!date) return "";
  return m.format_time({ date: new Date(date) });
}

export function formatMonthDayTime(
  date: Date | undefined | null | string | number,
) {
  if (!date) return "";
  return m.format_month_day_time({ date: new Date(date) });
}

export function formatTimeAgo(date: Date | null | string) {
  if (!date) return "";
  const now = new Date();
  const diffInSeconds = Math.floor(
    (now.getTime() - new Date(date).getTime()) / 1000,
  );

  if (diffInSeconds < 60) return m.time_ago_just_now();
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return m.time_ago_minutes({ count: diffInMinutes });
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return m.time_ago_hours({ count: diffInHours });
  const diffInDays = Math.floor(diffInHours / 24);
  return m.time_ago_days({ count: diffInDays });
}

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 将 Date 格式化为 `<input type="datetime-local">` 所需的本地时间字符串
 * （形如 `2026-02-17T20:30`）。
 *
 * 不能用 `toISOString()`：它返回的是 UTC（中时区）挂钟时间，而
 * datetime-local 控件按「本地时间」解释它的 value，直接用会导致
 * 编辑器里显示/回填的时间比本地时间偏移一个时区。
 */
export function toLocalDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join("");
}

/**
 * 将 `<input type="datetime-local">` 的本地时间串（形如 `2026-02-17T20:30`）
 * 转成 UTC 的 ISO 字符串；为空或非法时返回 `undefined`。
 *
 * 需要这个函数而不是直接 `new Date(value).toISOString()`：
 * 用户清空该输入框时 value 为 `""`，`new Date("")` 是 Invalid Date，
 * 再调用 `toISOString()` 会抛 RangeError（表现为「发布失败」）。
 *
 * 返回 `undefined` 的语义：新建时由服务端取默认值（当前时间），
 * 编辑时表示「不修改发布时间」。
 */
export function localDateTimeInputToIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}
