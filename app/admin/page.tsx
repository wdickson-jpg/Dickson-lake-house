"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FamilyMember = {
  id: string;
  email: string | null;
  display_name: string;
  role: string;
  created_at: string;
  last_seen_at: string | null;
};

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const { data: me } = await supabase
      .from("family_members")
      .select("role")
      .eq("auth_id", user.id)
      .single();

    if (!me || me.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    setIsAdmin(true);
    loadMembers();
    setLoading(false);
  }

  async function loadMembers() {
    const { data } = await supabase
      .from("family_members")
      .select("*")
      .order("created_at", { ascending: true });
    setMembers(data || []);
  }

  async function updateRole(id: string, role: string) {
    await supabase.from("family_members").update({ role }).eq("id", id);
    loadMembers();
  }

  async function removeMember(id: string) {
    await supabase.from("family_members").delete().eq("id", id);
    loadMembers();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-lake-mid border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const pending = members.filter((m) => m.role === "pending");
  const active = members.filter((m) => m.role !== "pending");

  return (
    <div className="px-4 py-5 space-y-6">
      <h2 className="text-lg font-bold text-lake-deep">Admin</h2>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-amber-600 mb-2">
            Pending Approval ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map((m) => (
              <div key={m.id} className="bg-amber-50 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{m.display_name}</p>
                  <p className="text-xs text-gray-400">{m.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateRole(m.id, "member")}
                    className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-full font-medium"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => removeMember(m.id)}
                    className="bg-red-100 text-red-500 text-xs px-3 py-1.5 rounded-full font-medium"
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active members */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 mb-2">
          Family Members ({active.length})
        </h3>
        <div className="space-y-2">
          {active.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="font-medium text-sm">
                  {m.display_name}
                  {m.role === "admin" && (
                    <span className="ml-2 text-[10px] bg-lake-mid text-white px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400">{m.email}</p>
              </div>
              <div className="flex gap-2">
                {m.role === "member" && (
                  <button
                    onClick={() => updateRole(m.id, "admin")}
                    className="text-[10px] text-lake-mid border border-lake-mid px-2 py-1 rounded-full"
                  >
                    Make Admin
                  </button>
                )}
                {m.role === "admin" && (
                  <button
                    onClick={() => updateRole(m.id, "member")}
                    className="text-[10px] text-gray-400 border border-gray-200 px-2 py-1 rounded-full"
                  >
                    Remove Admin
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
