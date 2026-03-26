"use client";

import { useState } from "react";

const SECTIONS = [
  { value: "NEWS", label: "News" },
  { value: "FEATURES", label: "Features" },
  { value: "OPINIONS", label: "Opinions" },
  { value: "A_AND_E", label: "A&E" },
  { value: "LIONS_DEN", label: "Lion\u2019s Den" },
  { value: "THE_ROUNDTABLE", label: "The Roundtable" },
];

const CREDIT_ROLES = [
  "Staff Writer",
  "Contributing Writer",
  "Editor",
  "Photographer",
  "Illustrator",
  "Designer",
];

export interface AuthorCredit {
  userId: string;
  userName: string;
  creditRole: string;
}

export interface AvailableUser {
  id: string;
  name: string;
}

interface ArticleFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    title?: string;
    body?: string;
    excerpt?: string;
    section?: string;
  };
  defaultCredits?: AuthorCredit[];
  availableUsers: AvailableUser[];
  submitLabel: string;
}

export function ArticleForm({
  action,
  defaultValues,
  defaultCredits = [],
  availableUsers,
  submitLabel,
}: ArticleFormProps) {
  const [credits, setCredits] = useState<AuthorCredit[]>(defaultCredits);

  function addCredit() {
    if (availableUsers.length === 0) return;
    const firstAvailable = availableUsers.find(
      (u) => !credits.some((c) => c.userId === u.id)
    ) ?? availableUsers[0];
    setCredits([...credits, {
      userId: firstAvailable.id,
      userName: firstAvailable.name,
      creditRole: "Staff Writer",
    }]);
  }

  function removeCredit(index: number) {
    setCredits(credits.filter((_, i) => i !== index));
  }

  function updateCredit(index: number, field: "userId" | "creditRole", value: string) {
    setCredits(credits.map((c, i) => {
      if (i !== index) return c;
      if (field === "userId") {
        const user = availableUsers.find((u) => u.id === value);
        return { ...c, userId: value, userName: user?.name ?? "" };
      }
      return { ...c, [field]: value };
    }));
  }

  return (
    <form action={action} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block font-headline text-[13px] font-semibold tracking-[0.08em] uppercase text-caption mb-2">
          Title
        </label>
        <input
          name="title"
          type="text"
          required
          defaultValue={defaultValues?.title ?? ""}
          placeholder="Article headline..."
          className="w-full border border-ink/20 px-4 py-3 font-headline text-[18px] tracking-wide placeholder:text-caption/30 outline-none focus:border-ink transition-colors"
        />
      </div>

      {/* Section */}
      <div>
        <label className="block font-headline text-[13px] font-semibold tracking-[0.08em] uppercase text-caption mb-2">
          Section
        </label>
        <select
          name="section"
          required
          defaultValue={defaultValues?.section ?? ""}
          className="w-full border border-ink/20 px-4 py-3 font-headline text-[16px] tracking-wide outline-none focus:border-ink transition-colors bg-white"
        >
          <option value="" disabled>
            Select a section...
          </option>
          {SECTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Authors */}
      <div>
        <label className="block font-headline text-[13px] font-semibold tracking-[0.08em] uppercase text-caption mb-2">
          Authors
        </label>
        <div className="space-y-3">
          {credits.map((credit, i) => (
            <div key={i} className="flex items-center gap-3">
              <select
                name={`credit_user_${i}`}
                value={credit.userId}
                onChange={(e) => updateCredit(i, "userId", e.target.value)}
                className="flex-1 border border-ink/20 px-3 py-2.5 font-headline text-[15px] tracking-wide outline-none focus:border-ink transition-colors bg-white"
              >
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <select
                name={`credit_role_${i}`}
                value={credit.creditRole}
                onChange={(e) => updateCredit(i, "creditRole", e.target.value)}
                className="w-44 border border-ink/20 px-3 py-2.5 font-headline text-[15px] tracking-wide outline-none focus:border-ink transition-colors bg-white"
              >
                {CREDIT_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeCredit(i)}
                className="cursor-pointer text-caption/40 hover:text-maroon transition-colors text-[18px] px-1"
                title="Remove author"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addCredit}
          className="cursor-pointer mt-3 font-headline text-[14px] tracking-wide text-maroon hover:underline"
        >
          + Add author
        </button>
        {/* Hidden field to pass credit count */}
        <input type="hidden" name="credit_count" value={credits.length} />
      </div>

      {/* Excerpt */}
      <div>
        <label className="block font-headline text-[13px] font-semibold tracking-[0.08em] uppercase text-caption mb-2">
          Excerpt <span className="normal-case text-caption/50">(optional)</span>
        </label>
        <textarea
          name="excerpt"
          rows={2}
          defaultValue={defaultValues?.excerpt ?? ""}
          placeholder="Short summary for previews..."
          className="w-full border border-ink/20 px-4 py-3 font-body text-[15px] leading-relaxed placeholder:text-caption/30 outline-none focus:border-ink transition-colors resize-none"
        />
      </div>

      {/* Body */}
      <div>
        <label className="block font-headline text-[13px] font-semibold tracking-[0.08em] uppercase text-caption mb-2">
          Body
        </label>
        <textarea
          name="body"
          rows={20}
          required
          defaultValue={defaultValues?.body ?? ""}
          placeholder="Write your article..."
          className="w-full border border-ink/20 px-4 py-3 font-body text-[15px] leading-relaxed placeholder:text-caption/30 outline-none focus:border-ink transition-colors resize-y min-h-[300px]"
        />
      </div>

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          className="cursor-pointer font-headline font-bold text-[15px] tracking-[0.04em] bg-ink text-white px-8 py-3 hover:bg-maroon transition-colors"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
