// src/features/theme/themes/fuwari/components/moments/moment-editor-modal.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, MapPin } from "lucide-react";
import {
  createMomentFn,
  updateMomentFn,
  reverseGeocodeFn,
} from "@/features/moments/api/moments.api";
import { MinimalEditor } from "./minimal-editor";
import type { JSONContent } from "@tiptap/react";

// ---------- 设备信息解析 ----------
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

// ---------- 逆地理编码（通过 Server Function 代理） ----------
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const result = await reverseGeocodeFn({
      data: { lat, lng },
    });
    if (result.success && result.address) {
      return result.address;
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

  // 存储编辑器分离后的数据：{ json: 纯文本JSON, images: 图片URL数组 }
  const [editorData, setEditorData] = useState<{
    json: JSONContent;
    images: string[];
  } | null>(null);
  const [location, setLocation] = useState("");
  const [publishedAt, setPublishedAt] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [isLocating, setIsLocating] = useState(false);

  // 动画状态
  const [isRendered, setIsRendered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const submittingRef = useRef(false);

  // 动画控制
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      submittingRef.current = false;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(false);
        });
      });
    } else if (isRendered) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isRendered]);

  // 回填编辑数据
  useEffect(() => {
    if (initialData) {
      setLocation(initialData.location ?? "");
      setPublishedAt(
        new Date(initialData.publishedAt).toISOString().slice(0, 16),
      );
      // 编辑器会自行从 initialContent 中分离图片
    } else {
      setEditorData(null);
      setLocation("");
      setPublishedAt(new Date().toISOString().slice(0, 16));
    }
  }, [initialData]);

  // 合并图片到文本 JSON 中（用于提交）
  const buildFullContent = useCallback((): JSONContent => {
    if (!editorData) return {};
    return {
      ...editorData.json,
      content: [
        ...(editorData.json.content || []),
        ...editorData.images.map((src) => ({
          type: "image",
          attrs: { src, alt: "", title: null },
        })),
      ],
    };
  }, [editorData]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const content = buildFullContent();
      if (!content.content || content.content.length === 0)
        throw new Error("请输入内容");
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
      if (!initialData) return;
      const content = buildFullContent();
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

  const handleSubmit = useCallback(() => {
    if (submittingRef.current) return;
    const content = buildFullContent();
    if (!content.content || content.content.length === 0) {
      toast.error("请输入内容");
      return;
    }
    submittingRef.current = true;
    if (isEdit) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  }, [buildFullContent, isEdit, updateMutation, createMutation]);

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
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const isSubmitting = isEdit
    ? updateMutation.isPending
    : createMutation.isPending;
  const submitLabel = isEdit ? "保存" : "发布";

  if (!isRendered) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-300 ${
        isAnimating ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className={`relative bg-(--fuwari-card-bg) rounded-(--fuwari-radius-large) shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col transition-all duration-300 transform ${
          isAnimating
            ? "scale-95 opacity-0 translate-y-2"
            : "scale-100 opacity-100 translate-y-0"
        }`}
      >
        {/* 头部 */}
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

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <MinimalEditor
            onChange={(data) => setEditorData(data)}
            initialContent={initialData?.content}
            placeholder="此刻的想法..."
          />

          {/* 定位与时间 */}
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

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-black/5 dark:border-white/5">
          <button
            onClick={onClose}
            className="fuwari-btn-regular h-9 px-4 text-sm rounded-lg"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!editorData || isSubmitting}
            className="fuwari-btn-primary h-9 px-5 text-sm rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? "处理中..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}