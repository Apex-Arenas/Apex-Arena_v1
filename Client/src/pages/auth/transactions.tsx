import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet, Banknote, RefreshCw, Loader2, X, Phone,
  Plus, Trophy, ArrowDownLeft, ArrowUpRight, ChevronDown,
  CheckCircle2, XCircle, Clock, TrendingUp, Send,
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
  status: string;
  description: string;
  createdAt: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TX_META: Record<string, { label: string; iconBg: string; iconColor: string; amountCls: string; sign: string }> = {
  deposit:          { label: "Deposit",      iconBg: "bg-emerald-500/15", iconColor: "text-emerald-400", amountCls: "text-emerald-400", sign: "+" },
  prize_won:        { label: "Prize Won",    iconBg: "bg-amber-500/15",  iconColor: "text-amber-400",   amountCls: "text-amber-400",   sign: "+" },
  refund:           { label: "Refund",       iconBg: "bg-emerald-500/15", iconColor: "text-emerald-400", amountCls: "text-emerald-400", sign: "+" },
  wallet_topup:     { label: "Top Up",       iconBg: "bg-emerald-500/15", iconColor: "text-emerald-400", amountCls: "text-emerald-400", sign: "+" },
  entry_fee:        { label: "Entry Fee",    iconBg: "bg-red-500/15",    iconColor: "text-red-400",     amountCls: "text-red-400",     sign: "-" },
  payout_completed: { label: "Withdrawal",   iconBg: "bg-cyan-500/15",   iconColor: "text-cyan-400",    amountCls: "text-cyan-300",    sign: "-" },
  payout_approved:  { label: "Withdrawal",   iconBg: "bg-indigo-500/15", iconColor: "text-indigo-400",  amountCls: "text-indigo-300",  sign: "-" },
  platform_fee:     { label: "Platform Fee", iconBg: "bg-slate-700/60",  iconColor: "text-slate-400",   amountCls: "text-slate-400",   sign: "-" },
};

const PAYOUT_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  pending:      { label: "Pending",      cls: "bg-amber-500/15 text-amber-300 border-amber-500/25",      dot: "bg-amber-400" },
  under_review: { label: "Under Review", cls: "bg-blue-500/15 text-blue-300 border-blue-500/25",         dot: "bg-blue-400" },
  approved:     { label: "Approved",     cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",         dot: "bg-cyan-400" },
  processing:   { label: "Processing",   cls: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",   dot: "bg-indigo-400 animate-pulse" },
  completed:    { label: "Completed",    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", dot: "bg-emerald-400" },
  rejected:     { label: "Rejected",     cls: "bg-red-500/15 text-red-300 border-red-500/25",            dot: "bg-red-400" },
  cancelled:    { label: "Cancelled",    cls: "bg-slate-600/20 text-slate-400 border-slate-600/25",      dot: "bg-slate-500" },
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
            Notes <span className="text-slate-600 normal-case font-normal">(optional)</span>
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
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-4 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-2xl rounded-t-2xl w-full max-w-sm overflow-hidden shadow-2xl mb-0 sm:mb-0">
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
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
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
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 transition-all"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? "Submitting…" : "Withdraw"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Transactions Tab ─────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button
        onClick={() => onPage(page - 1)} disabled={page === 1}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 border border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:text-white disabled:opacity-40 transition-colors"
      >← Prev</button>
      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => onPage(p)}
            className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
              p === page
                ? "bg-orange-500/20 border border-orange-500/40 text-orange-300"
                : "text-slate-500 hover:text-white hover:bg-slate-800/60"
            }`}
          >{p}</button>
        ))}
      </div>
      <button
        onClick={() => onPage(page + 1)} disabled={page === totalPages}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 border border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:text-white disabled:opacity-40 transition-colors"
      >Next →</button>
    </div>
  );
}

function TransactionsTab({ refresh }: { refresh: number }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await apiGet(`${FINANCE_ENDPOINTS.TRANSACTIONS}?limit=${PAGE_SIZE}&page=${p}`);
      if (res.success) {
        const raw = res.data as Record<string, unknown>;
        const list = (Array.isArray(raw) ? raw : Array.isArray(raw.transactions) ? raw.transactions : []) as Record<string, unknown>[];
        setTotal(Number(raw.total ?? list.length));
        setTransactions(list.map(t => ({
          id: String(t._id ?? t.id ?? ""),
          type: String(t.type ?? ""),
          direction: (t.direction ?? (["deposit", "prize_won", "refund", "wallet_topup"].includes(String(t.type)) ? "credit" : "debit")) as "credit" | "debit",
          amount: Number(t.amount ?? 0),
          status: String(t.status ?? ""),
          description: String((t.metadata as Record<string, unknown>)?.description ?? t.description ?? ""),
          createdAt: String(t.created_at ?? t.createdAt ?? ""),
        })));
      }
    } catch { setTransactions([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { setPage(1); }, [refresh]);
  useEffect(() => { void load(page); }, [load, page, refresh]);

  if (loading) return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-slate-800 shrink-0" />
          <div className="flex-1 space-y-2"><div className="h-3 w-32 bg-slate-800 rounded" /><div className="h-2.5 w-20 bg-slate-800 rounded" /></div>
          <div className="h-4 w-16 bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  );

  if (transactions.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-2">
        <TrendingUp className="w-7 h-7 text-slate-600" />
      </div>
      <p className="font-display text-lg font-semibold text-slate-300">No transactions yet</p>
      <p className="text-sm text-slate-500">Your transaction history will appear here.</p>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-slate-500">{total} transaction{total !== 1 ? "s" : ""}</p>
        <p className="text-xs text-slate-600">Page {page} of {totalPages}</p>
      </div>
      {transactions.map((tx, i) => {
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
          <div key={tx.id || i} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900 transition-colors">
            <div className={`w-10 h-10 rounded-xl ${meta.iconBg} flex items-center justify-center shrink-0`}>
              {tx.direction === "credit"
                ? <ArrowDownLeft className={`w-4 h-4 ${meta.iconColor}`} />
                : <ArrowUpRight className={`w-4 h-4 ${meta.iconColor}`} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white capitalize">{meta.label}</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">{tx.description || fmtDateTime(tx.createdAt)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-bold ${meta.amountCls}`}>{meta.sign}{fmtGhs(tx.amount)}</p>
              <p className={`text-[10px] capitalize mt-0.5 ${statusCls}`}>{tx.status}</p>
            </div>
          </div>
        );
      })}
      <Pagination page={page} totalPages={totalPages} onPage={p => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
    </div>
  );
}

