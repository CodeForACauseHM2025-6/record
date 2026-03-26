"use client";

import { useRef, useState } from "react";
import { updateProfilePicture } from "@/app/account/account-actions";

export function ProfilePicture({
  userId,
  currentImage,
  firstInitial,
}: {
  userId: string;
  currentImage: string | null;
  firstInitial: string;
}) {
  const [image, setImage] = useState(currentImage);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      // Convert to base64 data URL for simplicity (stored in DB)
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        await updateProfilePicture(userId, dataUrl);
        setImage(dataUrl);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  }

  return (
    <div className="relative group shrink-0">
      {image ? (
        <img
          src={image}
          alt="Profile picture"
          className="w-16 h-16 object-cover bg-neutral-100"
        />
      ) : (
        <div className="w-16 h-16 bg-maroon text-white flex items-center justify-center font-headline font-bold text-[24px]">
          {firstInitial}
        </div>
      )}

      {/* Hover overlay */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center"
      >
        <span className="text-white text-[11px] font-headline font-semibold tracking-wide uppercase opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? "..." : "Edit"}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
