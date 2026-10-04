import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Save, Trash2, Upload, Users, X } from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/page-parts";
import {
  AdminIntro,
  FieldLabel,
  FileButton,
  Panel,
  RowMenu,
  RowsSkeleton,
  SearchField,
  useConfirm,
} from "./shared";

const BLANK_STAFF = { name: "", position: "", bio: "", photo_url: "", sort_order: 0 };

export function StaffEditor() {
  const qc = useQueryClient();
  const { ask, dialog } = useConfirm();
  const { data: staff, isLoading } = useQuery({
    queryKey: ["staff_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [form, setForm] = useState(BLANK_STAFF);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [triedSave, setTriedSave] = useState(false);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (staff ?? []).filter(
      (s) => !q || s.name.toLowerCase().includes(q) || s.position.toLowerCase().includes(q),
    );
  }, [staff, query]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["staff_admin"] });
    qc.invalidateQueries({ queryKey: ["staff"] });
    qc.invalidateQueries({ queryKey: ["ov_staff"] });
  };

  const startNew = () => {
    setEditingId(null);
    setForm(BLANK_STAFF);
    setTriedSave(false);
    setOpen(true);
  };

  const startEdit = (s: NonNullable<typeof staff>[number]) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      position: s.position,
      bio: s.bio ?? "",
      photo_url: s.photo_url ?? "",
      sort_order: s.sort_order ?? 0,
    });
    setTriedSave(false);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditingId(null);
    setForm(BLANK_STAFF);
  };

  const save = async () => {
    setTriedSave(true);
    if (!form.name || !form.position) return toast.error("Name and position are required");
    setBusy(true);
    const payload = { ...form };
    const { error } = editingId
      ? await supabase.from("staff").update(payload).eq("id", editingId)
      : await supabase.from("staff").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Staff member updated" : "Staff member added");
    close();
    refresh();
  };

  const remove = async (id: string, name: string) => {
    if (
      !(await ask(
        `Remove ${name}?`,
        "They will disappear from the Staff page. This cannot be undone.",
        "Remove",
      ))
    )
      return;
    const { error } = await supabase.from("staff").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Staff member removed");
    if (editingId === id) close();
    refresh();
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadMedia(file, "staff");
      setForm((f) => ({ ...f, photo_url: url }));
      toast.success("Photo uploaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <AdminIntro
        Icon={Users}
        label="Staff"
        title="Teachers and leaders."
        summary="Everyone listed here appears on the Staff page. Lower order numbers come first."
        action={
          <Button onClick={startNew}>
            <Plus /> Add staff member
          </Button>
        }
      />

      {isLoading ? (
        <RowsSkeleton />
      ) : staff && staff.length > 0 ? (
        <Panel
          title={`${staff.length} ${staff.length === 1 ? "person" : "people"}`}
          action={
            <SearchField
              label="Search staff"
              placeholder="Search name or role"
              value={query}
              onChange={setQuery}
              className="w-full sm:w-64"
            />
          }
        >
          {shown.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No one matches &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <ul>
              {shown.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/60 sm:gap-4 sm:px-5"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-navy">
                    {s.photo_url ? (
                      <img
                        src={s.photo_url}
                        alt=""
                        width={56}
                        height={56}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-gold"
                        aria-hidden="true"
                      >
                        {s.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(s)}
                    className="min-h-11 min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate font-display text-base font-semibold">
                      {s.name}
                    </span>
                    <span className="label-mono block truncate text-navy">{s.position}</span>
                    {s.bio && (
                      <span className="mt-0.5 line-clamp-1 hidden text-sm text-muted-foreground sm:block">
                        {s.bio}
                      </span>
                    )}
                  </button>
                  <span className="label-mono hidden rounded-sm bg-secondary px-2 py-0.5 text-muted-foreground sm:block">
                    Order {s.sort_order ?? 0}
                  </span>
                  <RowMenu
                    label={`Actions for ${s.name}`}
                    actions={[
                      { label: "Edit", Icon: Pencil, onSelect: () => startEdit(s) },
                      {
                        label: "Remove",
                        Icon: Trash2,
                        danger: true,
                        separatorBefore: true,
                        onSelect: () => remove(s.id, s.name),
                      },
                    ]}
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : (
        <EmptyState
          Icon={Users}
          title="No staff added yet"
          body="Add the first staff member to show them on the Staff page."
        />
      )}

      <Sheet open={open} onOpenChange={(o) => !o && close()}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b p-5 text-left">
            <SheetTitle className="font-display">
              {editingId ? "Edit staff member" : "Add a staff member"}
            </SheetTitle>
            <SheetDescription>Name and position are required.</SheetDescription>
          </SheetHeader>
          <div className="grid flex-1 content-start gap-5 overflow-y-auto p-5">
            <div className="flex items-center gap-4 rounded-lg border bg-subnav p-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-navy">
                {form.photo_url ? (
                  <img
                    src={form.photo_url}
                    alt=""
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center font-display text-2xl font-bold text-gold"
                    aria-hidden="true"
                  >
                    {form.name.slice(0, 1).toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <FileButton accept="image/*" busy={busy} onChange={uploadPhoto} Icon={Upload}>
                  {form.photo_url ? "Replace photo" : "Upload photo"}
                </FileButton>
                {form.photo_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setForm({ ...form, photo_url: "" })}
                  >
                    <X /> Remove
                  </Button>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="s-name">Name</FieldLabel>
              <Input
                id="s-name"
                value={form.name}
                aria-invalid={triedSave && !form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {triedSave && !form.name && <p className="text-xs text-destructive">Enter a name.</p>}
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="s-pos">Position</FieldLabel>
              <Input
                id="s-pos"
                placeholder="For example Head Teacher"
                value={form.position}
                aria-invalid={triedSave && !form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
              {triedSave && !form.position && (
                <p className="text-xs text-destructive">Enter a position.</p>
              )}
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="s-bio">Short bio</FieldLabel>
              <Textarea
                id="s-bio"
                rows={4}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="s-order">Order (lower appears first)</FieldLabel>
              <Input
                id="s-order"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                className="w-28"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t p-4">
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : editingId ? <Save /> : <Plus />}
              {editingId ? "Save changes" : "Add staff member"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      {dialog}
    </div>
  );
}
