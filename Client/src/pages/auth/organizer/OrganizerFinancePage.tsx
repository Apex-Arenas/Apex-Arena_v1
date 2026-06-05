import { useCallback, useEffect, useState } from "react";
import {
  DollarSign, TrendingUp, RotateCcw, Banknote, Send,
  CheckCircle2, Clock, AlertCircle, X, Loader2, Phone,
  ChevronDown, RefreshCw, ArrowDownToLine, XCircle, Clock3,
} from "lucide-react";
import { organizerService, type PayoutRequest, type WalletBalance } from "../../../services/organizer.service";
import { apiGet, apiPost } from "../../../utils/api.utils";
import { TOURNAMENT_ENDPOINTS } from "../../../config/api.config";
import { showSuccess, showError } from "../../../utils/toast.utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtGhs(pesewas: number) {
  return `GHS ${(pesewas / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

function validateMomo(n: string) {
  const c = n.trim().replace(/\s/g, "");
  if (!c) return "Enter your MoMo number.";
  if (!/^0[0-9]{9}$/.test(c)) return "Must be 10 digits starting with 0.";
  return null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;
const MOMO_NETWORKS = ["MTN", "Vodafone", "AirtelTigo"] as const;

const NETWORK_STYLE: Record<string, string> = {
  MTN:        "bg-yellow-400/10 text-yellow-300 border-yellow-400/20",
  Vodafone:   "bg-red-400/10 text-red-300 border-red-400/20",
  AirtelTigo: "bg-blue-400/10 text-blue-300 border-blue-400/20",
};

const PAYOUT_STATUS: Record<string, { label: string; dot: string; cls: string }> = {
  pending:      { label: "Pending",      dot: "bg-amber-400",              cls: "bg-amber-400/10 text-amber-300 border-amber-400/20"    },
  under_review: { label: "Under Review", dot: "bg-blue-400",               cls: "bg-blue-400/10 text-blue-300 border-blue-400/20"       },
  approved:     { label: "Approved",     dot: "bg-cyan-400",               cls: "bg-cyan-400/10 text-cyan-300 border-cyan-400/20"       },
  processing:   { label: "Processing",   dot: "bg-indigo-400 animate-pulse", cls: "bg-indigo-400/10 text-indigo-300 border-indigo-400/20" },
  completed:    { label: "Paid",         dot: "bg-emerald-400",            cls: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20" },
  rejected:     { label: "Rejected",     dot: "bg-red-400",                cls: "bg-red-400/10 text-red-300 border-red-400/20"         },
  cancelled:    { label: "Cancelled",    dot: "bg-slate-500",              cls: "bg-slate-700/20 text-slate-400 border-slate-700"      },
};

const EARNING_STATUS: Record<string, { label: string; dot: string; cls: string }> = {
  pending_claim: { label: "Unclaimed",  dot: "bg-amber-400",   cls: "bg-amber-500/15 text-amber-300 border-amber-500/25"      },
  claimed:       { label: "Pending",    dot: "bg-blue-400",    cls: "bg-blue-500/15 text-blue-300 border-blue-500/25"         },
  processing:    { label: "Processing", dot: "bg-indigo-400 animate-pulse", cls: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25" },
  paid:          { label: "Paid",       dot: "bg-emerald-400", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" },
  failed:        { label: "Failed",     dot: "bg-red-400",     cls: "bg-red-500/15 text-red-300 border-red-500/25"            },
};

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button onClick={() => onPage(page - 1)} disabled={page === 1}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-white disabled:opacity-40 transition-colors">
        ← Prev
      </button>
      <div className="flex items-center gap-1">
        {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => onPage(p)}
            className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
              p === page ? "bg-orange-500/20 border border-orange-500/40 text-orange-300" : "text-slate-500 hover:text-white hover:bg-slate-800/60"
            }`}>{p}</button>
        ))}
      </div>
      <button onClick={() => onPage(page + 1)} disabled={page === pages}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-white disabled:opacity-40 transition-colors">
        Next →
      </button>
    </div>
  );
}

