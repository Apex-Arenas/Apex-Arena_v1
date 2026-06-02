import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle, CheckCircle2, Clock3, Loader2,
  Send, X, DollarSign, Banknote, ArrowDownToLine, Trash2,
  ChevronLeft, ChevronRight, ChevronDown,
  TrendingUp, RotateCcw, Phone, Clock, AlertTriangle,
} from "lucide-react";
import { organizerService, type PayoutRequest, type WalletBalance } from "../../../services/organizer.service";
import { apiGet, apiPost } from "../../../utils/api.utils";
import { TOURNAMENT_ENDPOINTS } from "../../../config/api.config";
import { showSuccess, showError } from "../../../utils/toast.utils";

// ─── Shared ───────────────────────────────────────────────────────────────────

const MOMO_NETWORKS = ["MTN", "Vodafone", "AirtelTigo"] as const;

function fmtGhs(pesewas: number) {
  return `GHS ${(pesewas / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Payouts types + components ───────────────────────────────────────────────

const PAGE_SIZE = 10;

const NETWORK_COLORS: Record<string, string> = {
  MTN:        "bg-yellow-400/15 text-yellow-300 border-yellow-400/20",
  Vodafone:   "bg-red-400/15 text-red-300 border-red-400/20",
  AirtelTigo: "bg-blue-400/15 text-blue-300 border-blue-400/20",
};

const PAYOUT_STATUS_META: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  pending:   { label: "Pending",   dot: "bg-amber-400",   text: "text-amber-300",   bg: "bg-amber-400/10 border-amber-400/20"    },
  approved:  { label: "Approved",  dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-400/10 border-emerald-400/20" },
  completed: { label: "Paid",      dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-400/10 border-emerald-400/20" },
  rejected:  { label: "Rejected",  dot: "bg-red-400",     text: "text-red-300",     bg: "bg-red-400/10 border-red-400/20"         },
  cancelled: { label: "Cancelled", dot: "bg-slate-500",   text: "text-slate-400",   bg: "bg-slate-700/20 border-slate-700"        },
};

const inputCls = "w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/70 focus:bg-slate-800 transition-colors";
const selectCls = "w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/70 focus:bg-slate-800 transition-colors";

function validateMomo(number: string): string | null {
  const cleaned = number.trim().replace(/\s/g, "");
  if (!cleaned) return "Enter your mobile money number.";
  if (!/^0[0-9]{9}$/.test(cleaned)) return "MoMo number must be 10 digits starting with 0 (e.g. 0241234567).";
  return null;
}

// ─── Earnings types + components ──────────────────────────────────────────────

type EarningType   = "entry_fee_share" | "prize_pool_refund";
type EarningStatus = "pending_claim" | "claimed" | "processing" | "paid" | "failed";

interface Earning {
  _id: string;
  tournament_id: { _id: string; title: string } | null;
  earning_type: EarningType;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  currency: string;
  status: EarningStatus;
  created_at: string;
  payout_completed_at?: string;
}

const TYPE_META: Record<EarningType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  entry_fee_share:   { label: "Entry Fee Share",   icon: TrendingUp, color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/25" },
  prize_pool_refund: { label: "Prize Pool Refund", icon: RotateCcw,  color: "text-cyan-400",   bg: "bg-cyan-500/15 border-cyan-500/25"     },
};

const EARNING_STATUS_META: Record<EarningStatus, { label: string; cls: string; dot: string }> = {
  pending_claim: { label: "Unclaimed",  cls: "bg-amber-500/15 text-amber-300 border-amber-500/25",      dot: "bg-amber-400"   },
  claimed:       { label: "Pending",    cls: "bg-blue-500/15 text-blue-300 border-blue-500/25",          dot: "bg-blue-400"    },
  processing:    { label: "Processing", cls: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",   dot: "bg-indigo-400"  },
  paid:          { label: "Paid",       cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", dot: "bg-emerald-400" },
  failed:        { label: "Failed",     cls: "bg-red-500/15 text-red-300 border-red-500/25",             dot: "bg-red-400"     },
};

function EarningClaimModal({ earning, onClose, onClaimed }: { earning: Earning; onClose: () => void; onClaimed: () => void }) {
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
      const res = await apiPost(`${TOURNAMENT_ENDPOINTS.ORGANIZER_EARNINGS_CLAIM}/${earning._id}/claim`, {
        momo_number: momoNumber.trim(),
        network,
        account_name: accountName.trim(),
        notes: notes.trim() || undefined,
      });
      if (!res.success) throw new Error((res as { error?: { message?: string } }).error?.message ?? "Claim failed.");
      showSuccess("Earnings claim submitted. Payment will be processed within 1–2 business days.");
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
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white">Claim Earnings</h2>
              <p className="text-xs text-slate-400">{fmtGhs(earning.net_amount)} net payout</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Fee breakdown */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700 divide-y divide-slate-700/50">
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-slate-400">Gross amount</span>
              <span className="text-white font-semibold">{fmtGhs(earning.gross_amount)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-slate-400">Platform fee (10%)</span>
              <span className="text-red-400">− {fmtGhs(earning.platform_fee)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 text-sm font-bold">
              <span className="text-white">You receive</span>
              <span className="text-emerald-400">{fmtGhs(earning.net_amount)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">Mobile Money Network</label>
            <div className="grid grid-cols-3 gap-2">
              {MOMO_NETWORKS.map((n) => (
                <button key={n} type="button" onClick={() => setNetwork(n)}
                  className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    network === n ? "border-orange-500 bg-orange-500/15 text-orange-300" : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500"
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
                placeholder="0551234567"
                className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>
            {momoNumber.length > 0 && !momoValid && (
              <p className="text-xs text-red-400 mt-1">Enter a valid 10-digit number starting with 0.</p>
            )}
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">Account Name</label>
            <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)}
              placeholder="Business or personal name on MoMo"
              className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/60 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">Notes <span className="normal-case text-slate-600">(optional)</span></label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for admin"
              className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/60 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-orange-400" />
            Earnings are processed within 1–2 business days after admin review.
          </div>

          <button onClick={() => void handleClaim()} disabled={!isValid || submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 font-bold text-sm hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
            {submitting ? "Submitting…" : `Claim ${fmtGhs(earning.net_amount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function EarningCard({ earning, onClaim }: { earning: Earning; onClaim: () => void }) {
  const statusMeta = EARNING_STATUS_META[earning.status];
  const typeMeta   = TYPE_META[earning.earning_type];
  const TypeIcon   = typeMeta.icon;
  const title      = earning.tournament_id?.title ?? "Unknown Tournament";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold truncate mb-1.5">{title}</p>
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${typeMeta.bg}`}>
            <TypeIcon className={`w-3 h-3 ${typeMeta.color}`} />
            <span className={typeMeta.color}>{typeMeta.label}</span>
          </span>
        </div>
        <span className={`shrink-0 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusMeta.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />{statusMeta.label}
        </span>
      </div>

      <div className="mb-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Net Payout</p>
        <p className="font-display text-2xl font-bold text-white">{fmtGhs(earning.net_amount)}</p>
      </div>

      <div className="rounded-xl bg-slate-800/40 border border-slate-700/50 divide-y divide-slate-700/40 mb-4 text-xs">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-slate-500">Gross</span>
          <span className="text-slate-300">{fmtGhs(earning.gross_amount)}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-slate-500">Platform fee</span>
          <span className="text-slate-400">− {fmtGhs(earning.platform_fee)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-600">{fmtDate(earning.created_at)}</p>
        {earning.status === "pending_claim" && (
          <button onClick={onClaim}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold hover:bg-orange-500/25 hover:border-orange-500/50 transition-all">
            <Banknote className="w-3.5 h-3.5" /> Claim
          </button>
        )}
        {earning.status === "paid" && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Paid {fmtDate(earning.payout_completed_at)}
          </span>
        )}
        {(earning.status === "claimed" || earning.status === "processing") && (
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock3 className="w-3.5 h-3.5" /> Pending admin review
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "payouts" | "earnings";

export default function OrganizerFinancePage() {
  const [tab, setTab] = useState<Tab>("payouts");
  const [statsOpen, setStatsOpen] = useState(false);

  // ── Payouts state ────────────────────────────────────────────────────────────
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [wallet, setWallet]     = useState<WalletBalance | null>(null);
  const [payLoading, setPayLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [page, setPage]         = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount]     = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [momoError, setMomoError]   = useState<string | null>(null);
  const [network, setNetwork]   = useState<typeof MOMO_NETWORKS[number]>("MTN");
  const [accountName, setAccountName] = useState("");
  const [notes, setNotes]       = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Earnings state ───────────────────────────────────────────────────────────
  const [earnings, setEarnings]     = useState<Earning[]>([]);
  const [earnLoading, setEarnLoading] = useState(true);
  const [claimingEarn, setClaimingEarn] = useState<Earning | null>(null);

  // ── Loaders ──────────────────────────────────────────────────────────────────
  const loadPayouts = useCallback(async () => {
    setPayLoading(true);
    try {
      const [reqs, bal] = await Promise.all([
        organizerService.getMyPayoutRequests(),
        organizerService.getWalletBalance().catch(() => null),
      ]);
      setRequests(reqs);
      setWallet(bal);
    } catch {
      setRequests([]);
      showError("Failed to load payout data.");
    } finally {
      setPayLoading(false);
    }
  }, []);

  const loadEarnings = useCallback(async () => {
    setEarnLoading(true);
    try {
      const res = await apiGet(TOURNAMENT_ENDPOINTS.ORGANIZER_EARNINGS);
      if (res.success) {
        const d = res.data as Record<string, unknown>;
        setEarnings((Array.isArray(res.data) ? res.data : (d.earnings ?? d.data ?? [])) as Earning[]);
      }
    } catch { showError("Failed to load earnings."); }
    finally { setEarnLoading(false); }
  }, []);

  useEffect(() => { void loadPayouts(); void loadEarnings(); }, [loadPayouts, loadEarnings]);

  // ── Payout submit ────────────────────────────────────────────────────────────
  const submitPayout = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 1) { showError("Enter a valid amount (min GHS 1)."); return; }
    const momoErr = validateMomo(momoNumber);
    if (momoErr) { setMomoError(momoErr); return; }
    if (!accountName.trim()) { showError("Enter account holder name."); return; }
    setMomoError(null);
    setSubmitting(true);
    try {
      await organizerService.requestPayout({
        amountGhs: amt,
        requestType: "wallet_withdrawal",
        momoNumber: momoNumber.trim(),
        network,
        accountName: accountName.trim(),
        notes: notes.trim() || undefined,
      });
      showSuccess("Payout request submitted. Processing typically takes 1–3 business days.");
      setShowForm(false);
      setAmount(""); setMomoNumber(""); setAccountName(""); setNotes(""); setMomoError(null);
      void loadPayouts();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelPayout = async (id: string) => {
    setCancelling(id);
    try {
      await organizerService.cancelPayoutRequest(id);
      showSuccess("Request cancelled.");
      void loadPayouts();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to cancel.");
    } finally {
      setCancelling(null);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const totalPaid    = requests.filter(r => r.status === "completed").reduce((s, r) => s + r.amountGhs, 0);
  const totalPending = requests.filter(r => r.status === "pending" || r.status === "approved").reduce((s, r) => s + r.amountGhs, 0);
  const totalPages   = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const pageRequests = requests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const earnUnclaimed = earnings.filter(e => e.status === "pending_claim").length;
  const earnPending   = earnings.filter(e => e.status === "claimed" || e.status === "processing").length;
  const earnPaidTotal = earnings.filter(e => e.status === "paid").reduce((s, e) => s + e.net_amount, 0);

  // ── Stats per tab ────────────────────────────────────────────────────────────
  const payoutStats = [
    { icon: DollarSign,   iconColor: "text-orange-400",  bg: "from-orange-500/15 to-amber-500/15",  label: "Available",  value: payLoading ? "—" : (wallet ? `GHS ${(wallet.availableBalance / 100).toFixed(2)}` : "—") },
    { icon: Send,         iconColor: "text-cyan-400",    bg: "from-cyan-500/15 to-indigo-500/15",   label: "Requests",   value: payLoading ? "—" : String(requests.length) },
    { icon: CheckCircle2, iconColor: "text-emerald-400", bg: "from-emerald-500/15 to-teal-500/15", label: "Total Paid", value: payLoading ? "—" : (totalPaid > 0 ? `GHS ${totalPaid.toFixed(2)}` : "—") },
    { icon: Clock3,       iconColor: "text-amber-400",   bg: "from-amber-500/15 to-orange-500/15", label: "Pending",    value: payLoading ? "—" : (totalPending > 0 ? `GHS ${totalPending.toFixed(2)}` : "—") },
  ];

  const earningStats = [
    { icon: TrendingUp,   iconColor: "text-orange-400", bg: "from-orange-500/15 to-amber-500/15",  label: "Total",     value: earnLoading ? "—" : String(earnings.length) },
    { icon: Banknote,     iconColor: "text-amber-400",  bg: "from-amber-500/15 to-yellow-500/15",  label: "Unclaimed", value: earnLoading ? "—" : String(earnUnclaimed)    },
    { icon: Clock3,       iconColor: "text-indigo-400", bg: "from-indigo-500/15 to-violet-500/15", label: "Pending",   value: earnLoading ? "—" : String(earnPending)      },
    { icon: CheckCircle2, iconColor: "text-emerald-400",bg: "from-emerald-500/15 to-teal-500/15",  label: "Paid Out",  value: earnLoading ? "—" : fmtGhs(earnPaidTotal)    },
  ];

  const statItems = tab === "payouts" ? payoutStats : earningStats;

  return (
    <div className="min-h-screen">

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-800/60 bg-slate-950">
        <div className="max-w-7xl mx-auto px-8 sm:px-14 lg:px-20 py-6 sm:py-8 space-y-4">

          {/* Title row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4 text-orange-400" />
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-white">Finance</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Mobile stats toggle */}
              <button onClick={() => setStatsOpen(v => !v)}
                className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300 hover:text-white hover:border-slate-600 transition-colors">
                Stats
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${statsOpen ? "rotate-180" : ""}`} />
              </button>
              {tab === "payouts" && (
                <button onClick={() => setShowForm(v => !v)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 transition-all shrink-0">
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Request</span>
                  <span className="sm:hidden">New</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-slate-500 -mt-2">
            {tab === "payouts" ? "Request and track your withdrawals." : "Your organizer earnings from entry fees and prize pool refunds."}
          </p>

          {/* Stats — mobile dropdown */}
          {statsOpen && (
            <div className="sm:hidden grid grid-cols-2 gap-2">
              {statItems.map((s) => (
                <div key={s.label} className="flex items-center gap-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl px-3 py-3">
                  <div className={`w-7 h-7 rounded-lg bg-linear-to-br ${s.bg} flex items-center justify-center shrink-0`}>
                    <s.icon className={`w-3.5 h-3.5 ${s.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-bold tabular-nums text-white leading-none truncate">{s.value}</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest truncate">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats — desktop */}
          <div className="hidden sm:grid grid-cols-4 gap-3">
            {statItems.map((s) => (
              <div key={s.label} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3">
                <div className={`w-8 h-8 rounded-lg bg-linear-to-br ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-base font-bold tabular-nums text-white leading-none truncate">{s.value}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest truncate">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-800/60 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-8 sm:px-14 lg:px-20 flex gap-1">
          {(["payouts", "earnings"] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setStatsOpen(false); setShowForm(false); }}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === t
                  ? "border-orange-400 text-orange-300"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {t === "payouts" ? <Send className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              {t === "payouts" ? "Payouts" : "Earnings"}
              {t === "earnings" && earnUnclaimed > 0 && (
                <span className="min-w-4 h-4 rounded-full bg-orange-500 text-slate-950 text-[9px] font-bold flex items-center justify-center px-1">
                  {earnUnclaimed}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-8 sm:px-14 lg:px-20 py-4 sm:py-6 space-y-6">

        {/* ── PAYOUTS TAB ─────────────────────────────────────────────────── */}
        {tab === "payouts" && (
          <>
            {/* New request form */}
            {showForm && (
              <div className="rounded-2xl border border-orange-500/20 bg-slate-900 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <ArrowDownToLine className="w-4 h-4 text-orange-400" />
                    <h2 className="font-display text-xl font-bold text-white">New Payout Request</h2>
                  </div>
                  <button onClick={() => setShowForm(false)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-2">
                        Amount (GHS) <span className="text-orange-400 normal-case font-normal tracking-normal">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">₵</span>
                        <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
                          placeholder="0.00" className={`${inputCls} pl-8`} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-2">Network <span className="text-orange-400">*</span></label>
                      <select value={network} onChange={e => setNetwork(e.target.value as typeof MOMO_NETWORKS[number])} className={selectCls}>
                        {MOMO_NETWORKS.map(n => <option key={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-2">MoMo Number <span className="text-orange-400">*</span></label>
                      <input value={momoNumber}
                        onChange={e => { setMomoNumber(e.target.value); if (momoError) setMomoError(null); }}
                        onBlur={() => setMomoError(validateMomo(momoNumber))}
                        placeholder="e.g. 0241234567"
                        className={`${inputCls} ${momoError ? "border-red-500/60" : ""}`}
                      />
                      {momoError && (
                        <p className="flex items-center gap-1.5 mt-1.5 text-xs text-red-400">
                          <AlertCircle className="w-3 h-3 shrink-0" />{momoError}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-2">Account Name <span className="text-orange-400">*</span></label>
                      <input value={accountName} onChange={e => setAccountName(e.target.value)}
                        placeholder="Full name on MoMo" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-2">
                      Notes <span className="text-slate-600 font-normal normal-case tracking-normal">optional</span>
                    </label>
                    <input value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="Any notes for this request" className={inputCls} />
                  </div>
                  <button onClick={() => void submitPayout()} disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-60 transition-all mt-2">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : <><Send className="w-4 h-4" />Submit Request</>}
                  </button>
                </div>
              </div>
            )}

            {/* History */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-white">Request History</h2>
                {requests.length > 0 && (
                  <span className="text-xs text-slate-500">{requests.length} request{requests.length !== 1 ? "s" : ""}</span>
                )}
              </div>

              {payLoading ? (
                <div className="flex justify-center py-14">
                  <div className="flex flex-col items-center gap-3 text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-xs">Loading…</span>
                  </div>
                </div>
              ) : requests.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center gap-3">
                  <div className="w-14 h-14 rounded-full border border-dashed border-slate-700 flex items-center justify-center">
                    <Banknote className="w-7 h-7 text-slate-600" />
                  </div>
                  <p className="font-display text-base font-semibold text-slate-500">No payout requests yet</p>
                  <p className="text-xs text-slate-600 max-w-xs">Submit a request to withdraw your earnings to your mobile money account.</p>
                  <button onClick={() => setShowForm(true)}
                    className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold">
                    <Send className="w-4 h-4" /> New Request
                  </button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-slate-800/60">
                    {pageRequests.map(req => {
                      const meta = PAYOUT_STATUS_META[req.status] ?? PAYOUT_STATUS_META.cancelled;
                      const netColor = NETWORK_COLORS[req.network] ?? "bg-slate-700/40 text-slate-400 border-slate-700";
                      return (
                        <div key={req.id} className="px-6 py-5 flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center shrink-0 mt-0.5">
                            <ArrowDownToLine className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-display text-lg font-bold text-white">GHS {req.amountGhs.toFixed(2)}</span>
                              <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${meta.bg} ${meta.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${netColor}`}>{req.network}</span>
                              <span className="text-xs text-slate-500">{req.momoNumber}</span>
                              <span className="text-slate-700">·</span>
                              <span className="text-xs text-slate-500">{req.accountName}</span>
                            </div>
                            {req.notes && <p className="text-xs text-slate-500 italic">"{req.notes}"</p>}
                            {req.rejectionReason && (
                              <div className="flex items-center gap-1.5 text-xs text-red-400">
                                <AlertCircle className="w-3 h-3 shrink-0" />{req.rejectionReason}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0 space-y-1.5">
                            <p className="text-xs text-slate-500">{fmtDate(req.createdAt)}</p>
                            {req.status === "completed" && (
                              <p className="text-[10px] text-emerald-400 flex items-center gap-1 justify-end">
                                <CheckCircle2 className="w-3 h-3" /> Paid
                              </p>
                            )}
                            {(req.status === "pending" || req.status === "approved") && (
                              <>
                                <p className="text-[10px] text-amber-400 flex items-center gap-1 justify-end">
                                  <Clock3 className="w-3 h-3" /> Processing
                                </p>
                                <button onClick={() => void cancelPayout(req.id)} disabled={cancelling === req.id}
                                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-red-400 transition-colors ml-auto disabled:opacity-50">
                                  {cancelling === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Page {page} of {totalPages} · {requests.length} requests</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                          className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                          className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* ── EARNINGS TAB ────────────────────────────────────────────────── */}
        {tab === "earnings" && (
          earnLoading ? (
            <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : earnings.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 py-24 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-5">
                <TrendingUp className="w-7 h-7 text-slate-600" />
              </div>
              <p className="font-display text-lg font-semibold text-slate-300">No earnings yet</p>
              <p className="text-sm text-slate-500 mt-2">Earnings from completed tournaments will appear here to claim.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {earnings.map((e) => (
                <EarningCard key={e._id} earning={e} onClaim={() => setClaimingEarn(e)} />
              ))}
            </div>
          )
        )}
      </div>

      {claimingEarn && (
        <EarningClaimModal
          earning={claimingEarn}
          onClose={() => setClaimingEarn(null)}
          onClaimed={() => { setClaimingEarn(null); void loadEarnings(); }}
        />
      )}
    </div>
  );
}
