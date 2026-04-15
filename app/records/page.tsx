"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Record = {
  id: string;
  category: string;
  holder_name: string;
  value: string;
  date: string | null;
  set_by: string | null;
  created_at: string;
};

const categoryMeta: { [key: string]: { emoji: string; label: string; unit: string } } = {
  biggest_fish: { emoji: "🐟", label: "Biggest Fish", unit: "Weight/length" },
  longest_tuber: { emoji: "🛟", label: "Longest Tuber", unit: "Distance/time" },
  biggest_swim: { emoji: "🏊", label: "Biggest Swim", unit: "Distance" },
};

export default function RecordsPage() {
  const supabase = createClient();
  const [records, setRecords] = useState<Record[]>([]);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ holder_name: "", value: "", date: "" });

  useEffect(() => {
    loadMember();
    loadRecords();
  }, []);

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

  async function loadRecords() {
    const { data } = await supabase
      .from("records")
      .select("*")
      .order("created_at", { ascending: false });
    setRecords(data || []);
  }

  async function submitRecord(category: string) {
    if (!form.holder_name.trim() || !form.value.trim()) return;

    await supabase.from("records").insert({
      category,
      holder_name: form.holder_name.trim(),
      value: form.value.trim(),
      date: form.date || null,
      set_by: memberId,
    });

    setForm({ holder_name: "", value: "", date: "" });
    setEditing(null);
    loadRecords();
  }

  function getCurrentRecord(category: string) {
    return records.find((r) => r.category === category);
  }

  return (
    <div className="px-4 py-5 space-y-4">
      <h2 className="text-lg font-bold text-lake-deep">Lake House Records</h2>

      {Object.entries(categoryMeta).map(([cat, meta]) => {
        const current = getCurrentRecord(cat);
        const isEditing = editing === cat;

        return (
          <div key={cat} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{meta.emoji}</span>
              <div>
                <h3 className="font-bold text-lake-deep">{meta.label}</h3>
                {current ? (
                  <div className="text-sm">
                    <span className="font-semibold text-sunset">{current.holder_name}</span>
                    <span className="text-gray-500"> — {current.value}</span>
                    {current.date && (
                      <span className="text-gray-400 text-xs ml-1">
                        ({new Date(current.date).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No record set yet</p>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <input
                  value={form.holder_name}
                  onChange={(e) => setForm({ ...form, holder_name: e.target.value })}
                  placeholder="Record holder name"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                />
                <input
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder={meta.unit}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                />
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => submitRecord(cat)}
                    className="flex-1 bg-lake-mid text-white py-2 rounded-xl text-sm font-semibold"
                  >
                    Save Record
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="px-4 py-2 rounded-xl text-sm text-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditing(cat);
                  setForm({ holder_name: "", value: "", date: "" });
                }}
                className="text-xs text-lake-mid font-medium mt-1"
              >
                {current ? "Submit new record" : "Set record"}
              </button>
            )}

            {/* History */}
            {records.filter((r) => r.category === cat).length > 1 && !isEditing && (
              <details className="mt-3">
                <summary className="text-xs text-gray-400 cursor-pointer">
                  Previous records
                </summary>
                <div className="mt-2 space-y-1">
                  {records
                    .filter((r) => r.category === cat)
                    .slice(1)
                    .map((r) => (
                      <div key={r.id} className="text-xs text-gray-400">
                        {r.holder_name} — {r.value}
                        {r.date && ` (${new Date(r.date).toLocaleDateString()})`}
                      </div>
                    ))}
                </div>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}
