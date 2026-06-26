// src/routes/admin/gallery/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpDown, Hash, Image, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { Input } from "@/components/ui/input";
import {
  galleryItemsAdminQueryOptions,
  useCreateGalleryItem,
  useUpdateGalleryItem,
  useDeleteGalleryItem,
} from "@/features/gallery/queries";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { toast } from "sonner";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { TagSelector } from "@/features/tags/components/tag-selector";
import { useForm } from "react-hook-form";
import { AvatarPicker } from "@/features/guest-authors/components/AvatarPicker";
import { getOptimizedImageUrl } from "@/features/media/utils/media.utils";

export const Route = createFileRoute("/admin/gallery/")({
  component: GalleryAdminPage,
});

const GalleryFormSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  imageKey: z.string().min(1, "请选择一张图片"),
  tagIds: z.array(z.number()).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

type GalleryFormData = z.infer<typeof GalleryFormSchema>;

function GalleryAdminPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "sortOrder">("sortOrder");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [itemToDelete, setItemToDelete] = useState<{ id: number; title: string } | null>(null);
  const [itemToEdit, setItemToEdit] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: items = [], isLoading } = useQuery(galleryItemsAdminQueryOptions());
  const createMutation = useCreateGalleryItem();
  const updateMutation = useUpdateGalleryItem();
  const deleteMutation = useDeleteGalleryItem();

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => item.title.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        if (sortBy === "title") return a.title.localeCompare(b.title) * dir;
        return (a.sortOrder - b.sortOrder) * dir;
      });
  }, [items, searchTerm, sortBy, sortDir]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("asc"); }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setItemToDelete(null);
        toast.success(m.gallery_deleted?.() ?? "已删除");
      },
    });
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/30">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-medium tracking-tight">
            {m.gallery_admin_title?.() ?? "画廊管理"}
          </h1>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            GALLERY MANAGEMENT
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={m.tag_manager_search_placeholder?.() ?? "搜索..."}
              className="pl-9 h-9 bg-transparent border-b border-border/50 rounded-none focus:border-foreground focus:ring-0 pr-0 transition-all font-mono text-xs"
            />
          </div>
          <Button
            onClick={() => setIsCreating(true)}
            size="sm"
            className="h-9 px-4 text-[10px] uppercase tracking-[0.2em] font-medium rounded-none gap-2 bg-foreground text-background hover:bg-foreground/90"
          >
            <Hash size={12} />
            {m.gallery_create?.() ?? "新建项目"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 border border-border/30 bg-background/50">
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-mono mb-2">
            {m.gallery_total?.() ?? "总项目数"}
          </div>
          <div className="text-3xl font-serif text-foreground">{items.length}</div>
        </div>
      </div>

      {/* Inline Create Form */}
      {isCreating && (
        <GalleryItemForm
          isSubmitting={createMutation.isPending}
          onCancel={() => setIsCreating(false)}
          onSubmit={(data) => {
            createMutation.mutate(data, {
              onSuccess: (result) => {
                if (result.error) {
                  toast.error(result.error.reason);
                  return;
                }
                setIsCreating(false);
                toast.success(m.gallery_created?.() ?? "已创建");
              },
            });
          }}
        />
      )}

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <LoadingSkeleton />
        ) : filteredItems.map((item) => (
          <div key={item.id} className="p-4 border border-border/30 bg-background space-y-4">
            <div className="flex gap-4">
              <img
                src={getOptimizedImageUrl(item.imageKey, 120)}
                alt={item.title}
                className="w-20 h-20 object-cover rounded-md border border-border/20"
              />
              <div className="flex-1">
                {itemToEdit === item.id ? (
                  <GalleryItemForm
                    isSubmitting={updateMutation.isPending}
                    defaultValues={{
                      title: item.title,
                      description: item.description,
                      imageKey: item.imageKey,
                      tagIds: item.tags?.map((t) => t.id) ?? [],
                      sortOrder: item.sortOrder,
                    }}
                    onCancel={() => setItemToEdit(null)}
                    onSubmit={(data) => {
                      updateMutation.mutate({ id: item.id, data }, {
                        onSuccess: (result) => {
                          if (result.error) {
                            toast.error(result.error.reason);
                            return;
                          }
                          setItemToEdit(null);
                          toast.success(m.gallery_updated?.() ?? "已更新");
                        },
                      });
                    }}
                  />
                ) : (
                  <>
                    <h3 className="font-medium">{item.title || "无标题"}</h3>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      排序：{item.sortOrder}
                    </p>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-muted-foreground"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border/30 pt-3">
              <Button variant="ghost" size="sm" onClick={() => setItemToEdit(item.id)}>
                [ 编辑 ]
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setItemToDelete({ id: item.id, title: item.title })}>
                [ 删除 ]
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-background border border-border/30 rounded-none shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border/30 bg-muted/5">
                <th className="px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-normal">
                  缩略图
                </th>
                <th className="px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-normal">
                  <button onClick={() => toggleSort("title")} className="flex items-center gap-2 hover:text-foreground">
                    {m.gallery_title_label?.() ?? "标题"}
                    <ArrowUpDown size={10} className={cn(sortBy === "title" && "text-foreground")} />
                  </button>
                </th>
                <th className="px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-normal hidden lg:table-cell">
                  {m.gallery_description?.() ?? "描述"}
                </th>
                <th className="px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-normal">
                  {m.gallery_tags?.() ?? "标签"}
                </th>
                <th className="px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-normal">
                  <button onClick={() => toggleSort("sortOrder")} className="flex items-center gap-2 hover:text-foreground">
                    {m.gallery_sort_order?.() ?? "排序"}
                    <ArrowUpDown size={10} className={cn(sortBy === "sortOrder" && "text-foreground")} />
                  </button>
                </th>
                <th className="px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-normal text-right">
                  {m.gallery_actions?.() ?? "操作"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <LoadingSkeleton rows={3} />
              ) : filteredItems.map((item) => (
                <tr key={item.id} className="group hover:bg-muted/5 transition-colors">
                  <td className="px-6 py-4">
                    <img
                      src={getOptimizedImageUrl(item.imageKey, 80)}
                      alt={item.title}
                      className="w-14 h-14 object-cover rounded-md border border-border/20"
                    />
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {itemToEdit === item.id ? (
                      <GalleryItemForm
                        isSubmitting={updateMutation.isPending}
                        defaultValues={{
                          title: item.title,
                          description: item.description,
                          imageKey: item.imageKey,
                          tagIds: item.tags?.map((t) => t.id) ?? [],
                          sortOrder: item.sortOrder,
                        }}
                        onCancel={() => setItemToEdit(null)}
                        onSubmit={(data) => {
                          updateMutation.mutate({ id: item.id, data }, {
                            onSuccess: (result) => {
                              if (result.error) {
                                toast.error(result.error.reason);
                                return;
                              }
                              setItemToEdit(null);
                              toast.success(m.gallery_updated?.() ?? "已更新");
                            },
                          });
                        }}
                      />
                    ) : (
                      <span className="text-foreground tracking-tight font-mono text-sm">
                        {item.title || "无标题"}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[10px] text-muted-foreground font-mono hidden lg:table-cell truncate max-w-[200px]">
                    {item.description}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.tags?.map((tag) => (
                        <span
                          key={tag.id}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-muted-foreground"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[10px] font-mono text-muted-foreground">
                    {item.sortOrder}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setItemToEdit(item.id)}>
                        [ 编辑 ]
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setItemToDelete({ id: item.id, title: item.title })}>
                        [ 删除 ]
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => itemToDelete && handleDelete(itemToDelete.id)}
        title={m.gallery_delete_title?.() ?? "删除画廊项目"}
        message={m.gallery_delete_message?.() ?? "确定删除此项目？此操作不可撤销。"}
        confirmLabel={m.gallery_delete_confirm?.() ?? "删除"}
      />
    </div>
  );
}

// 画廊项目编辑表单
function GalleryItemForm({
  defaultValues,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  defaultValues?: Partial<GalleryFormData>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (data: GalleryFormData) => void;
}) {
  const form = useForm<GalleryFormData>({
    resolver: standardSchemaResolver(GalleryFormSchema),
    defaultValues: defaultValues || { title: "", description: "", imageKey: "", tagIds: [], sortOrder: 0 },
  });

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-2 border border-border/30 bg-muted/5 p-4 animate-in slide-in-from-top-2 duration-300"
    >
      <div className="flex flex-col gap-2">
        <Input
          {...form.register("title")}
          placeholder={m.gallery_title_label?.() ?? "标题"}
          className="h-8 text-sm"
        />
        <Input
          {...form.register("description")}
          placeholder={m.gallery_description?.() ?? "描述"}
          className="h-8 text-sm"
        />

        {/* 图片选择器：使用 AvatarPicker，标签改为选择资产 */}
        <div className="space-y-1">
          <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
            {m.gallery_image_asset?.() ?? "图片资产"}
          </label>
          <AvatarPicker
            value={form.watch("imageKey")}
            onChange={(url) => {
              // 从 url 中提取 image key，兼容 /images/xxx?param 格式
              const key = url.split("/images/")[1]?.split("?")[0] || url;
              form.setValue("imageKey", key);
            }}
          />
          {form.formState.errors.imageKey && (
            <p className="text-xs text-red-500">{form.formState.errors.imageKey.message}</p>
          )}
        </div>

        {/* 标签选择器 */}
        <div className="space-y-1">
          <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
            {m.gallery_tags?.() ?? "标签"}
          </label>
          <TagSelector
            value={form.watch("tagIds") ?? []}
            onChange={(tagIds) => form.setValue("tagIds", tagIds)}
          />
        </div>

        <Input
          type="number"
          {...form.register("sortOrder")}
          placeholder={m.gallery_sort_order?.() ?? "排序"}
          className="h-8 text-sm"
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          [ 保存 ]
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          [ 取消 ]
        </Button>
      </div>
    </form>
  );
}

function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 border border-border/30 bg-background animate-pulse space-y-3">
          <div className="h-4 w-24 bg-accent rounded" />
          <div className="h-3 w-16 bg-accent rounded" />
        </div>
      ))}
    </>
  );
}
