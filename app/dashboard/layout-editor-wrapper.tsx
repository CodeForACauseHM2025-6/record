"use client";

import { useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { LayoutToolbar } from "@/app/dashboard/layout-toolbar";
import { LayoutBuilder } from "@/app/dashboard/layout-builder";
import { PatternRenderer } from "@/app/patterns/pattern-renderer";
import { BlockData } from "@/app/patterns/types";
import { AccountDropdown } from "@/app/account-dropdown";
import { HamburgerButton } from "@/app/sidebar-menu";

interface LayoutEditorWrapperProps {
  groupId: string;
  groupName: string;
  mainBlocks: any[];
  sidebarBlocks: any[];
  availableArticles: { id: string; title: string; section: string }[];
  staffMembers: { id: string; name: string }[];
  initialPreview?: boolean;
  previewMeta: {
    userName: string | null;
    userEmail: string | null;
    userImage: string | null;
    userRole: string;
    volumeNumber: string;
    issueNumber: string | null;
    groupDate: string;
  };
}

function toBlockData(blocks: any[]): BlockData[] {
  return blocks.map((b) => ({
    id: b.id,
    pattern: b.pattern,
    order: b.order,
    dividerStyle: b.dividerStyle,
    slots: b.slots.map((s: any) => ({
      id: s.id,
      slotRole: s.slotRole,
      order: s.order,
      article: s.article
        ? {
            id: s.article.id,
            title: s.article.title,
            slug: s.article.slug ?? s.article.id,
            body: s.article.body,
            section: s.article.section,
            featuredImage: s.article.featuredImage ?? null,
            publishedAt: s.article.publishedAt ?? null,
            createdBy: s.article.createdBy,
            credits: s.article.credits ?? [],
          }
        : null,
      mediaUrl: s.mediaUrl,
      mediaType: s.mediaType,
      mediaAlt: s.mediaAlt,
      mediaCredit: s.mediaCredit,
      scale: s.scale,
      imageScale: s.imageScale,
      previewLength: s.previewLength,
      featured: s.featured,
      showByline: s.showByline,
      imageFloat: s.imageFloat,
      imageWidth: s.imageWidth,
      imageCrop: s.imageCrop,
      imageCropCustom: s.imageCropCustom,
    })),
  }));
}

const NAV_SECTIONS = [
  { label: "News", href: "/section/news" },
  { label: "Features", href: "/section/features" },
  { label: "Opinions", href: "/section/opinions" },
  { label: "A&E", href: "/section/a-and-e" },
  { label: "Lion\u2019s Den", href: "/section/lions-den" },
];

function formatDateLong(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function LayoutEditorWrapper({
  groupId,
  groupName,
  mainBlocks,
  sidebarBlocks,
  availableArticles,
  staffMembers,
  initialPreview,
  previewMeta,
}: LayoutEditorWrapperProps) {
  const [opacity, setOpacity] = useState(0.6);
  const [previewOpen, setPreviewOpen] = useState(initialPreview ?? false);

  return (
    <>
      {/* Fixed toolbar at top of viewport */}
      <LayoutToolbar
        groupId={groupId}
        groupName={groupName}
        opacity={opacity}
        onOpacityChange={setOpacity}
        onPreview={() => setPreviewOpen(true)}
      />

      {/* Builder inline in the content flow */}
      <LayoutBuilder
        groupId={groupId}
        mainBlocks={mainBlocks}
        sidebarBlocks={sidebarBlocks}
        availableArticles={availableArticles}
        staffMembers={staffMembers}
        placeholderOpacity={opacity}
      />

      {/* Preview modal */}
      {previewOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
            {/* Close bar */}
            <div className="sticky top-0 z-10 bg-ink text-white px-4 py-2 flex items-center justify-between">
              <span className="font-headline text-[14px] font-semibold tracking-wide">
                Preview: {groupName}
              </span>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="cursor-pointer font-headline text-[13px] tracking-wide text-white/70 hover:text-white transition-colors"
              >
                &larr; Back to Editor
              </button>
            </div>

            {/* Page content — mirrors app/page.tsx layout exactly */}
            <div className="min-h-screen flex flex-col font-body">
              <header className="px-4 sm:px-8 pt-4 pb-2">
                <div className="max-w-[1200px] mx-auto grid grid-cols-[1fr_auto_1fr] items-center">
                  <div className="flex items-center gap-4 sm:gap-5 font-headline text-base">
                    <HamburgerButton />
                  </div>
                  <div className="text-center">
                    <Link href="/">
                      <h1 className="font-masthead text-[44px] sm:text-[60px] lg:text-[72px] leading-none tracking-tight">
                        The Record
                      </h1>
                    </Link>
                    <p className="font-body text-[11px] sm:text-[13px] tracking-[0.08em] mt-0.5">
                      Horace Mann&rsquo;s Weekly Newspaper Since 1903
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-4 sm:gap-5 font-headline text-base">
                    <Link href="/about" className="hidden sm:inline font-bold tracking-wide">About</Link>
                    <div className="hidden md:block">
                      <AccountDropdown
                        userName={previewMeta.userName}
                        userEmail={previewMeta.userEmail}
                        userImage={previewMeta.userImage}
                        userRole={previewMeta.userRole}
                      />
                    </div>
                    <Link href="/search" aria-label="Search" className="p-1">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                        <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </header>

              {/* Date bar */}
              <div className="border-t border-rule">
                <p className="text-center font-headline text-[12px] sm:text-[13px] font-semibold tracking-[0.05em] py-1.5">
                  {previewMeta.volumeNumber && <>Vol. {previewMeta.volumeNumber}</>}
                  {previewMeta.volumeNumber && previewMeta.issueNumber && <> &middot; </>}
                  {previewMeta.issueNumber && <>No. {previewMeta.issueNumber}</>}
                  {(previewMeta.volumeNumber || previewMeta.issueNumber) && <> &middot; </>}
                  {formatDateLong(previewMeta.groupDate)}
                </p>
              </div>

              {/* Section nav */}
              <nav className="border-t border-b border-rule overflow-x-auto">
                <div className="max-w-[1200px] mx-auto flex justify-between gap-6 px-4 sm:px-16 py-3 min-w-max sm:min-w-0">
                  {NAV_SECTIONS.map((s) => (
                    <Link key={s.href} href={s.href} className="font-headline text-lg sm:text-xl tracking-wide whitespace-nowrap hover:text-maroon transition-colors">
                      {s.label}
                    </Link>
                  ))}
                </div>
              </nav>

              <main className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-8 pb-16 w-full">
                <div className="flex flex-col lg:flex-row">
                  <div className="lg:flex-[2] lg:border-r lg:border-neutral-200 lg:pr-8">
                    {toBlockData(mainBlocks).map((block, i, arr) => (
                      <div key={block.id}>
                        <PatternRenderer block={block} />
                        {i < arr.length - 1 && block.dividerStyle !== "none" && (
                          <div className={`my-6 ${block.dividerStyle === "bold" ? "h-[2px] bg-ink" : "h-px bg-neutral-200"}`} />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="lg:flex-[1] lg:pl-8 mt-8 lg:mt-0 border-t lg:border-t-0 border-neutral-200 pt-8 lg:pt-0">
                    {toBlockData(sidebarBlocks).map((block, i, arr) => (
                      <div key={block.id}>
                        <PatternRenderer block={block} />
                        {i < arr.length - 1 && block.dividerStyle !== "none" && (
                          <div className={`my-6 ${block.dividerStyle === "bold" ? "h-[2px] bg-ink" : "h-px bg-neutral-200"}`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </main>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
