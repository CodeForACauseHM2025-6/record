"use client";

import { createContext, useContext } from "react";

export interface EditorContextValue {
  groupId: string;
  availableArticles: { id: string; title: string; section: string }[];
  staffMembers: { id: string; name: string }[];
  placeholderOpacity: number;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({
  value,
  children,
}: {
  value: EditorContextValue;
  children: React.ReactNode;
}) {
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditorContext(): EditorContextValue | null {
  return useContext(EditorContext);
}
