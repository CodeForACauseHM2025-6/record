"use client";

import { useRef, useEffect, useState } from "react";

export function VideoPlayer({
  src,
  autoplay,
  className,
  style,
}: {
  src: string;
  autoplay: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(autoplay);
  const [playing, setPlaying] = useState(autoplay);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = muted;
  }, [muted]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (playing) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [playing]);

  function toggleMute() {
    setMuted((m) => !m);
  }

  function togglePlay() {
    setPlaying((p) => !p);
  }

  return (
    <div className="relative group" style={style}>
      <video
        ref={ref}
        src={src}
        className={className}
        loop={autoplay}
        playsInline
        onClick={togglePlay}
        style={{ cursor: "pointer" }}
      />
      {/* Custom controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 py-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          type="button"
          onClick={togglePlay}
          className="cursor-pointer text-white hover:text-white/80 transition-colors"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={toggleMute}
          className="cursor-pointer text-white hover:text-white/80 transition-colors"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
