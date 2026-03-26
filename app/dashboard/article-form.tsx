"use client";

import { useState, useRef } from "react";

const SECTIONS = [
  { value: "NEWS", label: "News" },
  { value: "FEATURES", label: "Features" },
  { value: "OPINIONS", label: "Opinions" },
  { value: "A_AND_E", label: "A&E" },
  { value: "LIONS_DEN", label: "Lion\u2019s Den" },
  { value: "THE_ROUNDTABLE", label: "The Roundtable" },
];

export interface AuthorCredit {
  userId: string;
  userName: string;
  creditRole: string;
}

export interface AvailableUser {
  id: string;
  name: string;
  defaultRole: string;
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

  function addAuthor(user: AvailableUser) {
    if (credits.some((c) => c.userId === user.id)) return;
    setCredits([...credits, {
      userId: user.id,
      userName: user.name,
      creditRole: user.defaultRole,
    }]);
  }

  function removeCredit(index: number) {
    setCredits(credits.filter((_, i) => i !== index));
  }

  function updateCreditRole(index: number, value: string) {
    setCredits(credits.map((c, i) => i === index ? { ...c, creditRole: value } : c));
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

        {/* Listed authors */}
        {credits.length > 0 && (
          <div className="space-y-2 mb-3">
            {credits.map((credit, i) => (
              <div key={credit.userId} className="flex items-center gap-3 bg-neutral-50 px-4 py-2.5">
                <span className="font-headline font-semibold text-[15px] tracking-wide">
                  {credit.userName}
                </span>
                <span className="text-caption text-[13px]">&mdash;</span>
                <input
                  type="text"
                  name={`credit_role_${i}`}
                  value={credit.creditRole}
                  onChange={(e) => updateCreditRole(i, e.target.value)}
                  className="flex-1 bg-transparent font-headline text-[14px] tracking-wide outline-none text-caption placeholder:text-caption/30"
                  placeholder="Role..."
                />
                <input type="hidden" name={`credit_user_${i}`} value={credit.userId} />
                <button
                  type="button"
                  onClick={() => removeCredit(i)}
                  className="cursor-pointer text-caption/30 hover:text-maroon transition-colors text-[18px] px-1"
                  title="Remove author"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Author search */}
        <AuthorSearch
          users={availableUsers.filter((u) => !credits.some((c) => c.userId === u.id))}
          onSelect={addAuthor}
        />

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

function AuthorSearch({
  users,
  onSelect,
}: {
  users: AvailableUser[];
  onSelect: (user: AvailableUser) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.length > 0
    ? users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
    : users;

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search for an author to add..."
        className="w-full border border-ink/20 px-4 py-2.5 font-headline text-[15px] tracking-wide placeholder:text-caption/30 outline-none focus:border-ink transition-colors"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-ink/15 shadow-[0_4px_16px_rgba(0,0,0,0.08)] z-20 max-h-48 overflow-y-auto">
          {filtered.map((u) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(u);
                setQuery("");
                setOpen(false);
              }}
              className="cursor-pointer w-full text-left px-4 py-2.5 font-headline text-[15px] tracking-wide hover:bg-neutral-50 hover:text-maroon transition-colors flex items-baseline justify-between"
            >
              <span>{u.name}</span>
              <span className="text-[12px] text-caption/50">{u.defaultRole}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
