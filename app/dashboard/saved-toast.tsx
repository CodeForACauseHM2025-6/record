"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function SavedToast() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Clean up the ?saved param without a navigation
    const url = new URL(window.location.href);
    url.searchParams.delete("saved");
    window.history.replaceState(null, "", url.pathname + url.search);

    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-ink text-white font-headline font-semibold text-[15px] tracking-wide px-6 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.15)] animate-[fadeInUp_0.3s_ease-out]">
      Changes saved!
    </div>
  );
}
