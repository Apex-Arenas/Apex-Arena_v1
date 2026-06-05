import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet, ArrowDownLeft, ArrowUpRight, RefreshCw, Loader2,
  X, AlertCircle, Phone, Banknote, Plus, Trophy, ExternalLink,
} from "lucide-react";
import {
  organizerService,
  type WalletBalance,
  type PayoutRequest,
} from "../../services/organizer.service";
import { apiGet } from "../../utils/api.utils";
import { FINANCE_ENDPOINTS } from "../../config/api.config";
import { showSuccess, showError } from "../../utils/toast.utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtGhs(pesewas: number) {
  return `GHS ${(pesewas / 100).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GH", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GH", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const MOMO_NETWORKS = ["MTN", "Vodafone", "AirtelTigo"] as const;
type MomoNetwork = typeof MOMO_NETWORKS[number];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Transaction {
  id: string;
  type: string;
  direction: "credit" | "debit";
  amount: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
}

// ─── Config maps ──────────────────────────────────────────────────────────────

const TX_META: Record<string, { label: string; iconBg: string; iconColor: string; amountCls: string; sign: string }> = {
  deposit:          { label: "Deposit",     iconBg: "bg-emerald-500/15", iconColor: "text-emerald-400", amountCls: "text-emerald-400", sign: "+" },
  prize_won:        { label: "Prize Won",   iconBg: "bg-amber-500/15",  iconColor: "text-amber-400",   amountCls: "text-amber-400",   sign: "+" },
  refund:           { label: "Refund",      iconBg: "bg-emerald-500/15", iconColor: "text-emerald-400", amountCls: "text-emerald-400", sign: "+" },
  wallet_topup:     { label: "Top Up",      iconBg: "bg-emerald-500/15", iconColor: "text-emerald-400", amountCls: "text-emerald-400", sign: "+" },
  entry_fee:        { label: "Entry Fee",   iconBg: "bg-red-500/15",    iconColor: "text-red-400",     amountCls: "text-red-400",     sign: "-" },
  payout_completed: { label: "Withdrawal",  iconBg: "bg-cyan-500/15",   iconColor: "text-cyan-400",    amountCls: "text-cyan-300",    sign: "-" },
  payout_approved:  { label: "Withdrawal",  iconBg: "bg-indigo-500/15", iconColor: "text-indigo-400",  amountCls: "text-indigo-300",  sign: "-" },
  platform_fee:     { label: "Platform Fee",iconBg: "bg-slate-700/60",  iconColor: "text-slate-400",   amountCls: "text-slate-400",   sign: "-" },
};

const PAYOUT_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  pending:      { label: "Pending",      cls: "bg-amber-500/15 text-amber-300 border-amber-500/25",     dot: "bg-amber-400" },
  under_review: { label: "Under Review", cls: "bg-blue-500/15 text-blue-300 border-blue-500/25",        dot: "bg-blue-400" },
  approved:     { label: "Approved",     cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",        dot: "bg-cyan-400" },
  processing:   { label: "Processing",   cls: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",  dot: "bg-indigo-400 animate-pulse" },
  completed:    { label: "Completed",    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", dot: "bg-emerald-400" },
  rejected:     { label: "Rejected",     cls: "bg-red-500/15 text-red-300 border-red-500/25",           dot: "bg-red-400" },
  cancelled:    { label: "Cancelled",    cls: "bg-slate-600/20 text-slate-400 border-slate-600/25",     dot: "bg-slate-500" },
};

// ─── MoMo Form ────────────────────────────────────────────────────────────────

function MomoForm({
  network, momoNumber, accountName, notes,
  onNetworkChange, onMomoNumberChange, onAccountNameChange, onNotesChange,
}: {
  network: MomoNetwork; momoNumber: string; accountName: string; notes?: string;
  onNetworkChange: (v: MomoNetwork) => void;
  onMomoNumberChange: (v: string) => void;
  onAccountNameChange: (v: string) => void;
  onNotesChange?: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Network</label>
        <div className="grid grid-cols-3 gap-2">
          {MOMO_NETWORKS.map(n => (
            <button key={n} type="button" onClick={() => onNetworkChange(n)}
              className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                network === n ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300" : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600"
              }`}>{n}</button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">MoMo Number</label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input type="tel" maxLength={10} value={momoNumber}
            onChange={e => onMomoNumberChange(e.target.value.replace(/\D/g, ""))}
            placeholder="0XX XXX XXXX"
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Account Name</label>
        <input type="text" value={accountName} onChange={e => onAccountNameChange(e.target.value)}
          placeholder="Name on MoMo account"
          className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors"
        />
      </div>
      {onNotesChange && (
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Notes <span className="text-slate-600 normal-case">(optional)</span>
          </label>
          <input type="text" value={notes} onChange={e => onNotesChange(e.target.value)}
            placeholder="Any notes for the admin..."
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors"
          />
        </div>
      )}
    </div>
  );
}

