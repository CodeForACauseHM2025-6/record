"use client";

import { useRef, useState, type ReactNode } from "react";
import { reorderRows } from "@/app/dashboard/group-actions";

export function DraggableRowList({
  groupId,
  children,
  rowIds,
}: {
  groupId: string;
  children: ReactNode[];
  rowIds: string[];
}) {
  const dragIdx = useRef<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  function handleDragStart(idx: number) {
    dragIdx.current = idx;
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setOverIdx(idx);
  }

  function handleDragLeave() {
    setOverIdx(null);
  }

  async function handleDrop(idx: number) {
    setOverIdx(null);
    const from = dragIdx.current;
    if (from === null || from === idx) return;
    dragIdx.current = null;

    // Build reordered ID list and persist
    const newIds = [...rowIds];
    const [movedId] = newIds.splice(from, 1);
    newIds.splice(idx, 0, movedId);
    await reorderRows(groupId, newIds);
  }

  function handleDragEnd() {
    dragIdx.current = null;
    setOverIdx(null);
  }

  return (
    <div className="space-y-4">
      {children.map((child, idx) => (
        <div
          key={rowIds[idx]}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDragLeave={handleDragLeave}
          onDrop={() => handleDrop(idx)}
          onDragEnd={handleDragEnd}
          className={`transition-all duration-150 ${
            overIdx === idx ? "border-t-2 border-maroon" : ""
          }`}
        >
          <div className="flex items-start gap-2">
            <div className="cursor-grab active:cursor-grabbing pt-5 px-1 text-caption/30 hover:text-caption/60 transition-colors select-none">
              <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
                <circle cx="3" cy="3" r="1.5" />
                <circle cx="9" cy="3" r="1.5" />
                <circle cx="3" cy="9" r="1.5" />
                <circle cx="9" cy="9" r="1.5" />
                <circle cx="3" cy="15" r="1.5" />
                <circle cx="9" cy="15" r="1.5" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">{child}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
