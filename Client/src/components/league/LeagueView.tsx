import { useState, useEffect } from "react";
import { Trophy, CalendarDays, RefreshCw, AlertCircle } from "lucide-react";
import { tournamentService } from "../../services/tournament.service";
import type {
  LeagueTableRow,
  LeagueMatchweek,
} from "../../services/tournament.service";
import { LeagueTable } from "./LeagueTable";
import { MatchweekFixtures } from "./MatchweekFixtures";
import { MatchActionModal } from "./MatchActionModal";
import { OrganizerMatchModal } from "./OrganizerMatchModal";

interface LeagueViewProps {
  tournamentId: string;
  currentMatchweek: number;
  totalMatchweeks: number;
  legs?: number;
  highlightUserId?: string;
  isOrganizer?: boolean;
}

type ActiveTab = "table" | "fixtures";

export function LeagueView({
  tournamentId,
  currentMatchweek,
  totalMatchweeks,
  legs = 1,
  highlightUserId,
  isOrganizer = false,
}: LeagueViewProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("table");
  const [table, setTable] = useState<LeagueTableRow[]>([]);
  const [matchweeks, setMatchweeks] = useState<LeagueMatchweek[]>([]);
  const defaultWeek =
    legs >= 2 && currentMatchweek > 0
      ? currentMatchweek - 1
      : currentMatchweek || 1;
  const [selectedWeek, setSelectedWeek] = useState(defaultWeek);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  async function loadData(showRefresh = false, recalculate = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      if (recalculate && isOrganizer) {
        await tournamentService.recalculateLeagueStandings(tournamentId);
      }
      const [tableData, mwData] = await Promise.all([
        tournamentService.getLeagueTable(tournamentId),
        tournamentService.getLeagueMatchweeks(tournamentId),
      ]);
      setTable(tableData);
      setMatchweeks(mwData);
      if (mwData.length > 0 && selectedWeek === 0) {
        setSelectedWeek(
          legs >= 2 && currentMatchweek > 0
            ? currentMatchweek - 1
            : currentMatchweek || mwData[0].week,
        );
      }
    } catch {
      setError("Failed to load league data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "table", label: "Standings", icon: <Trophy className="w-4 h-4" /> },
    {
      id: "fixtures",
      label: "Fixtures",
      icon: <CalendarDays className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        {/* Tab pills */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 rounded-2xl p-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 shadow-lg shadow-orange-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Week indicator */}
          {totalMatchweeks > 0 && currentMatchweek > 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs">
              <CalendarDays className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-slate-400">Week</span>
              <span className="font-bold text-white tabular-nums">
                {legs >= 2
                  ? `${currentMatchweek - 1}–${currentMatchweek}`
                  : currentMatchweek}
              </span>
              <span className="text-slate-600">/ {totalMatchweeks}</span>
            </div>
          )}
          {/* Refresh — icon-only on mobile, with label on sm+ */}
          <button
            onClick={() => loadData(true, true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 rounded-xl border border-slate-700 text-xs text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 shrink-0 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">
              {refreshing ? "Refreshing…" : "Refresh"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-24 rounded-2xl bg-slate-800" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-slate-800/70" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-2xl border border-dashed border-slate-700">
          <AlertCircle className="w-8 h-8 text-slate-600" />
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => loadData()}
            className="text-sm text-orange-400 hover:text-orange-300 font-semibold underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      ) : activeTab === "table" ? (
        <LeagueTable table={table} highlightUserId={highlightUserId} />
      ) : (
        <MatchweekFixtures
          matchweeks={matchweeks}
          currentWeek={selectedWeek}
          onWeekChange={setSelectedWeek}
          highlightUserId={highlightUserId}
          onMatchClick={(id) => setActiveMatchId(id)}
        />
      )}

      {/* Modals */}
      {activeMatchId && highlightUserId && (
        <MatchActionModal
          matchId={activeMatchId}
          currentUserId={highlightUserId}
          currentMatchweek={currentMatchweek}
          onClose={() => setActiveMatchId(null)}
          onActionComplete={() => {
            setActiveMatchId(null);
            loadData(true);
          }}
        />
      )}
      {activeMatchId && !highlightUserId && isOrganizer && (
        <OrganizerMatchModal
          matchId={activeMatchId}
          onClose={() => setActiveMatchId(null)}
          onActionComplete={() => {
            setActiveMatchId(null);
            loadData(true);
          }}
        />
      )}
    </div>
  );
}