// ─── Withdraw Modal ───────────────────────────────────────────────────────────

function WithdrawModal({
  availableBalance, onClose, onSuccess,
}: { availableBalance: number; onClose: () => void; onSuccess: () => void }) {
  const [amountGhs, setAmountGhs] = useState("");
  const [network, setNetwork] = useState<MomoNetwork>("MTN");
  const [momoNumber, setMomoNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const availableGhs = availableBalance / 100;
  const amountNum = parseFloat(amountGhs) || 0;
  const valid = amountNum > 0 && amountNum <= availableGhs && momoNumber.length === 10 && accountName.trim().length > 0;

  const handleSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      await organizerService.requestPayout({
        amountGhs: amountNum,
        requestType: "wallet_withdrawal",
        momoNumber,
        network,
        accountName: accountName.trim(),
        notes: notes.trim() || undefined,
      });
      showSuccess("Withdrawal submitted — balance updated.");
      onSuccess();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Withdrawal failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80 bg-slate-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
              <Banknote className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-white">Withdraw Funds</h3>
              <p className="text-[11px] text-slate-500">Available: {fmtGhs(availableBalance)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Amount (GHS)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">GHS</span>
              <input type="number" min="1" max={availableGhs} step="0.01" value={amountGhs}
                onChange={e => setAmountGhs(e.target.value)} placeholder="0.00"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-11 pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors"
              />
            </div>
            <div className="flex gap-2 mt-1.5">
              {[0.25, 0.5, 0.75, 1].map(pct => (
                <button key={pct} type="button"
                  onClick={() => setAmountGhs((availableGhs * pct).toFixed(2))}
                  className="flex-1 py-1 rounded-lg text-[10px] font-semibold text-slate-400 bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 hover:text-white transition-colors"
                >{pct === 1 ? "Max" : `${pct * 100}%`}</button>
              ))}
            </div>
          </div>
          <MomoForm network={network} momoNumber={momoNumber} accountName={accountName} notes={notes}
            onNetworkChange={setNetwork} onMomoNumberChange={setMomoNumber}
            onAccountNameChange={setAccountName} onNotesChange={setNotes}
          />
        </div>
        <div className="px-5 pb-5 flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 transition-colors">Cancel</button>
          <button onClick={() => void handleSubmit()} disabled={!valid || submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 disabled:opacity-50 transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
            {submitting ? "Submitting…" : "Withdraw"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Transactions Tab ─────────────────────────────────────────────────────────

function TransactionsTab({ refresh }: { refresh: number }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet(`${FINANCE_ENDPOINTS.TRANSACTIONS}?limit=50`);
      if (res.success) {
        const raw = res.data as Record<string, unknown>;
        const list = (Array.isArray(raw) ? raw : Array.isArray(raw.transactions) ? raw.transactions : []) as Record<string, unknown>[];
        setTransactions(list.map(t => ({
          id: String(t._id ?? t.id ?? ""),
          type: String(t.type ?? ""),
          direction: (t.direction ?? (["deposit", "prize_won", "refund", "wallet_topup"].includes(String(t.type)) ? "credit" : "debit")) as "credit" | "debit",
          amount: Number(t.amount ?? 0),
          currency: String(t.currency ?? "GHS"),
          status: String(t.status ?? ""),
          description: String((t.metadata as Record<string, unknown>)?.description ?? t.description ?? ""),
          createdAt: String(t.created_at ?? t.createdAt ?? ""),
        })));
      }
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, refresh]);

  if (loading) return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse">
          <div className="w-9 h-9 rounded-xl bg-slate-800 shrink-0" />
          <div className="flex-1 space-y-2"><div className="h-3 w-32 bg-slate-800 rounded" /><div className="h-2.5 w-20 bg-slate-800 rounded" /></div>
          <div className="h-4 w-16 bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  );

  if (transactions.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
        <Wallet className="w-6 h-6 text-slate-600" />
      </div>
      <p className="text-sm font-medium text-slate-400">No transactions yet</p>
      <p className="text-xs text-slate-600">Your transaction history will appear here</p>
    </div>
  );

  return (
    <div className="space-y-1.5">
      {transactions.map(tx => {
        const meta = TX_META[tx.type] ?? {
          label: tx.type.replace(/_/g, " "),
          iconBg: "bg-slate-700/60", iconColor: "text-slate-400",
          amountCls: tx.direction === "credit" ? "text-emerald-400" : "text-slate-300",
          sign: tx.direction === "credit" ? "+" : "-",
        };
        const statusCls =
          tx.status === "completed" ? "text-emerald-400" :
          tx.status === "failed" || tx.status === "cancelled" ? "text-red-400" :
          "text-amber-400";
        return (
          <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-slate-700/80 hover:bg-slate-900 transition-colors">
            <div className={`w-9 h-9 rounded-xl ${meta.iconBg} flex items-center justify-center shrink-0`}>
              {tx.direction === "credit"
                ? <ArrowDownLeft className={`w-4 h-4 ${meta.iconColor}`} />
                : <ArrowUpRight className={`w-4 h-4 ${meta.iconColor}`} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white capitalize">{meta.label}</p>
              <p className="text-[11px] text-slate-500 truncate">{tx.description || fmtDateTime(tx.createdAt)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-bold ${meta.amountCls}`}>{meta.sign}{fmtGhs(tx.amount)}</p>
              <p className={`text-[10px] capitalize ${statusCls}`}>{tx.status}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Withdrawals Tab ──────────────────────────────────────────────────────────

function WithdrawalsTab({
  availableBalance, onRequestNew, refresh, onBalanceChange,
}: {
  availableBalance: number;
  onRequestNew: () => void;
  refresh: number;
  onBalanceChange: () => void;
}) {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await organizerService.getMyPayoutRequests();
      setRequests(list);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, refresh]);

  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      await organizerService.cancelPayoutRequest(id);
      showSuccess("Withdrawal cancelled — balance refunded.");
      void load();
      onBalanceChange();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not cancel.");
    } finally {
      setCancelling(null);
    }
  };

  if (loading) return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse space-y-2">
          <div className="h-3 w-24 bg-slate-800 rounded" /><div className="h-4 w-20 bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  );

  const active = requests.filter(r => !["completed", "rejected", "cancelled"].includes(r.status));
  const history = requests.filter(r => ["completed", "rejected", "cancelled"].includes(r.status));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{requests.length} request{requests.length !== 1 ? "s" : ""}</p>
        <button onClick={onRequestNew} disabled={availableBalance <= 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />New Withdrawal
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
            <Banknote className="w-6 h-6 text-slate-600" />
          </div>
          <p className="text-sm font-medium text-slate-400">No withdrawals yet</p>
          <p className="text-xs text-slate-600">Submit a withdrawal request to send funds to Mobile Money</p>
        </div>
      ) : (
        <div className="space-y-5">
          {active.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">In Progress</p>
              {active.map(req => {
                const m = PAYOUT_STATUS[req.status] ?? { label: req.status, cls: "bg-slate-700/50 text-slate-400 border-slate-600/25", dot: "bg-slate-500" };
                const canCancel = ["pending", "under_review"].includes(req.status);
                return (
                  <div key={req.id} className="rounded-xl border border-slate-700/80 bg-slate-900/80">
                    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-white">{fmtGhs(req.amountGhs * 100)}</p>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${m.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{req.network} · {req.momoNumber} · {fmtDate(req.createdAt)}</p>
                      </div>
                      {canCancel && (
                        <button onClick={() => void handleCancel(req.id)} disabled={cancelling === req.id}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 disabled:opacity-50 transition-colors"
                        >
                          {cancelling === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {history.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">History</p>
              {history.map(req => {
                const m = PAYOUT_STATUS[req.status] ?? { label: req.status, cls: "bg-slate-700/50 text-slate-400 border-slate-600/25", dot: "bg-slate-500" };
                return (
                  <div key={req.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-800/60 bg-slate-900/40">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-300">{fmtGhs(req.amountGhs * 100)}</p>
                      <p className="text-xs text-slate-600">{req.network} · {fmtDate(req.createdAt)}</p>
                      {req.rejectionReason && <p className="text-xs text-red-400 mt-0.5">{req.rejectionReason}</p>}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${m.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "transactions" | "withdrawals";

const WalletPage = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("transactions");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const b = await organizerService.getWalletBalance();
      setBalance(b);
    } catch {
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  useEffect(() => { void loadBalance(); }, [loadBalance]);

  const refresh = () => {
    setRefreshKey(k => k + 1);
    void loadBalance();
  };

  const handleWithdrawSuccess = () => {
    setShowWithdrawModal(false);
    refresh();
    setActiveTab("withdrawals");
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "transactions", label: "Transactions" },
    { id: "withdrawals",  label: "Withdrawals"  },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Wallet</h1>
          <p className="text-xs text-slate-500 mt-0.5">Your balance, transactions and withdrawals</p>
        </div>
        <button onClick={refresh} disabled={balanceLoading}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${balanceLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Balance strip ── */}
      {balanceLoading ? (
        <div className="grid grid-cols-3 gap-px bg-slate-800/60 rounded-2xl overflow-hidden animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-900/90 px-4 py-5 space-y-2">
              <div className="h-2.5 w-16 bg-slate-800 rounded" />
              <div className="h-6 w-24 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : balance ? (
        <div className={`grid gap-px bg-slate-800/60 rounded-2xl overflow-hidden`}
          style={{ gridTemplateColumns: balance.escrowLocked > 0 ? "repeat(4,1fr)" : "repeat(3,1fr)" }}
        >
          {([
            { label: "Available", value: balance.availableBalance, cls: "text-emerald-400", sub: "Ready to withdraw" },
            { label: "Pending",   value: balance.pendingBalance,   cls: "text-amber-400",  sub: "Awaiting processing" },
            ...(balance.escrowLocked > 0
              ? [{ label: "In Escrow", value: balance.escrowLocked, cls: "text-indigo-400", sub: "Locked in tournament" }]
              : []),
            { label: "Total",     value: balance.totalBalance,     cls: "text-white",      sub: "All funds" },
          ] as { label: string; value: number; cls: string; sub: string }[]).map(({ label, value, cls, sub }) => (
            <div key={label} className="bg-slate-900/90 px-4 py-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">{label}</p>
              <p className={`font-display text-xl font-bold mt-1 tabular-nums ${cls}`}>{fmtGhs(value)}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Could not load balance. Click Refresh to try again.
        </div>
      )}

      {/* ── Action row ── */}
      <div className="flex gap-2.5">
        <button
          onClick={() => setShowWithdrawModal(true)}
          disabled={!balance || balance.availableBalance <= 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 disabled:opacity-40 transition-colors"
        >
          <Banknote className="w-4 h-4" />
          Withdraw
        </button>
        <button
          onClick={() => navigate("/auth/prizes")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/8 text-amber-300 text-sm font-semibold hover:bg-amber-500/15 transition-colors"
        >
          <Trophy className="w-4 h-4" />
          Prizes & Refunds
          <ExternalLink className="w-3 h-3 opacity-60" />
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="flex border-b border-slate-800">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-3 text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? "text-white border-b-2 border-cyan-400 -mb-px bg-cyan-500/5"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >{tab.label}</button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === "transactions" && <TransactionsTab refresh={refreshKey} />}
          {activeTab === "withdrawals" && (
            <WithdrawalsTab
              availableBalance={balance?.availableBalance ?? 0}
              onRequestNew={() => setShowWithdrawModal(true)}
              refresh={refreshKey}
              onBalanceChange={refresh}
            />
          )}
        </div>
      </div>

      {showWithdrawModal && balance && (
        <WithdrawModal
          availableBalance={balance.availableBalance}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={handleWithdrawSuccess}
        />
      )}
    </div>
  );
};

export default WalletPage;
