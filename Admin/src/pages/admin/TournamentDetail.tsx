// @ts-nocheck
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronDown,
  Loader2,
  AlertCircle,
  Trash2,
  Trophy,
  Calendar,
  Users,
  Gamepad2,
  DollarSign,
  Clock,
  CheckCircle2,
  User,
  MapPin,
  Zap,
  Activity,
  Eye,
  Shield,
  Hash,
  Search,
  UserCheck,
} from "lucide-react";
import { adminService } from "../../services/admin.service";
import { apiGet } from "../../utils/api.utils";
import { API_BASE_URLS } from "../../config/api.config";
import { getAdminAccessToken } from "../../utils/auth.utils";
import { toast } from "react-toastify";

const STATUS_META: Record<string, { label: string; dot: string; badge: string; glow: string }> = {
  draft:            { label: "Draft",            dot: "bg-slate-400",   badge: "bg-slate-500/20 text-slate-300 border-slate-500/40",   glow: "" },
  awaiting_deposit: { label: "Awaiting Deposit", dot: "bg-amber-400",   badge: "bg-amber-400/20 text-amber-300 border-amber-400/40",   glow: "shadow-amber-500/20" },
  published:        { label: "Published",        dot: "bg-cyan-400",    badge: "bg-cyan-400/20 text-cyan-300 border-cyan-400/40",       glow: "shadow-cyan-500/20" },
  open:             { label: "Open",             dot: "bg-emerald-400", badge: "bg-emerald-400/20 text-emerald-300 border-emerald-400/40", glow: "shadow-emerald-500/20" },
  locked:           { label: "Locked",           dot: "bg-amber-400",   badge: "bg-amber-400/20 text-amber-300 border-amber-400/40",   glow: "" },
  started:          { label: "Live",             dot: "bg-orange-400",  badge: "bg-orange-400/20 text-orange-300 border-orange-400/40", glow: "shadow-orange-500/30" },
  ongoing:          { label: "Live",             dot: "bg-orange-400",  badge: "bg-orange-400/20 text-orange-300 border-orange-400/40", glow: "shadow-orange-500/30" },
  in_progress:      { label: "Live",             dot: "bg-orange-400",  badge: "bg-orange-400/20 text-orange-300 border-orange-400/40", glow: "shadow-orange-500/30" },
  ready_to_start:   { label: "Ready",            dot: "bg-violet-400",  badge: "bg-violet-400/20 text-violet-300 border-violet-400/40", glow: "shadow-violet-500/20" },
  completed:        { label: "Completed",        dot: "bg-slate-400",   badge: "bg-slate-400/20 text-slate-400 border-slate-400/30",   glow: "" },
  cancelled:        { label: "Cancelled",        dot: "bg-red-400",     badge: "bg-red-400/20 text-red-400 border-red-400/30",         glow: "" },
};

const BLOCKED_STATUSES = new Set(["started", "ongoing", "in_progress", "ready_to_start"]);
const LIVE_STATUSES    = new Set(["open", "started", "ongoing", "in_progress"]);

