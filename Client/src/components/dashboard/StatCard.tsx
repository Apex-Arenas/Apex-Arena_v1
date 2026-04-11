import type { ElementType } from "react";

type AccentColor = "cyan" | "emerald" | "amber" | "indigo" | "violet";

type StatCardProps = {
  icon: ElementType;
  label: string;
  value: string | number;
  accent?: string;
  accentColor?: AccentColor;
};

const accentMap: Record<AccentColor, { border: string; text: string; iconBg: string; iconText: string }> = {
  cyan:    { border: "border-l-cyan-500",    text: "text-cyan-300",    iconBg: "bg-cyan-500/10",    iconText: "text-cyan-400" },
  emerald: { border: "border-l-emerald-500", text: "text-emerald-300", iconBg: "bg-emerald-500/10", iconText: "text-emerald-400" },
  amber:   { border: "border-l-amber-500",   text: "text-amber-300",   iconBg: "bg-amber-500/10",   iconText: "text-amber-400" },
  indigo:  { border: "border-l-indigo-500",  text: "text-indigo-300",  iconBg: "bg-indigo-500/10",  iconText: "text-indigo-400" },
  violet:  { border: "border-l-violet-500",  text: "text-violet-300",  iconBg: "bg-violet-500/10",  iconText: "text-violet-400" },
};

export default function StatCard({ icon: Icon, label, value, accent, accentColor }: StatCardProps) {
  const colors = accentColor ? accentMap[accentColor] : null;

  return (
    <div
      className={`rounded-xl border border-slate-800 border-l-2 bg-slate-900/70 p-5 hover:bg-slate-900/90 transition-colors ${
        colors?.border ?? "border-l-slate-600"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 uppercase tracking-widest font-medium truncate">
            {label}
          </p>
          <p
            className={`text-2xl font-bold mt-1.5 leading-none ${
              accent ?? colors?.text ?? "text-white"
            }`}
          >
            {value}
          </p>
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            colors?.iconBg ?? "bg-slate-800"
          } ${colors?.iconText ?? "text-slate-400"}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
