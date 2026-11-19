import { ArrowDownToLine, FileText } from "@/components/icons";
import { cn } from "@/lib/utils";

type Kind = "receipt" | "admission-form" | "class-form" | "all" | "passport" | "birth-certificate";

const LABELS: Record<Kind, { title: string; note: string }> = {
  receipt: { title: "Payment receipt", note: "PDF" },
  "admission-form": { title: "Admission Form", note: "Form 1 and Form 2, PDF" },
  "class-form": { title: "Class Form", note: "Student Information Sheet and Home/School Agreement, PDF" },
  all: { title: "All three documents", note: "ZIP file" },
  passport: { title: "Passport photograph", note: "As uploaded" },
  "birth-certificate": { title: "Birth certificate", note: "As uploaded" },
};

/**
 * Each download is a small POST form, so the private token travels in the request body and
 * never in a URL. The server answers with the file itself.
 */
export function DownloadButtons({
  reference,
  token,
  audience,
  kinds,
}: {
  reference: string;
  token: string;
  audience: "parent" | "school";
  kinds: Kind[];
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {kinds.map((kind) => (
        <li key={kind}>
          <form method="post" action="/api/admissions/documents" target={kind === "passport" || kind === "birth-certificate" ? "_blank" : undefined}>
            <input type="hidden" name="ref" value={reference} />
            <input type="hidden" name="t" value={token} />
            <input type="hidden" name="aud" value={audience} />
            <input type="hidden" name="kind" value={kind} />
            <button
              type="submit"
              className={cn(
                "press flex min-h-16 w-full items-center gap-3 rounded-lg border bg-surface px-4 py-3 text-left hover:border-navy",
                kind === "all" && "border-navy/40 bg-navy/5",
              )}
            >
              <FileText className="h-6 w-6 shrink-0 text-navy" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-display font-semibold">{LABELS[kind].title}</span>
                <span className="block text-sm text-muted-foreground">{LABELS[kind].note}</span>
              </span>
              <ArrowDownToLine className="h-5 w-5 shrink-0 text-navy" aria-hidden="true" />
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
