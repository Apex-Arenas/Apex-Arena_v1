import { useCallback, useEffect, useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  X,
  Loader2,
  Gavel,
  Clock,
  Trophy,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { organizerService } from "../../../services/organizer.service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Participant {
  user_id: { _id: string; username: string; profile?: { avatar_url?: string } } | string | null;
  score?: number;
  result?: string;
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

function getParticipantId(p: Participant): string {
  if (!p.user_id) return "";
  if (typeof p.user_id === "string") return p.user_id;
  return p.user_id._id ?? "";
}

function getParticipantName(p: Participant): string {
  if (!p.user_id) return "Unknown";
  if (typeof p.user_id === "string") return "Player";
  return p.user_id.username ?? "Unknown";
}

function getParticipantAvatar(p: Participant): string | undefined {
  if (!p.user_id || typeof p.user_id === "string") return undefined;
  return p.user_id.profile?.avatar_url;
}

function isImageUrl(url: string) {
  return /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(url);
}

function Avatar({ name, url, size = "md" }: { name: string; url?: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "w-7 h-7 text-[10px]" : size === "lg" ? "w-12 h-12 text-base" : "w-9 h-9 text-xs";
  if (url) {
    return <img src={url} alt={name} className={`${sizeClass} rounded-full object-cover border border-slate-700`} />;
  }
  return (
    <div className={`${sizeClass} rounded-full bg-linear-to-br from-orange-500/30 to-amber-500/20 border border-orange-500/30 flex items-center justify-center font-bold text-orange-300`}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

// ─── Resolve Modal ────────────────────────────────────────────────────────────

function ResolveModal({ dispute, onClose, onResolved }: { dispute: Dispute; onClose: () => void; onResolved: () => void }) {
  const players = dispute.participants.filter((p) => getParticipantId(p));
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

  const evidence = dispute.dispute.evidence ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
      <div className="relative bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-lg shadow-2xl shadow-black/60 overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-amber-500/8 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-start justify-between px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
              <Gavel className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">Resolve Dispute</h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[280px]">
                {dispute.tournament_id?.title ?? "Unknown Tournament"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Dispute reason */}
          <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 px-4 py-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <p className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">Dispute Reason</p>
            </div>
            <p className="text-sm text-amber-200/90 leading-relaxed">{dispute.dispute.dispute_reason ?? "No reason provided."}</p>
          </div>

          {/* Evidence */}
          {evidence.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> Evidence
              </p>
              <div className="grid gap-2">
                {evidence.map((url, i) => (
                  isImageUrl(url) ? (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="block rounded-xl overflow-hidden border border-slate-700 hover:border-cyan-500/40 transition-colors group">
                      <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-32 object-cover group-hover:opacity-90 transition-opacity" />
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/70 text-xs text-cyan-400">
                        <ExternalLink className="w-3 h-3" /> View full image
                      </div>
                    </a>
                  ) : (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700 hover:border-cyan-500/40 text-xs text-cyan-400 hover:text-cyan-300 transition-all">
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{url}</span>
                    </a>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Select winner */}
          <div className="space-y-2.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Select True Winner <span className="text-red-400 ml-0.5">*</span>
            </p>
            {players.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {players.map((p) => {
                  const uid = getParticipantId(p);
                  const name = getParticipantName(p);
                  const avatar = getParticipantAvatar(p);
                  const selected = winnerId === uid;
                  return (
                    <button key={uid} onClick={() => setWinnerId(uid)}
                      className={`relative flex flex-col items-center gap-3 py-5 px-3 rounded-2xl border-2 transition-all ${
                        selected
                          ? "border-orange-500/70 bg-orange-500/10 shadow-lg shadow-orange-500/10"
                          : "border-slate-700 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/60"
                      }`}>
                      {selected && (
                        <div className="absolute top-2.5 right-2.5">
                          <CheckCircle2 className="w-4 h-4 text-orange-400" />
                        </div>
                      )}
                      <Avatar name={name} url={avatar} size="lg" />
                      <div className="text-center">
                        <p className={`text-sm font-bold truncate ${selected ? "text-orange-200" : "text-white"}`}>{name}</p>
                        {selected && <p className="text-[10px] text-orange-400 font-semibold uppercase tracking-wide mt-0.5">Selected</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-sm text-slate-400">Participant data unavailable. You may still submit a resolution note.</p>
              </div>
            )}
          </div>

          {/* Resolution note */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              Resolution Note <span className="text-red-400 ml-0.5">*</span>
            </label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Explain your decision — players will be notified (min 10 characters)…"
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/60 transition-colors resize-none"
            />
            <div className="flex items-center justify-between">
              {resolution.trim().length > 0 && resolution.trim().length < 10 && (
                <p className="text-[11px] text-red-400">{10 - resolution.trim().length} more characters required</p>
              )}
              <p className="text-[10px] text-slate-600 ml-auto">{resolution.length}/500</p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} disabled={submitting}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 disabled:opacity-50 transition-colors">
              Cancel
            </button>
            <button onClick={() => void handleResolve()} disabled={!canSubmit}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 text-slate-950 text-sm font-bold hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
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
  const players = dispute.participants.filter((p) => getParticipantId(p));
  const resolved = dispute.dispute.resolved;
  const evidence = dispute.dispute.evidence ?? [];

  return (
    <div className={`relative rounded-2xl border overflow-hidden transition-all ${
      resolved
        ? "border-slate-800 bg-slate-900/50"
        : "border-amber-500/20 bg-slate-900/80 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5"
    }`}>
      {/* Top accent */}
      {!resolved && <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-amber-500/40 to-transparent" />}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1 truncate">
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
              <span className="flex items-center gap-1 text-[10px] text-slate-600">
                <Clock className="w-3 h-3" />
                {timeAgo(dispute.dispute.disputed_at)}
              </span>
            </div>
          </div>
          {!resolved && (
            <button onClick={onResolve}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold hover:bg-orange-500/25 hover:border-orange-500/50 transition-all">
              <Gavel className="w-3.5 h-3.5" /> Resolve
            </button>
          )}
        </div>

        {/* Players vs */}
        {players.length > 0 ? (
          <div className="flex items-center gap-3 mb-4">
            {players.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Avatar name={getParticipantName(p)} url={getParticipantAvatar(p)} size="sm" />
                <span className="text-sm font-semibold text-white">{getParticipantName(p)}</span>
                {i < players.length - 1 && (
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mx-1 bg-slate-800 px-1.5 py-0.5 rounded">vs</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-4 text-slate-600 text-sm">
            <ShieldAlert className="w-4 h-4" /> Player data unavailable
          </div>
        )}

        {/* Dispute reason */}
        <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 px-3.5 py-2.5 mb-3">
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
            {dispute.dispute.dispute_reason ?? "No reason provided."}
          </p>
        </div>

        {/* Evidence */}
        {evidence.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {evidence.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-500/8 border border-cyan-500/20 hover:border-cyan-500/40 px-2.5 py-1 rounded-lg transition-all">
                {isImageUrl(url) ? <ImageIcon className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                Evidence {i + 1}
              </a>
            ))}
          </div>
        )}

        {/* Resolution note (resolved state) */}
        {resolved && dispute.dispute.resolution && (
          <div className="mt-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 px-3.5 py-2.5">
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Resolution</p>
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{dispute.dispute.resolution}</p>
          </div>
        )}
      </div>
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

  useEffect(() => { void fetchDisputes(); }, [fetchDisputes]);

  const pending = disputes.filter((d) => !d.dispute.resolved);
  const resolved = disputes.filter((d) => d.dispute.resolved);
  const shown = tab === "pending" ? pending : resolved;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <ShieldAlert className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <h1 className="font-display text-2xl font-bold text-white">Disputes</h1>
            {pending.length > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-bold">
                {pending.length} pending
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 ml-12">
            Review and resolve disputed matches across your tournaments.
          </p>
        </div>
        <button onClick={() => void fetchDisputes()} disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-slate-900/70 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-300 mb-6">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center rounded-xl bg-slate-800/60 border border-slate-700/60 p-1 mb-6 w-fit">
        {(["pending", "resolved"] as const).map((t) => {
          const count = t === "pending" ? pending.length : resolved.length;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                tab === t
                  ? t === "pending"
                    ? "bg-amber-500/15 border border-amber-500/25 text-amber-300"
                    : "bg-emerald-500/15 border border-emerald-500/25 text-emerald-300"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}>
              {t === "pending" ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {t}
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === t
                  ? t === "pending" ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"
                  : "bg-slate-700 text-slate-400"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 animate-pulse space-y-3">
              <div className="h-3 w-24 bg-slate-800 rounded" />
              <div className="h-4 w-16 bg-slate-800 rounded" />
              <div className="flex gap-3 items-center">
                <div className="w-7 h-7 rounded-full bg-slate-800" />
                <div className="h-3 w-20 bg-slate-800 rounded" />
                <div className="h-3 w-8 bg-slate-800 rounded" />
                <div className="w-7 h-7 rounded-full bg-slate-800" />
                <div className="h-3 w-20 bg-slate-800 rounded" />
              </div>
              <div className="h-10 bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto mb-4">
            {tab === "pending"
              ? <ShieldAlert className="w-8 h-8 text-slate-500" />
              : <CheckCircle2 className="w-8 h-8 text-slate-500" />}
          </div>
          <p className="font-display text-lg font-bold text-slate-300 mb-1">
            {tab === "pending" ? "No Pending Disputes" : "No Resolved Disputes"}
          </p>
          <p className="text-sm text-slate-500">
            {tab === "pending"
              ? "All disputes in your tournaments have been settled."
              : "You haven't resolved any disputes yet."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {shown.map((d) => (
            <DisputeCard key={d._id} dispute={d} onResolve={() => setResolving(d)} />
          ))}
        </div>
      )}

      {total > 50 && (
        <p className="text-center text-xs text-slate-600 mt-6">Showing 50 of {total} disputes.</p>
      )}

      {resolving && (
        <ResolveModal
          dispute={resolving}
          onClose={() => setResolving(null)}
          onResolved={() => { setResolving(null); void fetchDisputes(); }}
        />
      )}
    </div>
  );
}
