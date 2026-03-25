"use client";

import { useRef } from "react";

const SECTIONS = [
  { value: "NEWS", label: "News" },
  { value: "FEATURES", label: "Features" },
  { value: "OPINIONS", label: "Opinion" },
  { value: "A_AND_E", label: "A&E" },
  { value: "LIONS_DEN", label: "Lion\u2019s Den" },
  { value: "THE_ROUNDTABLE", label: "The Roundtable" },
];

interface ArticleFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    title?: string;
    body?: string;
    excerpt?: string;
    section?: string;
  };
  submitLabel: string;
}

export function ArticleForm({ action, defaultValues, submitLabel }: ArticleFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} className="space-y-6">
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
          placeholder="Write your article... (HTML supported)"
          className="w-full border border-ink/20 px-4 py-3 font-body text-[15px] leading-relaxed placeholder:text-caption/30 outline-none focus:border-ink transition-colors resize-y min-h-[300px]"
        />
      </div>

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          className="font-headline font-bold text-[15px] tracking-[0.04em] bg-ink text-white px-8 py-3 hover:bg-maroon transition-colors"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
