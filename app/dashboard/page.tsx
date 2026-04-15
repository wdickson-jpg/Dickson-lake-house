"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CheckIn = {
  id: string;
  member_id: string;
  checked_in_at: string;
  checked_out_at: string | null;
  note: string | null;
  family_members: { display_name: string };
};

type WallPost = {
  id: string;
  body: string;
  channel: string;
  created_at: string;
  family_members: { display_name: string } | null;
};

export default function DashboardPage() {
  const supabase = createClient();
  const [currentMember, setCurrentMember] = useState<{ id: string; display_name: string } | null>(null);
  const [whoIsHere, setWhoIsHere] = useState<CheckIn[]>([]);
  const [recentPosts, setRecentPosts] = useState<WallPost[]>([]);
  const [checkInNote, setCheckInNote] = useState("");
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [myCheckIn, setMyCheckIn] = useState<CheckIn | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: member } = await supabase
      .from("family_members")
      .select("id, display_name")
      .eq("auth_id", user.id)
      .single();
    setCurrentMember(member);

    // Who's here (active check-ins)
    const { data: checkIns } = await supabase
      .from("check_ins")
      .select("*, family_members(display_name)")
      .is("checked_out_at", null)
      .order("checked_in_at", { ascending: false });
    setWhoIsHere(checkIns || []);

    // Am I checked in?
    if (member) {
      const myCI = (checkIns || []).find((c: CheckIn) => c.member_id === member.id);
      setIsCheckedIn(!!myCI);
      setMyCheckIn(myCI || null);
    }

    // Recent wall posts
    const { data: posts } = await supabase
      .from("wall_posts")
      .select("*, family_members(display_name)")
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentPosts(posts || []);
  }

  async function handleCheckIn() {
    if (!currentMember) return;
    await supabase.from("check_ins").insert({
      member_id: currentMember.id,
      note: checkInNote || null,
    });
    setCheckInNote("");
    loadData();
  }

  async function handleCheckOut() {
    if (!myCheckIn) return;
    await supabase
      .from("check_ins")
      .update({ checked_out_at: new Date().toISOString() })
      .eq("id", myCheckIn.id);
    loadData();
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="px-4 py-5 space-y-6">
      {/* Who's Here */}
      <section>
        <h2 className="text-lg font-bold text-lake-deep mb-3">Who&apos;s at the Lake</h2>
        {whoIsHere.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-gray-400">
            <div className="text-3xl mb-2">🏖️</div>
            <p className="text-sm">Nobody&apos;s checked in right now</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {whoIsHere.map((ci) => (
              <div
                key={ci.id}
                className="bg-white rounded-full px-4 py-2 flex items-center gap-2 shadow-sm"
              >
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">{ci.family_members?.display_name}</span>
                {ci.note && (
                  <span className="text-xs text-gray-400">- {ci.note}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Check In/Out */}
      <section>
        {isCheckedIn ? (
          <button
            onClick={handleCheckOut}
            className="w-full bg-sunset text-white font-semibold py-3 rounded-2xl"
          >
            Check Out
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={checkInNote}
              onChange={(e) => setCheckInNote(e.target.value)}
              placeholder="Add a note (optional)"
              className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 text-sm"
            />
            <button
              onClick={handleCheckIn}
              className="bg-pine text-white font-semibold px-6 py-3 rounded-2xl whitespace-nowrap"
            >
              Check In
            </button>
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-lg font-bold text-lake-deep mb-3">Recent Posts</h2>
        {recentPosts.length === 0 ? (
          <p className="text-gray-400 text-sm">No posts yet</p>
        ) : (
          <div className="space-y-3">
            {recentPosts.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-semibold text-lake-deep">
                    {post.family_members?.display_name ?? "Unknown"}
                  </span>
                  <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
                </div>
                <p className="text-sm text-gray-700">{post.body}</p>
                {post.channel === "maintenance" && (
                  <span className="inline-block mt-2 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    Maintenance
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
