import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DropFiles, ExternalLink, ImageIcon, Loader2, Trash2, Upload } from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/media";
import { EmptyState } from "@/components/page-parts";
import { cn } from "@/lib/utils";
import { AdminIntro, FileButton, Panel, useConfirm } from "./shared";

export function GalleryEditor() {
  const qc = useQueryClient();
  const { ask, dialog } = useConfirm();
  const { data: images, isLoading } = useQuery({
    queryKey: ["gallery_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const busy = progress !== null;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["gallery_admin"] });
    qc.invalidateQueries({ queryKey: ["gallery"] });
    qc.invalidateQueries({ queryKey: ["gallery_home"] });
    qc.invalidateQueries({ queryKey: ["ov_photos"] });
  };

  const uploadFiles = async (list: File[]) => {
    const files = list.filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return toast.error("Choose image files (JPG, PNG or WebP).");
    setProgress({ done: 0, total: files.length });
    let added = 0;
    try {
      for (const file of files) {
        const url = await uploadMedia(file, "gallery");
        const { error } = await supabase
          .from("gallery_images")
          .insert({ image_url: url, title: "" });
        if (error) throw error;
        added += 1;
        setProgress({ done: added, total: files.length });
      }
      toast.success(added > 1 ? `${added} photos added` : "Photo added");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed", {
        description:
          added > 0 ? `${added} of ${files.length} were added before it stopped.` : undefined,
      });
    } finally {
      setProgress(null);
      refresh();
    }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length) await uploadFiles(files);
  };

  const remove = async (id: string) => {
    if (
      !(await ask(
        "Remove this image?",
        "It will disappear from the gallery. This cannot be undone.",
        "Remove",
      ))
    )
      return;
    const { error } = await supabase.from("gallery_images").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Image removed");
    refresh();
  };

  return (
    <div className="space-y-6">
      <AdminIntro
        Icon={ImageIcon}
        label="Gallery"
        title="Photos."
        summary="Shown on the Gallery page and the home page. Large phone photos are shrunk automatically before they upload."
        action={
          <FileButton
            accept="image/*"
            multiple
            busy={busy}
            onChange={onUpload}
            Icon={Upload}
            variant="solid"
          >
            {progress ? `Uploading ${progress.done + 1} of ${progress.total}` : "Upload photos"}
          </FileButton>
        }
      />

      {/* Drop zone: drag photos here, or use the button above */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) void uploadFiles(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "hidden items-center gap-4 rounded-lg border border-dashed px-5 py-4 transition-colors md:flex",
          dragging ? "border-primary bg-secondary" : "bg-surface",
        )}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-navy">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <DropFiles className="h-6 w-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-semibold">
            {progress ? "Uploading your photos" : "Drag photos here"}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {progress
              ? `${progress.done} of ${progress.total} done`
              : "Drop as many as you like. Each one is added to the gallery."}
          </p>
        </div>
        {progress && (
          <div
            className="h-1.5 w-40 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuenow={progress.done}
            aria-valuemax={progress.total}
          >
            <div
              className="h-full origin-left rounded-full bg-gold transition-transform duration-300"
              style={{ transform: `scaleX(${progress.done / progress.total})` }}
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5" aria-busy="true">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="shimmer aspect-square rounded-lg" />
          ))}
        </div>
      ) : images && images.length > 0 ? (
        <Panel
          title={`${images.length} ${images.length === 1 ? "photo" : "photos"}`}
          action={<span className="label-mono text-muted-foreground">Newest first</span>}
        >
          <ul className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 sm:p-4 lg:grid-cols-5">
            {images.map((img) => (
              <li
                key={img.id}
                className="group relative overflow-hidden rounded-md border bg-secondary"
              >
                <img
                  src={img.image_url}
                  alt={img.title ?? ""}
                  width={400}
                  height={400}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1.5 bg-gradient-to-t from-navy-deep/80 to-transparent p-2 pt-8 md:opacity-0 md:transition-opacity md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                  <a
                    href={img.image_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open photo in a new tab"
                    className="press flex h-11 w-11 items-center justify-center rounded-md bg-surface/95 text-foreground hover:bg-surface md:h-9 md:w-9"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => remove(img.id)}
                    aria-label="Remove photo"
                    className="press flex h-11 w-11 items-center justify-center rounded-md bg-surface/95 text-destructive hover:bg-destructive hover:text-destructive-foreground md:h-9 md:w-9"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : (
        <EmptyState
          Icon={ImageIcon}
          title="No photos yet"
          body="Upload the first photos to show them on the Gallery page."
        />
      )}
      {dialog}
    </div>
  );
}
