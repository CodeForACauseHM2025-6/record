"use client";

import { useState } from "react";
import { LayoutToolbar } from "@/app/dashboard/layout-toolbar";
import { LayoutBuilder } from "@/app/dashboard/layout-builder";

interface LayoutEditorWrapperProps {
  groupId: string;
  groupName: string;
  mainBlocks: any[];
  sidebarBlocks: any[];
  availableArticles: { id: string; title: string; section: string }[];
  staffMembers: { id: string; name: string }[];
}

export function LayoutEditorWrapper({
  groupId,
  groupName,
  mainBlocks,
  sidebarBlocks,
  availableArticles,
  staffMembers,
}: LayoutEditorWrapperProps) {
  const [opacity, setOpacity] = useState(0.6);

  return (
    <>
      {/* Fixed toolbar at top of viewport */}
      <LayoutToolbar
        groupId={groupId}
        groupName={groupName}
        opacity={opacity}
        onOpacityChange={setOpacity}
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
    </>
  );
}
