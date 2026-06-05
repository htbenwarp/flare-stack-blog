import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Hash, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { Input } from "@/components/ui/input";
import {
  guestAuthorsListQueryOptions,
  useCreateGuestAuthor,
  useUpdateGuestAuthor,
  useDeleteGuestAuthor,
} from "@/features/guest-authors/queries";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { toast } from "sonner";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { Check, X } from "lucide-react";
import { AvatarPicker } from "@/features/guest-authors/components/AvatarPicker";
import { FormProvider, useForm } from "react-hook-form";

export const Route = createFileRoute("/admin/guest-authors/")({
  component: GuestAuthorsManager,
});

const AuthorFormSchema = z.object({
  name: z.string().min(1, "姓名不能为空"),
  slug: z.string().min(1, "标识不能为空"),
  bio: z.string().optional(),
  avatar: z.string().optional(),
});

type AuthorFormData = z.infer<typeof AuthorFormSchema>;

function GuestAuthorsManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "postCount">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [authorToDelete, setAuthorToDelete] = useState<{ id: number; name: string } | null>(null);
  const [authorToEdit, setAuthorToEdit] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const queryClient = useQueryClient();
  const { data: authors = [], isLoading } = useQuery(guestAuthorsListQueryOptions());
  const createMutation = useCreateGuestAuthor();
  const updateMutation = useUpdateGuestAuthor();
  const deleteMutation = useDeleteGuestAuthor();

  const filteredAuthors = useMemo(() => {
    return authors
      .filter((author) => author.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        if (sortBy === "name") return a.name.localeCompare(b.name) * dir;
        if (sortBy === "createdAt") return (a.createdAt.getTime() - b.createdAt.getTime()) * dir;
        return (a.postCount - b.postCount) * dir;
      });
  }, [authors, searchTerm, sortBy, sortDir]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("desc"); }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["guest-authors"] });
        setAuthorToDelete(null);
        toast.success(m.admin_guest_authors_deleted?.() ?? "作者已删除");
      },
    });
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/30">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-medium tracking-tight">
            {m.admin_guest_authors_title?.() ?? "客邸作者管理"}
          </h1>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            GUEST HOUSE MANAGEMENT
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
            {m.admin_guest_authors_create?.() ?? "新建作者"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "总作者数", value: authors.length },
          { label: "有文章", value: authors.filter(a => a.postCount > 0).length },
          { label: "无文章", value: authors.filter(a => a.postCount === 0).length },
        ].map((stat, i) => (
          <div key={i} className="p-6 border border-border/30 bg-background/50 group">
            <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-mono mb-2">{stat.label}</div>
            <div className="text-3xl font-serif text-foreground">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Inline Create Form */}
      {isCreating && (
        <InlineAuthorForm
          isSubmitting={createMutation.isPending}
          onCancel={() => setIsCreating(false)}
          onSubmit={(data) => {
            createMutation.mutate(data, {
              onSuccess: (result) => {
                if (result.error) {
                  toast.error(result.error.reason);
                  return;
                }
                queryClient.invalidateQueries({ queryKey: ["guest-authors"] });
                setIsCreating(false);
                toast.success(m.admin_guest_authors_created?.() ?? "作者已创建");
              },
            });
          }}
        />
      )}

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <LoadingSkeleton />
        ) : filteredAuthors.length > 0 ? (
          filteredAuthors.map((author) => (
            <div key={author.id} className="p-4 border border-border/30 bg-background space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  {authorToEdit === author.id ? (
                    <InlineAuthorForm
                      isSubmitting={updateMutation.isPending}
                      defaultValues={{ name: author.name, slug: author.slug, bio: author.bio, avatar: author.avatar }}
                      onCancel={() => setAuthorToEdit(null)}
                      onSubmit={(data) => {
                        updateMutation.mutate({ id: author.id, ...data }, {
                          onSuccess: (result) => {
                            if (result.error) {
                              toast.error(result.error.reason);
                              return;
                            }
                            queryClient.invalidateQueries({ queryKey: ["guest-authors"] });
                            setAuthorToEdit(null);
                            toast.success(m.admin_guest_authors_updated?.() ?? "作者已更新");
                          },
                        });
                      }}
                    />
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{author.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">{author.slug}</div>
                      {author.bio && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{author.bio}</p>}
                    </>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-mono font-bold text-foreground">{author.postCount}</span>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">篇文章</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-border/30 pt-3">
                <Button variant="ghost" size="sm" onClick={() => setAuthorToEdit(author.id)}>[ 编辑 ]</Button>
                <Button variant="ghost" size="sm" onClick={() => setAuthorToDelete({ id: author.id, name: author.name })}>[ 删除 ]</Button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-background border border-border/30 rounded-none shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border/30 bg-muted/5">
                <th className="px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-normal">
                  <button onClick={() => toggleSort("name")} className="flex items-center gap-2 hover:text-foreground">
                    {m.admin_guest_authors_name?.() ?? "姓名"}
                    <ArrowUpDown size={10} className={cn(sortBy === "name" && "text-foreground")} />
                  </button>
                </th>
                <th className="px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-normal">标识</th>
                <th className="px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-normal hidden lg:table-cell">简介</th>
                <th className="px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-normal">文章数</th>
                <th className="px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-normal text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <LoadingSkeleton rows={5} />
              ) : filteredAuthors.length > 0 ? (
                filteredAuthors.map((author) => (
                  <tr key={author.id} className="group hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      {authorToEdit === author.id ? (
                        <InlineAuthorForm
                          isSubmitting={updateMutation.isPending}
                          defaultValues={{ name: author.name, slug: author.slug, bio: author.bio, avatar: author.avatar }}
                          onCancel={() => setAuthorToEdit(null)}
                          onSubmit={(data) => {
                            updateMutation.mutate({ id: author.id, ...data }, {
                              onSuccess: (result) => {
                                if (result.error) {
                                  toast.error(result.error.reason);
                                  return;
                                }
                                queryClient.invalidateQueries({ queryKey: ["guest-authors"] });
                                setAuthorToEdit(null);
                                toast.success(m.admin_guest_authors_updated?.() ?? "作者已更新");
                              },
                            });
                          }}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-foreground tracking-tight font-mono text-sm">{author.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground/60">{author.slug}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[10px] font-mono text-muted-foreground">{author.slug}</td>
                    <td className="px-6 py-4 text-[10px] text-muted-foreground/60 font-mono hidden lg:table-cell truncate max-w-[200px]">{author.bio}</td>
                    <td className="px-6 py-4"><span className="font-mono text-xs text-muted-foreground">{author.postCount}</span></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setAuthorToEdit(author.id)}>[ 编辑 ]</Button>
                        <Button variant="ghost" size="sm" onClick={() => setAuthorToDelete({ id: author.id, name: author.name })}>[ 删除 ]</Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5}><EmptyState /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!authorToDelete}
        onClose={() => setAuthorToDelete(null)}
        onConfirm={() => authorToDelete && handleDelete(authorToDelete.id)}
        title="删除作者"
        message={`确定删除作者「${authorToDelete?.name}」吗？此操作不可撤销。`}
        confirmLabel="删除"
      />
    </div>
  );
}

function InlineAuthorForm({
  defaultValues,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  defaultValues?: Partial<AuthorFormData>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (data: AuthorFormData) => void;
}) {
  const form = useForm<AuthorFormData>({
    resolver: standardSchemaResolver(AuthorFormSchema),
    defaultValues: defaultValues || { name: "", slug: "", bio: "", avatar: "" },
  });
  const { register, handleSubmit, watch, formState: { errors } } = form;
  const name = watch("name");
  const avatarValue = form.watch("avatar") || "";

  return (
    // 不再需要 FormProvider
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-2 border border-border/30 bg-muted/5 p-4 animate-in slide-in-from-top-2 duration-300"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Input autoFocus {...form.register("name")} placeholder="姓名" className="h-8 text-sm" />
          <Input {...form.register("slug")} placeholder="标识 (slug)" className="h-8 text-sm" />
        </div>
        <Input {...form.register("bio")} placeholder="简介 (可选)" className="h-8 text-sm" />

        {/* 使用 AvatarPicker 替代 AssetUploadField */}
        <AvatarPicker
          value={avatarValue}
          onChange={(url) => form.setValue("avatar", url)}
        />
      </div>

      {Object.values(form.formState.errors).map((err, i) => (
        <p key={i} className="text-xs text-red-500">{err?.message}</p>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" size="sm" disabled={isSubmitting || !form.watch("name").trim()}>
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

function EmptyState() {
  return (
    <div className="p-8 text-center border border-border/30 bg-background text-muted-foreground">
      <span className="text-xs font-serif italic">暂无匹配作者</span>
    </div>
  );
}