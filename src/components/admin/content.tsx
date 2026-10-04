import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Save,
  Trash2,
  Undo,
  Upload,
  Website,
} from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/media";
import { DEFAULTS } from "@/lib/use-site-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EASE } from "@/components/motion";
import { cn } from "@/lib/utils";
import {
  AdminIntro,
  FieldLabel,
  FileButton,
  Panel,
  RowsSkeleton,
  SearchField,
  StatusChip,
  useConfirm,
} from "./shared";

/* -------------------- Downloads list -------------------- */

function DocumentUploader({ onUpload }: { onUpload: (name: string, url: string) => void }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadMedia(file, "downloads");
      const displayName = file.name.split(".").slice(0, -1).join(" ").replace(/[-_]/g, " ");
      onUpload(displayName, url);
      toast.success("Document uploaded", { description: "Remember to save your changes." });
    } catch (err: unknown) {
      console.error("Upload error:", err);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <FileButton
      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
      busy={uploading}
      onChange={handleFileChange}
      Icon={Upload}
    >
      Upload document
    </FileButton>
  );
}

function DownloadsListEditor({
  value,
  onChange,
  onRemove,
  dirty,
  saving,
  onSave,
}: {
  value: string;
  onChange: (val: string) => void;
  /** Removes one document and saves straight away. */
  onRemove: (index: number, title: string) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const items = value
    .split("\n")
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split("|");
      const title = parts[0]?.trim() || "";
      const url = parts.slice(1).join("|")?.trim() || "";
      return { id: `${index}-${title}`, title, url };
    });

  const updateItems = (newItems: typeof items) => {
    const serialized = newItems
      .map((item) => `${item.title.trim()} | ${item.url.trim()}`)
      .join("\n");
    onChange(serialized);
  };

  const patch = (index: number, change: Partial<(typeof items)[number]>) => {
    const next = [...items];
    next[index] = { ...next[index], ...change };
    updateItems(next);
  };

  return (
    <Panel
      title="Documents"
      action={
        <div className="flex items-center gap-3">
          <span className="label-mono text-muted-foreground">
            {items.length} {items.length === 1 ? "file" : "files"}
          </span>
          {dirty && (
            <Button type="button" size="sm" onClick={onSave} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              Save documents
            </Button>
          )}
        </div>
      }
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-md border bg-secondary text-navy">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-3 font-display text-base font-semibold">No documents yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Upload a file or add a link below.</p>
        </div>
      ) : (
        <ul>
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:px-5"
            >
              <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-navy sm:flex">
                <FileText className="h-5 w-5" />
              </span>
              <div className="grid flex-1 gap-2">
                <Input
                  aria-label="Document title"
                  placeholder="Document title (for example 2026 Prospectus)"
                  value={item.title}
                  onChange={(e) => patch(index, { title: e.target.value })}
                  className="font-medium"
                />
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Document URL"
                    placeholder="https://..."
                    value={item.url}
                    onChange={(e) => patch(index, { url: e.target.value })}
                    className="font-mono text-xs md:text-xs"
                  />
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Open link in a new tab"
                      className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-md border hover:bg-muted md:h-10 md:w-10"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => onRemove(index, item.title)}
                aria-label={`Remove ${item.title || "document"}`}
                className="self-end sm:self-start"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2 bg-subnav p-3 sm:px-5">
        <DocumentUploader
          onUpload={(fileName, url) =>
            updateItems([...items, { id: String(Date.now()), title: fileName, url }])
          }
        />
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            updateItems([...items, { id: String(Date.now()), title: "New document", url: "" }])
          }
        >
          <Plus /> Add link
        </Button>
      </div>
    </Panel>
  );
}

/* -------------------- Website text -------------------- */

const PAGE_ORDER = [
  "home",
  "about",
  "academics",
  "admissions",
  "schoolLife",
  "facilities",
  "contact",
  "downloads",
];

const PAGE_LABELS: Record<string, string> = {
  home: "Home",
  about: "About",
  academics: "Academics",
  admissions: "Admissions",
  schoolLife: "School life",
  facilities: "Facilities",
  contact: "Contact",
  downloads: "Downloads",
};

const PAGE_ROUTES: Record<string, string> = {
  home: "/",
  about: "/about",
  academics: "/academics",
  admissions: "/admissions",
  schoolLife: "/school-life",
  facilities: "/facilities",
  contact: "/contact",
  downloads: "/downloads",
};

/** "schoolLife.partnership.title" becomes "Partnership: Title". */
function friendly(key: string) {
  const words = key
    .split(".")
    .slice(1)
    .map((seg) => {
      const spaced = seg.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
      return spaced.charAt(0).toUpperCase() + spaced.slice(1);
    });
  return words.join(": ") || key;
}

