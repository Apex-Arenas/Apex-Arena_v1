import { useCallback, useEffect, useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  X,
  Loader2,
  User,
} from "lucide-react";
import { organizerService } from "../../../services/organizer.service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Participant {
  user_id: { _id: string; username: string; profile?: { avatar_url?: string } } | null;
  role: string;
  result?: { score?: number };
}

interface Dispute {
  _id: string;
  tournament_id: { _id: string; title: string } | null;
  participants: Participant[];
  status: string;
  dispute: {
    is_disputed: boolean;
    disputed_by?: string;
    dispute_reason?: string;
    disputed_at?: string;
    evidence?: string[];
    resolved: boolean;
    resolution?: string;
    resolved_at?: string;
  };
  result?: {
    reported_by?: string;
    winner_id?: string;
    scores?: Record<string, number>;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso?: string) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Avatar({ username, url }: { username: string; url?: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={username}
        className="w-7 h-7 rounded-full object-cover border border-slate-700"
      />
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300">
      {username?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

// ─── Resolve Modal ────────────────────────────────────────────────────────────

interface ResolveModalProps {
  dispute: Dispute;
  onClose: () => void;
  onResolved: () => void;
}

function ResolveModal({ dispute, onClose, onResolved }: ResolveModalProps) {
  const players = dispute.participants.filter(
    (p) => p.role === "player" || p.role === "participant",
  );
  const [winnerId, setWinnerId] = useState("");
  const [resolution, setResolution] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = winnerId && resolution.trim().length >= 10 && !submitting;

  async function handleResolve() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await organizerService.resolveDispute(dispute._id, winnerId, resolution.trim());
      onResolved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resolve dispute.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Resolve Dispute</h2>
            <p className="text-sm text-slate-400 mt-0.5 truncate">
              {dispute.tournament_id?.title ?? "Unknown Tournament"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Dispute reason */}
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-300">
            <p className="font-semibold mb-1">Dispute Reason</p>
            <p className="text-amber-200/80">{dispute.dispute.dispute_reason ?? "No reason provided."}</p>
          </div>

          {/* Evidence */}
          {dispute.dispute.evidence && dispute.dispute.evidence.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-widest">Evidence</p>
              <div className="flex flex-col gap-1.5">
                {dispute.dispute.evidence.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Select winner */}
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-widest">
              Select True Winner <span className="text-red-400">*</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {players.map((p) => {
                const uid = p.user_id?._id ?? "";
                const uname = p.user_id?.username ?? "Unknown";
                const avatarUrl = p.user_id?.profile?.avatar_url;
                const selected = winnerId === uid;
                return (
                  <button
                    key={uid}
                    onClick={() => setWinnerId(uid)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selected
                        ? "border-orange-500/60 bg-orange-500/10 text-white"
                        : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    <Avatar username={uname} url={avatarUrl} />
                    <span className="text-sm font-medium truncate">{uname}</span>
                    {selected && <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0 ml-auto" />}
                  </button>
                );
              })}
            </div>
            {players.length === 0 && (
              <p className="text-xs text-slate-500">No participants found for this match.</p>
            )}
          </div>

          {/* Resolution text */}
          <div>
            <label className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-widest block">
              Resolution Note <span className="text-red-400">*</span>
            </label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Explain your decision (min 10 characters)…"
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/60 transition-colors resize-none"
            />
            <p className="text-[10px] text-slate-600 mt-1 text-right">{resolution.length}/500</p>
          </div>

          {error && (
            <p className="text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleResolve()}
              disabled={!canSubmit}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 text-slate-950 text-sm font-bold hover:bg-orange-400 disabled:opacity-50 transition-colors"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Resolving…" : "Resolve Dispute"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dispute Card ─────────────────────────────────────────────────────────────

function DisputeCard({ dispute, onResolve }: { dispute: Dispute; onResolve: () => void }) {
  const players = dispute.participants.filter(
    (p) => p.role === "player" || p.role === "participant",
  );
  const resolved = dispute.dispute.resolved;

  return (
    <div className={`rounded-2xl border bg-slate-900/70 p-5 transition-all ${
      resolved
        ? "border-slate-800 opacity-70"
        : "border-amber-500/25 hover:border-amber-500/50"
    }`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">
            {dispute.tournament_id?.title ?? "Unknown Tournament"}
          </p>
          <div className="flex items-center gap-2">
            {resolved ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> Resolved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <AlertTriangle className="w-3 h-3" /> Pending
              </span>
            )}
            <span className="text-[10px] text-slate-600">
              {timeAgo(dispute.dispute.disputed_at)}
            </span>
          </div>
        </div>
        {!resolved && (
          <button
            onClick={onResolve}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/25 text-orange-400 text-xs font-semibold hover:bg-orange-500/20 hover:border-orange-500/40 transition-all"
          >
            Resolve <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Players */}
      <div className="flex items-center gap-3 mb-4">
        {players.length > 0 ? (
          <>
            {players.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Avatar
                  username={p.user_id?.username ?? "?"}
                  url={p.user_id?.profile?.avatar_url}
                />
                <span className="text-sm font-medium text-white">
                  {p.user_id?.username ?? "Unknown"}
                </span>
                {i < players.length - 1 && (
                  <span className="text-slate-600 text-xs font-bold mx-1">vs</span>
                )}
              </div>
            ))}
          </>
        ) : (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <User className="w-4 h-4" /> Players unavailable
          </div>
        )}
      </div>

      {/* Dispute reason */}
      <p className="text-xs text-slate-400 bg-slate-800/50 rounded-lg px-3 py-2 line-clamp-2">
        {dispute.dispute.dispute_reason ?? "No reason provided."}
      </p>

      {/* Evidence link */}
      {dispute.dispute.evidence && dispute.dispute.evidence.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {dispute.dispute.evidence.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Evidence {i + 1}
            </a>
          ))}
        </div>
      )}

      {/* Resolution note */}
      {resolved && dispute.dispute.resolution && (
        <div className="mt-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15 px-3 py-2">
          <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-widest mb-0.5">
            Resolution
          </p>
          <p className="text-xs text-slate-400 line-clamp-2">{dispute.dispute.resolution}</p>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrganizerDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"pending" | "resolved">("pending");
  const [resolving, setResolving] = useState<Dispute | null>(null);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await organizerService.getMyDisputes({ limit: 50 });
      setDisputes(result.disputes as Dispute[]);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load disputes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDisputes();
  }, [fetchDisputes]);

  const pending = disputes.filter((d) => !d.dispute.resolved);
  const resolved = disputes.filter((d) => d.dispute.resolved);
  const shown = tab === "pending" ? pending : resolved;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h1 className="font-display text-2xl font-bold text-white">Disputes</h1>
            {pending.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-bold">
                {pending.length} pending
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400">
            Review and resolve disputed matches across your tournaments.
          </p>
        </div>
        <button
          onClick={() => void fetchDisputes()}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-slate-900/70 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-300 mb-6">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center rounded-xl bg-slate-800/60 border border-slate-700/60 p-0.5 mb-6 w-fit">
        {(["pending", "resolved"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            {t} ({t === "pending" ? pending.length : resolved.length})
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 animate-pulse space-y-3">
              <div className="h-3 w-32 bg-slate-800 rounded" />
              <div className="h-5 w-24 bg-slate-800 rounded" />
              <div className="h-8 bg-slate-800 rounded-lg" />
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-slate-500" />
          </div>
          <p className="font-display text-lg font-bold text-slate-300 mb-1">
            {tab === "pending" ? "No Pending Disputes" : "No Resolved Disputes"}
          </p>
          <p className="text-sm text-slate-500">
            {tab === "pending"
              ? "All disputes in your tournaments have been resolved."
              : "You haven't resolved any disputes yet."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {shown.map((d) => (
            <DisputeCard
              key={d._id}
              dispute={d}
              onResolve={() => setResolving(d)}
            />
          ))}
        </div>
      )}

      {total > 50 && (
        <p className="text-center text-xs text-slate-600 mt-6">
          Showing 50 of {total} disputes.
        </p>
      )}

      {/* Resolve modal */}
      {resolving && (
        <ResolveModal
          dispute={resolving}
          onClose={() => setResolving(null)}
          onResolved={() => {
            setResolving(null);
            void fetchDisputes();
          }}
        />
      )}
    </div>
  );
}
