import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Newspaper,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EmptyState, formatDate } from "@/components/page-parts";
import {
  AdminIntro,
  FieldLabel,
  FileButton,
  Panel,
  RowMenu,
  RowsSkeleton,
  SearchField,
  Segmented,
  StatusChip,
  useConfirm,
} from "./shared";

type NewsRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  cover_image_url: string | null;
  published: boolean;
  published_at: string;
};

type Filter = "all" | "live" | "draft";

export function NewsEditor() {
  const qc = useQueryClient();
  const { ask, dialog } = useConfirm();
  const { data: posts, isLoading } = useQuery({
    queryKey: ["news_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("*")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      all: posts?.length ?? 0,
      live: posts?.filter((p) => p.published).length ?? 0,
      draft: posts?.filter((p) => !p.published).length ?? 0,
    }),
    [posts],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (posts ?? []).filter(
      (p) =>
        (filter === "all" || (filter === "live" ? p.published : !p.published)) &&
        (!q || p.title.toLowerCase().includes(q)),
    );
  }, [posts, filter, query]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["news_admin"] });
    qc.invalidateQueries({ queryKey: ["news_list"] });
    qc.invalidateQueries({ queryKey: ["news_home"] });
    qc.invalidateQueries({ queryKey: ["ov_live"] });
    qc.invalidateQueries({ queryKey: ["ov_drafts"] });
    qc.invalidateQueries({ queryKey: ["ov_recent"] });
  };

  const remove = async (id: string, title: string) => {
    if (
      !(await ask(
        "Delete this post?",
        `"${title}" will be removed from the site. This cannot be undone.`,
      ))
    )
      return;
    const { error } = await supabase.from("news_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Post deleted");
    refresh();
  };

  const setPublished = async (id: string, published: boolean) => {
    const { error } = await supabase.from("news_posts").update({ published }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(published ? "Post is live" : "Post moved to drafts");
    refresh();
  };

  return (
    <div className="space-y-6">
      <AdminIntro
        Icon={Newspaper}
        label="News"
        title="Stories and announcements."
        summary="Drafts stay hidden until you publish them. The newest post leads the News page."
        action={
          <Button onClick={() => setEditing("new")}>
            <Plus /> New post
          </Button>
        }
      />

      {isLoading ? (
        <RowsSkeleton />
      ) : posts && posts.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented<Filter>
              label="Filter posts"
              value={filter}
              onChange={setFilter}
              items={[
                { id: "all", label: "All", count: counts.all },
                { id: "live", label: "Published", count: counts.live },
                { id: "draft", label: "Drafts", count: counts.draft },
              ]}
            />
            <SearchField
              label="Search posts"
              placeholder="Search titles"
              value={query}
              onChange={setQuery}
              className="w-full sm:w-64"
            />
          </div>
          <Panel>
            {shown.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                No posts match this view.
              </p>
            ) : (
              <ul>
                {shown.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/60 sm:gap-4 sm:px-5"
                  >
                    <div className="hidden h-14 w-20 shrink-0 overflow-hidden rounded-md bg-navy sm:block">
                      {p.cover_image_url && (
                        <img
                          src={p.cover_image_url}
                          alt=""
                          width={80}
                          height={56}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditing(p.id)}
                      className="min-h-11 min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate font-display text-base font-semibold">
                        {p.title}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <StatusChip tone={p.published ? "green" : "amber"}>
                          {p.published ? "Published" : "Draft"}
                        </StatusChip>
                        <span className="label-mono text-muted-foreground">
                          {formatDate(p.published_at)}
                        </span>
                      </span>
                    </button>
                    <RowMenu
                      label={`Actions for ${p.title}`}
                      actions={[
                        { label: "Edit", Icon: Pencil, onSelect: () => setEditing(p.id) },
                        ...(p.published
                          ? [
                              {
                                label: "View on site",
                                Icon: ExternalLink,
                                onSelect: () =>
                                  window.open(`/news/${p.slug}`, "_blank", "noopener,noreferrer"),
                              },
                              {
                                label: "Move to drafts",
                                Icon: EyeOff,
                                onSelect: () => setPublished(p.id, false),
                              },
                            ]
                          : [
                              {
                                label: "Publish",
                                Icon: Eye,
                                onSelect: () => setPublished(p.id, true),
                              },
                            ]),
                        {
                          label: "Delete",
                          Icon: Trash2,
                          danger: true,
                          separatorBefore: true,
                          onSelect: () => remove(p.id, p.title),
                        },
                      ]}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      ) : (
        <EmptyState
          Icon={Newspaper}
          title="No posts yet"
          body="Write the first news post to show it on the News page."
        />
      )}

      <Sheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
          {editing !== null && (
            <NewsForm
              key={editing}
              post={editing === "new" ? null : (posts?.find((p) => p.id === editing) ?? null)}
              onClose={() => setEditing(null)}
              onSaved={() => {
                setEditing(null);
                refresh();
              }}
            />
          )}
        </SheetContent>
      </Sheet>
      {dialog}
    </div>
  );
}

function NewsForm({
  post,
  onClose,
  onSaved,
}: {
  post: NewsRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const todayISO = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    body: post?.body ?? "",
    cover_image_url: post?.cover_image_url ?? "",
    published: post?.published ?? true,
    published_at: post?.published_at ? post.published_at.split("T")[0] : todayISO,
  });
  const [busy, setBusy] = useState(false);
  const [triedSave, setTriedSave] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const onUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadMedia(file, "news");
      setForm((f) => ({ ...f, cover_image_url: url }));
      toast.success("Cover image uploaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const onUploadBodyImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadMedia(file, "news");
      const textarea = bodyRef.current;
      const insert = `\n![](${url})\n`;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newBody = form.body.substring(0, start) + insert + form.body.substring(end);
        setForm((f) => ({ ...f, body: newBody }));
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + insert.length;
          textarea.focus();
        }, 0);
      } else {
        setForm((f) => ({ ...f, body: f.body + insert }));
      }
      toast.success("Image uploaded", { description: "Inserted at the cursor." });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const save = async () => {
    setTriedSave(true);
    const slug = form.slug || slugify(form.title);
    if (!form.title || !slug) return toast.error("A title is required");
    setBusy(true);
    const payload = { ...form, slug };
    const { error } = post
      ? await supabase.from("news_posts").update(payload).eq("id", post.id)
      : await supabase.from("news_posts").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(post ? "Post updated" : "Post created");
    onSaved();
  };

  const excerptLength = (form.excerpt ?? "").length;

  return (
    <>
      <SheetHeader className="border-b p-5 text-left">
        <SheetTitle className="font-display">{post ? "Edit post" : "New post"}</SheetTitle>
        <SheetDescription>
          The title is required. The web address is made from it if you leave it empty.
        </SheetDescription>
      </SheetHeader>
      <div className="grid flex-1 content-start gap-5 overflow-y-auto p-5">
        <div className="grid gap-2">
          <FieldLabel htmlFor="n-title">Title</FieldLabel>
          <Input
            id="n-title"
            value={form.title}
            aria-invalid={triedSave && !form.title}
            onChange={(e) =>
              setForm({
                ...form,
                title: e.target.value,
                slug: form.slug || slugify(e.target.value),
              })
            }
            className="text-base font-medium"
          />
          {triedSave && !form.title && <p className="text-xs text-destructive">Enter a title.</p>}
        </div>
        <div className="grid gap-2">
          <FieldLabel htmlFor="n-slug">Web address</FieldLabel>
          <div className="flex items-center overflow-clip rounded-md border border-input bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <span className="label-mono select-none border-r bg-subnav px-3 py-3 text-muted-foreground">
              /news/
            </span>
            <input
              id="n-slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
              className="h-11 min-w-0 flex-1 bg-transparent px-3 font-mono text-xs focus:outline-none md:h-10"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor="n-excerpt">Short summary (shown on listings)</FieldLabel>
            <span
              className={`label-mono ${excerptLength > 180 ? "text-warning" : "text-muted-foreground"}`}
            >
              {excerptLength}
            </span>
          </div>
          <Textarea
            id="n-excerpt"
            rows={2}
            value={form.excerpt ?? ""}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <FieldLabel htmlFor="n-body">Story</FieldLabel>
            <FileButton accept="image/*" busy={busy} onChange={onUploadBodyImage} Icon={Upload}>
              Insert image
            </FileButton>
          </div>
          <Textarea
            id="n-body"
            ref={bodyRef}
            placeholder={
              "Write paragraphs separated by blank lines.\nEmbed images using: ![alt text](https://image-url.jpg)"
            }
            rows={12}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Tip: &ldquo;Insert image&rdquo; uploads a photo and drops it at your cursor in the
            story.
          </p>
        </div>
        <div className="grid gap-2">
          <FieldLabel>Cover image</FieldLabel>
          <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-subnav p-3">
            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md bg-navy">
              {form.cover_image_url && (
                <img
                  src={form.cover_image_url}
                  alt=""
                  width={96}
                  height={64}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <FileButton accept="image/*" busy={busy} onChange={onUploadCover} Icon={Upload}>
                {form.cover_image_url ? "Replace cover" : "Upload cover"}
              </FileButton>
              {form.cover_image_url && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setForm({ ...form, cover_image_url: "" })}
                >
                  <X /> Remove
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-4 rounded-lg border bg-surface p-4 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="n-pub" className="font-display text-sm font-semibold">
              <span className="block">Published</span>
              <span className="block text-xs font-normal text-muted-foreground">
                {form.published ? "Visible on the site" : "Saved as a draft"}
              </span>
            </label>
            <Switch
              id="n-pub"
              checked={form.published}
              onCheckedChange={(v) => setForm({ ...form, published: v })}
            />
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="n-date">Date</FieldLabel>
            <Input
              id="n-date"
              type="date"
              value={form.published_at}
              onChange={(e) => setForm({ ...form, published_at: e.target.value })}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t p-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Save />}
          {form.published ? "Save and publish" : "Save draft"}
        </Button>
      </div>
    </>
  );
}
