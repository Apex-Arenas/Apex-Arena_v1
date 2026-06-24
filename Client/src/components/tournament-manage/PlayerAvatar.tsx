import { useState } from "react";

export default function PlayerAvatar({
  src,
  name,
  size = "sm",
  ringClass = "ring-2 ring-slate-700",
}: {
  src?: string | null;
  name?: string;
  size?: "xs" | "sm" | "md";
  ringClass?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = name?.[0]?.toUpperCase() ?? "?";
  const sz = size === "xs" ? "w-6 h-6 text-[9px]" : size === "md" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs";
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        className={`${sz} rounded-full object-cover ${ringClass} shrink-0`}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-cyan-500/30 to-indigo-500/30 border border-slate-700 flex items-center justify-center font-bold text-cyan-300 shrink-0`}>
      {initial}
    </div>
  );
}
