import { useCallback, useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, MoreHorizontal, Search, X, type LucideIcon } from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CountUp, EASE } from "@/components/motion";
import { cn } from "@/lib/utils";

/** Confirm prompt that replaces window.confirm. `ask()` resolves true or false. */
export function useConfirm() {
  const [state, setState] = useState<{ title: string; body: string; action: string } | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const ask = useCallback(
    (title: string, body: string, action = "Delete") =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setState({ title, body, action });
      }),
    [],
  );

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setState(null);
  };

  const dialog = (
    <AlertDialog open={!!state} onOpenChange={(o) => !o && close(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">{state?.title}</AlertDialogTitle>
          <AlertDialogDescription>{state?.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => close(true)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {state?.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { ask, dialog };
}

/** Page intro: a small mono label with its icon, the title, one line of summary, an action. */
export function AdminIntro({
  Icon,
  label,
  title,
  summary,
  action,
}: {
  Icon?: LucideIcon;
  label?: string;
  title: string;
  summary?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rise flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {label && (
          <p className="label-mono flex items-center gap-2 text-muted-foreground">
            {Icon && <Icon className="h-4 w-4 text-navy" />}
            {label}
          </p>
        )}
        <h1 className="mt-1.5 font-display text-[1.75rem] font-bold leading-[1.1] tracking-[-0.035em] sm:text-[2.2rem]">
          {title}
        </h1>
        {summary && <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">{summary}</p>}
      </div>
      {action}
    </div>
  );
}

export type Tone = "navy" | "green" | "amber" | "gold";

const TONES: Record<Tone, { tile: string; bar: string }> = {
  navy: { tile: "bg-secondary text-navy", bar: "bg-navy" },
  green: { tile: "bg-success-soft text-success", bar: "bg-success" },
  amber: { tile: "bg-warning-soft text-warning", bar: "bg-warning" },
  gold: { tile: "bg-gold-soft text-navy-deep", bar: "bg-gold" },
};

export type Stat = {
  label: string;
  value: number | null;
  note?: string;
  Icon: LucideIcon;
  tone?: Tone;
};

/** One bordered box split into cells by hairlines. Numbers count up once. */
export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <ul
      className="grid grid-cols-2 gap-px overflow-clip rounded-lg border bg-border lg:grid-cols-4 [&>li]:bg-surface"
      aria-label="The site at a glance"
    >
      {stats.map(({ label, value, note, Icon, tone = "navy" }) => (
        <li key={label} className="relative p-4 sm:p-5">
          <span
            aria-hidden="true"
            className={cn("absolute inset-x-0 top-0 h-[3px]", TONES[tone].bar)}
          />
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                TONES[tone].tile,
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <p className="label-mono text-muted-foreground">{label}</p>
          </div>
          <p className="mt-3 font-display text-4xl font-bold leading-none tracking-[-0.04em]">
            {value === null ? (
              <span className="shimmer inline-block h-9 w-12 rounded-md align-middle" />
            ) : (
              <CountUp value={String(value)} />
            )}
          </p>
          {note && <p className="mt-2 text-[13px] text-muted-foreground">{note}</p>}
        </li>
      ))}
    </ul>
  );
}

/** Bordered panel: a header row (title and action) above hairline-divided rows. */
export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-clip rounded-lg border bg-surface", className)}>
      {(title || action) && (
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b px-4 py-2 sm:px-5">
          {title && <h2 className="font-display text-base font-bold tracking-tight">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** Counted tabs: one joined box whose active cell slides between the options. */
export function Segmented<T extends string>({
  value,
  onChange,
  items,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: string; count?: number }[];
  label: string;
  className?: string;
}) {
  const uid = useId();
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("inline-flex overflow-clip rounded-md border bg-surface", className)}
    >
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(it.id)}
            className={cn(
              "relative flex h-11 items-center gap-2 border-r px-3.5 font-display text-sm font-semibold transition-colors last:border-r-0 md:h-10",
              active ? "text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${uid}`}
                className="absolute inset-0 bg-primary"
                transition={{ duration: 0.3, ease: EASE }}
              />
            )}
            <span className="relative">{it.label}</span>
            {it.count !== undefined && (
              <span
                className={cn(
                  "label-mono relative rounded-sm px-1.5 py-px",
                  active ? "bg-white/15" : "bg-secondary",
                )}
              >
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export type MenuAction = {
  label: string;
  Icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  separatorBefore?: boolean;
};

/** The "..." menu at the end of a row. */
export function RowMenu({ label, actions }: { label: string; actions: MenuAction[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-muted data-[state=open]:bg-muted md:h-10 md:w-10"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {actions.map((a) => (
          <div key={a.label}>
            {a.separatorBefore && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onSelect={a.onSelect}
              className={cn(
                "min-h-11 font-display font-semibold md:min-h-9",
                a.danger && "text-destructive focus:bg-danger-soft focus:text-destructive",
              )}
            >
              <a.Icon /> {a.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Search box with the icon inside at the left and a clear button. */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-md border border-input bg-surface pl-9 pr-10 text-base transition-[border-color,box-shadow] placeholder:text-muted-foreground/80 hover:border-foreground/30 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 md:h-10 md:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground md:h-10 md:w-10"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Label with a small mono caption style, used above fields. */
export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="label-mono block text-muted-foreground">
      {children}
    </label>
  );
}

/** File picker styled as a button. Keeps the native input hidden but reachable. */
export function FileButton({
  children,
  accept,
  multiple,
  disabled,
  busy,
  onChange,
  variant = "outline",
  Icon,
}: {
  children: React.ReactNode;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  busy?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  variant?: "outline" | "solid";
  Icon: LucideIcon;
}) {
  return (
    <label
      className={cn(
        "press inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md px-4 font-display text-sm font-semibold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring md:h-10",
        variant === "solid"
          ? "bg-primary text-primary-foreground hover:bg-navy-deep"
          : "border border-dashed border-input bg-surface hover:bg-muted",
        (disabled || busy) && "pointer-events-none opacity-60",
      )}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Icon className="h-4 w-4" aria-hidden="true" />
      )}
      {children}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={onChange}
        disabled={disabled || busy}
      />
    </label>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="overflow-clip rounded-lg border bg-surface" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b p-4 last:border-b-0">
          <div className="shimmer h-10 w-10 rounded-md" />
          <div className="flex-1 space-y-2">
            <div className="shimmer h-4 w-1/3 rounded-md" />
            <div className="shimmer h-3 w-1/2 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatusChip({
  tone,
  children,
}: {
  tone: "green" | "amber" | "blue" | "muted";
  children: React.ReactNode;
}) {
  const style = {
    green: "bg-success-soft text-success",
    amber: "bg-warning-soft text-warning",
    blue: "bg-secondary text-navy",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <span
      className={cn("label-mono inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5", style)}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
