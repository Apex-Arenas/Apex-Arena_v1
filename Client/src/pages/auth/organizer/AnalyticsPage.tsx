import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart2,
  Loader2, ArrowRight, Gamepad2, Users, Trophy, CheckCircle2,
} from "lucide-react";
import { organizerService, type Tournament } from "../../../services/organizer.service";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtGhs(pesewas: number) {
  return `GHS ${(pesewas / 100).toLocaleString("en-GH", { minimumFractionDigits: 0 })}`;
}

function fmtDate(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_META: Record<string, { label: string; dot: string; bar: string; text: string }> = {
  completed:        { label: "Completed",   dot: "bg-emerald-400", bar: "bg-emerald-400", text: "text-emerald-400" },
  started:          { label: "Live",        dot: "bg-orange-400",  bar: "bg-orange-400",  text: "text-orange-400" },
  ongoing:          { label: "Live",        dot: "bg-orange-400",  bar: "bg-orange-400",  text: "text-orange-400" },
  in_progress:      { label: "Live",        dot: "bg-orange-400",  bar: "bg-orange-400",  text: "text-orange-400" },
  open:             { label: "Open",        dot: "bg-cyan-400",    bar: "bg-cyan-400",    text: "text-cyan-400"   },
  published:        { label: "Published",   dot: "bg-cyan-400",    bar: "bg-cyan-400",    text: "text-cyan-400"   },
  awaiting_deposit: { label: "Pending",     dot: "bg-amber-400",   bar: "bg-amber-400",   text: "text-amber-400"  },
  draft:            { label: "Draft",       dot: "bg-slate-500",   bar: "bg-slate-500",   text: "text-slate-400"  },
  cancelled:        { label: "Cancelled",   dot: "bg-red-400",     bar: "bg-red-400",     text: "text-red-400"    },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const BAR_GRADIENT: Record<string, string> = {
  "bg-emerald-400": "linear-gradient(to right, #059669, #34d399)",
  "bg-orange-400":  "linear-gradient(to right, #ea580c, #fb923c)",
  "bg-cyan-400":    "linear-gradient(to right, #0891b2, #22d3ee)",
  "bg-amber-400":   "linear-gradient(to right, #d97706, #fbbf24)",
  "bg-slate-500":   "linear-gradient(to right, #475569, #94a3b8)",
  "bg-red-400":     "linear-gradient(to right, #dc2626, #f87171)",
};

const BAR_SHADOW: Record<string, string> = {
  "bg-emerald-400": "0 0 12px rgba(52,211,153,0.5)",
  "bg-orange-400":  "0 0 12px rgba(251,146,60,0.5)",
  "bg-cyan-400":    "0 0 12px rgba(34,211,238,0.5)",
  "bg-amber-400":   "0 0 12px rgba(251,191,36,0.5)",
  "bg-slate-500":   "none",
  "bg-red-400":     "0 0 12px rgba(248,113,113,0.4)",
};

function StatusRow({
  label, count, total, bar, index, animated,
}: {
  label: string; count: number; total: number;
  bar: string; index: number; animated: boolean;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const gradient = BAR_GRADIENT[bar] ?? BAR_GRADIENT["bg-slate-500"];
  const shadow   = BAR_SHADOW[bar]   ?? "none";

  return (
    <div className="group flex items-center gap-4">
      {/* Label */}
      <span className="text-xs text-slate-400 w-32 shrink-0">{label}</span>

      {/* Track */}
      <div className="flex-1 h-3 rounded-full bg-slate-800/80 overflow-hidden relative">
        {/* Animated fill */}
        <div
          className="h-full rounded-full"
          style={{
            width: animated ? `${pct}%` : "0%",
            background: gradient,
            boxShadow: animated ? shadow : "none",
            transition: `width 900ms cubic-bezier(0.22,1,0.36,1) ${index * 120}ms, box-shadow 600ms ease ${index * 120}ms`,
          }}
        />
        {/* Tip glow dot */}
        {animated && pct > 2 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
            style={{
              left: `calc(${pct}% - 4px)`,
              background: gradient,
              boxShadow: shadow,
              transition: `left 900ms cubic-bezier(0.22,1,0.36,1) ${index * 120}ms`,
            }}
          />
        )}
      </div>

      {/* Count + % */}
      <div className="flex items-center gap-2 shrink-0 w-20 justify-end">
        <span className="text-sm font-bold text-white tabular-nums">{count}</span>
        <span className="text-[11px] text-slate-500 tabular-nums">{pct}%</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    organizerService.getMyTournaments()
      .then(setTournaments)
      .catch(() => setTournaments([]))
      .finally(() => {
        setLoading(false);
        // Small delay so bars animate in after paint
        requestAnimationFrame(() => setTimeout(() => setAnimated(true), 80));
      });
  }, []);

  // ── Derived metrics ──────────────────────────────────────────────────────
  const total = tournaments.length;
  const completed  = tournaments.filter(t => t.status === "completed").length;
  const live       = tournaments.filter(t => ["started", "ongoing", "in_progress"].includes(t.status)).length;
  const open       = tournaments.filter(t => ["open", "published"].includes(t.status)).length;
  const draft      = tournaments.filter(t => t.status === "draft").length;
  const cancelled  = tournaments.filter(t => t.status === "cancelled").length;
  const pending    = tournaments.filter(t => t.status === "awaiting_deposit").length;

  const totalPlayers  = tournaments.reduce((s, t) => s + (t.currentCount ?? 0), 0);
  const totalPrize    = tournaments.reduce((s, t) => s + (t.prizePool ?? 0), 0);
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const avgFillRate = total > 0
    ? Math.round(tournaments.reduce((s, t) =>
        s + (t.maxParticipants > 0 ? (t.currentCount / t.maxParticipants) * 100 : 0), 0
      ) / total)
    : 0;

  // Revenue potential: entry fee × current registrants (non-free only)
  const revenueEstimate = tournaments
    .filter(t => !t.isFree)
    .reduce((s, t) => s + (t.entryFee ?? 0) * (t.currentCount ?? 0), 0);

  // Most popular game
  const gameCounts: Record<string, number> = {};
  tournaments.forEach(t => {
    const name = t.game?.name ?? "Unknown";
    gameCounts[name] = (gameCounts[name] ?? 0) + 1;
  });
  const topGame = Object.entries(gameCounts).sort((a, b) => b[1] - a[1])[0];

  // Top 5 by fill rate
  const topByFill = [...tournaments]
    .filter(t => t.maxParticipants > 0)
    .sort((a, b) => (b.currentCount / b.maxParticipants) - (a.currentCount / a.maxParticipants))
    .slice(0, 5);

  return (
    <div className="min-h-screen">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="relative bg-slate-900 border-b border-slate-800/60 overflow-hidden">
        <div className="absolute -top-40 right-0 w-175 h-100 rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-125 h-50 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-size-[60px_60px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-7">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-none">Analytics</h1>
            <p className="text-base text-slate-400 mt-3">Performance overview across all your tournaments.</p>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { icon: BarChart2,    iconColor: "text-orange-400",  bg: "from-orange-500/15 to-amber-500/15",   label: "Tournaments",     value: loading ? "—" : String(total) },
              { icon: Users,        iconColor: "text-cyan-400",    bg: "from-cyan-500/15 to-indigo-500/15",    label: "Total Players",   value: loading ? "—" : String(totalPlayers) },
              { icon: CheckCircle2, iconColor: "text-emerald-400", bg: "from-emerald-500/15 to-teal-500/15",  label: "Completion Rate", value: loading ? "—" : `${completionRate}%` },
              { icon: Trophy,       iconColor: "text-amber-400",   bg: "from-amber-500/15 to-orange-500/15",  label: "Prize Pool",      value: loading ? "—" : (totalPrize > 0 ? fmtGhs(totalPrize) : "—") },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 sm:gap-3 bg-slate-800/50 border border-slate-700/60 rounded-xl px-3 sm:px-4 py-3">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-linear-to-br ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${s.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-base sm:text-xl font-bold tabular-nums text-white leading-none">{s.value}</p>
                  <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-widest truncate">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Loading analytics…</span>
          </div>
        </div>
      ) : total === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 py-20 px-6 text-center">
          <BarChart2 className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="font-display text-xl font-semibold text-slate-400">No data yet</p>
          <p className="text-sm text-slate-600 mt-2 mb-7">Create your first tournament to start seeing analytics.</p>
          <Link to="/auth/organizer/create-tournament"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold">
            Create Tournament
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

          {/* ── Left column ──────────────────────────────────── */}
          <div className="space-y-6">

            {/* Status breakdown */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-white">Status Breakdown</h2>
                <span className="text-xs text-slate-500">{total} total</span>
              </div>
              <div className="px-6 py-5 space-y-5">
                <StatusRow label="Completed"        count={completed} total={total} bar="bg-emerald-400" index={0} animated={animated} />
                <StatusRow label="Live / Ongoing"   count={live}      total={total} bar="bg-orange-400"  index={1} animated={animated} />
                <StatusRow label="Open / Published" count={open}      total={total} bar="bg-cyan-400"    index={2} animated={animated} />
                <StatusRow label="Awaiting Deposit" count={pending}   total={total} bar="bg-amber-400"   index={3} animated={animated} />
                <StatusRow label="Draft"            count={draft}     total={total} bar="bg-slate-500"   index={4} animated={animated} />
                <StatusRow label="Cancelled"        count={cancelled} total={total} bar="bg-red-400"     index={5} animated={animated} />
              </div>
            </div>

            {/* All tournaments table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800">
                <h2 className="font-display text-xl font-bold text-white">All Tournaments</h2>
              </div>
              <div className="divide-y divide-slate-800/60">
                {tournaments.map(t => {
                  const meta = STATUS_META[t.status] ?? { label: t.status, dot: "bg-slate-500", bar: "bg-slate-500", text: "text-slate-400" };
                  const fillPct = t.maxParticipants > 0 ? Math.min(100, Math.round((t.currentCount / t.maxParticipants) * 100)) : 0;
                  const cover = t.thumbnailUrl ?? t.bannerUrl ?? null;

                  return (
                    <Link
                      key={t.id}
                      to={`/auth/organizer/tournaments/${t.id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-slate-700/50">
                        {cover ? (
                          <img src={cover} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {t.game?.logoUrl
                              ? <img src={t.game.logoUrl} alt="" className="w-7 h-7 object-contain opacity-40" />
                              : <Gamepad2 className="w-5 h-5 text-slate-600" />
                            }
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate group-hover:text-orange-300 transition-colors">
                          {t.title}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {t.game?.name ?? "Unknown"} · {fmtDate(t.schedule?.tournamentStart)}
                        </p>
                        {/* Fill bar */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden max-w-30">
                            <div className={`h-full ${meta.bar}`} style={{ width: `${fillPct}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-500">{t.currentCount}/{t.maxParticipants}</span>
                        </div>
                      </div>

                      {/* Status + prize */}
                      <div className="text-right shrink-0 space-y-1.5">
                        <span className={`flex items-center gap-1.5 justify-end text-[10px] font-bold uppercase tracking-wide ${meta.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                        {t.prizePool && t.prizePool > 0 ? (
                          <p className="text-[11px] text-amber-400 font-semibold">{fmtGhs(t.prizePool)}</p>
                        ) : (
                          <p className="text-[11px] text-slate-600">Free</p>
                        )}
                      </div>

                      <ArrowRight className="w-4 h-4 text-slate-700 group-hover:text-slate-400 transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right column ─────────────────────────────────── */}
          <div className="space-y-4">

            {/* Key insights */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800">
                <h3 className="font-display text-base font-bold text-white">Key Insights</h3>
              </div>
              <div className="divide-y divide-slate-800/60">
                {[
                  { label: "Avg. fill rate",      value: `${avgFillRate}%`,                             accent: "text-cyan-400" },
                  { label: "Live right now",       value: String(live),                                  accent: live > 0 ? "text-orange-400" : "text-slate-400" },
                  { label: "Revenue estimate",     value: revenueEstimate > 0 ? fmtGhs(revenueEstimate) : "—", accent: "text-emerald-400" },
                  { label: "Most popular game",    value: topGame?.[0] ?? "—",                           accent: "text-white" },
                  { label: "Cancelled",            value: `${cancelled} tournament${cancelled !== 1 ? "s" : ""}`, accent: cancelled > 0 ? "text-red-400" : "text-slate-400" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-5 py-3">
                    <span className="text-xs text-slate-500">{row.label}</span>
                    <span className={`text-sm font-bold ${row.accent}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top by fill rate */}
            {topByFill.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800">
                  <h3 className="font-display text-base font-bold text-white">Top Fill Rate</h3>
                </div>
                <div className="p-4 space-y-3">
                  {topByFill.map(t => {
                    const pct = t.maxParticipants > 0 ? Math.round((t.currentCount / t.maxParticipants) * 100) : 0;
                    const meta = STATUS_META[t.status] ?? { bar: "bg-slate-500" };
                    return (
                      <div key={t.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-300 truncate max-w-40">{t.title}</span>
                          <span className="text-xs font-bold text-white tabular-nums ml-2">{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className={`h-full ${meta.bar}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="p-2">
                {[
                  { label: "Create a tournament", to: "/auth/organizer/create-tournament", accent: true },
                  { label: "Manage tournaments",  to: "/auth/organizer/tournaments" },
                  { label: "Payouts",             to: "/auth/organizer/payouts" },
                ].map(a => (
                  <Link key={a.to} to={a.to}
                    className={`flex items-center justify-between text-xs rounded-xl px-3 py-2.5 transition-all group ${
                      a.accent
                        ? "text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    }`}>
                    {a.label}
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