const LONG_SUFFIXES = [
  ".body",
  ".story",
  ".steps",
  ".subtitle",
  ".intro",
  ".mission",
  ".vision",
  ".address",
  ".items",
  ".bands",
  ".rows",
];

function hintFor(key: string) {
  if (key.startsWith("about.values."))
    return "Three lines: the value's name, a description, then its motto.";
  if (/\.(items|steps|bands|rows)$/.test(key))
    return "One item per line. Keep the | divider where a line already has one.";
  return null;
}

type ContentMap = Record<string, string>;

export function WebsiteEditor() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["site_content_admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_content").select("key, value");
      if (error) throw error;
      const map: ContentMap = { ...DEFAULTS };
      for (const r of data ?? []) map[r.key] = r.value;
      return map;
    },
  });

  const [values, setValues] = useState<ContentMap>({});
  const [saved, setSaved] = useState<ContentMap>({});
  const [saving, setSaving] = useState<string | "all" | null>(null);
  const [active, setActive] = useState<string>("home");
  const [query, setQuery] = useState("");
  const { ask, dialog } = useConfirm();
  const loaded = useRef(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Take the stored copy once. Later refetches never overwrite what is being typed.
  useEffect(() => {
    if (data && !loaded.current) {
      loaded.current = true;
      setValues(data);
      setSaved(data);
    }
  }, [data]);

  const dirtyKeys = useMemo(
    () => Object.keys(values).filter((k) => values[k] !== saved[k]),
    [values, saved],
  );

  useEffect(() => {
    if (dirtyKeys.length === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirtyKeys.length]);

  const groups = useMemo(() => {
    const g: Record<string, string[]> = {};
    // Keep the order the pages are written in (the defaults), not alphabetical.
    for (const key of Object.keys(values)) (g[key.split(".")[0]] ||= []).push(key);
    return g;
  }, [values]);

  const pages = useMemo(() => {
    const names = Object.keys(groups);
    return [
      ...PAGE_ORDER.filter((n) => names.includes(n)),
      ...names.filter((n) => !PAGE_ORDER.includes(n)),
    ];
  }, [groups]);

  const current = groups[active] ? active : pages[0];
  const q = query.trim().toLowerCase();
  const fields = (groups[current] ?? []).filter(
    (k) =>
      !q ||
      friendly(k).toLowerCase().includes(q) ||
      k.toLowerCase().includes(q) ||
      (values[k] ?? "").toLowerCase().includes(q),
  );

  const persist = async (
    keys: string[],
    which: string | "all",
    override?: Record<string, string>,
  ) => {
    setSaving(which);
    try {
      const rows = keys.map((key) => ({ key, value: override?.[key] ?? values[key] ?? "" }));
      const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      setSaved((s) => ({ ...s, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) }));
      toast.success(keys.length > 1 ? `${keys.length} changes saved` : "Saved", {
        description: keys.length === 1 ? friendly(keys[0]) : "Your website is up to date.",
      });
      qc.invalidateQueries({ queryKey: ["site_content"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(null);
    }
  };

  const removeDocument = async (index: number, title: string) => {
    if (
      !(await ask(
        `Remove ${title || "this document"}?`,
        "It will disappear from the Downloads page straight away.",
        "Remove",
      ))
    )
      return;
    const lines = (values["downloads.items"] ?? "").split("\n").filter(Boolean);
    const next = lines.filter((_, i) => i !== index).join("\n");
    setValues((v) => ({ ...v, "downloads.items": next }));
    await persist(["downloads.items"], "downloads.items", { "downloads.items": next });
  };

  const revert = (keys: string[]) =>
    setValues((v) => ({ ...v, ...Object.fromEntries(keys.map((k) => [k, saved[k] ?? ""])) }));

  const dirtyIn = (g: string) => (groups[g] ?? []).filter((k) => dirtyKeys.includes(k)).length;

  return (
    <div className="space-y-6">
      <AdminIntro
        Icon={Website}
        label="Website text"
        title="Edit your pages."
        summary="Pick a page, change the words and save. Visitors see the new text straight away."
        action={
          current &&
          PAGE_ROUTES[current] && (
            <Button asChild variant="outline">
              <a href={PAGE_ROUTES[current]} target="_blank" rel="noreferrer">
                View {PAGE_LABELS[current] ?? current} page <ExternalLink />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Button>
          )
        }
      />

      {isLoading ? (
        <RowsSkeleton rows={5} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[13.5rem_1fr] lg:gap-8">
          {/* Page list: a rail on desktop, scrolling chips on phones */}
          <nav
            aria-label="Pages"
            className="-mx-[1.125rem] flex gap-1.5 overflow-x-auto px-[1.125rem] pb-1 sm:-mx-6 sm:px-6 lg:sticky lg:top-24 lg:mx-0 lg:block lg:self-start lg:space-y-0.5 lg:overflow-visible lg:px-0 lg:pb-0"
          >
            {pages.map((g) => {
              const n = dirtyIn(g);
              const on = g === current;
              return (
                <button
                  key={g}
                  type="button"
                  aria-current={on ? "page" : undefined}
                  onClick={() => {
                    setActive(g);
                    setQuery("");
                  }}
                  className={cn(
                    "press flex h-11 shrink-0 items-center justify-between gap-3 rounded-md border px-3.5 font-display text-sm font-semibold lg:w-full lg:border-transparent",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-surface hover:bg-muted lg:bg-transparent",
                  )}
                >
                  {PAGE_LABELS[g] ?? g}
                  {n > 0 && (
                    <span
                      className={cn(
                        "label-mono rounded-sm px-1.5 py-px",
                        on ? "bg-white/20" : "bg-warning-soft text-warning",
                      )}
                    >
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="min-w-0 space-y-4 pb-24 lg:pb-16">
            <SearchField
              label={`Search the ${PAGE_LABELS[current] ?? current} page`}
              placeholder={`Search ${PAGE_LABELS[current] ?? current} text`}
              value={query}
              onChange={setQuery}
              className="max-w-md"
            />

            {fields.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-surface px-5 py-10 text-center text-sm text-muted-foreground">
                Nothing on this page matches &ldquo;{query}&rdquo;.
              </p>
            ) : (
              <Panel title={PAGE_LABELS[current] ?? current}>
                {fields.map((k) => {
                  const dirty = dirtyKeys.includes(k);
                  const isLong =
                    (values[k]?.length ?? 0) > 80 || LONG_SUFFIXES.some((s) => k.endsWith(s));
                  const hint = hintFor(k);
                  if (k === "downloads.items") return null;
                  return (
                    <div
                      key={k}
                      className={cn(
                        "grid gap-2 border-b p-4 last:border-b-0 sm:px-5 md:grid-cols-[minmax(0,12rem)_1fr] md:gap-5",
                        dirty && "bg-warning-soft/40",
                      )}
                    >
                      <div className="min-w-0">
                        <FieldLabel htmlFor={`f-${k}`}>{friendly(k)}</FieldLabel>
                        <p className="mt-1 hidden truncate font-mono text-[11px] text-muted-foreground/70 md:block">
                          {k}
                        </p>
                      </div>
                      <div className="grid gap-2">
                        {isLong ? (
                          <Textarea
                            id={`f-${k}`}
                            rows={Math.max(
                              3,
                              Math.min(10, Math.ceil((values[k]?.length ?? 0) / 80)),
                            )}
                            value={values[k] ?? ""}
                            onChange={(e) => setValues({ ...values, [k]: e.target.value })}
                          />
                        ) : (
                          <Input
                            id={`f-${k}`}
                            value={values[k] ?? ""}
                            onChange={(e) => setValues({ ...values, [k]: e.target.value })}
                          />
                        )}
                        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
                        {dirty && (
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusChip tone="amber">Unsaved</StatusChip>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => revert([k])}
                            >
                              <Undo /> Undo
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => persist([k], k)}
                              disabled={saving !== null}
                            >
                              {saving === k ? <Loader2 className="animate-spin" /> : <Save />}
                              Save
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </Panel>
            )}

            {current === "downloads" && !q && (
              <DownloadsListEditor
                value={values["downloads.items"] ?? ""}
                onChange={(v) => setValues({ ...values, "downloads.items": v })}
                dirty={dirtyKeys.includes("downloads.items")}
                saving={saving === "downloads.items"}
                onSave={() => persist(["downloads.items"], "downloads.items")}
                onRemove={removeDocument}
              />
            )}
          </div>
        </div>
      )}

      {dialog}

      {/* Sticky save bar while anything is unsaved. Portalled so the page-enter transform
          on the screen never turns "fixed" into "fixed to the screen". */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {dirtyKeys.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
                transition={{ duration: 0.3, ease: EASE }}
                role="region"
                aria-label="Unsaved changes"
                className="fixed inset-x-3 bottom-[5.25rem] z-40 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-lg border bg-surface p-2.5 pl-4 shadow-[0_18px_40px_-18px_oklch(0.22_0.09_264/0.55)] lg:bottom-5"
              >
                <p className="text-sm">
                  <span className="font-display font-semibold">{dirtyKeys.length}</span> unsaved{" "}
                  {dirtyKeys.length === 1 ? "change" : "changes"}
                </p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => revert(dirtyKeys)}>
                    Discard
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => persist(dirtyKeys, "all")}
                    disabled={saving !== null}
                  >
                    {saving === "all" ? <Loader2 className="animate-spin" /> : <Save />}
                    Save all
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
