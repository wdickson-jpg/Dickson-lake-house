"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type Photo = {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
  uploaded_by: string | null;
  family_members: { display_name: string } | null;
};

export default function PhotosPage() {
  const supabase = createClient();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMember();
    loadPhotos();
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

  async function loadPhotos() {
    const { data } = await supabase
      .from("photos")
      .select("*, family_members(display_name)")
      .order("created_at", { ascending: false });
    setPhotos(data || []);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !memberId) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const filePath = `${memberId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("photos")
        .getPublicUrl(filePath);

      await supabase.from("photos").insert({
        url: urlData.publicUrl,
        file_path: filePath,
        uploaded_by: memberId,
      });
    }

    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
    loadPhotos();
  }

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-lake-deep">Photos</h2>
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="bg-lake-mid text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">📸</div>
          <p className="text-sm">No photos yet. Upload some memories!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="aspect-square overflow-hidden"
            >
              <img
                src={photo.url}
                alt={photo.caption || "Lake house photo"}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 text-white text-2xl z-10"
          >
            &times;
          </button>
          <img
            src={selectedPhoto.url}
            alt={selectedPhoto.caption || ""}
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mt-3 text-center">
            {selectedPhoto.caption && (
              <p className="text-white text-sm mb-1">{selectedPhoto.caption}</p>
            )}
            <p className="text-white/50 text-xs">
              {selectedPhoto.family_members?.display_name} &middot;{" "}
              {new Date(selectedPhoto.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
