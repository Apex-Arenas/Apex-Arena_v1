import type { Dispatch, SetStateAction } from "react";
import {
  ChevronLeft,
  ChevronDown,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Trophy,
  CalendarDays,
  UserCheck,
  Send,
  Trash2,
  Wallet,
  RefreshCw,
  Play,
  List,
  Share2,
} from "lucide-react";
import type { Tournament } from "../../services/tournament.service";
import type { TournamentRegistrant } from "../../services/organizer.service";
import { showSuccess } from "../../utils/toast.utils";

interface TournamentManageHeroProps {
  tournament: Tournament;
  activeRegistrants: TournamentRegistrant[];
  checkedInCount: number;
  statsOpen: boolean;
  setStatsOpen: Dispatch<SetStateAction<boolean>>;
  onBack: () => void;

  canPublish: boolean;
  isPublishing: boolean;
  onPublish: () => void;

  canGenerateLeagueFixtures: boolean;
  isGeneratingFixtures: boolean;
  onGenerateLeagueFixtures: () => void;

  isRecalculating: boolean;
  onRecalculateStandings: () => void;

  canAdvanceMatchweek: boolean | undefined;
  isAdvancingMatchweek: boolean;
  onAdvanceLeagueMatchweek: () => void;

  canGenerateBracket: boolean;
  hasBracketGenerated: boolean;
  isGeneratingBracket: boolean;
  onGenerateBracket: () => void;

  canDepositPrizePool: boolean;
  isInitiatingPayment: boolean;
  onPayPrizePool: () => void;

  canOpenWinnersModal: boolean;
  canSubmitWinners: boolean;
  onOpenWinnersModal: () => void;

  canCancel: boolean;
  isCancelling: boolean;
  onRequestCancel: () => void;
  onRequestDelete: () => void;
}

