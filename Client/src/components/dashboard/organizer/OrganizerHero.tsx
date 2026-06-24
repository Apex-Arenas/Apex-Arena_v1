import type { Dispatch, SetStateAction } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Gamepad2,
  PlusCircle,
  ListTodo,
  Wallet,
  Users,
  ChevronDown,
} from "lucide-react";
import type { DashboardData } from "../../../services/dashboard.service";

interface OrganizerHeroProps {
  profile: DashboardData["profile"] | undefined;
  initials: string;
  greeting: string;
  displayName: string;
  tournamentCount: number;
  organizerLiveCount: number;
  organizerTotalParticipants: number;
  organizerWalletBalance: number | null;
  statsOpen: boolean;
  setStatsOpen: Dispatch<SetStateAction<boolean>>;
}

export default function OrganizerHero({
  profile,
  initials,
  greeting,
  displayName,
  tournamentCount,
  organizerLiveCount,
  organizerTotalParticipants,
  organizerWalletBalance,
  statsOpen,
  setStatsOpen,
}: OrganizerHeroProps) {
  return (
    <div className="relative bg-slate-900 border-b border-slate-800/60 overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-orange-500/12 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-violet-600/8 blur-3xl pointer-events-none" />
      {/* Fine grid */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-size-[48px_48px]" />

      <div className="relative max-w-7xl mx-auto px-8 py-5 sm:px-14 lg:px-20 sm:py-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:justify-between">
          {/* Identity */}
          <div className="flex flex-col items-center text-center gap-3 sm:flex-row sm:items-center sm:text-left">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full ring-2 ring-orange-500/40 ring-offset-2 ring-offset-slate-900 bg-slate-800 flex items-center justify-center text-xl font-bold text-white overflow-hidden">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
            </div>
            <div>
              <p className="text-xs text-orange-400/80 font-semibold uppercase tracking-[0.18em] mb-1">
                {greeting} · Organizer
              </p>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-none">
                {displayName}
              </h1>
              {tournamentCount > 0 ? (
                <p className="text-sm text-slate-400 mt-2">
                  {tournamentCount} tournament
                  {tournamentCount !== 1 ? "s" : ""} ·{" "}
                  <span className="text-emerald-400">
                    {organizerLiveCount} live
                  </span>
                </p>
              ) : (
                <p className="text-sm text-slate-500 mt-2">
                  No tournaments yet — create your first one
                </p>
              )}
            </div>
          </div>

          {/* Live count + CTAs */}
          <div className="flex flex-col items-center gap-4 shrink-0 sm:items-end">
            {organizerLiveCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                </span>
                <span className="font-display text-2xl font-bold text-white">
                  {organizerLiveCount}
                </span>
                <span className="text-sm text-slate-400">
                  live right now
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Link
                to="/auth/organizer/create-tournament"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                Create Tournament
              </Link>
              <Link
                to="/auth/organizer/tournaments"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:border-slate-600 hover:bg-slate-800/60 transition-all"
              >
                <ListTodo className="w-4 h-4" />
                Manage
              </Link>
            </div>
          </div>
        </div>

        {/* Stats strip — dropdown on mobile, grid on sm+ */}
        {(() => {
          const statItems = [
            { icon: Trophy,   iconColor: "text-orange-400",  bg: "from-orange-500/15 to-amber-500/15",  label: "Tournaments",    value: String(tournamentCount) },
            { icon: Gamepad2, iconColor: "text-emerald-400", bg: "from-emerald-500/15 to-teal-500/15",  label: "Live / Active",  value: String(organizerLiveCount) },
            { icon: Users,    iconColor: "text-cyan-400",    bg: "from-cyan-500/15 to-indigo-500/15",   label: "Total Entrants", value: String(organizerTotalParticipants) },
            { icon: Wallet,   iconColor: "text-amber-400",   bg: "from-amber-500/15 to-orange-500/15",  label: "Wallet",         value: organizerWalletBalance === null ? "GHS —" : `GHS ${(organizerWalletBalance / 100).toFixed(2)}` },
          ];
          return (
            <>
              {/* Mobile dropdown */}
              <div className="sm:hidden mt-4">
                <button
                  onClick={() => setStatsOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs font-semibold text-slate-400 uppercase tracking-widest"
                >
                  <span>My Stats</span>
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
              <div className="hidden sm:grid sm:grid-cols-4 gap-3 mt-5">
                {statItems.map((s) => (
                  <div key={s.label} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3">
                    <div className={`w-9 h-9 rounded-xl bg-linear-to-br ${s.bg} flex items-center justify-center shrink-0`}>
                      <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-xl font-bold tabular-nums text-white leading-none">{s.value}</p>
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