function formatDate(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatShortDate(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatGhs(amount?: number) {
  if (!amount || amount === 0) return "Free";
  return `GHS ${(amount / 100).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;
}

/* ── Reusable Info Row ─────────────────────────────────── */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-slate-800/60 last:border-0">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide shrink-0 mt-0.5">{label}</span>
      <span className="text-sm font-medium text-slate-200 text-right wrap-break-word">{value}</span>
    </div>
  );
}

/* ── Stat Tile ─────────────────────────────────────────── */
function StatTile({
  icon: Icon,
  label,
  value,
  accent = "text-amber-400",
  sub,
}: {
  icon: React.ComponentType<{ className: string }>;
  label: string;
  value: React.ReactNode;
  accent?: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/60 transition-colors">
      <div className={`w-9 h-9 rounded-xl bg-slate-700/60 flex items-center justify-center ${accent}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
        <p className="text-xl font-bold text-white leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Section Card ──────────────────────────────────────── */
function Section({ title, icon: Icon, children }: { title: string; icon?: React.ComponentType<{ className: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
      {title && (
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800 bg-slate-800/30">
          {Icon && <Icon className="w-4 h-4 text-amber-400" />}
          <h2 className="text-sm font-semibold text-white">{title}</h2>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ── Delete Modal ──────────────────────────────────────── */
function DeleteModal({ tournament, onClose, onConfirm, loading }) {
  if (!tournament) return null;
  const status = String(tournament.status || "");
  const isBlocked = BLOCKED_STATUSES.has(status);
  const title = String(tournament.title || "Tournament");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Tournament</h3>
              <p className="text-xs text-slate-400 truncate max-w-65">{title}</p>
            </div>
          </div>

          {isBlocked ? (
            <div className="flex items-start gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300 leading-relaxed">
                Cannot delete an active tournament ({status.replace(/_/g, " ")}). Wait until it ends.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400 leading-relaxed">
              This will permanently remove the tournament and all associated data. This action cannot be undone.
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
            >
              Cancel
            </button>
            {!isBlocked && (
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…</> : "Delete Tournament"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const REGISTRANT_STATUS_COLORS: Record<string, string> = {
  registered:      "bg-cyan-500/20 text-cyan-300 border-cyan-500/25",
  checked_in:      "bg-emerald-500/20 text-emerald-300 border-emerald-500/25",
  pending_payment: "bg-amber-500/20 text-amber-300 border-amber-500/25",
  disqualified:    "bg-red-500/20 text-red-400 border-red-500/25",
  withdrawn:       "bg-slate-600/20 text-slate-400 border-slate-600/25",
  cancelled:       "bg-slate-600/20 text-slate-400 border-slate-600/25",
  waitlist:        "bg-violet-500/20 text-violet-300 border-violet-500/25",
};

function ParticipantsSection({ tournamentId }: { tournamentId: string }) {
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!tournamentId) return;
    setLoading(true);
    const token = getAdminAccessToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    apiGet(
      `${API_BASE_URLS.TOURNAMENT}/registration/${tournamentId}/registrations`,
      { headers },
    )
      .then((res: any) => {
        if (!res.success) return;
        const raw = res.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.registrations)
            ? raw.registrations
            : Array.isArray(raw?.data)
              ? raw.data
              : [];
        setParticipants(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tournamentId]);

  const filtered = participants.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const user    = (p.user_id ?? {}) as Record<string, unknown>;
    const profile = (user.profile ?? {}) as Record<string, unknown>;
    const fullName = `${user.first_name ?? profile.first_name ?? ""} ${user.last_name ?? profile.last_name ?? ""}`.trim();
    const username = String(user.username ?? p.username ?? "");
    const inGameId = String(p.in_game_id ?? "");
    return fullName.toLowerCase().includes(q) || username.toLowerCase().includes(q) || inGameId.toLowerCase().includes(q);
  });

  const checkedInCount = participants.filter((p) => {
    const checkInObj = (p.check_in ?? {}) as Record<string, unknown>;
    return Boolean(checkInObj.checked_in) || p.status === "checked_in";
  }).length;

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 px-5 py-4 border-b border-slate-800 bg-slate-800/30 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/25 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              Participants
              <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-full">
                {participants.length}
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              {checkedInCount} checked in
            </p>
          </div>
        </div>

        <div className="relative flex-1 sm:flex-none sm:w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players…"
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 focus:bg-slate-800 transition-colors"
          />
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-14 text-slate-500 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading participants…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center px-6 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center">
            <Users className="w-5 h-5 text-slate-600" />
          </div>
          <p className="text-sm text-slate-400 font-medium">
            {search ? "No players match your search" : "No players registered yet"}
          </p>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-950/20">
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Player</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">In-Game ID</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registered</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Check-in</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                // API returns user_id as a populated object, check_in as nested
                const user        = (p.user_id ?? {}) as Record<string, unknown>;
                const checkInObj  = (p.check_in ?? {}) as Record<string, unknown>;
                const profile     = (user.profile ?? {}) as Record<string, unknown>;
                const firstName   = String(user.first_name ?? profile.first_name ?? "");
                const lastName    = String(user.last_name ?? profile.last_name ?? "");
                const displayName = `${firstName} ${lastName}`.trim() || String(user.username ?? p.username ?? "—");
                const username    = String(user.username ?? p.username ?? "");
                const avatarUrl   = String(user.avatar_url ?? profile.avatar_url ?? p.avatar_url ?? "");
                const inGameId    = String(p.in_game_id ?? p.inGameId ?? "");
                const status      = String(p.status ?? "registered");
                const isCheckedIn = Boolean(checkInObj.checked_in ?? p.checked_in ?? p.checkedIn ?? status === "checked_in");
                const registeredAt = String(p.created_at ?? p.registered_at ?? p.registeredAt ?? "");
                const statusColor = REGISTRANT_STATUS_COLORS[status] ?? "bg-slate-700/50 text-slate-400 border-slate-700/50";
                const initials = displayName[0]?.toUpperCase() ?? "?";

                return (
                  <tr key={p.registration_id ?? p.registrationId ?? p._id ?? i}
                    className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                    {/* Player */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-700" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-300">
                              {initials}
                            </div>
                          )}
                          {isCheckedIn && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate leading-tight">{displayName}</p>
                          {username && <p className="text-[11px] text-slate-500 truncate">@{username}</p>}
                        </div>
                      </div>
                    </td>
                    {/* In-Game ID */}
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-mono text-slate-300 bg-slate-800/60 px-2 py-1 rounded-md border border-slate-700/50">
                        {inGameId || <span className="text-slate-600 italic">—</span>}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border capitalize ${statusColor}`}>
                        {status.replace(/_/g, " ")}
                      </span>
                    </td>
                    {/* Registered At */}
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-slate-500">{registeredAt ? formatDate(registeredAt) : "—"}</span>
                    </td>
                    {/* Check-in */}
                    <td className="px-5 py-3.5">
                      {isCheckedIn ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Checked in
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
const TournamentDetail = () => {
  const navigate = useNavigate();
  const { tournamentId } = useParams<{ tournamentId: string }>();

  const [tournament, setTournament] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  const load = useCallback(async () => {
    if (!tournamentId) return;
    setIsLoading(true);
    try {
      const result = await adminService.listTournaments({ limit: 1000 });
      const found = result.data.find((t: any) => t._id === tournamentId || t.id === tournamentId);
      if (found) {
        setTournament(found);
      } else {
        toast.error("Tournament not found");
        navigate("/admin/tournaments");
      }
    } catch {
      toast.error("Failed to load tournament");
      navigate("/admin/tournaments");
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId, navigate]);

  useEffect(() => { void load(); }, [load]);

  const handleConfirmDelete = async () => {
    if (!tournament || !tournamentId) return;
    setIsDeleting(true);
    try {
      const success = await adminService.deleteTournament(tournamentId);
      if (success) {
        toast.success("Tournament deleted successfully");
        navigate("/admin/tournaments");
      } else {
        toast.error("Failed to delete tournament");
      }
    } catch (error: any) {
      toast.error(error.message || "Error deleting tournament");
    } finally {
      setIsDeleting(false);
    }
  };

  /* ── Loading ── */
  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm">Loading tournament…</span>
      </div>
    </div>
  );

  if (!tournament) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <AlertCircle className="w-10 h-10" />
        <span className="text-sm">Tournament not found</span>
      </div>
    </div>
  );

  /* ── Derived values ── */
  const status        = String(tournament.status ?? "unknown");
  const meta          = STATUS_META[status] ?? STATUS_META.draft;
  const isBlocked     = BLOCKED_STATUSES.has(status);
  const isLive        = LIVE_STATUSES.has(status);
  const title         = String(tournament.title ?? "Untitled");
  const schedule      = tournament.schedule as Record<string, unknown> | undefined;
  const organizer     = tournament.organizer_id as Record<string, unknown> | undefined;
  const game          = tournament.game_id as Record<string, unknown> | undefined;
  const prizeStruct   = tournament.prize_structure as Record<string, unknown> | undefined;
  const capacity      = tournament.capacity as Record<string, unknown> | undefined;
  const metadata      = tournament.metadata as Record<string, unknown> | undefined;

  const currentCount    = Number(capacity?.current_participants ?? tournament.current_count ?? 0);
  const maxParticipants = Number(capacity?.max_participants ?? tournament.max_participants ?? 0);
  const checkedIn       = Number(capacity?.checked_in_count ?? tournament.checked_in_count ?? 0);
  const waitlistCount   = Number(capacity?.waitlist_count ?? 0);
  const entryFee        = Number(tournament.entry_fee ?? 0);
  const prizePool       = Number(prizeStruct?.net_prize_pool ?? tournament.prizePool ?? 0);
  const platformFee     = Number(prizeStruct?.platform_fee_amount ?? 0);
  const fundingType     = String(tournament.funding_type ?? "free");
  const format          = String(tournament.format ?? "—");
  const region          = String(tournament.region ?? "—");
  const visibility      = String(tournament.visibility ?? "public");
  const tournamentType  = String(tournament.tournament_type ?? "—");
  const fillPct         = maxParticipants > 0 ? Math.round((currentCount / maxParticipants) * 100) : 0;
  const id              = String(tournament._id ?? tournament.id ?? "");

  const gameName    = game ? String(game.name ?? "Unknown") : "Unknown";
  const gameLogoUrl = game ? String(game.logo_url ?? game.icon_url ?? game.banner_url ?? game.logoUrl ?? "") : "";
  const orgUsername = organizer ? String(organizer.username ?? "Unknown") : "Unknown";
  const orgEmail    = organizer ? String(organizer.email ?? "") : "";

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-slate-900 border-b border-slate-800 px-6 py-7 sm:px-8 sm:py-8">
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-orange-500/12 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-violet-600/8 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-size-[48px_48px]" />

        <div className="relative">
          {/* Top nav */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate("/admin/tournaments")}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Back to Tournaments</span>
            </button>
            <button
              onClick={() => setDeleteTarget(tournament)}
              disabled={isBlocked}
              title={isBlocked ? "Cannot delete active tournaments" : "Delete tournament"}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                isBlocked
                  ? "text-slate-600 border-slate-800 cursor-not-allowed opacity-40"
                  : "text-red-400 bg-red-500/10 border-red-500/25 hover:bg-red-500/20 hover:border-red-500/40"
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>

          {/* Title block — centered on mobile, left on desktop */}
          <div className="flex flex-col items-center text-center gap-4 sm:flex-row sm:items-center sm:text-left">
            {/* Game icon */}
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
              {gameLogoUrl ? (
                <img src={gameLogoUrl} alt={gameName} className="w-9 h-9 object-contain" />
              ) : (
                <Gamepad2 className="w-7 h-7 text-slate-600" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">{title}</h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${meta.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${isLive ? "animate-pulse" : ""}`} />
                  {meta.label}
                </span>
              </div>
              <div className="flex flex-col items-center sm:flex-row sm:items-center sm:flex-wrap sm:justify-start gap-y-1 gap-x-4 text-sm text-slate-400 mt-1">
                <span className="flex items-center gap-1.5"><Gamepad2 className="w-3.5 h-3.5" />{gameName}</span>
                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{orgUsername}</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{format} · {region}</span>
              </div>
            </div>
          </div>

          {/* Quick stat strip — collapsible on mobile, always visible on desktop */}
          <div className="mt-6">
            {/* Mobile toggle */}
            <button
              onClick={() => setStatsOpen(o => !o)}
              className="sm:hidden w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm font-medium text-slate-300"
            >
              <span>Tournament Stats</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${statsOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Cards */}
            <div className={`sm:grid sm:grid-cols-4 sm:gap-3 sm:mt-3 ${statsOpen ? "grid grid-cols-1 gap-2 mt-2" : "hidden"}`}>
              {[
                { label: "Players",    value: `${currentCount} / ${maxParticipants}`, icon: Users },
                { label: "Entry Fee",  value: formatGhs(entryFee),                    icon: DollarSign },
                { label: "Prize Pool", value: formatGhs(prizePool),                   icon: Trophy },
                { label: "Starts",     value: formatShortDate(String(schedule?.tournament_start ?? "")), icon: Calendar },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <Icon className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="text-sm font-bold text-white">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="px-6 sm:px-8 py-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN (2/3) ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Participation */}
            <Section title="Participation" icon={Users}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <StatTile icon={Users} label="Registered" value={currentCount}
                  sub={`of ${maxParticipants} slots`} accent="text-emerald-400" />
                <StatTile icon={CheckCircle2} label="Checked In" value={checkedIn}
                  sub={currentCount > 0 ? `${Math.round((checkedIn / currentCount) * 100)}% rate` : "—"} accent="text-cyan-400" />
                <StatTile icon={Activity} label="Waitlist" value={waitlistCount}
                  accent="text-violet-400" />
                <StatTile icon={Eye} label="Visibility" value={visibility}
                  accent="text-slate-400" />
              </div>

              {/* Fill bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span>Registration fill</span>
                  <span className="font-semibold text-white">{fillPct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      fillPct >= 100 ? "bg-orange-400" : fillPct >= 60 ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                    style={{ width: `${Math.min(fillPct, 100)}%` }}
                  />
                </div>
              </div>
            </Section>

            {/* Schedule */}
            <Section title="Schedule" icon={Calendar}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    icon: Clock,
                    label: "Registration",
                    start: String(schedule?.registration_start ?? ""),
                    end: String(schedule?.registration_end ?? ""),
                    color: "text-cyan-400 bg-cyan-400/10",
                  },
                  {
                    icon: Zap,
                    label: "Tournament",
                    start: String(schedule?.tournament_start ?? ""),
                    end: String(schedule?.tournament_end ?? ""),
                    color: "text-amber-400 bg-amber-400/10",
                  },
                  ...(schedule?.check_in_start
                    ? [{
                        icon: CheckCircle2,
                        label: "Check-in",
                        start: String(schedule?.check_in_start ?? ""),
                        end: String(schedule?.check_in_end ?? ""),
                        color: "text-emerald-400 bg-emerald-400/10",
                      }]
                    : []),
                ].map(({ icon: Icon, label, start, end, color }) => (
                  <div key={label} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                    <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-3`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{label}</p>
                    <p className="text-sm font-semibold text-white">{formatDate(start)}</p>
                    <p className="text-xs text-slate-500 mt-1">→ {formatDate(end)}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* Financials */}
            <Section title="Financials" icon={DollarSign}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatTile icon={DollarSign} label="Entry Fee" value={formatGhs(entryFee)} accent="text-slate-400" />
                <StatTile icon={Trophy} label="Net Prize Pool" value={formatGhs(prizePool)} accent="text-amber-400" />
                <StatTile icon={Shield} label="Platform Fee" value={formatGhs(platformFee)} accent="text-violet-400" />
              </div>

              <div className="mt-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/40">
                <InfoRow label="Funding Type" value={<span className="capitalize">{fundingType.replace(/_/g, " ")}</span>} />
                {tournament.escrow_status && (
                  <InfoRow label="Escrow Status" value={String(tournament.escrow_status)} />
                )}
                {tournament.escrow_id && (
                  <InfoRow
                    label="Escrow ID"
                    value={<span className="font-mono text-xs text-slate-400">{String(tournament.escrow_id)}</span>}
                  />
                )}
              </div>
            </Section>

            {/* Participants */}
            <ParticipantsSection tournamentId={id} />

            {/* Description */}
            {tournament.description && (
              <Section title="Description">
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap wrap-break-word">
                  {String(tournament.description)}
                </p>
              </Section>
            )}
          </div>

          {/* ── RIGHT COLUMN (1/3) ── */}
          <div className="space-y-6">

            {/* Tournament Details */}
            <Section title="Details" icon={Hash}>
              <InfoRow label="Format" value={format} />
              <InfoRow label="Type" value={<span className="capitalize">{tournamentType.replace(/_/g, " ")}</span>} />
              <InfoRow label="Region" value={region} />
              <InfoRow label="Status" value={
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${meta.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
              } />
              <InfoRow label="Visibility" value={<span className="capitalize">{visibility}</span>} />
              <InfoRow label="Created" value={formatShortDate(String(tournament.created_at ?? ""))} />
            </Section>

            {/* Organizer */}
            <Section title="Organizer" icon={User}>
              {(() => {
                const profile      = organizer?.profile as Record<string, unknown> | undefined;
                const vstatus      = organizer?.verification_status as Record<string, unknown> | undefined;
                const ostats       = organizer?.stats as Record<string, unknown> | undefined;
                const avatarUrl    = String(profile?.avatar_url ?? "");
                const firstName    = String(profile?.first_name ?? "");
                const lastName     = String(profile?.last_name ?? "");
                const fullName     = [firstName, lastName].filter(Boolean).join(" ");
                const country      = String(profile?.country ?? "");
                const momoAccount  = organizer?.momo_account as Record<string, unknown> | undefined;
                const phone        = String(profile?.phone_number ?? momoAccount?.phone_number ?? "");
                const role         = String(organizer?.role ?? "");
                const isActive     = organizer?.is_active !== false;
                const isBanned     = Boolean(organizer?.is_banned);
                const emailVerif   = Boolean(vstatus?.email_verified);
                const orgVerif     = Boolean(vstatus?.organizer_verified);
                const lastLogin    = String(organizer?.last_login ?? "");
                const memberSince  = String(organizer?.created_at ?? "");
                const tournsPlayed = Number(ostats?.tournaments_played ?? 0);
                const tournsWon    = Number(ostats?.tournaments_won ?? 0);
                const totalEarned  = Number(ostats?.total_earnings ?? 0);

                return (
                  <>
                    {/* Avatar + name row */}
                    <div className="flex items-center justify-between gap-3 mb-6">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0 overflow-hidden">
                          {avatarUrl
                            ? <img src={avatarUrl} alt={orgUsername} className="w-full h-full object-cover" />
                            : <User className="w-6 h-6 text-slate-400" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{orgUsername}</p>
                          {fullName && <p className="text-xs text-slate-400 truncate">{fullName}</p>}
                          {orgEmail && <p className="text-xs text-slate-500 truncate">{orgEmail}</p>}
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 ${
                        isActive && !isBanned
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-red-500/15 text-red-400 border-red-500/30"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive && !isBanned ? "bg-emerald-400" : "bg-red-400"}`} />
                        {isBanned ? "Banned" : isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Info rows */}
                    <div className="space-y-1">
                      {country   && <InfoRow label="Country"      value={country} />}
                      <InfoRow label="Phone" value={phone || "—"} />
                      {memberSince && <InfoRow label="Member Since" value={formatShortDate(memberSince)} />}
                      {lastLogin && <InfoRow label="Last Login"   value={formatDate(lastLogin)} />}
                      {organizer?._id && (
                        <InfoRow label="User ID" value={
                          <span className="font-mono text-xs text-slate-500">{String(organizer._id).slice(0, 20)}…</span>
                        } />
                      )}
                    </div>

                    {/* Stats */}
                    {(tournsPlayed > 0 || totalEarned > 0) && (
                      <div className="mt-5 pt-5 border-t border-slate-800 grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-lg font-bold text-white">{tournsPlayed}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Played</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-amber-400">{tournsWon}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Won</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-emerald-400">{formatGhs(totalEarned)}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Earned</p>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </Section>

            {/* Game */}
            <Section title="Game" icon={Gamepad2}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                  {gameLogoUrl ? (
                    <img src={gameLogoUrl} alt={gameName} className="w-8 h-8 object-contain" />
                  ) : (
                    <Gamepad2 className="w-6 h-6 text-slate-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{gameName}</p>
                  {game?._id && <p className="text-xs font-mono text-slate-500 mt-0.5">{String(game._id).slice(0, 16)}…</p>}
                </div>
              </div>
            </Section>

            {/* Prize Distribution */}
            {prizeStruct?.distribution && Array.isArray(prizeStruct.distribution) && prizeStruct.distribution.length > 0 && (
              <Section title="Prize Distribution" icon={Trophy}>
                <div className="space-y-2">
                  {(prizeStruct.distribution as any[]).map((d: any) => (
                    <div key={d.position} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          d.position === 1 ? "bg-amber-400/20 text-amber-300" :
                          d.position === 2 ? "bg-slate-400/20 text-slate-300" :
                          d.position === 3 ? "bg-orange-700/20 text-orange-400" :
                          "bg-slate-800 text-slate-500"
                        }`}>
                          {d.position}
                        </span>
                        <span className="text-sm text-slate-300">{d.percentage}%</span>
                      </div>
                      <span className="text-sm font-semibold text-white">{formatGhs(d.amount)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>

      {/* ── Delete Modal ── */}
      <DeleteModal
        tournament={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
      />
    </div>
  );
};

export default TournamentDetail;
