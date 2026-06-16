import { useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import type { PostEditorData, SaveStatus } from "../types";

interface UseAutoSaveOptions {
  post: PostEditorData;
  onSave: (data: PostEditorData) => Promise<void>;
  debounceMs?: number;
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  error: string | null;
  setError: (error: string | null) => void;
  setSaveStatus: (status: SaveStatus) => void;
  isDirty: boolean;
  markSaved: (post: PostEditorData) => void;
}

/**
 * 规范化 JSON 内容，确保空段落至少包含一个 hardBreak
 * 这样 Tiptap 渲染时不会忽略空行
 */
function normalizeContentJson(json: JSONContent): JSONContent {
  if (json.type === "doc" && json.content) {
    json.content = json.content.map(node => {
      if (node.type === "paragraph" && (!node.content || node.content.length === 0)) {
        return { ...node, content: [{ type: "hardBreak" }] };
      }
      return node;
    });
  }
  return json;
}

export function useAutoSave({
  post,
  onSave,
  debounceMs = 1500,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("SYNCED");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isFirstMount = useRef(true);
  const isMounted = useRef(false);
  const isSaving = useRef(false);
  const latestPostRef = useRef(post);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshot = useRef<{
    title: string;
    summary: string;
    slug: string;
    status: string;
    readTimeInMinutes: number;
    publishedAt: number | null;
    pinnedAt: number | null;
    tagIds: string;
    contentRef: PostEditorData["contentJson"];
    isEncrypted: boolean;
    password: string | undefined;
    isGuestPost: boolean;
    guestAuthorId: number | null;
  } | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const toComparable = (p: PostEditorData) => {
    // 规范化内容 JSON，确保空段落包含 hardBreak
    const normalizedContent = p.contentJson
      ? normalizeContentJson(p.contentJson)
      : p.contentJson;
    return {
      title: p.title,
      summary: p.summary,
      slug: p.slug,
      status: p.status,
      readTimeInMinutes: p.readTimeInMinutes,
      publishedAt: p.publishedAt ? p.publishedAt.valueOf() : null,
      pinnedAt: p.pinnedAt ? p.pinnedAt.valueOf() : null,
      tagIds: [...p.tagIds].sort().join(","),
      contentRef: normalizedContent,
      isEncrypted: p.isEncrypted,
      password: p.password,
      isGuestPost: p.isGuestPost,
      guestAuthorId: p.guestAuthorId,
    };
  };

  const isDirty = (curr: ReturnType<typeof toComparable>) => {
    const prev = lastSavedSnapshot.current;
    if (!prev) return true;
    return (
      prev.title !== curr.title ||
      prev.summary !== curr.summary ||
      prev.slug !== curr.slug ||
      prev.status !== curr.status ||
      prev.readTimeInMinutes !== curr.readTimeInMinutes ||
      prev.publishedAt !== curr.publishedAt ||
      prev.pinnedAt !== curr.pinnedAt ||
      prev.tagIds !== curr.tagIds ||
      prev.contentRef !== curr.contentRef ||
      prev.isEncrypted !== curr.isEncrypted ||
      prev.password !== curr.password ||
      prev.isGuestPost !== curr.isGuestPost ||
      prev.guestAuthorId !== curr.guestAuthorId
    );
  };

  const markSaved = (savedPost: PostEditorData) => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    // 更新 latestPostRef 时也规范化内容，保持一致性
    latestPostRef.current = {
      ...savedPost,
      contentJson: savedPost.contentJson
        ? normalizeContentJson(savedPost.contentJson)
        : savedPost.contentJson,
    };
    lastSavedSnapshot.current = toComparable(savedPost);
    setError(null);
    setSaveStatus("SYNCED");
    setLastSaved(new Date());
  };

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    latestPostRef.current = {
      ...post,
      // 在自动保存时也规范化内容，这样比较时使用一致的数据
      contentJson: post.contentJson
        ? normalizeContentJson(post.contentJson)
        : post.contentJson,
    };
    const current = toComparable(post);

    if (isFirstMount.current) {
      isFirstMount.current = false;
      lastSavedSnapshot.current = current;
      return;
    }

    if (!isDirty(current)) {
      setSaveStatus("SYNCED");
      return;
    }

    setSaveStatus("SAVING");

    const attemptSave = async () => {
      if (isSaving.current) return;
      isSaving.current = true;

      try {
        setError(null);
        const latestPost = latestPostRef.current;
        // 在真正保存前，也确保内容被规范化
        const postToSave = {
          ...latestPost,
          contentJson: latestPost.contentJson
            ? normalizeContentJson(latestPost.contentJson)
            : latestPost.contentJson,
        };
        await onSaveRef.current(postToSave);
        const latestComparable = toComparable(postToSave);
        lastSavedSnapshot.current = latestComparable;
        if (!isMounted.current) return;
        setLastSaved(new Date());

        const stillDirty = isDirty(toComparable(latestPostRef.current));
        if (stillDirty) {
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
          }
          retryTimerRef.current = setTimeout(() => {
            if (!isMounted.current) return;
            attemptSave();
          }, debounceMs);
          setSaveStatus("SAVING");
        } else {
          setSaveStatus("SYNCED");
        }
      } catch (err) {
        console.error("Auto-save failed:", err);
        setSaveStatus("ERROR");
        setError("AUTO_SAVE_FAILED");
      } finally {
        isSaving.current = false;
      }
    };

    const timer = setTimeout(() => {
      void attemptSave();
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [post, debounceMs]);

  return {
    saveStatus,
    lastSaved,
    error,
    setError,
    setSaveStatus,
    isDirty: isDirty(toComparable(post)),
    markSaved,
  };
}