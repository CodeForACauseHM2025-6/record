"use client";

import { updateRow } from "@/app/dashboard/group-actions";

export function RowEditor({
  rowId,
  groupId,
  currentLayout,
  isFeatured,
}: {
  rowId: string;
  groupId: string;
  currentLayout: string;
  isFeatured: boolean;
}) {
  const boundUpdate = updateRow.bind(null, rowId, groupId);

  return (
    <form action={boundUpdate} className="flex items-center gap-2">
      <select
        name="layout"
        defaultValue={currentLayout}
        className="border border-ink/15 px-2 py-0.5 font-headline text-[11px] outline-none bg-white cursor-pointer"
        onChange={(e) => e.target.form?.requestSubmit()}
      >
        <option value="large">Large</option>
        <option value="medium,small">Medium + Small</option>
        <option value="small,medium">Small + Medium</option>
        <option value="small,small,small">3 Small</option>
      </select>
      <label className="flex items-center gap-1 font-headline text-[11px] tracking-wide cursor-pointer">
        <input
          type="checkbox"
          name="isFeatured"
          value="true"
          defaultChecked={isFeatured}
          onChange={(e) => e.target.form?.requestSubmit()}
        />
        Featured
      </label>
    </form>
  );
}
