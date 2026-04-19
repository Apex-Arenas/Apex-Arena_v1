import { useEffect, useState } from "react";
import {
  BarChart2, CalendarDays, CheckCircle2,
  Loader2, Trophy, Users,
} from "lucide-react";
import { organizerService, type Tournament } from "../../../services/organizer.service";

function StatCard({ label, value, sub, icon, accent = "cyan" }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; accent?: "cyan" | "indigo" | "emerald" | "amber";
}) {
  const colors: Record<string, string> = {
    cyan: "border-cyan-500/30 bg-cyan-950/20",
    indigo: "border-indigo-500/30 bg-indigo-950/20",
    emerald: "border-emerald-500/30 bg-emerald-950/20",
    amber: "border-amber-500/30 bg-amber-950/20",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[accent]}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-400">{label}</p>
        <div className="w-7 h-7 rounded-lg bg-slate-800/60 flex items-center justify-center">{icon}</div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400 capitalize">{label}</span>
        <span className="text-slate-300 font-medium">{count} <span className="text-slate-500">({pct}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    organizerService.getMyTournaments()
      .then(setTournaments)
      .catch(() => setTournaments([]))
      .finally(() => setLoading(false));
  }, []);

  const total = tournaments.length;
  const completed = tournaments.filter(t => t.status === "completed").length;
  const ongoing = tournaments.filter(t => ["started", "ongoing"].includes(t.status)).length;
  const open = tournaments.filter(t => ["open", "published"].includes(t.status)).length;
  const draft = tournaments.filter(t => t.status === "draft").length;
  const cancelled = tournaments.filter(t => t.status === "cancelled").length;
  const totalPlayers = tournaments.reduce((s, t) => s + (t.currentCount ?? 0), 0);
  const totalPrize = tournaments.reduce((s, t) => s + (t.prizePool ?? 0), 0);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-cyan-400" /> Analytics
        </h1>
        <p className="text-sm text-slate-400 mt-1">Overview of your tournaments and performance.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Tournaments" value={total} icon={<Trophy className="w-4 h-4 text-cyan-400" />} accent="cyan" />
            <StatCard label="Total Players" value={totalPlayers} icon={<Users className="w-4 h-4 text-indigo-400" />} accent="indigo" />
            <StatCard label="Completed" value={completed} sub={`${total > 0 ? Math.round((completed / total) * 100) : 0}% completion rate`} icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />} accent="emerald" />
            <StatCard label="Prize Pool" value={totalPrize > 0 ? `GHS ${(totalPrize / 100).toFixed(2)}` : "—"} icon={<Trophy className="w-4 h-4 text-amber-400" />} accent="amber" />
          </div>

          {/* Status breakdown */}
          {total > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <h2 className="font-semibold text-white text-sm">Tournament Status Breakdown</h2>
              <div className="space-y-3">
                <StatusBar label="Completed" count={completed} total={total} color="bg-emerald-500" />
                <StatusBar label="Live / Ongoing" count={ongoing} total={total} color="bg-blue-500" />
                <StatusBar label="Open / Published" count={open} total={total} color="bg-cyan-500" />
                <StatusBar label="Draft" count={draft} total={total} color="bg-slate-500" />
                <StatusBar label="Cancelled" count={cancelled} total={total} color="bg-red-500" />
              </div>
            </div>
          )}

          {/* Tournament list */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800">
              <h2 className="font-semibold text-white text-sm">All Tournaments</h2>
            </div>
            {tournaments.length === 0 ? (
              <p className="text-center py-10 text-sm text-slate-500">No tournaments yet.</p>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {tournaments.map(t => {
                  const fillPct = t.maxParticipants > 0
                    ? Math.min(100, Math.round((t.currentCount / t.maxParticipants) * 100))
                    : 0;
                  return (
                    <div key={t.id} className="px-5 py-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{t.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <CalendarDays className="w-3 h-3" />
                          {t.schedule?.tournamentStart
                            ? new Date(t.schedule.tournamentStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "TBD"}
                          <span className="capitalize">{t.tournamentType ?? "standard"}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                          t.status === "completed" ? "bg-emerald-500/20 text-emerald-300"
                          : t.status === "started" || t.status === "ongoing" ? "bg-blue-500/20 text-blue-300"
                          : t.status === "cancelled" ? "bg-red-500/20 text-red-400"
                          : "bg-slate-700/60 text-slate-400"
                        }`}>{t.status.replace("_", " ")}</span>
                        <p className="text-xs text-slate-500">
                          {t.currentCount}/{t.maxParticipants} players · {fillPct}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
