// src/features/theme/themes/fuwari/components/moments/moment-editor-modal.tsx
import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, MapPin } from "lucide-react";
import { createMomentFn, updateMomentFn } from "@/features/moments/api/moments.api";
import { MinimalEditor } from "./minimal-editor";
import type { JSONContent } from "@tiptap/react";

// 设备信息解析（保持不变）
function parseDeviceInfo() {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

  let os = "Unknown";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  const mobile = /Mobi|Android|iPhone|iPad|iPod/.test(ua);
  const device = mobile ? "mobile" : "desktop";

  return { browser, os, device };
}

// 逆地理编码（保持不变）
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "zh" } }
    );
    const data = await res.json();
    if (data?.display_name) {
      const address = data.address || {};
      const parts: string[] = [];
      if (address.city || address.town || address.village)
        parts.push(address.city || address.town || address.village);
      if (address.road) parts.push(address.road);
      if (address.suburb) parts.push(address.suburb);
      if (parts.length === 0) {
        return data.display_name.split(",").slice(0, 3).join(", ");
      }
      return parts.join(", ");
    }
  } catch {}
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

interface MomentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    id: number;
    content: JSONContent;
    location?: string;
    publishedAt: string;
  } | null;
}

export function MomentEditorModal({
  isOpen,
  onClose,
  initialData,
}: MomentEditorModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!initialData;

  const [content, setContent] = useState<JSONContent | null>(null);
  const [location, setLocation] = useState("");
  const [publishedAt, setPublishedAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [isLocating, setIsLocating] = useState(false);

  // 动画状态
  const [isRendered, setIsRendered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // 控制动画：当 isOpen 变化时触发
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      // 下一帧触发进场动画
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(false);
        });
      });
    } else if (isRendered) {
      // 触发退场动画
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, 300); // 与 CSS transition 时长一致
      return () => clearTimeout(timer);
    }
  }, [isOpen, isRendered]);

  // 回填编辑数据
  useEffect(() => {
    if (initialData) {
      setContent(initialData.content);
      setLocation(initialData.location ?? "");
      setPublishedAt(
        new Date(initialData.publishedAt).toISOString().slice(0, 16)
      );
    } else {
      setContent(null);
      setLocation("");
      setPublishedAt(new Date().toISOString().slice(0, 16));
    }
  }, [initialData]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!content) throw new Error("请输入内容");
      const deviceInfo = parseDeviceInfo();
      return createMomentFn({
        data: {
          content,
          location: location || undefined,
          deviceInfo,
          publishedAt: new Date(publishedAt).toISOString(),
        },
      });
    },
    onSuccess: () => {
      toast.success("动态已发布");
      queryClient.invalidateQueries({ queryKey: ["moments"] });
      queryClient.invalidateQueries({ queryKey: ["moment-dates"] });
      onClose();
    },
    onError: () => toast.error("发布失败"),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!content || !initialData) return;
      return updateMomentFn({
        data: {
          id: initialData.id,
          content,
          location: location || undefined,
          publishedAt: new Date(publishedAt).toISOString(),
        },
      });
    },
    onSuccess: () => {
      toast.success("动态已更新");
      queryClient.invalidateQueries({ queryKey: ["moments"] });
      queryClient.invalidateQueries({ queryKey: ["moment-dates"] });
      onClose();
    },
    onError: () => toast.error("更新失败"),
  });

  const handleSubmit = () => {
    if (isEdit) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("浏览器不支持定位");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const address = await reverseGeocode(latitude, longitude);
        setLocation(address);
        setIsLocating(false);
      },
      (err) => {
        toast.error(`定位失败：${err.message}`);
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const isSubmitting = isEdit
    ? updateMutation.isPending
    : createMutation.isPending;
  const submitLabel = isEdit ? "保存" : "发布";

  // 不渲染时返回 null
  if (!isRendered) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-300 ${
        isAnimating ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* 背景点击关闭 */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* 弹窗主体 */}
      <div
        className={`relative bg-(--fuwari-card-bg) rounded-(--fuwari-radius-large) shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col transition-all duration-300 transform ${
          isAnimating
            ? "scale-95 opacity-0 translate-y-2"
            : "scale-100 opacity-100 translate-y-0"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5">
          <h2 className="text-lg font-bold fuwari-text-90">
            {isEdit ? "编辑动态" : "发布动态"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <MinimalEditor
            onChange={(json) => setContent(json)}
            initialContent={content || undefined}
            placeholder="此刻的想法..."
          />

          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={isLocating}
              className="flex items-center gap-1.5 text-xs fuwari-btn-regular px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              <MapPin size={14} />
              {isLocating ? "获取中..." : "定位"}
            </button>
            <input
              type="text"
              placeholder="位置（自动或手动）"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="flex-1 text-xs fuwari-input px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-transparent"
            />
          </div>

          <div>
            <label className="text-xs fuwari-text-50 block mb-1">
              发布时间
            </label>
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className="w-full text-xs fuwari-input px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-transparent"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-black/5 dark:border-white/5">
          <button
            onClick={onClose}
            className="fuwari-btn-regular h-9 px-4 text-sm rounded-lg"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content || isSubmitting}
            className="fuwari-btn-primary h-9 px-5 text-sm rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? "处理中..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}