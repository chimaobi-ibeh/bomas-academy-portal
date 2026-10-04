import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  ShieldCheck,
} from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/admin/shared";
import logoAsset from "@/assets/bomas-logo.jpg";
import sideImg from "@/assets/academic-primary.webp";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Admin sign in - Bomas Academy" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

/** Plain-language versions of the errors people actually meet. */
function friendlyError(err: unknown) {
  const message = err instanceof Error ? err.message : "";
  if (/failed to fetch|network|load failed/i.test(message))
    return "Could not reach the server. Check your internet connection and try again.";
  if (/invalid login credentials/i.test(message)) return "That email or password is not right.";
  if (/already registered|already been registered/i.test(message))
    return "An account with this email already exists. Try signing in instead.";
  if (/email not confirmed/i.test(message))
    return "This email has not been confirmed yet. Check your inbox for the confirmation link.";
  return message || "Something went wrong. Please try again.";
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast.success("Account created", { description: "You can sign in now." });
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      }
    } catch (err: unknown) {
      setError(friendlyError(err));
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1.05fr_1fr]">
      {/* Brand side: a school photograph under navy, wordmark at the foot */}
      <aside className="relative isolate hidden flex-col justify-center overflow-hidden bg-navy-deep p-10 text-white lg:flex">
        <img
          src={sideImg}
          alt=""
          width={1200}
          height={800}
          fetchPriority="high"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[50%_30%]"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-deep via-navy-deep/70 to-navy-deep/45"
        />
        <Link to="/" className="absolute left-10 top-10 flex min-h-11 w-fit items-center gap-3">
          <img
            src={logoAsset}
            alt=""
            width={48}
            height={48}
            className="logo-spin h-12 w-12 rounded-full ring-1 ring-white/30"
          />
          <span className="font-display text-lg font-bold tracking-[-0.02em]">Bomas Academy</span>
        </Link>
        <div>
          <p className="label-mono flex items-center gap-2 text-gold">
            <ShieldCheck className="h-4 w-4" /> Admin area
          </p>
          <p className="mt-4 max-w-md font-display text-[clamp(2.2rem,3.6vw,3.4rem)] font-bold leading-[1.04] tracking-[-0.04em]">
            Keep the school website up to date.
          </p>
          <p className="mt-4 max-w-sm text-white/80">
            Write news, change page text, add photos and update staff. Everything goes live the
            moment you save.
          </p>
        </div>
      </aside>

      <main className="grid place-items-center bg-background px-4 py-8 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link to="/" className="flex min-h-11 items-center gap-3">
              <img
                src={logoAsset}
                alt=""
                width={40}
                height={40}
                className="logo-spin h-10 w-10 rounded-full ring-1 ring-border"
              />
              <span>
                <span className="block font-display text-lg font-bold leading-tight tracking-[-0.02em]">
                  Bomas Academy
                </span>
                <span className="label-mono block text-muted-foreground">Admin area</span>
              </span>
            </Link>
          </div>

          <div className="rise rounded-2xl border bg-surface p-6 shadow-[0_24px_60px_-34px_oklch(0.22_0.09_264/0.4)] sm:p-8">
            <Segmented<Mode>
              label="Sign in or create an account"
              value={mode}
              onChange={switchMode}
              items={[
                { id: "signin", label: "Sign in" },
                { id: "signup", label: "Create account" },
              ]}
              className="w-full [&>button]:flex-1 [&>button]:justify-center"
            />

            <h1 className="mt-6 font-display text-[1.9rem] font-bold leading-tight tracking-[-0.035em]">
              {mode === "signin" ? "Welcome back." : "Create your account."}
            </h1>
            <p className="mt-1.5 text-[15px] text-muted-foreground">
              {mode === "signin"
                ? "Sign in to manage the Bomas Academy website."
                : "Make an account first. An existing admin then gives it access."}
            </p>

            <form onSubmit={onSubmit} className="mt-6 grid gap-4" noValidate={false}>
              <div className="grid gap-2">
                <Label htmlFor="email" className="label-mono text-muted-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@bomasacademy.org"
                    value={email}
                    aria-invalid={error ? true : undefined}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className="label-mono text-muted-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    aria-invalid={error ? true : undefined}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Hide password" : "Show password"}
                    aria-pressed={show}
                    className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground md:h-10 md:w-10"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === "signup" && (
                  <p className="text-xs text-muted-foreground">Use at least 6 characters.</p>
                )}
              </div>

              {error && (
                <p
                  key={shakeKey}
                  role="alert"
                  className="shake flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-destructive"
                >
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
                {loading ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : mode === "signin" ? (
                  <ArrowRight aria-hidden="true" />
                ) : null}
                {loading ? "Please wait" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            {mode === "signup" && (
              <p className="mt-5 rounded-md bg-secondary px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                After creating the first account, it must be granted admin permissions from the
                backend before content can be edited.
              </p>
            )}
          </div>

          <Link
            to="/"
            className="mt-5 inline-flex min-h-11 items-center gap-1.5 font-display text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to the school website
          </Link>
        </div>
      </main>
    </div>
  );
}
