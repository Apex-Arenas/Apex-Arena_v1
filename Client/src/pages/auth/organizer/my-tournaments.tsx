import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Trophy,
  PlusCircle,
  Loader2,
  AlertCircle,
  Pencil,
  Gamepad2,
  Users,
  Ticket,
  CalendarDays,
} from "lucide-react";
import { organizerService } from "../../../services/organizer.service";
import type { Tournament } from "../../../services/tournament.service";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; dot: string; text: string }> = {
  draft:            { label: "Draft",            dot: "bg-slate-500",   text: "text-slate-300"   },
  awaiting_deposit: { label: "Awaiting Deposit", dot: "bg-amber-400",   text: "text-amber-300"   },
  published:        { label: "Published",        dot: "bg-cyan-400",    text: "text-cyan-300"    },
  open:             { label: "Open",             dot: "bg-emerald-400", text: "text-emerald-300" },
  locked:           { label: "Locked",           dot: "bg-amber-400",   text: "text-amber-300"   },
  started:          { label: "Live",             dot: "bg-orange-400",  text: "text-orange-300"  },
  ongoing:          { label: "Live",             dot: "bg-orange-400",  text: "text-orange-300"  },
  in_progress:      { label: "Live",             dot: "bg-orange-400",  text: "text-orange-300"  },
  completed:        { label: "Completed",        dot: "bg-slate-400",   text: "text-slate-400"   },
  cancelled:        { label: "Cancelled",        dot: "bg-red-400",     text: "text-red-400"     },
};

function formatDate(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const navigate = useNavigate();

  const meta = STATUS_META[tournament.status] ?? {
    label: tournament.status.replace(/_/g, " "),
    dot: "bg-slate-500",
    text: "text-slate-300",
  };

  const liveStatuses = new Set(["open", "started", "ongoing", "in_progress"]);
  const isLive = liveStatuses.has(tournament.status);

  const canEdit = ["draft", "awaiting_deposit", "open", "locked"].includes(tournament.status);
  const needsDeposit = tournament.status === "awaiting_deposit" && !tournament.isFree;

  const coverImage = tournament.thumbnailUrl ?? tournament.bannerUrl ?? null;

  const entryFee =
    tournament.isFree || tournament.entryFee === 0
      ? "Free"
      : `GHS ${(tournament.entryFee / 100).toLocaleString("en-GH", { minimumFractionDigits: 0 })}`;

  const prizeGhs =
    tournament.prizePool && tournament.prizePool > 0
      ? `GHS ${(tournament.prizePool / 100).toLocaleString("en-GH", { minimumFractionDigits: 0 })}`
      : null;

  const href = needsDeposit
    ? `/auth/organizer/tournaments/${tournament.id}?openDeposit=1`
    : `/auth/organizer/tournaments/${tournament.id}`;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 hover:shadow-xl hover:shadow-black/40 transition-all">

      {/* ── Cover image ───────────────────────────────────── */}
      <Link to={href} className="relative aspect-4/3 overflow-hidden bg-slate-800 shrink-0 block">
        {coverImage ? (
          <img
            src={coverImage}
            alt={tournament.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-slate-800 to-slate-900">
            {tournament.game?.logoUrl ? (
              <img src={tournament.game.logoUrl} alt="" className="w-20 h-20 object-contain opacity-25" />
            ) : (
              <Gamepad2 className="w-14 h-14 text-slate-700" />
            )}
          </div>
        )}

        {/* Bottom fade */}
        <div className="absolute inset-0 bg-linear-to-t from-slate-900 via-slate-900/20 to-transparent" />

        {/* Status chip — top right */}
        <div className="absolute top-2.5 right-2.5">
          <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-sm border border-white/10 ${meta.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${isLive ? "animate-pulse" : ""}`} />
            {meta.label}
          </span>
        </div>

        {/* Edit button — top left */}
        {canEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/auth/organizer/tournaments/${tournament.id}/edit`);
            }}
            className="absolute top-2.5 left-2.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-sm border border-white/10 text-slate-300 hover:text-white hover:border-white/25 transition-colors"
          >
            <Pencil className="w-2.5 h-2.5" />
            Edit
          </button>
        )}

        {/* Game logo — bottom left */}
        {tournament.game?.logoUrl && (
          <div className="absolute bottom-2.5 left-2.5">
            <img
              src={tournament.game.logoUrl}
              alt={tournament.game.name}
              className="w-7 h-7 rounded-md object-cover border border-white/15 shadow-md"
            />
          </div>
        )}

        {/* Prize — bottom right */}
        {prizeGhs && (
          <div className="absolute bottom-2.5 right-2.5">
            <span className="text-[11px] font-bold text-amber-300 bg-slate-950/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-amber-400/20">
              {prizeGhs}
            </span>
          </div>
        )}
      </Link>

      {/* ── Content ───────────────────────────────────────── */}
      <Link to={href} className="px-4 pt-3 pb-4 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-display text-sm font-bold text-white leading-tight truncate group-hover:text-orange-300 transition-colors">
            {tournament.title}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
            {tournament.game?.name ?? "Unknown Game"} · {tournament.format ?? "Solo"}
            {tournament.region ? ` · ${tournament.region}` : ""}
          </p>
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5 flex items-center gap-1">
              <CalendarDays className="w-2.5 h-2.5" /> Starts
            </p>
            <p className="text-[11px] font-medium text-slate-300">{formatDate(tournament.schedule.tournamentStart)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5 flex items-center gap-1">
              <Users className="w-2.5 h-2.5" /> Players
            </p>
            <p className="text-[11px] font-medium text-slate-300">{tournament.currentCount} / {tournament.maxParticipants}</p>
          </div>
          {tournament.schedule.registrationEnd && (
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5 flex items-center gap-1">
                <CalendarDays className="w-2.5 h-2.5" /> Reg. closes
              </p>
              <p className="text-[11px] font-medium text-slate-300">
                {formatDate(tournament.schedule.registrationEnd)}
              </p>
            </div>
          )}
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5 flex items-center gap-1">
              <Ticket className="w-2.5 h-2.5" /> Entry
            </p>
            <p className={`text-[11px] font-medium ${entryFee === "Free" ? "text-emerald-400" : "text-slate-300"}`}>
              {entryFee}
            </p>
          </div>
        </div>

        {/* Prize pool */}
        {prizeGhs && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
            <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="text-[11px] font-semibold text-amber-400">{prizeGhs} prize pool</span>
          </div>
        )}
      </Link>

      {/* ── Deposit banner ────────────────────────────────── */}
      {needsDeposit && (
        <Link
          to={`/auth/organizer/tournaments/${tournament.id}?openDeposit=1`}
          className="mx-4 mb-4 flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-300 hover:bg-amber-500/20 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Prize deposit required to open registration
          </span>
          <span className="font-bold whitespace-nowrap">Complete →</span>
        </Link>
      )}
    </div>
  );
}

