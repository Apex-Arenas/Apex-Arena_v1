import type { ElementType } from "react";

type AccentColor = "cyan" | "emerald" | "amber" | "indigo" | "violet";

type StatCardProps = {
  icon: ElementType;
  label: string;
  value: string | number;
  accent?: string;
  accentColor?: AccentColor;
};

const accentMap: Record<AccentColor, { iconBg: string; iconText: string }> = {
  cyan:    { iconBg: "bg-cyan-500/10",    iconText: "text-cyan-400" },
  emerald: { iconBg: "bg-emerald-500/10", iconText: "text-emerald-400" },
  amber:   { iconBg: "bg-amber-500/10",   iconText: "text-amber-400" },
  indigo:  { iconBg: "bg-indigo-500/10",  iconText: "text-indigo-400" },
  violet:  { iconBg: "bg-violet-500/10",  iconText: "text-violet-400" },
};

export default function StatCard({ icon: Icon, label, value, accent, accentColor }: StatCardProps) {
  const colors = accentColor ? accentMap[accentColor] : null;

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900 p-4 hover:border-slate-700 transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colors?.iconBg ?? "bg-slate-800"} ${colors?.iconText ?? "text-slate-400"}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className={`text-2xl font-bold ${accent ?? "text-white"}`}>{value}</p>
      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium mt-1">
        {label}
      </p>
    </div>
  );
}
