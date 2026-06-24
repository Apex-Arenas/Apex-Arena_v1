import type { Dispatch, SetStateAction } from "react";
import { Link } from "react-router-dom";
import { Trophy, Gamepad2, Wallet, Swords, ChevronDown } from "lucide-react";
import type { DashboardData } from "../../../services/dashboard.service";

interface PlayerHeroProps {
  profile: DashboardData["profile"] | undefined;
  initials: string;
  greeting: string;
  displayName: string;
  activeCount: number;
  stats: DashboardData["stats"];
  statsOpen: boolean;
  setStatsOpen: Dispatch<SetStateAction<boolean>>;
}

export default function PlayerHero({
  profile,
  initials,
  greeting,
  displayName,
  activeCount,
  stats,
  statsOpen,
  setStatsOpen,
}: PlayerHeroProps) {
  return (
    <div className="relative bg-slate-900 border-b border-slate-800/60 overflow-hidden">
      <div className="absolute -top-20 right-0 w-96 h-96 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-60 rounded-full bg-amber-500/6 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[48px_48px]" />

      <div className="relative max-w-7xl mx-auto px-4 py-5 sm:px-8 sm:py-6">
        {/* Identity + CTAs */}
        <div className="flex flex-col items-center text-center gap-4 sm:flex-row sm:items-start sm:text-left sm:justify-between">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full ring-2 ring-orange-500/40 ring-offset-2 ring-offset-slate-900 bg-slate-800 flex items-center justify-center text-xl font-bold text-white overflow-hidden">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
            </div>
            <div>
              <p className="text-xs text-orange-400/80 font-semibold uppercase tracking-[0.18em] mb-1">
                {greeting} · Player
              </p>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-none">
                {displayName}
              </h1>
              <p className="text-sm text-slate-400 mt-2">
                {activeCount > 0
                  ? `${activeCount} active tournament${activeCount !== 1 ? "s" : ""}`
                  : "No active tournaments · browse to join one"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-center sm:justify-end">
            <Link
              to="/auth/player/join-tournament"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 transition-all"
            >
              <Swords className="w-4 h-4" />
              Find Tournaments
            </Link>
            <Link
              to="/auth/player/profile"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:border-slate-600 hover:bg-slate-800/60 transition-all"
            >
              Profile
            </Link>
          </div>
        </div>

        {/* Stats strip — grid on sm+, dropdown on mobile */}
        {(() => {
          const statItems = [
            { icon: Trophy,   iconColor: "text-orange-400",  bg: "from-orange-500/15 to-amber-500/15",  label: "Tournaments", value: String(stats.joinedTournaments) },
            { icon: Swords,   iconColor: "text-emerald-400", bg: "from-emerald-500/15 to-teal-500/15",  label: "Total Wins",  value: String(stats.totalWins) },
            { icon: Wallet,   iconColor: "text-amber-400",   bg: "from-amber-500/15 to-orange-500/15",  label: "Prize Won",   value: stats.totalPrizeWon > 0 ? `GHS ${(stats.totalPrizeWon / 100).toFixed(2)}` : "GHS 0" },
            { icon: Gamepad2, iconColor: "text-cyan-400",    bg: "from-cyan-500/15 to-indigo-500/15",   label: "Checked In",  value: String(stats.checkedInCount) },
          ];
          return (
            <>
              {/* Mobile: dropdown */}
              <div className="sm:hidden mt-4">
                <button
                  onClick={() => setStatsOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-sm font-semibold text-slate-300"
                >
                  <span className="text-slate-400 text-xs uppercase tracking-widest font-semibold">My Stats</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${statsOpen ? "rotate-180" : ""}`} />
                </button>
                {statsOpen && (
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {statItems.map((s) => (
                      <div key={s.label} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3">
                        <div className={`w-8 h-8 rounded-xl bg-linear-to-br ${s.bg} flex items-center justify-center shrink-0`}>
                          <s.icon className={`w-3.5 h-3.5 ${s.iconColor}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-display text-base font-bold tabular-nums text-white leading-none truncate">{s.value}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest truncate">{s.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* sm+: full grid */}
              <div className="hidden sm:grid sm:grid-cols-4 gap-3 mt-6">
                {statItems.map((s) => (
                  <div key={s.label} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3">
                    <div className={`w-9 h-9 rounded-xl bg-linear-to-br ${s.bg} flex items-center justify-center shrink-0`}>
                      <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-xl font-bold tabular-nums text-white leading-none truncate">{s.value}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest truncate">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
