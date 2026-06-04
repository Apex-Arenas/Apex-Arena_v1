import { useCallback, useEffect, useState } from "react";
import {
  Star, Trophy, Medal, Crown, ChevronDown, RefreshCw,
  Phone, X, Loader2, CheckCircle2, Clock, AlertTriangle,
  RotateCcw, Banknote,
} from "lucide-react";
import { apiGet, apiPost } from "../../utils/api.utils";
import { TOURNAMENT_ENDPOINTS } from "../../config/api.config";
import { showSuccess, showError } from "../../utils/toast.utils";
import { organizerService, type WalletBalance } from "../../services/organizer.service";
import { useNavigate } from "react-router-dom";

// ─── Shared ───────────────────────────────────────────────────────────────────

const MOMO_NETWORKS = ["MTN", "Vodafone", "AirtelTigo"] as const;

function fmtGhs(pesewas: number) {
  return `GHS ${(pesewas / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Winnings types + components ──────────────────────────────────────────────

interface Winning {
  _id: string;
  tournament_id: { _id: string; title: string; status: string } | null;
  placement: number;
  prize_percentage: number;
  amount: number;
  currency: string;
  status: "allocated" | "claimed" | "processing" | "paid" | "failed";
  created_at: string;
  payout_completed_at?: string;
}

const WINNING_STATUS_META: Record<Winning["status"], { label: string; cls: string; dot: string }> = {
  allocated:  { label: "Unclaimed",  cls: "bg-amber-500/15 text-amber-300 border-amber-500/25",      dot: "bg-amber-400"   },
  claimed:    { label: "Pending",    cls: "bg-blue-500/15 text-blue-300 border-blue-500/25",          dot: "bg-blue-400"    },
  processing: { label: "Processing", cls: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",   dot: "bg-indigo-400"  },
  paid:       { label: "Paid",       cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", dot: "bg-emerald-400" },
  failed:     { label: "Failed",     cls: "bg-red-500/15 text-red-300 border-red-500/25",             dot: "bg-red-400"     },
};

function PlacementBadge({ placement }: { placement: number }) {
  if (placement === 1) return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25">
      <Crown className="w-3.5 h-3.5 text-amber-400" />
      <span className="text-xs font-bold text-amber-300">1st Place</span>
    </div>
  );
  if (placement === 2) return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-400/10 border border-slate-400/25">
      <Medal className="w-3.5 h-3.5 text-slate-300" />
      <span className="text-xs font-bold text-slate-300">2nd Place</span>
    </div>
  );
  if (placement === 3) return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-800/15 border border-orange-700/25">
      <Medal className="w-3.5 h-3.5 text-orange-600" />
      <span className="text-xs font-bold text-orange-500">3rd Place</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-700/40 border border-slate-700">
      <Trophy className="w-3.5 h-3.5 text-slate-400" />
      <span className="text-xs font-bold text-slate-400">#{placement}</span>
    </div>
  );
}

function WinningClaimModal({ winning, onClose, onClaimed }: { winning: Winning; onClose: () => void; onClaimed: () => void }) {
  const [momoNumber, setMomoNumber] = useState("");
  const [network, setNetwork] = useState<typeof MOMO_NETWORKS[number]>("MTN");
  const [accountName, setAccountName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const momoValid = /^0[0-9]{9}$/.test(momoNumber.trim());
  const isValid = momoValid && accountName.trim().length > 0;

  async function handleClaim() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await apiPost(`${TOURNAMENT_ENDPOINTS.WINNINGS_CLAIM}/${winning._id}/claim`, {
        momo_number: momoNumber.trim(),
        network,
        account_name: accountName.trim(),
        notes: notes.trim() || undefined,
      });
      if (!res.success) throw new Error((res as { error?: { message?: string } }).error?.message ?? "Claim failed.");
      showSuccess("Prize claim submitted. You'll receive payment within 1–2 business days.");
      onClaimed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white">Claim Prize</h2>
              <p className="text-xs text-slate-400">{fmtGhs(winning.amount)} · {winning.prize_percentage}% share</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">Mobile Money Network</label>
            <div className="grid grid-cols-3 gap-2">
              {MOMO_NETWORKS.map((n) => (
                <button key={n} type="button" onClick={() => setNetwork(n)}
                  className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    network === n ? "border-amber-500 bg-amber-500/15 text-amber-300" : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500"
                  }`}
                >{n}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">MoMo Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="tel" value={momoNumber}
                onChange={(e) => setMomoNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="0241234567"
                className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
              />
            </div>
            {momoNumber.length > 0 && !momoValid && (
              <p className="text-xs text-red-400 mt-1">Enter a valid 10-digit number starting with 0.</p>
            )}
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">Account Name</label>
            <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)}
              placeholder="Name registered on MoMo account"
              className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">Notes <span className="normal-case text-slate-600">(optional)</span></label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes for admin"
              className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
            Prize payments are processed within 1–2 business days after admin review.
          </div>

          <button onClick={() => void handleClaim()} disabled={!isValid || submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-linear-to-r from-amber-400 to-orange-400 text-slate-950 font-bold text-sm hover:shadow-lg hover:shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
            {submitting ? "Submitting…" : `Claim ${fmtGhs(winning.amount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function WinningCard({ winning, onClaim }: { winning: Winning; onClaim: () => void }) {
  const meta = WINNING_STATUS_META[winning.status];
  const title = winning.tournament_id?.title ?? "Unknown Tournament";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1 truncate">{title}</p>
          <PlacementBadge placement={winning.placement} />
        </div>
        <span className={`shrink-0 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${meta.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Prize Amount</p>
        <p className="font-display text-2xl font-bold text-white">{fmtGhs(winning.amount)}</p>
        <p className="text-xs text-slate-500 mt-0.5">{winning.prize_percentage}% of prize pool</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-600">{fmtDate(winning.created_at)}</p>
        {winning.status === "allocated" && (
          <button onClick={onClaim}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/25 hover:border-amber-500/50 transition-all">
            <Star className="w-3.5 h-3.5" /> Claim Prize
          </button>
        )}
        {winning.status === "paid" && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Paid {fmtDate(winning.payout_completed_at)}
          </span>
        )}
        {(winning.status === "claimed" || winning.status === "processing") && (
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" /> Pending admin review
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Refunds types + components ───────────────────────────────────────────────

type RefundReason = "player_cancelled" | "tournament_cancelled" | "tournament_full_race" | "admin_override";
type RefundStatus = "pending_claim" | "claimed" | "processing" | "paid" | "failed";

interface Refund {
  _id: string;
  tournament_id: { _id: string; title: string } | null;
  amount: number;
  currency: string;
  reason: RefundReason;
  reason_note?: string;
  status: RefundStatus;
  created_at: string;
  payout_completed_at?: string;
}

const REASON_LABELS: Record<RefundReason, string> = {
  player_cancelled:     "You withdrew from this tournament",
  tournament_cancelled: "Tournament was cancelled",
  tournament_full_race: "Tournament filled up before your slot was confirmed",
  admin_override:       "Refund issued by support",
};

const REFUND_STATUS_META: Record<RefundStatus, { label: string; cls: string; dot: string }> = {
  pending_claim: { label: "Unclaimed",  cls: "bg-amber-500/15 text-amber-300 border-amber-500/25",      dot: "bg-amber-400"   },
  claimed:       { label: "Pending",    cls: "bg-blue-500/15 text-blue-300 border-blue-500/25",          dot: "bg-blue-400"    },
  processing:    { label: "Processing", cls: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",   dot: "bg-indigo-400"  },
  paid:          { label: "Refunded",   cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", dot: "bg-emerald-400" },
  failed:        { label: "Failed",     cls: "bg-red-500/15 text-red-300 border-red-500/25",             dot: "bg-red-400"     },
};

function RefundClaimModal({ refund, onClose, onClaimed }: { refund: Refund; onClose: () => void; onClaimed: () => void }) {
  const [momoNumber, setMomoNumber] = useState("");
  const [network, setNetwork] = useState<typeof MOMO_NETWORKS[number]>("MTN");
  const [accountName, setAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const momoValid = /^0[0-9]{9}$/.test(momoNumber.trim());
  const isValid = momoValid && accountName.trim().length > 0;

  async function handleClaim() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await apiPost(`${TOURNAMENT_ENDPOINTS.REFUNDS_CLAIM}/${refund._id}/claim`, {
        momo_number: momoNumber.trim(),
        network,
        account_name: accountName.trim(),
      });
      if (!res.success) throw new Error((res as { error?: { message?: string } }).error?.message ?? "Claim failed.");
      showSuccess("Refund claim submitted. You'll receive your funds within 1–2 business days.");
      onClaimed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white">Claim Refund</h2>
              <p className="text-xs text-slate-400">{fmtGhs(refund.amount)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">Mobile Money Network</label>
            <div className="grid grid-cols-3 gap-2">
              {MOMO_NETWORKS.map((n) => (
                <button key={n} type="button" onClick={() => setNetwork(n)}
                  className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    network === n ? "border-cyan-500 bg-cyan-500/15 text-cyan-300" : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500"
                  }`}
                >{n}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">MoMo Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="tel" value={momoNumber}
                onChange={(e) => setMomoNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="0241234567"
                className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
              />
            </div>
            {momoNumber.length > 0 && !momoValid && (
              <p className="text-xs text-red-400 mt-1">Enter a valid 10-digit number starting with 0.</p>
            )}
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">Account Name</label>
            <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)}
              placeholder="Name registered on MoMo account"
              className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-cyan-400" />
            Refunds are processed within 1–2 business days after admin review.
          </div>

          <button onClick={() => void handleClaim()} disabled={!isValid || submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            {submitting ? "Submitting…" : `Claim ${fmtGhs(refund.amount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function RefundCard({ refund, onClaim }: { refund: Refund; onClaim: () => void }) {
  const meta = REFUND_STATUS_META[refund.status];
  const title = refund.tournament_id?.title ?? "Unknown Tournament";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold truncate flex-1">{title}</p>
        <span className={`shrink-0 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${meta.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
        </span>
      </div>

      <div className="mb-3">
        <p className="font-display text-2xl font-bold text-white">{fmtGhs(refund.amount)}</p>
      </div>

      <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 px-3 py-2.5 mb-4">
        <p className="text-xs text-slate-400">{REASON_LABELS[refund.reason]}</p>
        {refund.reason_note && <p className="text-xs text-slate-500 mt-0.5 italic">{refund.reason_note}</p>}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-600">{fmtDate(refund.created_at)}</p>
        {refund.status === "pending_claim" && (
          <button onClick={onClaim}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-bold hover:bg-cyan-500/25 hover:border-cyan-500/50 transition-all">
            <RotateCcw className="w-3.5 h-3.5" /> Claim Refund
          </button>
        )}
        {refund.status === "paid" && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Refunded {fmtDate(refund.payout_completed_at)}
          </span>
        )}
        {(refund.status === "claimed" || refund.status === "processing") && (
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" /> Pending admin review
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "winnings" | "refunds";

export default function PrizesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("winnings");
  const [statsOpen, setStatsOpen] = useState(false);

  // Wallet balance
  const [balance, setBalance] = useState<WalletBalance | null>(null);

  // Winnings state
  const [winnings, setWinnings] = useState<Winning[]>([]);
  const [winLoading, setWinLoading] = useState(true);
  const [claimingWin, setClaimingWin] = useState<Winning | null>(null);

  // Refunds state
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [refLoading, setRefLoading] = useState(true);
  const [claimingRef, setClaimingRef] = useState<Refund | null>(null);

  const loadWinnings = useCallback(async () => {
    setWinLoading(true);
    try {
      const res = await apiGet(TOURNAMENT_ENDPOINTS.WINNINGS);
      if (res.success) {
        const d = res.data as Record<string, unknown>;
        setWinnings((Array.isArray(res.data) ? res.data : (d.winnings ?? d.data ?? [])) as Winning[]);
      }
    } catch { showError("Failed to load winnings."); }
    finally { setWinLoading(false); }
  }, []);

  const loadRefunds = useCallback(async () => {
    setRefLoading(true);
    try {
      const res = await apiGet(TOURNAMENT_ENDPOINTS.REFUNDS);
      if (res.success) {
        const d = res.data as Record<string, unknown>;
        setRefunds((Array.isArray(res.data) ? res.data : (d.refunds ?? d.data ?? [])) as Refund[]);
      }
    } catch { showError("Failed to load refunds."); }
    finally { setRefLoading(false); }
  }, []);

  useEffect(() => {
    void loadWinnings();
    void loadRefunds();
    organizerService.getWalletBalance().then(setBalance).catch(() => null);
  }, [loadWinnings, loadRefunds]);

  const loading = tab === "winnings" ? winLoading : refLoading;

  // Stats per tab
  const winStats = [
    { icon: Star,         iconColor: "text-amber-400",  bg: "from-amber-500/25 to-orange-500/20",  label: "Total",     value: winLoading ? "—" : String(winnings.length) },
    { icon: Trophy,       iconColor: "text-cyan-400",   bg: "from-cyan-500/25 to-indigo-500/20",   label: "Unclaimed", value: winLoading ? "—" : String(winnings.filter(w => w.status === "allocated").length) },
    { icon: Clock,        iconColor: "text-indigo-400", bg: "from-indigo-500/25 to-violet-500/20", label: "Pending",   value: winLoading ? "—" : String(winnings.filter(w => w.status === "claimed" || w.status === "processing").length) },
    { icon: CheckCircle2, iconColor: "text-green-400",  bg: "from-green-500/25 to-teal-500/20",    label: "Paid Out",  value: winLoading ? "—" : fmtGhs(winnings.filter(w => w.status === "paid").reduce((s, w) => s + w.amount, 0)) },
  ];

  const refStats = [
    { icon: RotateCcw,    iconColor: "text-cyan-400",   bg: "from-cyan-500/25 to-indigo-500/20",   label: "Total",     value: refLoading ? "—" : String(refunds.length) },
    { icon: AlertTriangle,iconColor: "text-amber-400",  bg: "from-amber-500/25 to-orange-500/20",  label: "Unclaimed", value: refLoading ? "—" : String(refunds.filter(r => r.status === "pending_claim").length) },
    { icon: Clock,        iconColor: "text-indigo-400", bg: "from-indigo-500/25 to-violet-500/20", label: "Pending",   value: refLoading ? "—" : String(refunds.filter(r => r.status === "claimed" || r.status === "processing").length) },
    { icon: CheckCircle2, iconColor: "text-green-400",  bg: "from-green-500/25 to-teal-500/20",    label: "Refunded",  value: refLoading ? "—" : fmtGhs(refunds.filter(r => r.status === "paid").reduce((s, r) => s + r.amount, 0)) },
  ];

  const statItems = tab === "winnings" ? winStats : refStats;

  return (
    <div className="min-h-screen">

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <div className="relative bg-slate-900 border-b border-slate-800/60 overflow-hidden">
        <div className="absolute -top-40 right-0 w-150 h-100 rounded-full bg-amber-500/6 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-125 h-50 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-size-[60px_60px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-none">Prizes</h1>
              <p className="text-base text-slate-400 mt-3">Your tournament winnings and entry fee refunds — claim via Mobile Money.</p>
            </div>
            <button
              onClick={() => void (tab === "winnings" ? loadWinnings() : loadRefunds())}
              disabled={loading}
              className="p-2 mt-1 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-50 transition-colors shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Wallet balance strip */}
          {balance && (
            <div className="mt-5 flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-px rounded-xl overflow-hidden border border-slate-700/60 bg-slate-800/50">
                {([
                  { label: "Available", value: balance.availableBalance, cls: "text-emerald-400" },
                  { label: "Pending",   value: balance.pendingBalance,   cls: "text-amber-400"  },
                  ...(balance.escrowLocked > 0
                    ? [{ label: "In Escrow", value: balance.escrowLocked, cls: "text-indigo-400" }]
                    : []),
                  { label: "Total",     value: balance.totalBalance,     cls: "text-white"      },
                ] as { label: string; value: number; cls: string }[]).map(({ label, value, cls }) => (
                  <div key={label} className="px-4 py-2.5 border-r border-slate-700/60 last:border-r-0">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">{label}</p>
                    <p className={`font-display text-sm font-bold tabular-nums mt-0.5 ${cls}`}>
                      GHS {(value / 100).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
              {balance.availableBalance > 0 && (
                <button
                  onClick={() => navigate("/auth/transactions")}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/25 transition-colors"
                >
                  <Banknote className="w-3.5 h-3.5" />
                  Withdraw
                </button>
              )}
            </div>
          )}

          {/* Stats — mobile toggle */}
          <div className="sm:hidden mt-4">
            <button onClick={() => setStatsOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs font-semibold text-slate-400 uppercase tracking-widest">
              <span>Stats</span>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${statsOpen ? "rotate-180" : ""}`} />
            </button>
            {statsOpen && (
              <div className="mt-1 grid grid-cols-2 gap-2">
                {statItems.map((s) => (
                  <div key={s.label} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3">
                    <div className={`w-8 h-8 rounded-lg bg-linear-to-br ${s.bg} flex items-center justify-center shrink-0`}>
                      <s.icon className={`w-3.5 h-3.5 ${s.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-base font-bold tabular-nums text-white leading-none truncate">{s.value}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest truncate">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats — desktop */}
          <div className="hidden sm:grid sm:grid-cols-4 gap-3 mt-6">
            {statItems.map((s) => (
              <div key={s.label} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3">
                <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-xl font-bold tabular-nums text-white leading-none truncate">{s.value}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-800/60 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex gap-1">
          {(["winnings", "refunds"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setStatsOpen(false); }}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors capitalize ${
                tab === t
                  ? t === "winnings"
                    ? "border-amber-400 text-amber-300"
                    : "border-cyan-400 text-cyan-300"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {t === "winnings" ? <Star className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
              {t === "winnings" ? "Tournament Winnings" : "Entry Fee Refunds"}
              {/* Badge for unclaimed */}
              {t === "winnings" && winnings.filter(w => w.status === "allocated").length > 0 && (
                <span className="min-w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-bold flex items-center justify-center px-1">
                  {winnings.filter(w => w.status === "allocated").length}
                </span>
              )}
              {t === "refunds" && refunds.filter(r => r.status === "pending_claim").length > 0 && (
                <span className="min-w-4 h-4 rounded-full bg-cyan-500 text-slate-950 text-[9px] font-bold flex items-center justify-center px-1">
                  {refunds.filter(r => r.status === "pending_claim").length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">

        {/* Winnings tab */}
        {tab === "winnings" && (
          winLoading ? (
            <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : winnings.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 py-24 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-5">
                <Star className="w-7 h-7 text-slate-600" />
              </div>
              <p className="font-display text-lg font-semibold text-slate-300">No winnings yet</p>
              <p className="text-sm text-slate-500 mt-2">Win a tournament and your prize will appear here to claim.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {winnings.map((w) => (
                <WinningCard key={w._id} winning={w} onClaim={() => setClaimingWin(w)} />
              ))}
            </div>
          )
        )}

        {/* Refunds tab */}
        {tab === "refunds" && (
          refLoading ? (
            <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : refunds.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 py-24 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-5">
                <RotateCcw className="w-7 h-7 text-slate-600" />
              </div>
              <p className="font-display text-lg font-semibold text-slate-300">No refunds</p>
              <p className="text-sm text-slate-500 mt-2">Any entry fee refunds owed to you will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {refunds.map((r) => (
                <RefundCard key={r._id} refund={r} onClaim={() => setClaimingRef(r)} />
              ))}
            </div>
          )
        )}
      </div>

      {claimingWin && (
        <WinningClaimModal
          winning={claimingWin}
          onClose={() => setClaimingWin(null)}
          onClaimed={() => { setClaimingWin(null); void loadWinnings(); }}
        />
      )}
      {claimingRef && (
        <RefundClaimModal
          refund={claimingRef}
          onClose={() => setClaimingRef(null)}
          onClaimed={() => { setClaimingRef(null); void loadRefunds(); }}
        />
      )}
    </div>
  );
}