// ─── Create card ─────────────────────────────────────────────────────────────

function CreateCard() {
  return (
    <Link
      to="/auth/organizer/create-tournament"
      className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/30 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all min-h-65"
    >
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-600 group-hover:border-orange-400/60 flex items-center justify-center transition-colors">
          <PlusCircle className="w-6 h-6 text-slate-600 group-hover:text-orange-400 transition-colors" />
        </div>
        <div>
          <p className="font-display text-sm font-bold text-slate-500 group-hover:text-white transition-colors">
            New Tournament
          </p>
          <p className="text-[11px] text-slate-600 mt-0.5">Click to create</p>
        </div>
      </div>
    </Link>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  title,
  count,
  badge,
  children,
}: {
  title: string;
  count: number;
  badge: string;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section>
      <div className="flex items-center justify-center gap-3 mb-5 sm:justify-start">
        <h2 className="font-display text-xl font-bold text-white">{title}</h2>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badge}`}>
          {count}
        </span>
      </div>
      {children}
    </section>
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
      setTournaments(await organizerService.getMyTournaments());
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

  const active = tournaments.filter((t) =>
    ["awaiting_deposit", "published", "open", "locked", "started", "ongoing", "in_progress"].includes(t.status),
  );
  const drafts = tournaments.filter((t) => t.status === "draft");
  const past = tournaments.filter((t) => ["completed", "cancelled"].includes(t.status));

  return (
    <div className="max-w-7xl mx-auto">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-slate-900 border-b border-slate-800 px-6 py-7 sm:px-8 sm:py-8">
        {/* Ambient glows */}
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-orange-500/12 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-violet-600/8 blur-3xl pointer-events-none" />
        {/* Fine grid */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-size-[48px_48px]" />

        <div className="relative flex flex-col items-center text-center gap-4 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">My Tournaments</h1>
            <p className="text-sm text-slate-400 mt-1">
              {tournaments.length > 0
                ? `${tournaments.length} tournament${tournaments.length !== 1 ? "s" : ""} · ${active.length} active`
                : "No tournaments yet — create your first one"}
            </p>
          </div>
          <Link
            to="/auth/organizer/create-tournament"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 transition-all shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            Create Tournament
          </Link>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6 space-y-8">
      {/* ── Loading ─────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Loading tournaments…</span>
          </div>
        </div>
      )}

      {/* ── Empty ───────────────────────────────────────────── */}
      {!isLoading && tournaments.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 py-20 px-6 text-center">
          <Trophy className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="font-display text-xl font-semibold text-slate-400">No tournaments yet</p>
          <p className="text-sm text-slate-600 mt-2 mb-7">
            Create your first tournament and start collecting registrations.
          </p>
          <Link
            to="/auth/organizer/create-tournament"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold"
          >
            <PlusCircle className="w-4 h-4" />
            Create Tournament
          </Link>
        </div>
      )}

      {/* ── Sections ────────────────────────────────────────── */}
      {!isLoading && tournaments.length > 0 && (
        <div className="space-y-10">
          <Section
            title="Active"
            count={active.length}
            badge="bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-4 px-6 sm:px-0">
              {active.map((t) => <TournamentCard key={t.id} tournament={t} />)}
              <CreateCard />
            </div>
          </Section>

          <Section
            title="Drafts"
            count={drafts.length}
            badge="bg-amber-500/15 text-amber-400 border-amber-500/20"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-4 px-6 sm:px-0">
              {drafts.map((t) => <TournamentCard key={t.id} tournament={t} />)}
              <CreateCard />
            </div>
          </Section>

          <Section
            title="Past"
            count={past.length}
            badge="bg-slate-700/60 text-slate-400 border-slate-700"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-4 px-6 sm:px-0">
              {past.map((t) => <TournamentCard key={t.id} tournament={t} />)}
            </div>
          </Section>
        </div>
      )}
      </div>
    </div>
  );
};

export default MyTournaments;