// ─── New Withdrawal Modal ──────────────────────────────────────────────────────

function WithdrawalModal({ availableGhs, onClose, onSuccess }: {
  availableGhs: number; onClose: () => void; onSuccess: () => void;
}) {
  const [amount, setAmount]         = useState("");
  const [network, setNetwork]       = useState<typeof MOMO_NETWORKS[number]>("MTN");
  const [momoNumber, setMomoNumber] = useState("");
  const [momoError, setMomoError]   = useState<string | null>(null);
  const [accountName, setAccountName] = useState("");
  const [notes, setNotes]           = useState("");
  const [submitting, setSubmitting] = useState(false);

  const amtNum = parseFloat(amount) || 0;
  const valid  = amtNum > 0 && amtNum <= availableGhs && !momoError && momoNumber.length === 10 && accountName.trim().length > 0;

  const submit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      await organizerService.requestPayout({
        amountGhs: amtNum, requestType: "wallet_withdrawal",
        momoNumber: momoNumber.trim(), network,
        accountName: accountName.trim(),
        notes: notes.trim() || undefined,
      });
      showSuccess("Withdrawal request submitted.");
      onSuccess();
    } catch (e) { showError(e instanceof Error ? e.message : "Request failed."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80 bg-slate-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
              <Send className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-white">New Withdrawal</h3>
              <p className="text-[11px] text-slate-500">Available: GHS {availableGhs.toFixed(2)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Amount */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Amount (GHS)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">GHS</span>
              <input type="number" min="1" max={availableGhs} step="0.01" value={amount}
                onChange={e => setAmount(e.target.value)} placeholder="0.00"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-11 pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>
            <div className="flex gap-1.5 mt-1">
              {[0.25, 0.5, 0.75, 1].map(pct => (
                <button key={pct} type="button" onClick={() => setAmount((availableGhs * pct).toFixed(2))}
                  className="flex-1 py-1 rounded-lg text-[10px] font-bold text-slate-400 bg-slate-800/60 border border-slate-700/60 hover:border-orange-500/40 hover:text-orange-300 transition-colors">
                  {pct === 1 ? "Max" : `${pct * 100}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Network */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Network</label>
            <div className="grid grid-cols-3 gap-2">
              {MOMO_NETWORKS.map(n => (
                <button key={n} type="button" onClick={() => setNetwork(n)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                    network === n ? "bg-orange-500/15 border-orange-500/40 text-orange-300" : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}>{n}</button>
              ))}
            </div>
          </div>

          {/* MoMo Number */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">MoMo Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input type="tel" maxLength={10} value={momoNumber}
                onChange={e => { setMomoNumber(e.target.value.replace(/\D/g, "")); setMomoError(null); }}
                onBlur={() => setMomoError(validateMomo(momoNumber))}
                placeholder="0XX XXX XXXX"
                className={`w-full bg-slate-800/60 border rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-colors ${momoError ? "border-red-500/50" : "border-slate-700 focus:border-orange-500/60"}`}
              />
            </div>
            {momoError && <p className="text-[11px] text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{momoError}</p>}
          </div>

          {/* Account Name */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Account Name</label>
            <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)}
              placeholder="Full name on MoMo account"
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/60 transition-colors"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Notes <span className="text-slate-600 normal-case font-normal">(optional)</span>
            </label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any notes for admin..."
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/60 transition-colors"
            />
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 transition-colors">Cancel</button>
          <button onClick={() => void submit()} disabled={!valid || submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 transition-all">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Claim Earnings Modal ─────────────────────────────────────────────────────

function ClaimModal({ earning, onClose, onClaimed }: { earning: Earning; onClose: () => void; onClaimed: () => void }) {
  const [network, setNetwork]       = useState<typeof MOMO_NETWORKS[number]>("MTN");
  const [momoNumber, setMomoNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [notes, setNotes]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  const netPayout = earning.gross_amount - earning.platform_fee;
  const momoValid = /^0[0-9]{9}$/.test(momoNumber.trim());
  const valid     = momoValid && accountName.trim().length > 0;

  const handleClaim = async () => {
    if (!valid || submitting) return;
    setSubmitting(true); setError("");
    try {
      const res = await apiPost(`${TOURNAMENT_ENDPOINTS.ORGANIZER_EARNINGS_CLAIM}/${earning._id}/claim`, {
        momo_number: momoNumber.trim(), network, account_name: accountName.trim(),
        notes: notes.trim() || undefined,
      });
      if (!res.success) throw new Error((res as { error?: { message?: string } }).error?.message ?? "Claim failed.");
      showSuccess("Earnings claim submitted — processed within 1–2 business days.");
      onClaimed();
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80 bg-slate-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
              <Banknote className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-white">Claim Earnings</h3>
              <p className="text-[11px] text-slate-500">{fmtGhs(netPayout)} to your MoMo account</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Breakdown */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 divide-y divide-slate-700/40 text-sm">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-slate-400">Total entry fees</span>
              <span className="text-white font-semibold">{fmtGhs(earning.gross_amount)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-slate-400">Platform fee (10%)</span>
              <span className="text-red-400">− {fmtGhs(earning.platform_fee)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/40">
              <span className="text-white font-semibold">You receive</span>
              <span className="text-emerald-400 font-bold">{fmtGhs(netPayout)}</span>
            </div>
          </div>

          {/* Network */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Network</label>
            <div className="grid grid-cols-3 gap-2">
              {MOMO_NETWORKS.map(n => (
                <button key={n} type="button" onClick={() => setNetwork(n)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                    network === n ? "bg-orange-500/15 border-orange-500/40 text-orange-300" : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}>{n}</button>
              ))}
            </div>
          </div>

          {/* MoMo */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">MoMo Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input type="tel" maxLength={10} value={momoNumber}
                onChange={e => setMomoNumber(e.target.value.replace(/\D/g, ""))} placeholder="0XX XXX XXXX"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Account Name</label>
            <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)}
              placeholder="Name on MoMo account"
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/60 transition-colors"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Notes <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes..."
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/60 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </div>
          )}

          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-orange-400" />
            Payment processed within 1–2 business days after admin review.
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 transition-colors">Cancel</button>
          <button onClick={() => void handleClaim()} disabled={!valid || submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 transition-all">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
            {submitting ? "Claiming…" : `Claim ${fmtGhs(netPayout)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "payouts" | "earnings";

export default function OrganizerFinancePage() {
  const [tab, setTab]             = useState<Tab>("payouts");
  const [statsOpen, setStatsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Payouts
  const [requests, setRequests]   = useState<PayoutRequest[]>([]);
  const [wallet, setWallet]       = useState<WalletBalance | null>(null);
  const [payLoading, setPayLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [payPage, setPayPage]     = useState(1);

  // Earnings
  const [earnings, setEarnings]   = useState<Earning[]>([]);
  const [earnLoading, setEarnLoading] = useState(true);
  const [claimTarget, setClaimTarget] = useState<Earning | null>(null);
  const [earnPage, setEarnPage]   = useState(1);

  const loadPayouts = useCallback(async () => {
    setPayLoading(true);
    try {
      const [reqs, bal] = await Promise.all([
        organizerService.getMyPayoutRequests(),
        organizerService.getWalletBalance().catch(() => null),
      ]);
      setRequests(reqs);
      setWallet(bal);
    } catch { setRequests([]); }
    finally { setPayLoading(false); }
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

  const refresh = () => { void loadPayouts(); void loadEarnings(); };
  useEffect(() => { void loadPayouts(); void loadEarnings(); }, [loadPayouts, loadEarnings]);

  const cancelPayout = async (id: string) => {
    setCancelling(id);
    try {
      await organizerService.cancelPayoutRequest(id);
      showSuccess("Request cancelled — balance refunded.");
      void loadPayouts();
    } catch (e) { showError(e instanceof Error ? e.message : "Could not cancel."); }
    finally { setCancelling(null); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const TERMINAL = new Set(["completed", "rejected", "cancelled"]);
  const availableGhs  = (wallet?.availableBalance ?? 0) / 100;
  const totalPaid     = requests.filter(r => r.status === "completed").reduce((s, r) => s + r.amountGhs, 0);
  const totalPending  = requests.filter(r => !TERMINAL.has(r.status)).reduce((s, r) => s + r.amountGhs, 0);
  const earnUnclaimed = earnings.filter(e => e.status === "pending_claim").length;
  const earnPaidTotal = earnings.filter(e => e.status === "paid").reduce((s, e) => s + (e.gross_amount - e.platform_fee), 0);
  const earnPending   = earnings.filter(e => e.status === "claimed" || e.status === "processing").length;

  const paySlice  = requests.slice((payPage - 1)  * PAGE_SIZE, payPage  * PAGE_SIZE);
  const earnSlice = earnings.slice((earnPage - 1) * PAGE_SIZE, earnPage * PAGE_SIZE);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const payStats = [
    { icon: DollarSign,   color: "text-orange-400",  bg: "from-orange-500/25 to-amber-500/20",   label: "Available",   value: payLoading  ? "—" : `GHS ${availableGhs.toFixed(2)}` },
    { icon: ArrowDownToLine, color: "text-cyan-400", bg: "from-cyan-500/25 to-indigo-500/20",    label: "Requests",    value: payLoading  ? "—" : String(requests.length)           },
    { icon: CheckCircle2, color: "text-emerald-400", bg: "from-emerald-500/25 to-teal-500/20",   label: "Total Paid",  value: payLoading  ? "—" : `GHS ${totalPaid.toFixed(2)}`     },
    { icon: Clock3,       color: "text-amber-400",   bg: "from-amber-500/25 to-orange-500/20",   label: "Pending",     value: payLoading  ? "—" : `GHS ${totalPending.toFixed(2)}`  },
  ];

  const earnStats = [
    { icon: TrendingUp,   color: "text-orange-400",  bg: "from-orange-500/25 to-amber-500/20",   label: "Total",       value: earnLoading ? "—" : String(earnings.length)           },
    { icon: Banknote,     color: "text-amber-400",   bg: "from-amber-500/25 to-yellow-500/20",   label: "Unclaimed",   value: earnLoading ? "—" : String(earnUnclaimed)              },
    { icon: Clock3,       color: "text-indigo-400",  bg: "from-indigo-500/25 to-violet-500/20",  label: "Pending",     value: earnLoading ? "—" : String(earnPending)                },
    { icon: CheckCircle2, color: "text-emerald-400", bg: "from-emerald-500/25 to-teal-500/20",   label: "Paid Out",    value: earnLoading ? "—" : fmtGhs(earnPaidTotal)        },
  ];

  const statItems = tab === "payouts" ? payStats : earnStats;

  return (
    <div className="min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative bg-slate-900 border-b border-slate-800/60 overflow-hidden">
        <div className="absolute -top-40 right-0 w-150 h-100 rounded-full bg-orange-500/6 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-125 h-50 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-size-[60px_60px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-7">
          {/* Title row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-none">Finance</h1>
              <p className="text-sm sm:text-base text-slate-400 mt-2 sm:mt-3">
                {tab === "payouts" ? "Request and track your wallet withdrawals." : "Your organizer earnings from entry fees and prize pool refunds."}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {tab === "payouts" && (
                <button onClick={() => setShowModal(true)} disabled={availableGhs <= 0 && !payLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-40 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">New Request</span>
                </button>
              )}
              <button onClick={refresh} disabled={payLoading && earnLoading}
                className="p-2 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-50 transition-colors">
                <RefreshCw className={`w-4 h-4 ${payLoading || earnLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Stats — mobile toggle */}
          <div className="sm:hidden mt-4">
            <button onClick={() => setStatsOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs font-semibold text-slate-400 uppercase tracking-widest">
              <span>Stats</span>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${statsOpen ? "rotate-180" : ""}`} />
            </button>
            {statsOpen && (
              <div className="mt-1 grid grid-cols-2 gap-2">
                {statItems.map(s => (
                  <div key={s.label} className="flex items-center gap-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl px-3 py-3">
                    <div className={`w-8 h-8 rounded-lg bg-linear-to-br ${s.bg} flex items-center justify-center shrink-0`}>
                      <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">{s.label}</p>
                      <p className={`font-display text-base font-bold tabular-nums leading-tight ${s.color}`}>{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats — desktop */}
          <div className="hidden sm:grid sm:grid-cols-4 gap-3 mt-6">
            {statItems.map(s => (
              <div key={s.label} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3 hover:border-slate-600/60 transition-colors">
                <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{s.label}</p>
                  <p className={`font-display text-xl font-bold tabular-nums leading-tight ${s.color}`}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-800/60 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex gap-1">
          {([
            { id: "payouts" as Tab,  label: "Payouts",  icon: Send },
            { id: "earnings" as Tab, label: "Earnings", icon: TrendingUp },
          ]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setTab(id); setStatsOpen(false); }}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === id ? "border-orange-400 text-orange-300" : "border-transparent text-slate-500 hover:text-slate-300"
              }`}>
              <Icon className="w-4 h-4" />
              {label}
              {id === "earnings" && earnUnclaimed > 0 && (
                <span className="min-w-4 h-4 rounded-full bg-orange-500 text-slate-950 text-[9px] font-bold flex items-center justify-center px-1">
                  {earnUnclaimed}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">

        {/* PAYOUTS TAB */}
        {tab === "payouts" && (
          payLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 shrink-0" />
                  <div className="flex-1 space-y-2"><div className="h-4 w-28 bg-slate-800 rounded" /><div className="h-3 w-40 bg-slate-800 rounded" /></div>
                  <div className="h-6 w-20 bg-slate-800 rounded-full" />
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center">
                <Banknote className="w-7 h-7 text-slate-600" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-slate-300">No withdrawal requests yet</p>
                <p className="text-sm text-slate-500 mt-1">Submit a request to withdraw funds from your wallet to Mobile Money.</p>
              </div>
              {availableGhs > 0 && (
                <button onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 transition-all">
                  <Send className="w-4 h-4" />New Request
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500">{requests.length} request{requests.length !== 1 ? "s" : ""}</p>
                <p className="text-xs text-slate-600">Page {payPage} of {Math.max(1, Math.ceil(requests.length / PAGE_SIZE))}</p>
              </div>
              {paySlice.map(req => {
                const s = PAYOUT_STATUS[req.status] ?? PAYOUT_STATUS.cancelled;
                const netStyle = NETWORK_STYLE[req.network] ?? "bg-slate-700/30 text-slate-400 border-slate-700";
                const canCancel = req.status === "pending" || req.status === "under_review";
                return (
                  <div key={req.id} className={`rounded-2xl border bg-slate-900/60 overflow-hidden transition-colors hover:bg-slate-900 ${
                    TERMINAL.has(req.status) ? "border-slate-800/60" : "border-slate-700/60"
                  }`}>
                    <div className="flex items-center gap-4 px-5 py-4">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        req.status === "completed" ? "bg-emerald-500/15 border border-emerald-500/25" :
                        req.status === "rejected" || req.status === "cancelled" ? "bg-slate-800 border border-slate-700" :
                        "bg-orange-500/15 border border-orange-500/20"
                      }`}>
                        {req.status === "completed" ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" /> :
                         req.status === "rejected" ? <XCircle className="w-4.5 h-4.5 text-red-400" /> :
                         req.status === "cancelled" ? <XCircle className="w-4.5 h-4.5 text-slate-500" /> :
                         <ArrowDownToLine className="w-4.5 h-4.5 text-orange-400" />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-display text-base font-bold text-white">GHS {req.amountGhs.toFixed(2)}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${s.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${netStyle}`}>{req.network}</span>
                          <span className="truncate">{req.momoNumber}</span>
                          {req.accountName && <><span className="text-slate-700">·</span><span className="truncate">{req.accountName}</span></>}
                        </div>
                        {req.rejectionReason && (
                          <p className="text-xs text-red-400/80 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />{req.rejectionReason}
                          </p>
                        )}
                      </div>

                      {/* Right */}
                      <div className="text-right shrink-0 space-y-1.5">
                        <p className="text-xs text-slate-500">{fmtDate(req.createdAt)}</p>
                        {canCancel && (
                          <button onClick={() => void cancelPayout(req.id)} disabled={cancelling === req.id}
                            className="flex items-center gap-1 text-[10px] font-semibold text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 px-2 py-1 rounded-lg ml-auto disabled:opacity-50 transition-colors">
                            {cancelling === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <Pagination page={payPage} total={requests.length} onPage={p => { setPayPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
            </div>
          )
        )}

        {/* EARNINGS TAB */}
        {tab === "earnings" && (
          earnLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse space-y-3">
                  <div className="flex items-center justify-between"><div className="h-4 w-32 bg-slate-800 rounded" /><div className="h-5 w-20 bg-slate-800 rounded-full" /></div>
                  <div className="h-6 w-24 bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          ) : earnings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-slate-600" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-slate-300">No earnings yet</p>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">Earnings appear here when a <span className="text-slate-300 font-medium">paid tournament</span> you hosted completes — you receive 90% of all entry fees. Free tournaments generate no earnings.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500">{earnings.length} earning{earnings.length !== 1 ? "s" : ""}</p>
                <p className="text-xs text-slate-600">Page {earnPage} of {Math.max(1, Math.ceil(earnings.length / PAGE_SIZE))}</p>
              </div>
              {earnSlice.map(e => {
                const netPayout = e.gross_amount - e.platform_fee;
                const st  = EARNING_STATUS[e.status] ?? EARNING_STATUS.pending_claim;
                const title = e.tournament_id?.title ?? "Tournament";
                const isEntry = e.earning_type === "entry_fee_share";
                const canClaim = e.status === "pending_claim";
                return (
                  <div key={e._id} className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden hover:border-slate-700 transition-colors">
                    <div className="px-5 py-4 flex items-center gap-4">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isEntry ? "bg-orange-500/15 border-orange-500/25" : "bg-cyan-500/15 border-cyan-500/25"
                      }`}>
                        {isEntry ? <TrendingUp className="w-4.5 h-4.5 text-orange-400" /> : <RotateCcw className="w-4.5 h-4.5 text-cyan-400" />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-display text-base font-bold text-white">{fmtGhs(netPayout)}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${st.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            isEntry ? "bg-orange-500/10 text-orange-300 border-orange-500/20" : "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                          }`}>{isEntry ? "Entry Fee Share" : "Prize Pool Refund"}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{title}</p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-600 mt-0.5">
                          <span>Gross: {fmtGhs(e.gross_amount)}</span>
                          <span>·</span>
                          <span>Platform: {fmtGhs(e.platform_fee)}</span>
                          <span>·</span>
                          <span>{fmtDate(e.created_at)}</span>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="shrink-0">
                        {canClaim && (
                          <button onClick={() => setClaimTarget(e)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-linear-to-r from-orange-500/20 to-amber-400/20 border border-orange-500/30 text-orange-300 text-xs font-bold hover:from-orange-500/30 hover:to-amber-400/30 transition-all">
                            <Banknote className="w-3.5 h-3.5" />Claim
                          </button>
                        )}
                        {e.status === "paid" && (
                          <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />Paid {fmtDate(e.payout_completed_at)}
                          </p>
                        )}
                        {(e.status === "claimed" || e.status === "processing") && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />Pending review
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <Pagination page={earnPage} total={earnings.length} onPage={p => { setEarnPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
            </div>
          )
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <WithdrawalModal
          availableGhs={availableGhs}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); void loadPayouts(); }}
        />
      )}
      {claimTarget && (
        <ClaimModal
          earning={claimTarget}
          onClose={() => setClaimTarget(null)}
          onClaimed={() => { setClaimTarget(null); void loadEarnings(); }}
        />
      )}
    </div>
  );
}
