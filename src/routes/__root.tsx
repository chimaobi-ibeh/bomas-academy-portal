import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  type ErrorComponentProps,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { fetchContent, orNothing } from "@/lib/data";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/bomas-logo.jpg";

function StatusPage({
  code,
  title,
  body,
  children,
}: {
  code: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute select-none font-display text-[clamp(10rem,38vw,26rem)] font-bold leading-none tracking-tighter text-navy/[0.06]"
      >
        {code}
      </span>
      <div className="rise relative w-full max-w-md rounded-lg border bg-surface p-7 text-center sm:p-9">
        <img
          src={logoAsset}
          alt=""
          width={48}
          height={48}
          className="mx-auto h-12 w-12 rounded-full ring-1 ring-border"
        />
        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>
        <p className="mt-6 text-xs text-muted-foreground">
          Need help?{" "}
          <Link
            to="/contact"
            className="inline-flex min-h-11 items-center font-semibold text-navy underline"
          >
            Contact the school office
          </Link>
        </p>
      </div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <StatusPage
      code="404"
      title="Page not found"
      body="The page you are looking for does not exist or has moved."
    >
      <Button asChild>
        <Link to="/">Go home</Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/news">Read the news</Link>
      </Button>
    </StatusPage>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <StatusPage
      code="500"
      title="This page did not load"
      body="Something went wrong on our end. You can try again or head back home."
    >
      <Button
        onClick={() => {
          router.invalidate();
          reset();
        }}
      >
        Try again
      </Button>
      <Button asChild variant="outline">
        <a href="/">Go home</a>
      </Button>
    </StatusPage>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // The stored page text is read before anything renders, so the first HTML is already final.
  loader: async () => ({ content: await orNothing(fetchContent) }),
  staleTime: 60_000,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Bomas Academy - Jos, Plateau State" },
      {
        name: "description",
        content:
          "Bomas Academy is a nurturing learning community in Jos shaping confident, curious and compassionate young minds from early years through senior secondary.",
      },
      { name: "author", content: "Bomas Academy" },
      { property: "og:title", content: "Bomas Academy - Jos, Plateau State" },
      {
        property: "og:description",
        content:
          "A nurturing learning community in Jos shaping confident, curious and compassionate young minds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#1f2f6b" },
    ],
    links: [
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Hanken+Grotesk:wght@400;500;600;700&family=Geist+Mono:wght@500&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <noscript>
          <style>{`[style*="opacity: 0"]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/auth");

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <div className="flex min-h-[100dvh] flex-col">
          {!isAdminArea && (
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-gold focus:px-4 focus:py-2.5 focus:font-display focus:text-sm focus:font-semibold focus:text-navy-deep"
            >
              Skip to content
            </a>
          )}
          {!isAdminArea && <SiteHeader />}
          <main id="main" className="flex-1">
            <div key={pathname} className="page-in">
              <Outlet />
            </div>
          </main>
          {!isAdminArea && <SiteFooter />}
        </div>
        <Toaster position="top-center" offset={16} />
      </MotionConfig>
    </QueryClientProvider>
  );
}
