import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useSession } from "@/lib/use-auth";
import { AdminShell } from "@/components/admin/shell";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin - Bomas Academy" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin(session?.user?.id);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || (session && roleLoading)) {
    return (
      <div role="status" className="grid min-h-[100dvh] place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-navy" aria-label="Loading" />
      </div>
    );
  }
  if (!session) return null;

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <AdminShell
      email={session.user.email ?? "Admin"}
      userId={session.user.id}
      isAdmin={Boolean(isAdmin)}
      onSignOut={signOut}
    />
  );
}
