import { useState, useEffect, useRef } from "react";
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
  pointsPerWin?: number;
  pointsPerDraw?: number;
  pointsPerLoss?: number;
  highlightUserId?: string;
  isOrganizer?: boolean;
}

type ActiveTab = "table" | "fixtures";

export function LeagueView({
  tournamentId,
  currentMatchweek,
  totalMatchweeks,
  legs = 1,
  pointsPerWin = 3,
  pointsPerDraw = 1,
  pointsPerLoss = 0,
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
  const defaultWeekRef = useRef(defaultWeek);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  function buildTableFromMatchweeks(
    matchweeks: LeagueMatchweek[],
    baseTable: LeagueTableRow[],
  ): LeagueTableRow[] {
    const baseByKey = new Map<string, LeagueTableRow>();
    baseTable.forEach((row) => {
      const key = row.userId ?? row.teamId ?? row.inGameId ?? row.displayName;
      if (key) baseByKey.set(key, row);
    });

    const rows = new Map<string, LeagueTableRow>();
    const formBuckets = new Map<string, { week: number; result: string }[]>();

    const ensureRow = (key: string, seed: Partial<LeagueTableRow>) => {
      if (rows.has(key)) return rows.get(key)!;
      const base = baseByKey.get(key);
      const row: LeagueTableRow = {
        userId: base?.userId ?? seed.userId,
        teamId: base?.teamId ?? seed.teamId,
        displayName: base?.displayName ?? seed.displayName ?? "Unknown",
        inGameId: base?.inGameId ?? seed.inGameId,
        avatarUrl: base?.avatarUrl ?? seed.avatarUrl,
        position: 0,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        form: [],
        positionChange: 0,
      };
      rows.set(key, row);
      return row;
    };

    const addForm = (key: string, week: number, result: string) => {
      const bucket = formBuckets.get(key) ?? [];
      bucket.push({ week, result });
      formBuckets.set(key, bucket);
    };

    matchweeks.forEach((mw) => {
      mw.matches.forEach((match) => {
        if (match.status !== "completed") return;

        const p1Key = match.player1Id || match.player1Name;
        const p2Key = match.player2Id || match.player2Name;
        if (!p1Key || !p2Key) return;

        const p1 = ensureRow(p1Key, {
          userId: match.player1Id,
          displayName: match.player1Name,
          avatarUrl: match.player1Avatar,
        });
        const p2 = ensureRow(p2Key, {
          userId: match.player2Id,
          displayName: match.player2Name,
          avatarUrl: match.player2Avatar,
        });

        const hasScores =
          typeof match.score1 === "number" && typeof match.score2 === "number";
        const winnerId = match.winnerId;
        let p1Result: "W" | "D" | "L" | null = null;
        let p2Result: "W" | "D" | "L" | null = null;

        if (winnerId && match.player1Id && winnerId === match.player1Id) {
          p1Result = "W";
          p2Result = "L";
        } else if (
          winnerId &&
          match.player2Id &&
          winnerId === match.player2Id
        ) {
          p1Result = "L";
          p2Result = "W";
        } else if (hasScores) {
          if (match.score1! > match.score2!) {
            p1Result = "W";
            p2Result = "L";
          } else if (match.score1! < match.score2!) {
            p1Result = "L";
            p2Result = "W";
          } else {
            p1Result = "D";
            p2Result = "D";
          }
        }

        if (!p1Result || !p2Result) return;

        p1.played += 1;
        p2.played += 1;

        if (p1Result === "W") {
          p1.won += 1;
          p2.lost += 1;
          p1.points += pointsPerWin;
          p2.points += pointsPerLoss;
        } else if (p1Result === "L") {
          p1.lost += 1;
          p2.won += 1;
          p1.points += pointsPerLoss;
          p2.points += pointsPerWin;
        } else {
          p1.drawn += 1;
          p2.drawn += 1;
          p1.points += pointsPerDraw;
          p2.points += pointsPerDraw;
        }

        if (hasScores) {
          p1.goalsFor += match.score1!;
          p1.goalsAgainst += match.score2!;
          p2.goalsFor += match.score2!;
          p2.goalsAgainst += match.score1!;
        }

        addForm(p1Key, mw.week, p1Result);
        addForm(p2Key, mw.week, p2Result);
      });
    });

    baseTable.forEach((row) => {
      const key = row.userId ?? row.teamId ?? row.inGameId ?? row.displayName;
      if (!key) return;
      if (!rows.has(key)) {
        rows.set(key, {
          ...row,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
          form: [],
          positionChange: row.positionChange ?? 0,
        });
      }
    });

    const computed = Array.from(rows.values()).map((row) => {
      row.goalDifference = row.goalsFor - row.goalsAgainst;
      const key = row.userId ?? row.teamId ?? row.inGameId ?? row.displayName;
      const bucket = formBuckets.get(key) ?? [];
      row.form = bucket
        .sort((a, b) => a.week - b.week)
        .map((item) => item.result)
        .slice(-5);
      return row;
    });

    computed.sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.displayName.localeCompare(b.displayName),
    );

    computed.forEach((row, index) => {
      row.position = index + 1;
    });

    return computed;
  }

  async function loadData(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [tableData, mwData] = await Promise.all([
        tournamentService.getLeagueTable(tournamentId),
        tournamentService.getLeagueMatchweeks(tournamentId),
      ]);
      const hasCompletedScores = mwData.some((mw) =>
        mw.matches.some((match) => match.status === "completed"),
      );
      const computedTable = hasCompletedScores
        ? buildTableFromMatchweeks(mwData, tableData)
        : tableData;
      setTable(computedTable);
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

  useEffect(() => {
    if (selectedWeek === defaultWeekRef.current) {
      setSelectedWeek(defaultWeek);
    }
    defaultWeekRef.current = defaultWeek;
  }, [defaultWeek, selectedWeek]);

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
            onClick={() => loadData(true)}
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