// ─── Withdrawals Tab ──────────────────────────────────────────────────────────

function WithdrawalsTab({
  refresh, onBalanceChange,
}: {
  refresh: number;
  onBalanceChange: () => void;
}) {
  const [allRequests, setAllRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try { setAllRequests(await organizerService.getMyPayoutRequests()); }
    catch { setAllRequests([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); setPage(1); }, [load, refresh]);

  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      await organizerService.cancelPayoutRequest(id);
      showSuccess("Withdrawal cancelled — balance refunded.");
      void load();
      onBalanceChange();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not cancel.");
    } finally { setCancelling(null); }
  };

  if (loading) return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-slate-800 rounded" />
            <div className="h-5 w-20 bg-slate-800 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-3 w-full bg-slate-800 rounded" />
            <div className="h-3 w-full bg-slate-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  const active = allRequests.filter(r => !["completed", "rejected", "cancelled"].includes(r.status));
  const history = allRequests.filter(r => ["completed", "rejected", "cancelled"].includes(r.status));
  const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const historyPage = history.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (allRequests.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-2">
        <Banknote className="w-7 h-7 text-slate-600" />
      </div>
      <p className="font-display text-lg font-semibold text-slate-300">No withdrawals yet</p>
      <p className="text-sm text-slate-500">Submit a request to withdraw your available balance.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Active */}
      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">In Progress</p>
          {active.map(req => {
            const m = PAYOUT_STATUS[req.status] ?? { label: req.status, cls: "bg-slate-700/50 text-slate-400 border-slate-600/25", dot: "bg-slate-500" };
            const canCancel = ["pending", "under_review"].includes(req.status);
            return (
              <div key={req.id} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-slate-700/60 bg-slate-900">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-bold text-white">{fmtGhs(req.amountGhs * 100)}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${m.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{req.network} · {req.momoNumber} · {req.accountName}</p>
                  <p className="text-[10px] text-slate-600">{fmtDate(req.createdAt)}</p>
                </div>
                {canCancel && (
                  <button onClick={() => void handleCancel(req.id)} disabled={cancelling === req.id}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 disabled:opacity-50 transition-colors"
                  >
                    {cancelling === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                    Cancel
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* History — paginated */}
      {history.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">History</p>
            <p className="text-[10px] text-slate-600">{history.length} total</p>
          </div>
          {historyPage.map(req => {
            const m = PAYOUT_STATUS[req.status] ?? { label: req.status, cls: "bg-slate-700/50 text-slate-400 border-slate-600/25", dot: "bg-slate-500" };
            const icon = req.status === "completed"
              ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              : req.status === "rejected" || req.status === "cancelled"
                ? <XCircle className="w-4 h-4 text-red-400" />
                : <Clock className="w-4 h-4 text-slate-500" />;
            return (
              <div key={req.id} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">{icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-300">{fmtGhs(req.amountGhs * 100)}</p>
                  <p className="text-xs text-slate-500 truncate">{req.network} · {req.momoNumber} · {req.accountName}</p>
                  {req.rejectionReason && <p className="text-xs text-red-400/80 truncate mt-0.5">{req.rejectionReason}</p>}
                  <p className="text-[10px] text-slate-600">{fmtDate(req.createdAt)}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${m.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label}
                </span>
              </div>
            );
          })}
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
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
  const [statsOpen, setStatsOpen] = useState(false);

  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    try { setBalance(await organizerService.getWalletBalance()); }
    catch { setBalance(null); }
    finally { setBalanceLoading(false); }
  }, []);

  useEffect(() => { void loadBalance(); }, [loadBalance]);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
    void loadBalance();
  }, [loadBalance]);

  const handleWithdrawSuccess = () => {
    setShowWithdrawModal(false);
    refresh();
    setActiveTab("withdrawals");
  };

  const balanceStats = balance ? [
    { icon: Banknote,   iconColor: "text-cyan-400",   bg: "from-cyan-500/25 to-blue-500/20",     label: "Available", value: fmtGhs(balance.availableBalance) },
    { icon: Clock,      iconColor: "text-amber-400",  bg: "from-amber-500/25 to-orange-500/20",  label: "Pending",   value: fmtGhs(balance.pendingBalance)   },
    { icon: Wallet,     iconColor: "text-indigo-400", bg: "from-indigo-500/25 to-violet-500/20", label: "In Escrow", value: fmtGhs(balance.escrowLocked)     },
    { icon: TrendingUp, iconColor: "text-white",      bg: "from-slate-500/25 to-slate-600/20",   label: "Total",     value: fmtGhs(balance.totalBalance)    },
  ] as { icon: React.ElementType; iconColor: string; bg: string; label: string; value: string }[] : [];

  return (
    <div className="min-h-screen">

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative bg-slate-900 border-b border-slate-800/60 overflow-hidden">
        {/* Background decorations — same as PrizesPage */}
        <div className="absolute -top-40 right-0 w-150 h-100 rounded-full bg-cyan-500/6 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-125 h-50 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-size-[60px_60px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-7">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl sm:text-5xl font-bold text-white leading-none">Wallet</h1>
              <p className="text-sm sm:text-base text-slate-400 mt-2 sm:mt-3 max-w-md">Your balance, transactions and withdrawals — send funds to Mobile Money.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowWithdrawModal(true)}
                disabled={!balance || balance.availableBalance <= 0}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 text-xs sm:text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-40 transition-all"
              >
                <Banknote className="w-4 h-4" />
                Withdraw
              </button>
              <button
                onClick={refresh}
                disabled={balanceLoading}
                className="p-2 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${balanceLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Stats — mobile dropdown */}
          <div className="sm:hidden mt-4">
            <button onClick={() => setStatsOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs font-semibold text-slate-400 uppercase tracking-widest"
            >
              <span>Balance</span>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${statsOpen ? "rotate-180" : ""}`} />
            </button>
            {statsOpen && (
              <div className="mt-1 grid grid-cols-2 gap-2">
                {balanceLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3 animate-pulse">
                        <div className="w-8 h-8 rounded-lg bg-slate-700 shrink-0" />
                        <div className="space-y-1.5"><div className="h-2.5 w-12 bg-slate-700 rounded" /><div className="h-4 w-16 bg-slate-700 rounded" /></div>
                      </div>
                    ))
                  : balanceStats.map(s => (
                      <div key={s.label} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3">
                        <div className={`w-8 h-8 rounded-lg bg-linear-to-br ${s.bg} flex items-center justify-center shrink-0`}>
                          <s.icon className={`w-3.5 h-3.5 ${s.iconColor}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">{s.label}</p>
                          <p className={`font-display text-base font-bold tabular-nums leading-tight ${s.iconColor}`}>{s.value}</p>
                        </div>
                      </div>
                    ))
                }
              </div>
            )}
          </div>

          {/* Stats — desktop grid of 4 */}
          <div className="hidden sm:grid sm:grid-cols-4 gap-3 mt-6">
            {balanceLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-slate-700 shrink-0" />
                    <div className="space-y-2"><div className="h-2.5 w-16 bg-slate-700 rounded" /><div className="h-5 w-24 bg-slate-700 rounded" /></div>
                  </div>
                ))
              : balanceStats.map(s => (
                  <div key={s.label} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3 hover:border-slate-600/60 transition-colors">
                    <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${s.bg} flex items-center justify-center shrink-0`}>
                      <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{s.label}</p>
                      <p className={`font-display text-xl font-bold tabular-nums leading-tight ${s.iconColor}`}>{s.value}</p>
                    </div>
                  </div>
                ))
            }
          </div>

          {/* Prizes link */}
          <button
            onClick={() => navigate("/auth/prizes")}
            className="mt-4 flex items-center gap-2 text-sm text-slate-400 hover:text-amber-300 transition-colors group"
          >
            <Trophy className="w-4 h-4 text-amber-500/70 group-hover:text-amber-400 transition-colors" />
            View tournament prizes &amp; refunds →
          </button>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-800/60 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex gap-1">
          {([
            { id: "transactions" as Tab, label: "Transactions" },
            { id: "withdrawals"  as Tab, label: "Withdrawals"  },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === t.id
                  ? "border-orange-400 text-orange-300"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex items-center pb-1">
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={!balance || balance.availableBalance <= 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400 text-xs font-semibold hover:border-slate-600 hover:text-white disabled:opacity-40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Withdrawal</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {activeTab === "transactions" && <TransactionsTab refresh={refreshKey} />}
        {activeTab === "withdrawals" && (
          <WithdrawalsTab
            refresh={refreshKey}
            onBalanceChange={refresh}
          />
        )}
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
