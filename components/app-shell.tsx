"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "./bottom-nav";
import { InstallBanner } from "./install-banner";
import type { User } from "@supabase/supabase-js";

type FamilyMember = {
  id: string;
  auth_id: string;
  email: string | null;
  display_name: string;
  role: string;
  avatar_url: string | null;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from("family_members")
          .select("*")
          .eq("auth_id", user.id)
          .single();
        setMember(data);
      }
      setLoading(false);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data } = await supabase
            .from("family_members")
            .select("*")
            .eq("auth_id", session.user.id)
            .single();
          setMember(data);
        } else {
          setMember(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Auth landing page — no shell
  if (pathname === "/") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-lake-mid border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  // Pending approval screen
  if (member && member.role === "pending") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="text-6xl mb-4">🏡</div>
        <h1 className="text-2xl font-bold text-lake-deep mb-2">Welcome!</h1>
        <p className="text-gray-600 mb-6">
          Your account is pending approval. A family admin will approve you soon.
        </p>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/");
          }}
          className="text-lake-mid underline"
        >
          Sign out
        </button>
      </div>
    );
  }

  const isAdmin = member?.role === "admin";

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-lake-deep text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">Dickson Lake House</h1>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => router.push("/admin")}
              className="text-xs bg-white/20 rounded-full px-3 py-1"
            >
              Admin
            </button>
          )}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/");
            }}
            className="text-xs text-white/70"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto">{children}</main>

      {/* Install banner */}
      <InstallBanner />

      {/* Bottom nav */}
      <BottomNav />
    </div>
  );
}
