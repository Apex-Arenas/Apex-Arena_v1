import { useEffect, useState } from "react";
import { Loader2, Trophy, ChevronDown, Gamepad2, Medal, Crown } from "lucide-react";
import { tournamentService, type Tournament, type LeagueTableRow } from "../../services/tournament.service";
import { LeagueTable } from "../../components/league/LeagueTable";
import { useAuth } from "../../lib/auth-context";
import { apiGet } from "../../utils/api.utils";
import { TOURNAMENT_ENDPOINTS } from "../../config/api.config";

interface Game {
  id: string;
  name: string;
  logoUrl?: string;
}

interface TournamentResult {
  position: number | null;
  user: { _id: string; username: string; name?: string; avatar?: string };
  in_game_id: string;
  status: string;
  prize_won?: number;
  checked_in: boolean;
  disqualified: boolean;
  disqualification_reason?: string;
}

function PodiumCard({ result, rank }: { result: TournamentResult; rank: 1 | 2 | 3 }) {
  const configs = {
    1: { ring: "ring-amber-400/60", bg: "bg-amber-400/10", icon: <Crown className="w-5 h-5 text-amber-400" />, label: "1st", height: "h-24" },
    2: { ring: "ring-slate-400/50", bg: "bg-slate-400/10", icon: <Medal className="w-4 h-4 text-slate-300" />, label: "2nd", height: "h-16" },
    3: { ring: "ring-amber-700/50", bg: "bg-amber-700/10", icon: <Medal className="w-4 h-4 text-amber-600" />, label: "3rd", height: "h-12" },
  } as const;
  const c = configs[rank];
  const displayName = result.user.name || result.user.username;

  return (
    <div className={`flex flex-col items-center gap-2 flex-1 ${rank === 1 ? "order-first sm:order-2" : rank === 2 ? "order-2 sm:order-1" : "order-3"}`}>
      <div className={`relative ${c.bg} rounded-xl p-3 ring-1 ${c.ring} flex flex-col items-center gap-1.5`}>
        {result.user.avatar ? (
          <img src={result.user.avatar} alt={displayName}
            className="w-12 h-12 rounded-full object-cover border-2 border-slate-700" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-linear-to-br from-cyan-800 to-indigo-800 flex items-center justify-center text-white font-bold text-lg border-2 border-slate-700">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">{c.icon}</div>
        <span className="text-xs font-semibold text-white truncate max-w-20 text-center">{displayName}</span>
        {result.prize_won ? (
          <span className="text-[10px] text-emerald-400 font-semibold">₵{result.prize_won.toLocaleString()}</span>
        ) : null}
      </div>
      <div className={`${c.bg} ring-1 ${c.ring} rounded-b-lg w-full ${c.height} flex items-end justify-center pb-1`}>
        <span className="text-[11px] font-bold text-slate-400">{c.label}</span>
      </div>
    </div>
  );
}

function ResultsTable({ results, highlightUserId }: { results: TournamentResult[]; highlightUserId?: string }) {
  if (results.length === 0) return null;

  const podium = results.filter(r => r.position !== null && r.position <= 3).sort((a, b) => (a.position ?? 99) - (b.position ?? 99));

  return (
    <div className="space-y-6">
      {/* Podium */}
      {podium.length > 0 && (
        <div className="flex items-end gap-3 justify-center px-4 pt-4">
          {podium[0] && <PodiumCard result={podium[0]} rank={1} />}
          {podium[1] && <PodiumCard result={podium[1]} rank={2} />}
          {podium[2] && <PodiumCard result={podium[2]} rank={3} />}
        </div>
      )}

      {/* Full table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-10">#</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Player</th>
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">In-Game ID</th>
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Prize</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const isMe = !!highlightUserId && r.user._id === highlightUserId;
              const pos = r.position ?? i + 1;
              const displayName = r.user.name || r.user.username;
              const posColor = pos === 1 ? "text-amber-400 font-bold" : pos === 2 ? "text-slate-300 font-bold" : pos === 3 ? "text-amber-600 font-bold" : "text-slate-500";

              return (
                <tr
                  key={r.user._id}
                  className={`border-b border-slate-800/60 last:border-0 transition-colors ${
                    isMe ? "bg-cyan-950/30" : "hover:bg-slate-900/50"
                  }`}
                >
                  <td className={`px-4 py-3 tabular-nums text-sm ${posColor}`}>{pos}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {r.user.avatar ? (
                        <img src={r.user.avatar} alt={displayName}
                          className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-linear-to-br from-cyan-800 to-indigo-800 flex items-center justify-center text-white text-xs font-bold border border-slate-700 shrink-0">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className={`text-sm font-medium block truncate ${isMe ? "text-cyan-300" : "text-white"}`}>
                          {displayName}
                        </span>
                        {isMe && <span className="text-[10px] text-cyan-500 font-semibold">you</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-400 hidden sm:table-cell">
                    {r.in_game_id || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.disqualified ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-semibold">DQ</span>
                    ) : r.status === "winner" || r.status === "champion" ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold capitalize">{r.status}</span>
                    ) : r.status === "eliminated" || r.status === "lost" ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-500 font-semibold capitalize">{r.status}</span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700/40 text-slate-400 font-semibold capitalize">{r.status.replace(/_/g, " ")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {r.prize_won ? (
                      <span className="text-emerald-400 font-semibold">₵{r.prize_won.toLocaleString()}</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGameId, setSelectedGameId] = useState<string>("all");
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [table, setTable] = useState<LeagueTableRow[]>([]);
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [noStandings, setNoStandings] = useState(false);

  // Fetch games + tournaments in parallel
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [gamesRes, tournamentsRes] = await Promise.all([
          apiGet(TOURNAMENT_ENDPOINTS.GAMES),
          tournamentService.getTournaments({ limit: 100 }),
        ]);

        if (gamesRes.success) {
          const raw = gamesRes.data as Record<string, unknown>;
          const list = (Array.isArray(raw) ? raw : ((raw.games ?? raw.data ?? []) as Record<string, unknown>[]));
          setGames(list.map(g => ({
            id: String(g._id ?? g.id ?? ""),
            name: String(g.name ?? ""),
            logoUrl: g.logo_url as string | undefined ?? g.logoUrl as string | undefined,
          })));
        }

        setTournaments(tournamentsRes.tournaments);

        if (tournamentsRes.tournaments.length > 0) {
          setSelectedTournamentId(tournamentsRes.tournaments[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  // When game tab changes, auto-select first tournament in that game
  useEffect(() => {
    const filtered = filteredTournaments();
    if (filtered.length > 0) {
      setSelectedTournamentId(filtered[0].id);
    } else {
      setSelectedTournamentId(null);
      setTable([]);
      setResults([]);
      setNoStandings(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGameId, tournaments]);

  // Fetch standings when tournament changes
  useEffect(() => {
    if (!selectedTournamentId) return;
    const selected = tournaments.find(t => t.id === selectedTournamentId);
    setLoadingTable(true);
    setTable([]);
    setResults([]);
    setNoStandings(false);

    if (selected?.tournamentType === "league") {
      tournamentService.getLeagueTable(selectedTournamentId)
        .then(data => {
          setTable(data);
          setNoStandings(data.length === 0);
        })
        .catch(() => {
          setTable([]);
          setNoStandings(true);
        })
        .finally(() => setLoadingTable(false));
    } else {
      apiGet(`${TOURNAMENT_ENDPOINTS.RESULTS}/${selectedTournamentId}/results`)
        .then(res => {
          if (!res.success) { setNoStandings(true); return; }
          const raw = res.data as Record<string, unknown>;
          const list = (Array.isArray(raw) ? raw : ((raw.standings ?? raw.results ?? raw.data ?? []) as unknown[])) as TournamentResult[];
          setResults(list);
          setNoStandings(list.length === 0);
        })
        .catch(() => {
          setResults([]);
          setNoStandings(true);
        })
        .finally(() => setLoadingTable(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTournamentId]);

  function filteredTournaments() {
    if (selectedGameId === "all") return tournaments;
    return tournaments.filter(t => t.game?.id === selectedGameId || t.game?.name === games.find(g => g.id === selectedGameId)?.name);
  }

  const filtered = filteredTournaments();
  const selected = tournaments.find(t => t.id === selectedTournamentId);
  const isLeague = selected?.tournamentType === "league";

  const gamesWithTournaments = games.filter(g =>
    tournaments.some(t => t.game?.id === g.id || t.game?.name === g.name)
  );

  const leagueCount = tournaments.filter(t => t.tournamentType === "league").length;
  const bracketCount = tournaments.filter(t => t.tournamentType !== "league").length;

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative bg-slate-900 border-b border-slate-800/60 overflow-hidden">
        <div className="absolute -top-40 right-0 w-175 h-100 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-125 h-50 rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-size-[60px_60px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-7">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-none">Leaderboard</h1>
            <p className="text-base text-slate-400 mt-3">Standings by tournament — select a game and tournament to view rankings.</p>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { icon: Trophy,   iconColor: "text-amber-400",   bg: "from-amber-500/15 to-orange-500/15",  label: "Tournaments", value: loading ? "—" : String(tournaments.length) },
              { icon: Gamepad2, iconColor: "text-cyan-400",    bg: "from-cyan-500/15 to-indigo-500/15",   label: "Games",       value: loading ? "—" : String(gamesWithTournaments.length) },
              { icon: Crown,    iconColor: "text-violet-400",  bg: "from-violet-500/15 to-indigo-500/15", label: "League",      value: loading ? "—" : String(leagueCount) },
              { icon: Medal,    iconColor: "text-orange-400",  bg: "from-orange-500/15 to-amber-500/15",  label: "Bracket",     value: loading ? "—" : String(bracketCount) },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 sm:gap-3 bg-slate-800/50 border border-slate-700/60 rounded-xl px-3 sm:px-4 py-3">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-linear-to-br ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${s.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-lg sm:text-xl font-bold tabular-nums text-white leading-none">{s.value}</p>
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
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Game category tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              onClick={() => setSelectedGameId("all")}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border shrink-0 ${
                selectedGameId === "all"
                  ? "bg-cyan-500 text-slate-950 border-cyan-500"
                  : "bg-slate-900/60 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              All Games
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                selectedGameId === "all" ? "bg-slate-950/20 text-slate-950" : "bg-slate-700 text-slate-400"
              }`}>
                {tournaments.length}
              </span>
            </button>

            {gamesWithTournaments.map(game => {
              const count = tournaments.filter(t => t.game?.id === game.id || t.game?.name === game.name).length;
              const isActive = selectedGameId === game.id;
              return (
                <button
                  key={game.id}
                  onClick={() => setSelectedGameId(game.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border shrink-0 ${
                    isActive
                      ? "bg-cyan-500 text-slate-950 border-cyan-500"
                      : "bg-slate-900/60 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
                  }`}
                >
                  {game.logoUrl ? (
                    <img src={game.logoUrl} alt={game.name} className="w-4 h-4 rounded object-cover" />
                  ) : (
                    <Gamepad2 className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{game.name}</span>
                  <span className="sm:hidden">{game.name.split(" ")[0]}</span>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? "bg-slate-950/20 text-slate-950" : "bg-slate-700 text-slate-400"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-slate-800 bg-slate-900/40">
              <Trophy className="w-8 h-8 text-slate-600 mb-3" />
              <p className="text-sm text-slate-400">No tournaments found for this game.</p>
            </div>
          ) : (
            <>
              {/* Tournament picker */}
              {filtered.length > 1 && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative min-w-48 max-w-sm flex-1">
                    <select
                      value={selectedTournamentId ?? ""}
                      onChange={e => setSelectedTournamentId(e.target.value)}
                      className="w-full appearance-none bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    >
                      {filtered.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                  {selected && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                      ["started", "ongoing", "live"].includes(selected.status)
                        ? "bg-blue-500/20 text-blue-300"
                        : selected.status === "completed"
                          ? "bg-slate-600/30 text-slate-400"
                          : "bg-amber-500/20 text-amber-300"
                    }`}>
                      {selected.status.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              )}

              {filtered.length === 1 && selected && (
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-white">{selected.title}</h2>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                    ["started", "ongoing", "live"].includes(selected.status)
                      ? "bg-blue-500/20 text-blue-300"
                      : selected.status === "completed"
                        ? "bg-slate-600/30 text-slate-400"
                        : "bg-amber-500/20 text-amber-300"
                  }`}>
                    {selected.status.replace(/_/g, " ")}
                  </span>
                </div>
              )}

              {/* Tournament info strip */}
              {selected && (
                <div className="flex flex-wrap items-center gap-4 px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/50 text-xs text-slate-400">
                  {selected.game?.name && (
                    <span className="flex items-center gap-1.5">
                      {selected.game.logoUrl && (
                        <img src={selected.game.logoUrl} alt="" className="w-4 h-4 rounded object-cover" />
                      )}
                      {selected.game.name}
                    </span>
                  )}
                  <span>{selected.currentCount} players</span>
                  {isLeague && selected.leagueSettings && (
                    <span>
                      Week {selected.leagueSettings.currentMatchweek ?? 0} / {selected.leagueSettings.totalMatchweeks ?? 0}
                    </span>
                  )}
                  {selected.tournamentType && (
                    <span className="capitalize">{selected.tournamentType.replace(/_/g, " ")}</span>
                  )}
                </div>
              )}

              {/* Standings */}
              {loadingTable ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : noStandings ? (
                <div className="text-center py-12 rounded-xl border border-slate-800 bg-slate-900/40">
                  <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No standings available yet.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {isLeague
                      ? "League fixtures haven't been generated yet."
                      : "Results will appear once the tournament concludes."}
                  </p>
                </div>
              ) : isLeague ? (
                <LeagueTable table={table} highlightUserId={user?.id} />
              ) : (
                <ResultsTable results={results} highlightUserId={user?.id} />
              )}
            </>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