export default function TournamentManageHero({
  tournament,
  activeRegistrants,
  checkedInCount,
  statsOpen,
  setStatsOpen,
  onBack,
  canPublish,
  isPublishing,
  onPublish,
  canGenerateLeagueFixtures,
  isGeneratingFixtures,
  onGenerateLeagueFixtures,
  isRecalculating,
  onRecalculateStandings,
  canAdvanceMatchweek,
  isAdvancingMatchweek,
  onAdvanceLeagueMatchweek,
  canGenerateBracket,
  hasBracketGenerated,
  isGeneratingBracket,
  onGenerateBracket,
  canDepositPrizePool,
  isInitiatingPayment,
  onPayPrizePool,
  canOpenWinnersModal,
  canSubmitWinners,
  onOpenWinnersModal,
  canCancel,
  isCancelling,
  onRequestCancel,
  onRequestDelete,
}: TournamentManageHeroProps) {
  const leagueSettings = tournament.leagueSettings;

  return (
    <div className="relative border-b border-slate-800/60 bg-slate-950 overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute -top-40 right-0 w-[700px] h-[400px] rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[200px] rounded-full bg-indigo-500/6 blur-3xl pointer-events-none" />
      {/* Fine grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-size-[60px_60px] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 md:px-8 lg:px-14 xl:px-20">
        {/* ── Top bar: back + actions + utility ── */}
        <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-800/50">
          {/* Back */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors group shrink-0"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>My Tournaments</span>
          </button>

          {/* Right: action buttons + utility icons */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {canPublish && (
              <button
                onClick={onPublish}
                disabled={isPublishing}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-linear-to-r from-orange-500 to-amber-500 text-slate-950 text-xs font-bold hover:opacity-90 disabled:opacity-60 transition-all shadow-md shadow-orange-500/20"
              >
                {isPublishing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Publish
              </button>
            )}
            {canGenerateLeagueFixtures && (
              <button
                onClick={onGenerateLeagueFixtures}
                disabled={isGeneratingFixtures}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-400 disabled:opacity-60 transition-colors"
              >
                {isGeneratingFixtures ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <List className="w-3.5 h-3.5" />
                )}
                {isGeneratingFixtures ? "Generating…" : "Gen Fixtures"}
              </button>
            )}
            {leagueSettings?.fixturesGenerated && (
              <button
                onClick={onRecalculateStandings}
                disabled={isRecalculating}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-medium hover:border-slate-500 hover:text-white disabled:opacity-60 transition-colors"
              >
                {isRecalculating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span className="hidden md:inline">
                  {isRecalculating ? "Recalculating…" : "Recalculate Table"}
                </span>
                <span className="md:hidden">
                  {isRecalculating ? "…" : "Recalc"}
                </span>
              </button>
            )}
            {canAdvanceMatchweek && (
              <button
                onClick={onAdvanceLeagueMatchweek}
                disabled={isAdvancingMatchweek}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 disabled:opacity-60 transition-colors"
              >
                {isAdvancingMatchweek ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {isAdvancingMatchweek
                  ? "…"
                  : leagueSettings?.legs === 2
                    ? `Wk ${(leagueSettings?.currentMatchweek ?? 0) + 1}–${(leagueSettings?.currentMatchweek ?? 0) + 2}`
                    : `Wk ${(leagueSettings?.currentMatchweek ?? 0) + 1}`}
              </button>
            )}
            {(canGenerateBracket || hasBracketGenerated) && (
              <button
                onClick={() => {
                  if (!hasBracketGenerated) onGenerateBracket();
                }}
                disabled={isGeneratingBracket || hasBracketGenerated}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60 ${
                  hasBracketGenerated
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                    : "bg-indigo-500 text-white hover:bg-indigo-400"
                }`}
              >
                {isGeneratingBracket ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : hasBracketGenerated ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Trophy className="w-3.5 h-3.5" />
                )}
                {isGeneratingBracket
                  ? "…"
                  : hasBracketGenerated
                    ? "Bracket Ready"
                    : "Gen Bracket"}
              </button>
            )}
            {canDepositPrizePool && (
              <button
                onClick={onPayPrizePool}
                disabled={isInitiatingPayment}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 disabled:opacity-60 transition-colors"
              >
                {isInitiatingPayment ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wallet className="w-3.5 h-3.5" />
                )}
                Prize Pool
              </button>
            )}
            {canOpenWinnersModal && (
              <button
                onClick={onOpenWinnersModal}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-400 transition-colors"
              >
                <Trophy className="w-3.5 h-3.5" />
                {canSubmitWinners ? "Submit Winners" : "Review Winners"}
              </button>
            )}

            {/* Divider */}
            <span className="w-px h-5 bg-slate-800 shrink-0 mx-0.5" />

            {/* Utility icons */}
            <button
              onClick={() => {
                const url = `${window.location.origin}/auth/tournaments/${tournament.id}`;
                if (navigator.share) {
                  void navigator.share({ title: tournament.title, url });
                } else {
                  void navigator.clipboard.writeText(url);
                  showSuccess("Link copied!");
                }
              }}
              title="Share"
              className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {canCancel && (
              <button
                onClick={onRequestCancel}
                disabled={isCancelling}
                title="Cancel tournament"
                className="shrink-0 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 disabled:opacity-60 transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
            {tournament.status === "draft" && (
              <button
                onClick={onRequestDelete}
                title="Delete draft"
                className="shrink-0 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Hero body ── */}
        <div className="py-5 space-y-4">
          {/* Title + status + meta */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-linear-to-br from-cyan-500/20 to-indigo-500/20 border border-slate-700/60 flex items-center justify-center shrink-0 mt-0.5">
              <Trophy className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              {/* Title + badge — same line, spread apart */}
              <div className="flex items-start justify-between gap-2">
                <h1 className="font-display text-xl md:text-2xl font-bold text-white leading-tight break-words min-w-0">
                  {tournament.title}
                </h1>
                <span
                  className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide border ${
                    tournament.status === "open"
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                      : tournament.status === "awaiting_deposit" ||
                          tournament.status === "published"
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/25"
                        : tournament.status === "draft"
                          ? "bg-slate-600/20 text-slate-400 border-slate-600/25"
                          : tournament.status === "cancelled"
                            ? "bg-red-500/15 text-red-400 border-red-500/25"
                            : tournament.status === "completed"
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/25"
                              : "bg-cyan-500/15 text-cyan-300 border-cyan-500/25"
                  }`}
                >
                  {tournament.status.replace(/_/g, " ")}
                </span>
              </div>
              {/* Meta chips + stats toggle on mobile */}
              <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar">
                <span className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[11px] font-semibold text-slate-300">
                  {tournament.game?.name ?? "Unknown Game"}
                </span>
                <span className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[11px] text-slate-400">
                  {tournament.format ?? "Solo"}
                </span>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${tournament.isFree ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-amber-500/10 border-amber-500/20 text-amber-300"}`}
                >
                  {tournament.isFree
                    ? "Free"
                    : `GHS ${(tournament.entryFee / 100).toFixed(2)}`}
                </span>
                <span className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[11px] text-slate-400 capitalize">
                  {(tournament.tournamentType ?? "—").replace(/_/g, " ")}
                </span>
                {leagueSettings?.fixturesGenerated &&
                  !canGenerateLeagueFixtures && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      Fixtures
                      {leagueSettings?.currentMatchweek != null &&
                        leagueSettings?.totalMatchweeks != null &&
                        leagueSettings.currentMatchweek > 0 && (
                          <span className="text-emerald-400/60 font-normal">
                            Wk {leagueSettings.currentMatchweek}/
                            {leagueSettings.totalMatchweeks}
                          </span>
                        )}
                    </span>
                  )}
                {/* Stats toggle — sits at end of chips row on mobile */}
                <button
                  onClick={() => setStatsOpen((v) => !v)}
                  className="md:hidden shrink-0 ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
                >
                  Stats
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${statsOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Stats — mobile dropdown */}
          {statsOpen && (
            <div className="md:hidden grid grid-cols-2 gap-2">
              {[
                {
                  icon: Users,
                  label: "Registrants",
                  value: String(activeRegistrants.length),
                  sub: `of ${tournament.maxParticipants} max`,
                  accent: "text-white",
                  iconColor: "text-slate-400",
                  iconBg: "bg-slate-800 border-slate-700/50",
                },
                {
                  icon: UserCheck,
                  label: "Checked In",
                  value: String(checkedInCount),
                  sub: `${activeRegistrants.length > 0 ? Math.round((checkedInCount / activeRegistrants.length) * 100) : 0}% ready`,
                  accent: "text-emerald-400",
                  iconColor: "text-emerald-400",
                  iconBg: "bg-emerald-500/10 border-emerald-500/20",
                },
                {
                  icon: Trophy,
                  label: "Capacity",
                  value: `${tournament.currentCount}/${tournament.maxParticipants}`,
                  sub: `${tournament.minParticipants} min`,
                  accent: "text-cyan-400",
                  iconColor: "text-cyan-400",
                  iconBg: "bg-cyan-500/10 border-cyan-500/20",
                },
                {
                  icon: CalendarDays,
                  label: "Starts",
                  value: tournament.schedule.tournamentStart
                    ? new Date(
                        tournament.schedule.tournamentStart,
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "TBD",
                  sub: tournament.schedule.tournamentStart
                    ? new Date(
                        tournament.schedule.tournamentStart,
                      ).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Date not set",
                  accent: "text-orange-400",
                  iconColor: "text-orange-400",
                  iconBg: "bg-orange-500/10 border-orange-500/20",
                },
              ].map(
                ({
                  icon: Icon,
                  label,
                  value,
                  sub,
                  accent,
                  iconColor,
                  iconBg,
                }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2.5 bg-slate-800/40 border border-slate-700/40 rounded-xl px-3 py-3"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${iconBg}`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                        {label}
                      </p>
                      <p
                        className={`font-display text-lg font-bold tabular-nums leading-tight ${accent}`}
                      >
                        {value}
                      </p>
                      <p className="text-[9px] text-slate-600 mt-0.5 truncate">
                        {sub}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

          {/* Stats — desktop always visible */}
          <div className="hidden md:grid grid-cols-4 gap-3">
            {[
              {
                icon: Users,
                label: "Registrants",
                value: String(activeRegistrants.length),
                sub: `of ${tournament.maxParticipants} max`,
                accent: "text-white",
                iconColor: "text-slate-400",
                iconBg: "bg-slate-800 border-slate-700/50",
              },
              {
                icon: UserCheck,
                label: "Checked In",
                value: String(checkedInCount),
                sub: `${activeRegistrants.length > 0 ? Math.round((checkedInCount / activeRegistrants.length) * 100) : 0}% ready`,
                accent: "text-emerald-400",
                iconColor: "text-emerald-400",
                iconBg: "bg-emerald-500/10 border-emerald-500/20",
              },
              {
                icon: Trophy,
                label: "Capacity",
                value: `${tournament.currentCount}/${tournament.maxParticipants}`,
                sub: `${tournament.minParticipants} min required`,
                accent: "text-cyan-400",
                iconColor: "text-cyan-400",
                iconBg: "bg-cyan-500/10 border-cyan-500/20",
              },
              {
                icon: CalendarDays,
                label: "Starts",
                value: tournament.schedule.tournamentStart
                  ? new Date(
                      tournament.schedule.tournamentStart,
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "TBD",
                sub: tournament.schedule.tournamentStart
                  ? new Date(
                      tournament.schedule.tournamentStart,
                    ).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Date not set",
                accent: "text-orange-400",
                iconColor: "text-orange-400",
                iconBg: "bg-orange-500/10 border-orange-500/20",
              },
            ].map(
              ({
                icon: Icon,
                label,
                value,
                sub,
                accent,
                iconColor,
                iconBg,
              }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/40 rounded-2xl px-4 py-3.5 hover:border-slate-600/60 transition-colors"
                >
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}
                  >
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                      {label}
                    </p>
                    <p
                      className={`font-display text-xl font-bold tabular-nums leading-tight ${accent}`}
                    >
                      {value}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5 truncate">
                      {sub}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
