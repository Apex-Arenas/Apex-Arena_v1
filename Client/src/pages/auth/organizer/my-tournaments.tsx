import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Trophy,
  PlusCircle,
  CalendarDays,
  Users,
  ChevronRight,
  Loader2,
  Globe,
  Lock,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { organizerService } from "../../../services/organizer.service";
import type { Tournament } from "../../../services/tournament.service";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-600/20 text-slate-400",
  awaiting_deposit: "bg-amber-500/20 text-amber-300",
  published: "bg-cyan-500/20 text-cyan-300",
  open: "bg-green-500/20 text-green-300",
  locked: "bg-amber-500/20 text-amber-300",
  started: "bg-blue-500/20 text-blue-300",
  ongoing: "bg-blue-500/20 text-blue-300",
  completed: "bg-slate-500/20 text-slate-400",
  cancelled: "bg-red-500/20 text-red-400",
};

function formatDate(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Tournament Card ──────────────────────────────────────────────────────────

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const navigate = useNavigate();
  const statusColor =
    STATUS_COLORS[tournament.status] ?? "bg-slate-700 text-slate-300";
  const needsPrizeDeposit =
    tournament.status === "awaiting_deposit" && !tournament.isFree;
  const canEdit = ["draft", "awaiting_deposit", "open", "locked"].includes(
    tournament.status,
  );
  const cardHref = needsPrizeDeposit
    ? `/auth/organizer/tournaments/${tournament.id}?openDeposit=1`
    : `/auth/organizer/tournaments/${tournament.id}`;

  return (
    <Link
      to={cardHref}
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-3 hover:border-slate-600 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
            {tournament.title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {tournament.game?.name ?? "Unknown Game"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canEdit && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                navigate(`/auth/organizer/tournaments/${tournament.id}/edit`);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          )}
          <span
            className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColor}`}
          >
            {tournament.status}
          </span>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5" />
          {formatDate(tournament.schedule.tournamentStart)}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          {tournament.currentCount}/{tournament.maxParticipants}
        </span>
        <span className="flex items-center gap-1.5">
          {tournament.visibility === "public" ? (
            <Globe className="w-3.5 h-3.5" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
          {tournament.isFree
            ? "Free"
            : `${tournament.currency} ${(tournament.entryFee / 100).toFixed(2)}`}
        </span>
      </div>

      {needsPrizeDeposit && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Prize deposit required to open registration
          </span>
          <span className="font-semibold">Complete now</span>
        </div>
      )}
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const MyTournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetched = useRef(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await organizerService.getMyTournaments();
      setTournaments(result);
    } catch {
      setTournaments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    void load();
  }, [load]);

  const byStatus = {
    active: tournaments.filter((t) =>
      [
        "awaiting_deposit",
        "published",
        "open",
        "locked",
        "started",
        "ongoing",
      ].includes(t.status),
    ),
    draft: tournaments.filter((t) => t.status === "draft"),
    past: tournaments.filter((t) =>
      ["completed", "cancelled"].includes(t.status),
    ),
  };

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            My Tournaments
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage and monitor your tournaments.
          </p>
        </div>
        <Link
          to="/auth/organizer/create-tournament"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Create Tournament
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : tournaments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-slate-600" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">
            No Tournaments Yet
          </h2>
          <p className="text-sm text-slate-400 max-w-xs mb-5">
            You haven't created any tournaments. Start by creating your first
            one.
          </p>
          <Link
            to="/auth/organizer/create-tournament"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Create Tournament
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {byStatus.active.length > 0 && (
            <section>
              <h2 className="font-display text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Active ({byStatus.active.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {byStatus.active.map((t) => (
                  <TournamentCard key={t.id} tournament={t} />
                ))}
              </div>
            </section>
          )}

          {byStatus.draft.length > 0 && (
            <section>
              <h2 className="font-display text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Drafts ({byStatus.draft.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {byStatus.draft.map((t) => (
                  <TournamentCard key={t.id} tournament={t} />
                ))}
              </div>
            </section>
          )}

          {byStatus.past.length > 0 && (
            <section>
              <h2 className="font-display text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Past ({byStatus.past.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {byStatus.past.map((t) => (
                  <TournamentCard key={t.id} tournament={t} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default MyTournaments;
