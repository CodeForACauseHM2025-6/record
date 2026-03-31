"use client";

import { useState } from "react";
import { addBlock } from "@/app/dashboard/group-actions";

interface BlockPickerProps {
  groupId: string;
  column: "main" | "sidebar";
  patterns: { id: string; name: string; description: string }[];
}

export function BlockPicker({ groupId, column, patterns }: BlockPickerProps) {
  const [open, setOpen] = useState(false);

  async function handleSelect(patternId: string) {
    setOpen(false);
    await addBlock(groupId, column, patternId);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="cursor-pointer w-full border border-dashed border-ink/20 py-3 text-center hover:border-ink/40 transition-colors font-headline text-[13px] tracking-wide text-caption"
      >
        + Add Block
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-ink/15 shadow-[0_4px_16px_rgba(0,0,0,0.08)] z-20 max-h-64 overflow-y-auto">
          {patterns.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p.id)}
              className="cursor-pointer w-full text-left px-4 py-3 hover:bg-neutral-50 hover:text-maroon transition-colors border-b border-neutral-100 last:border-b-0"
            >
              <span className="block font-headline text-[14px] font-semibold">{p.name}</span>
              <span className="block font-headline text-[12px] text-caption mt-0.5">{p.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
