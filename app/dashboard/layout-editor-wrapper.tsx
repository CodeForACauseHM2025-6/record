"use client";

import { useState } from "react";
import { LayoutToolbar } from "@/app/dashboard/layout-toolbar";
import { LayoutBuilder } from "@/app/dashboard/layout-builder";
import { RoundTableSummary } from "@/app/patterns/types";

interface LayoutEditorWrapperProps {
  groupId: string;
  groupName: string;
  mainBlocks: any[];
  sidebarBlocks: any[];
  fullBlocks: any[];
  roundTable: RoundTableSummary | null;
  availableArticles: { id: string; title: string; section: string }[];
  staffMembers: { id: string; name: string }[];
}

export function LayoutEditorWrapper({
  groupId,
  groupName,
  mainBlocks,
  sidebarBlocks,
  fullBlocks,
  roundTable,
  availableArticles,
  staffMembers,
}: LayoutEditorWrapperProps) {
  const [opacity, setOpacity] = useState(0.6);

  return (
    <>
      <LayoutToolbar
        groupId={groupId}
        groupName={groupName}
        opacity={opacity}
        onOpacityChange={setOpacity}
      />

      <LayoutBuilder
        groupId={groupId}
        mainBlocks={mainBlocks}
        sidebarBlocks={sidebarBlocks}
        fullBlocks={fullBlocks}
        roundTable={roundTable}
        availableArticles={availableArticles}
        staffMembers={staffMembers}
        placeholderOpacity={opacity}
      />
    </>
  );
}
