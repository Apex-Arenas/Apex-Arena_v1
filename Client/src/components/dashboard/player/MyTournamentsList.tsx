import type { Dispatch, SetStateAction } from "react";
import { Link } from "react-router-dom";
import { Trophy, Swords } from "lucide-react";
import type { DashboardData } from "../../../services/dashboard.service";
import JoinedTournamentDetailsCard from "../JoinedTournamentDetailsCard";

type Registration = DashboardData["registrations"][number];

interface MyTournamentsListProps {
  registrations: Registration[];
  activeRegistrations: Registration[];
  completedRegistrations: Registration[];
  tournamentTab: "active" | "history";
  setTournamentTab: Dispatch<SetStateAction<"active" | "history">>;
}

export default function MyTournamentsList({
  registrations,
  activeRegistrations,
  completedRegistrations,
  tournamentTab,
  setTournamentTab,
}: MyTournamentsListProps) {
  return (
    <section className="min-w-0 space-y-6 mt-8">
      {/* Section header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-6 rounded-full bg-linear-to-b from-orange-400 to-amber-500 shrink-0" />
          <h2 className="font-display text-xl font-bold text-white">My Tournaments</h2>
          {registrations.length > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">
              {registrations.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-full sm:w-auto">
          <button
            onClick={() => setTournamentTab("active")}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tournamentTab === "active"
                ? "bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 shadow shadow-orange-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            Active
            {activeRegistrations.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                tournamentTab === "active" ? "bg-slate-950/30 text-slate-950" : "bg-slate-800 text-slate-400"
              }`}>
                {activeRegistrations.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTournamentTab("history")}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tournamentTab === "history"
                ? "bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 shadow shadow-orange-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            History
            {completedRegistrations.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                tournamentTab === "history" ? "bg-slate-950/30 text-slate-950" : "bg-slate-800 text-slate-400"
              }`}>
                {completedRegistrations.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {tournamentTab === "active" ? (
        activeRegistrations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeRegistrations.map((reg) => (
              <JoinedTournamentDetailsCard key={reg.id} reg={reg} />
            ))}
            <Link
              to="/auth/player/join-tournament"
              className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 py-10 px-6 text-center hover:border-orange-500/40 hover:bg-orange-500/5 transition-all group min-h-65"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                <Swords className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="font-display text-sm font-bold text-slate-300 group-hover:text-white transition-colors">Find More</p>
                <p className="text-xs text-slate-500 mt-0.5">Browse open tournaments</p>
              </div>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40">
            <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center mb-4">
              <Swords className="w-7 h-7 text-slate-600" />
            </div>
            <h3 className="font-display text-lg font-bold text-white mb-1">No Active Tournaments</h3>
            <p className="text-sm text-slate-400 max-w-xs mb-5">
              Join a tournament to see it here.
            </p>
            <Link
              to="/auth/player/join-tournament"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 transition-all"
            >
              <Swords className="w-4 h-4" />
              Browse Tournaments
            </Link>
          </div>
        )
      ) : completedRegistrations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {completedRegistrations.map((reg) => (
            <JoinedTournamentDetailsCard key={reg.id} reg={reg} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40">
          <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center mb-4">
            <Trophy className="w-7 h-7 text-slate-600" />
          </div>
          <h3 className="font-display text-lg font-bold text-white mb-1">No Tournament History</h3>
          <p className="text-sm text-slate-400 max-w-xs">Completed tournaments will appear here.</p>
        </div>
      )}
    </section>
  );
}
