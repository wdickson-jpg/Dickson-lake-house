"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type WallPost = {
  id: string;
  author_id: string | null;
  channel: string;
  body: string;
  status: string | null;
  created_at: string;
  family_members: { display_name: string } | null;
};

export default function WallPage() {
  const supabase = createClient();
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [channel, setChannel] = useState<"general" | "maintenance">("general");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);

  useEffect(() => {
    loadMember();
  }, []);

  useEffect(() => {
    loadPosts();
  }, [channel]);

  async function loadMember() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("family_members")
      .select("id")
      .eq("auth_id", user.id)
      .single();
    if (data) setMemberId(data.id);
  }

  async function loadPosts() {
    const { data } = await supabase
      .from("wall_posts")
      .select("*, family_members(display_name)")
      .eq("channel", channel)
      .order("created_at", { ascending: false });
    setPosts(data || []);
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !memberId) return;
    setPosting(true);

    await supabase.from("wall_posts").insert({
      author_id: memberId,
      channel,
      body: body.trim(),
      status: channel === "maintenance" ? "open" : null,
    });

    setBody("");
    setPosting(false);
    loadPosts();
  }

  async function updateStatus(postId: string, newStatus: string) {
    await supabase
      .from("wall_posts")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", postId);
    loadPosts();
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const statusColors: Record<string, string> = {
    open: "bg-red-100 text-red-700",
    in_progress: "bg-amber-100 text-amber-700",
    done: "bg-green-100 text-green-700",
  };

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Channel tabs */}
      <div className="flex gap-2">
        {(["general", "maintenance"] as const).map((ch) => (
          <button
            key={ch}
            onClick={() => setChannel(ch)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              channel === ch
                ? "bg-lake-mid text-white"
                : "bg-white text-gray-500"
            }`}
          >
            {ch === "general" ? "General" : "Maintenance"}
          </button>
        ))}
      </div>

      {/* New post form */}
      <form onSubmit={handlePost} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            channel === "general"
              ? "Share something with the family..."
              : "Report a maintenance issue..."
          }
          className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 text-sm bg-white"
        />
        <button
          type="submit"
          disabled={posting || !body.trim()}
          className="bg-lake-mid text-white px-5 py-3 rounded-2xl text-sm font-semibold disabled:opacity-50"
        >
          Post
        </button>
      </form>

      {/* Posts list */}
      <div className="space-y-3">
        {posts.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">
            No {channel} posts yet. Be the first!
          </p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-semibold text-lake-deep">
                  {post.family_members?.display_name ?? "Unknown"}
                </span>
                <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
              </div>
              <p className="text-sm text-gray-700 mb-2">{post.body}</p>

              {/* Maintenance status controls */}
              {channel === "maintenance" && post.status && (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[post.status]}`}
                  >
                    {post.status.replace("_", " ")}
                  </span>
                  {post.status !== "done" && (
                    <div className="flex gap-1 ml-auto">
                      {post.status === "open" && (
                        <button
                          onClick={() => updateStatus(post.id, "in_progress")}
                          className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full"
                        >
                          Start
                        </button>
                      )}
                      <button
                        onClick={() => updateStatus(post.id, "done")}
                        className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
