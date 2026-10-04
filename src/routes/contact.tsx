import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowUpRight,
  Clock,
  Facebook,
  Instagram,
  MapPin,
  Send,
  Youtube,
  XLogoIcon as XIcon,
} from "@/components/icons";
import { useSiteContent } from "@/lib/use-site-content";
import { PaperHeader } from "@/components/page-parts";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendEnquiry } from "@/lib/api/contact.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact - Bomas Academy" },
      {
        name: "description",
        content:
          "Get in touch with the Bomas Academy admissions and main office in Jos, Plateau State.",
      },
      { property: "og:title", content: "Contact - Bomas Academy" },
      {
        property: "og:description",
        content:
          "Get in touch with the Bomas Academy admissions and main office in Jos, Plateau State.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const c = useSiteContent();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const socials = [
    { Icon: Facebook, href: c["contact.facebook"], label: "Facebook" },
    { Icon: Instagram, href: c["contact.instagram"], label: "Instagram" },
    { Icon: XIcon, href: c["contact.x"], label: "X" },
    { Icon: Youtube, href: c["contact.youtube"], label: "YouTube" },
  ].filter((s) => s.href);

  return (
    <>
      <PaperHeader
        trail="Contact"
        title="Come say hello."
        intro="We would love to meet your family and show you around our campus in Jos."
      />
      <section className="container-wide grid gap-12 py-14 lg:grid-cols-[6fr_6fr] lg:gap-20 lg:py-24">
        {/* The ways in, set as large links */}
        <div className="space-y-10">
          <div>
            <p className="label-mono text-muted-foreground">Call</p>
            <a
              href={`tel:${c["contact.phone"].replace(/\s/g, "")}`}
              className="mt-2 flex min-h-11 items-center gap-2 font-display text-[clamp(2rem,5vw,3.4rem)] font-bold leading-none tracking-[-0.04em] text-navy-deep hover:text-navy"
            >
              {c["contact.phone"]}
              <ArrowUpRight className="h-7 w-7 shrink-0 text-gold" aria-hidden="true" />
            </a>
          </div>
          <div>
            <p className="label-mono text-muted-foreground">Write</p>
            <a
              href={`mailto:${c["contact.email"]}`}
              className="mt-2 flex min-h-11 items-center gap-2 break-all font-display text-[clamp(1.4rem,3vw,2.1rem)] font-bold leading-tight tracking-[-0.03em] text-navy-deep hover:text-navy"
            >
              {c["contact.email"]}
              <ArrowUpRight className="h-6 w-6 shrink-0 text-gold" aria-hidden="true" />
            </a>
          </div>
          <div className="grid gap-6 border-t pt-8 sm:grid-cols-2">
            <div className="flex gap-3">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-navy" aria-hidden="true" />
              <div>
                <p className="label-mono text-muted-foreground">Campus</p>
                <p className="mt-1 whitespace-pre-line font-display text-lg font-semibold">
                  {c["contact.address"]}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Clock className="mt-1 h-5 w-5 shrink-0 text-navy" aria-hidden="true" />
              <div>
                <p className="label-mono text-muted-foreground">Office hours</p>
                <p className="mt-1 font-display text-lg font-semibold">{c["contact.hours"]}</p>
              </div>
            </div>
          </div>
          {socials.length > 0 && (
            <div>
              <p className="label-mono text-muted-foreground">Follow us</p>
              <div className="mt-3 flex items-center gap-2">
                {socials.map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="press flex h-11 w-11 items-center justify-center rounded-md border bg-surface text-navy hover:bg-navy hover:text-white"
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <Reveal direction="left">
          <form
            className="rounded-lg bg-navy-deep p-6 text-white sm:p-10"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = new FormData(form);
              setStatus("sending");
              try {
                await sendEnquiry({
                  data: {
                    name: String(data.get("name") ?? ""),
                    email: String(data.get("email") ?? ""),
                    phone: String(data.get("phone") ?? ""),
                    message: String(data.get("message") ?? ""),
                    website: String(data.get("website") ?? ""),
                  },
                });
                form.reset();
                setStatus("sent");
              } catch {
                setStatus("error");
              }
            }}
          >
            <h2 className="display-xl text-[clamp(1.8rem,3.4vw,2.8rem)]">Send us a message</h2>
            <p className="mt-2 text-sm text-white/70">
              We read every message and usually reply within one working day.
            </p>
            <div className="mt-7 grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-white">
                  Your name
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  autoComplete="name"
                  className="border-white/25 bg-white text-ink"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-white">
                  Your email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="border-white/25 bg-white text-ink"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone" className="text-white">
                  Phone (optional)
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className="border-white/25 bg-white text-ink"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message" className="text-white">
                  How can we help?
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  className="border-white/25 bg-white text-ink"
                />
              </div>
              {/* Honeypot for spam bots, hidden from people and screen readers */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              <Button
                type="submit"
                variant="gold"
                size="lg"
                className="w-full sm:w-fit"
                disabled={status === "sending"}
              >
                <Send aria-hidden="true" /> {status === "sending" ? "Sending..." : "Send message"}
              </Button>
              {status === "sent" && (
                <p role="status" className="rounded-md bg-white/10 px-3 py-2 text-sm">
                  Thank you. Your message has been sent and we will be in touch soon.
                </p>
              )}
              {status === "error" && (
                <p role="alert" className="rounded-md bg-red-500/20 px-3 py-2 text-sm">
                  Sorry, your message could not be sent. Please try again or write to{" "}
                  {c["contact.email"]}.
                </p>
              )}
            </div>
          </form>
        </Reveal>
      </section>
    </>
  );
}
