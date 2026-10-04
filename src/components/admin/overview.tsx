import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Dashboard,
  FileText,
  ImageIcon,
  LayoutList,
  Newspaper,
  Plus,
  Upload,
  Users,
  type LucideIcon,
} from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { AdminIntro, Panel, StatStrip, StatusChip } from "./shared";

export type AdminTab = "overview" | "website" | "staff" | "news" | "gallery";

async function countRows(table: "staff" | "gallery_images") {
  const { count: n, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return n ?? 0;
}

async function countNews(published: boolean) {
  const { count: n, error } = await supabase
    .from("news_posts")
    .select("id", { count: "exact", head: true })
    .eq("published", published);
  if (error) throw error;
  return n ?? 0;
}

const PAGES: { label: string; to: string }[] = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Academics", to: "/academics" },
  { label: "Admissions", to: "/admissions" },
  { label: "School life", to: "/school-life" },
  { label: "Staff", to: "/staff" },
  { label: "News", to: "/news" },
  { label: "Gallery", to: "/gallery" },
  { label: "Facilities", to: "/facilities" },
  { label: "Contact", to: "/contact" },
  { label: "Downloads", to: "/downloads" },
];

const ACTIONS: {
  tab: AdminTab;
  title: string;
  note: string;
  Icon: LucideIcon;
}[] = [
  {
    tab: "news",
    title: "Write a news post",
    note: "Announce an event or share a story.",
    Icon: Newspaper,
  },
  { tab: "gallery", title: "Add photos", note: "Upload several pictures at once.", Icon: Upload },
  {
    tab: "staff",
    title: "Add a staff member",
    note: "Teachers and leaders on the Staff page.",
    Icon: Users,
  },
  {
    tab: "website",
    title: "Edit website text",
    note: "Change wording on any page.",
    Icon: LayoutList,
  },
];

export function Overview({ email, go }: { email: string; go: (tab: AdminTab) => void }) {
  const staff = useQuery({ queryKey: ["ov_staff"], queryFn: () => countRows("staff") });
  const live = useQuery({ queryKey: ["ov_live"], queryFn: () => countNews(true) });
  const drafts = useQuery({ queryKey: ["ov_drafts"], queryFn: () => countNews(false) });
  const photos = useQuery({ queryKey: ["ov_photos"], queryFn: () => countRows("gallery_images") });
  const recent = useQuery({
    queryKey: ["ov_recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("id, title, published, published_at")
        .order("published_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const name = email.split("@")[0];

  return (
    <div className="space-y-6">
      <AdminIntro
        Icon={Dashboard}
        label="Overview"
        title={`Welcome back, ${name}.`}
        summary="Everything on the school website is managed from here. Changes go live as soon as you save them."
        action={
          <Button onClick={() => go("news")}>
            <Plus /> New post
          </Button>
        }
      />

      <StatStrip
        stats={[
          {
            label: "Staff",
            value: staff.data ?? null,
            note: "On the Staff page",
            Icon: Users,
            tone: "navy",
          },
          {
            label: "Published",
            value: live.data ?? null,
            note: "News posts live now",
            Icon: Newspaper,
            tone: "green",
          },
          {
            label: "Drafts",
            value: drafts.data ?? null,
            note: "Hidden until published",
            Icon: FileText,
            tone: "amber",
          },
          {
            label: "Photos",
            value: photos.data ?? null,
            note: "In the gallery",
            Icon: ImageIcon,
            tone: "gold",
          },
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.15fr]">
        <Panel title="Quick actions">
          <ul>
            {ACTIONS.map(({ tab, title, note, Icon }) => (
              <li key={title} className="border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => go(tab)}
                  className="group flex min-h-16 w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-muted sm:px-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-navy">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[15px] font-semibold">{title}</span>
                    <span className="block text-[13px] text-muted-foreground">{note}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Latest news"
          action={
            <button
              type="button"
              onClick={() => go("news")}
              className="inline-flex min-h-11 items-center gap-1 font-display text-sm font-semibold text-navy hover:underline"
            >
              All posts <ArrowRight className="h-4 w-4" />
            </button>
          }
        >
          {recent.isLoading ? (
            <div className="space-y-px" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 border-b p-4 last:border-b-0">
                  <div className="shimmer h-4 w-2/3 rounded-md" />
                </div>
              ))}
            </div>
          ) : recent.data && recent.data.length > 0 ? (
            <ul>
              {recent.data.map((p) => (
                <li key={p.id} className="border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => go("news")}
                    className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted sm:px-5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[15px] font-semibold">
                        {p.title}
                      </span>
                      <span className="label-mono text-muted-foreground">
                        {formatDate(p.published_at)}
                      </span>
                    </span>
                    <StatusChip tone={p.published ? "green" : "amber"}>
                      {p.published ? "Live" : "Draft"}
                    </StatusChip>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-10 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-md border bg-secondary text-navy">
                <Newspaper className="h-5 w-5" />
              </span>
              <p className="mt-3 font-display text-base font-semibold">No posts yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your first story will show up here.
              </p>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="See it live">
        <ul className="flex flex-wrap gap-2 p-4 sm:p-5">
          {PAGES.map((p) => (
            <li key={p.to}>
              <a
                href={p.to}
                target="_blank"
                rel="noreferrer"
                className="press inline-flex h-11 items-center gap-1.5 rounded-md border bg-surface px-3.5 font-display text-sm font-semibold hover:bg-muted md:h-10"
              >
                {p.label}
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
