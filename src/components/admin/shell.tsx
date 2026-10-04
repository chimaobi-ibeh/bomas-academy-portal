import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Account,
  ArrowLeft,
  Dashboard,
  ExternalLink,
  ImageIcon,
  LogOut,
  Newspaper,
  ShieldCheck,
  Users,
  Website,
  type LucideIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EASE } from "@/components/motion";
import { cn } from "@/lib/utils";
import { WebsiteEditor } from "./content";
import { StaffEditor } from "./staff";
import { GalleryEditor } from "./gallery";
import { NewsEditor } from "./news";
import { Overview, type AdminTab } from "./overview";
import logoAsset from "@/assets/bomas-logo.jpg";

const TABS: { id: AdminTab; label: string; Icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", Icon: Dashboard },
  { id: "website", label: "Website", Icon: Website },
  { id: "staff", label: "Staff", Icon: Users },
  { id: "news", label: "News", Icon: Newspaper },
  { id: "gallery", label: "Gallery", Icon: ImageIcon },
];

function isTab(v: string): v is AdminTab {
  return TABS.some((t) => t.id === v);
}

/** Top bar, navigation and the five admin screens. Auth is decided by the route. */
export function AdminShell({
  email,
  userId,
  isAdmin,
  onSignOut,
}: {
  email: string;
  userId: string;
  isAdmin: boolean;
  onSignOut: () => void;
}) {
  const [tab, setTabState] = useState<AdminTab>("overview");

  // The open screen survives a refresh through the address bar (#news and so on),
  // and the browser back button moves between screens.
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1);
      setTabState(isTab(h) ? h : "overview");
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const setTab = (t: AdminTab) => {
    window.location.hash = t;
    window.scrollTo({ top: 0 });
  };

  const initial = email.slice(0, 1).toUpperCase();

  return (
    <div className="min-h-[100dvh] bg-background pb-28 lg:pb-12">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
        <div className="container-wide flex h-16 items-center justify-between gap-4">
          <Link to="/admin" className="flex min-h-11 items-center gap-3" aria-label="Admin home">
            <img
              src={logoAsset}
              alt=""
              width={36}
              height={36}
              className="logo-spin h-9 w-9 rounded-full ring-1 ring-border"
            />
            <span className="leading-tight">
              <span className="block font-display text-[15px] font-bold tracking-[-0.02em]">
                Bomas Academy
              </span>
              <span className="label-mono block text-muted-foreground">Admin</span>
            </span>
          </Link>

          {isAdmin && (
            <nav aria-label="Admin sections" className="hidden items-stretch self-stretch lg:flex">
              {TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={tab === id ? "page" : undefined}
                  className={cn(
                    "relative px-4 font-display text-sm font-semibold transition-colors",
                    tab === id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                  {tab === id && (
                    <motion.span
                      layoutId="admin-underline"
                      className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-sm bg-gold"
                      transition={{ duration: 0.3, ease: EASE }}
                    />
                  )}
                </button>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <a href="/" target="_blank" rel="noreferrer">
                View site <ExternalLink />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="press flex h-11 items-center gap-2 rounded-md border bg-surface pl-1.5 pr-2.5 hover:bg-muted data-[state=open]:bg-muted md:h-10"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground md:h-7 md:w-7">
                    {initial}
                  </span>
                  <Account className="hidden h-4 w-4 text-muted-foreground sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <span className="label-mono block text-muted-foreground">Signed in as</span>
                  <span className="mt-0.5 block truncate font-display text-sm font-semibold">
                    {email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  asChild
                  className="min-h-11 font-display font-semibold md:min-h-9"
                >
                  <a href="/" target="_blank" rel="noreferrer">
                    <ExternalLink /> View site
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={onSignOut}
                  className="min-h-11 font-display font-semibold md:min-h-9"
                >
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {!isAdmin ? (
        <main id="admin-main" className="container-wide py-10">
          <div className="rise mx-auto max-w-xl rounded-lg border bg-surface p-6 sm:p-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-warning-soft text-warning">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
              Not an admin yet
            </h1>
            <p className="mt-3 text-muted-foreground">
              Your account is signed in but does not have admin permissions yet. Open the Cloud
              backend, find your user in the{" "}
              <code className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-[13px]">
                user_roles
              </code>{" "}
              table, and insert a row with your user id and role{" "}
              <code className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-[13px]">
                admin
              </code>
              .
            </p>
            <p className="label-mono mt-5 text-muted-foreground">Your user id</p>
            <code className="mt-1 block break-all rounded-md bg-secondary px-3 py-2 font-mono text-[13px]">
              {userId}
            </code>
            <Button asChild className="mt-6">
              <Link to="/">
                <ArrowLeft /> Back to site
              </Link>
            </Button>
          </div>
        </main>
      ) : (
        <main id="admin-main" className="container-wide py-8 lg:py-10">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {tab === "overview" && <Overview email={email} go={setTab} />}
            {tab === "website" && <WebsiteEditor />}
            {tab === "staff" && <StaffEditor />}
            {tab === "news" && <NewsEditor />}
            {tab === "gallery" && <GalleryEditor />}
          </motion.div>
        </main>
      )}

      {isAdmin && (
        <nav
          aria-label="Admin sections"
          className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 overflow-clip rounded-lg border bg-surface/95 shadow-[0_16px_40px_-20px_oklch(0.22_0.09_264/0.5)] backdrop-blur-md lg:hidden"
        >
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
                tab === id ? "text-navy" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
              {tab === id && (
                <motion.span
                  layoutId="admin-underline-m"
                  className="absolute inset-x-4 top-0 h-[3px] rounded-b-sm bg-gold"
                  transition={{ duration: 0.3, ease: EASE }}
                />
              )}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
