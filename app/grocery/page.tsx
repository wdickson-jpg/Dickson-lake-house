"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type GroceryItem = {
  id: string;
  item: string;
  checked: boolean;
  added_by: string | null;
  checked_by: string | null;
  created_at: string;
  checked_at: string | null;
  added_member: { display_name: string } | null;
  checked_member: { display_name: string } | null;
};

export default function GroceryPage() {
  const supabase = createClient();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [memberId, setMemberId] = useState<string | null>(null);
  const [showChecked, setShowChecked] = useState(false);

  useEffect(() => {
    loadMember();
    loadItems();
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

  async function loadItems() {
    const { data } = await supabase
      .from("grocery_items")
      .select("*, added_member:family_members!grocery_items_added_by_fkey(display_name), checked_member:family_members!grocery_items_checked_by_fkey(display_name)")
      .order("checked", { ascending: true })
      .order("created_at", { ascending: false });
    setItems(data || []);
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.trim() || !memberId) return;

    await supabase.from("grocery_items").insert({
      item: newItem.trim(),
      added_by: memberId,
    });
    setNewItem("");
    loadItems();
  }

  async function toggleItem(item: GroceryItem) {
    if (item.checked) {
      await supabase
        .from("grocery_items")
        .update({ checked: false, checked_by: null, checked_at: null })
        .eq("id", item.id);
    } else {
      await supabase
        .from("grocery_items")
        .update({
          checked: true,
          checked_by: memberId,
          checked_at: new Date().toISOString(),
        })
        .eq("id", item.id);
    }
    loadItems();
  }

  async function deleteItem(id: string) {
    await supabase.from("grocery_items").delete().eq("id", id);
    loadItems();
  }

  async function clearChecked() {
    const checkedIds = items.filter((i) => i.checked).map((i) => i.id);
    if (checkedIds.length === 0) return;
    await supabase.from("grocery_items").delete().in("id", checkedIds);
    loadItems();
  }

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  return (
    <div className="px-4 py-5 space-y-4">
      <h2 className="text-lg font-bold text-lake-deep">Grocery List</h2>

      {/* Add item */}
      <form onSubmit={addItem} className="flex gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add an item..."
          className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 text-sm bg-white"
        />
        <button
          type="submit"
          disabled={!newItem.trim()}
          className="bg-lake-mid text-white px-5 py-3 rounded-2xl text-sm font-semibold disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {/* Unchecked items */}
      <div className="space-y-2">
        {unchecked.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">
            List is empty. Add some items!
          </p>
        )}
        {unchecked.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm"
          >
            <button
              onClick={() => toggleItem(item)}
              className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm">{item.item}</span>
              {item.added_member && (
                <span className="text-[10px] text-gray-400 ml-2">
                  by {item.added_member.display_name}
                </span>
              )}
            </div>
            <button
              onClick={() => deleteItem(item.id)}
              className="text-gray-300 text-lg"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Checked items */}
      {checked.length > 0 && (
        <div>
          <button
            onClick={() => setShowChecked(!showChecked)}
            className="flex items-center gap-2 text-sm text-gray-400 mb-2"
          >
            <span>{showChecked ? "▼" : "▶"}</span>
            <span>Checked off ({checked.length})</span>
          </button>
          {showChecked && (
            <>
              <div className="space-y-2 mb-3">
                {checked.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white/60 rounded-2xl px-4 py-3 flex items-center gap-3"
                  >
                    <button
                      onClick={() => toggleItem(item)}
                      className="w-6 h-6 rounded-full border-2 border-green-400 bg-green-400 flex-shrink-0 flex items-center justify-center text-white text-xs"
                    >
                      ✓
                    </button>
                    <span className="text-sm line-through text-gray-400 flex-1">
                      {item.item}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={clearChecked}
                className="text-xs text-red-400 underline"
              >
                Clear checked items
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
