import { useState, useEffect, useCallback } from "react";
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Trophy, Crown, Medal,
  Clock, RefreshCw, Loader2, CheckCircle2, X, RotateCcw,
  Plus, AlertCircle, Phone, Banknote, Star,
} from "lucide-react";
import {
  organizerService,
  type WalletBalance,
  type PayoutRequest,
} from "../../services/organizer.service";
import { apiGet, apiPost } from "../../utils/api.utils";
import { FINANCE_ENDPOINTS, TOURNAMENT_ENDPOINTS } from "../../config/api.config";
import { showSuccess, showError } from "../../utils/toast.utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

interface Winning {
  _id: string;
  tournament_id: { _id: string; title: string } | null;
  placement: number;
  prize_percentage: number;
  amount: number;
  currency: string;
  status: "allocated" | "claimed" | "processing" | "paid" | "failed";
  created_at: string;
  payout_completed_at?: string;
}

interface Refund {
  _id: string;
  tournament_id: { _id: string; title: string } | null;
  amount: number;
  currency: string;
  reason: string;
  status: "pending_claim" | "claimed" | "processing" | "paid" | "failed";
  created_at: string;
}

// ─── Config maps ──────────────────────────────────────────────────────────────

const TX_META: Record<string, { label: string; iconBg: string; iconColor: string; amountCls: string; sign: string }> = {
  deposit:           { label: "Deposit",          iconBg: "bg-emerald-500/15", iconColor: "text-emerald-400", amountCls: "text-emerald-400", sign: "+" },
  prize_won:         { label: "Prize Won",         iconBg: "bg-amber-500/15",  iconColor: "text-amber-400",   amountCls: "text-amber-400",   sign: "+" },
  refund:            { label: "Refund",            iconBg: "bg-emerald-500/15", iconColor: "text-emerald-400", amountCls: "text-emerald-400", sign: "+" },
  wallet_topup:      { label: "Top Up",            iconBg: "bg-emerald-500/15", iconColor: "text-emerald-400", amountCls: "text-emerald-400", sign: "+" },
  entry_fee:         { label: "Entry Fee",         iconBg: "bg-red-500/15",    iconColor: "text-red-400",     amountCls: "text-red-400",     sign: "-" },
  payout_completed:  { label: "Withdrawal",        iconBg: "bg-slate-700/60",  iconColor: "text-slate-300",   amountCls: "text-slate-300",   sign: "-" },
  payout_approved:   { label: "Withdrawal",        iconBg: "bg-blue-500/15",   iconColor: "text-blue-400",    amountCls: "text-blue-300",    sign: "-" },
  platform_fee:      { label: "Platform Fee",      iconBg: "bg-slate-700/60",  iconColor: "text-slate-400",   amountCls: "text-slate-400",   sign: "-" },
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

const WINNING_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  allocated:  { label: "Unclaimed",  cls: "bg-amber-500/15 text-amber-300 border-amber-500/25",    dot: "bg-amber-400" },
  claimed:    { label: "Pending",    cls: "bg-blue-500/15 text-blue-300 border-blue-500/25",       dot: "bg-blue-400" },
  processing: { label: "Processing", cls: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25", dot: "bg-indigo-400 animate-pulse" },
  paid:       { label: "Paid",       cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", dot: "bg-emerald-400" },
  failed:     { label: "Failed",     cls: "bg-red-500/15 text-red-300 border-red-500/25",          dot: "bg-red-400" },
};

// ─── Placement badge ──────────────────────────────────────────────────────────

function PlacementBadge({ n }: { n: number }) {
  if (n === 1) return <span className="flex items-center gap-1 text-xs font-bold text-amber-300"><Crown className="w-3 h-3" />1st</span>;
  if (n === 2) return <span className="flex items-center gap-1 text-xs font-bold text-slate-300"><Medal className="w-3 h-3" />2nd</span>;
  if (n === 3) return <span className="flex items-center gap-1 text-xs font-bold text-orange-500"><Medal className="w-3 h-3" />3rd</span>;
  return <span className="text-xs font-bold text-slate-400">#{n}</span>;
}

// ─── MoMo Form ────────────────────────────────────────────────────────────────

interface MomoFormProps {
  network: MomoNetwork;
  momoNumber: string;
  accountName: string;
  notes?: string;
  onNetworkChange: (v: MomoNetwork) => void;
  onMomoNumberChange: (v: string) => void;
  onAccountNameChange: (v: string) => void;
  onNotesChange?: (v: string) => void;
  showNotes?: boolean;
}

function MomoForm({
  network, momoNumber, accountName, notes,
  onNetworkChange, onMomoNumberChange, onAccountNameChange, onNotesChange,
  showNotes = true,
}: MomoFormProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Network</label>
        <div className="grid grid-cols-3 gap-2">
          {MOMO_NETWORKS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onNetworkChange(n)}
              className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                network === n
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                  : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">MoMo Number</label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="tel"
            maxLength={10}
            value={momoNumber}
            onChange={e => onMomoNumberChange(e.target.value.replace(/\D/g, ""))}
            placeholder="0XX XXX XXXX"
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Account Name</label>
        <input
          type="text"
          value={accountName}
          onChange={e => onAccountNameChange(e.target.value)}
          placeholder="Name on MoMo account"
          className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors"
        />
      </div>
      {showNotes && onNotesChange && (
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Notes <span className="text-slate-600 normal-case">(optional)</span></label>
          <input
            type="text"
            value={notes}
            onChange={e => onNotesChange(e.target.value)}
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
  availableBalance,
  onClose,
  onSuccess,
}: {
  availableBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amountGhs, setAmountGhs] = useState("");
  const [network, setNetwork] = useState<MomoNetwork>("MTN");
  const [momoNumber, setMomoNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const availableGhs = availableBalance / 100;
  const amountNum = parseFloat(amountGhs) || 0;
  const valid =
    amountNum > 0 &&
    amountNum <= availableGhs &&
    momoNumber.length === 10 &&
    accountName.trim().length > 0;

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
      showSuccess("Withdrawal request submitted.");
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
              <input
                type="number"
                min="1"
                max={availableGhs}
                step="0.01"
                value={amountGhs}
                onChange={e => setAmountGhs(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-11 pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors"
              />
            </div>
            <div className="flex gap-2 mt-1.5">
              {[0.25, 0.5, 0.75, 1].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setAmountGhs((availableGhs * pct).toFixed(2))}
                  className="flex-1 py-1 rounded-lg text-[10px] font-semibold text-slate-400 bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 hover:text-white transition-colors"
                >
                  {pct === 1 ? "Max" : `${pct * 100}%`}
                </button>
              ))}
            </div>
          </div>

          <MomoForm
            network={network}
            momoNumber={momoNumber}
            accountName={accountName}
            notes={notes}
            onNetworkChange={setNetwork}
            onMomoNumberChange={setMomoNumber}
            onAccountNameChange={setAccountName}
            onNotesChange={setNotes}
          />
        </div>

        <div className="px-5 pb-5 flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={!valid || submitting}
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

// ─── Claim Modal ──────────────────────────────────────────────────────────────

function ClaimModal({
  title,
  amount,
  placement,
  claimEndpoint,
  onClose,
  onSuccess,
}: {
  title: string;
  amount: number;
  placement?: number;
  claimEndpoint: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [network, setNetwork] = useState<MomoNetwork>("MTN");
  const [momoNumber, setMomoNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const valid = momoNumber.length === 10 && accountName.trim().length > 0;

  const handleClaim = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      await apiPost(claimEndpoint, {
        momo_number: momoNumber,
        network,
        account_name: accountName.trim(),
        notes: notes.trim() || undefined,
      });
      showSuccess("Claim submitted successfully.");
      onSuccess();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Claim failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80 bg-slate-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-white">Claim Prize</h3>
              <p className="text-[11px] text-slate-500 truncate max-w-44">{title}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
            <div className="flex items-center gap-2">
              {placement && <PlacementBadge n={placement} />}
              <span className="text-xs text-slate-400">{title}</span>
            </div>
            <span className="text-sm font-bold text-amber-300">{fmtGhs(amount)}</span>
          </div>
          <MomoForm
            network={network}
            momoNumber={momoNumber}
            accountName={accountName}
            notes={notes}
            onNetworkChange={setNetwork}
            onMomoNumberChange={setMomoNumber}
            onAccountNameChange={setAccountName}
            onNotesChange={setNotes}
          />
        </div>

        <div className="px-5 pb-5 flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => void handleClaim()}
            disabled={!valid || submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-sm font-bold hover:bg-amber-400 disabled:opacity-50 transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
            {submitting ? "Claiming…" : `Claim ${fmtGhs(amount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Transactions Tab ─────────────────────────────────────────────────────────

function TransactionsTab() {
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

  useEffect(() => { void load(); }, [load]);

  if (loading) return (
    <div className="space-y-2 px-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse">
          <div className="w-9 h-9 rounded-xl bg-slate-800 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 bg-slate-800 rounded" />
            <div className="h-2.5 w-20 bg-slate-800 rounded" />
          </div>
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
        const meta = TX_META[tx.type] ?? { label: tx.type.replace(/_/g, " "), iconBg: "bg-slate-700/60", iconColor: "text-slate-400", amountCls: "text-slate-300", sign: tx.direction === "credit" ? "+" : "-" };
        const isCredit = tx.direction === "credit";
        const statusCls = tx.status === "completed" ? "text-emerald-400" : tx.status === "failed" || tx.status === "cancelled" ? "text-red-400" : "text-amber-400";

        return (
          <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-slate-700/80 hover:bg-slate-900 transition-colors">
            <div className={`w-9 h-9 rounded-xl ${meta.iconBg} flex items-center justify-center shrink-0`}>
              {isCredit
                ? <ArrowDownLeft className={`w-4 h-4 ${meta.iconColor}`} />
                : <ArrowUpRight className={`w-4 h-4 ${meta.iconColor}`} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white capitalize">{meta.label}</p>
              <p className="text-[11px] text-slate-500 truncate">{tx.description || fmtDateTime(tx.createdAt)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-bold ${meta.amountCls}`}>
                {meta.sign}{fmtGhs(tx.amount)}
              </p>
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
  availableBalance,
  onRequestNew,
  refresh,
}: {
  availableBalance: number;
  onRequestNew: () => void;
  refresh: number;
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
      showSuccess("Withdrawal request cancelled.");
      void load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not cancel request.");
    } finally {
      setCancelling(null);
    }
  };

  if (loading) return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse space-y-2">
          <div className="h-3 w-24 bg-slate-800 rounded" />
          <div className="h-4 w-20 bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{requests.length} request{requests.length !== 1 ? "s" : ""}</p>
        <button
          onClick={onRequestNew}
          disabled={availableBalance <= 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Withdrawal
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
            <Banknote className="w-6 h-6 text-slate-600" />
          </div>
          <p className="text-sm font-medium text-slate-400">No withdrawal requests</p>
          <p className="text-xs text-slate-600">Submit a request to withdraw your available balance</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map(req => {
            const statusMeta = PAYOUT_STATUS[req.status] ?? { label: req.status, cls: "bg-slate-700/50 text-slate-400 border-slate-600/25", dot: "bg-slate-500" };
            const canCancel = req.status === "pending";
            return (
              <div key={req.id} className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-white">{fmtGhs(req.amountGhs * 100)}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${statusMeta.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                        {statusMeta.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {req.network} · {req.momoNumber} · {fmtDate(req.createdAt)}
                    </p>
                    {req.rejectionReason && (
                      <p className="text-xs text-red-400 mt-1">Reason: {req.rejectionReason}</p>
                    )}
                  </div>
                  {canCancel && (
                    <button
                      onClick={() => void handleCancel(req.id)}
                      disabled={cancelling === req.id}
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
    </div>
  );
}

// ─── Prizes Tab ───────────────────────────────────────────────────────────────

function PrizesTab({ refresh }: { refresh: number }) {
  const [winnings, setWinnings] = useState<Winning[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimTarget, setClaimTarget] = useState<{
    title: string; amount: number; placement?: number; endpoint: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, rRes] = await Promise.allSettled([
        apiGet(TOURNAMENT_ENDPOINTS.WINNINGS),
        apiGet(TOURNAMENT_ENDPOINTS.REFUNDS),
      ]);
      if (wRes.status === "fulfilled" && wRes.value.success) {
        const raw = wRes.value.data as Record<string, unknown>;
        const list = (Array.isArray(raw) ? raw : Array.isArray(raw.winnings) ? raw.winnings : []) as Winning[];
        setWinnings(list);
      }
      if (rRes.status === "fulfilled" && rRes.value.success) {
        const raw = rRes.value.data as Record<string, unknown>;
        const list = (Array.isArray(raw) ? raw : Array.isArray(raw.refunds) ? raw.refunds : []) as Refund[];
        setRefunds(list);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, refresh]);

  const unclaimedWinnings = winnings.filter(w => w.status === "allocated");
  const otherWinnings = winnings.filter(w => w.status !== "allocated");
  const pendingRefunds = refunds.filter(r => r.status === "pending_claim");
  const otherRefunds = refunds.filter(r => r.status !== "pending_claim");

  if (loading) return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse space-y-2">
          <div className="h-3 w-32 bg-slate-800 rounded" />
          <div className="h-4 w-24 bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  );

  const hasAnything = winnings.length > 0 || refunds.length > 0;

  if (!hasAnything) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
        <Trophy className="w-6 h-6 text-slate-600" />
      </div>
      <p className="text-sm font-medium text-slate-400">No prizes or refunds</p>
      <p className="text-xs text-slate-600">Tournament winnings and entry fee refunds will appear here</p>
    </div>
  );

  const renderWinning = (w: Winning) => {
    const statusMeta = WINNING_STATUS[w.status] ?? { label: w.status, cls: "bg-slate-700/50 text-slate-400 border-slate-600/25", dot: "bg-slate-500" };
    const tournamentTitle = w.tournament_id?.title ?? "Tournament";
    const canClaim = w.status === "allocated";
    return (
      <div key={w._id} className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <PlacementBadge n={w.placement} />
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${statusMeta.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                {statusMeta.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">{tournamentTitle}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{fmtDate(w.created_at)}</p>
          </div>
          <div className="text-right shrink-0 space-y-1.5">
            <p className="text-sm font-bold text-amber-300">{fmtGhs(w.amount)}</p>
            {canClaim && (
              <button
                onClick={() => setClaimTarget({
                  title: tournamentTitle,
                  amount: w.amount,
                  placement: w.placement,
                  endpoint: `${TOURNAMENT_ENDPOINTS.WINNINGS_CLAIM}/${w._id}/claim`,
                })}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-300 border border-amber-500/30 bg-amber-500/8 hover:bg-amber-500/15 transition-colors"
              >
                <Star className="w-3 h-3" />
                Claim
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderRefund = (r: Refund) => {
    const canClaim = r.status === "pending_claim";
    const statusColor = r.status === "completed" ? "text-emerald-400" : r.status === "failed" ? "text-red-400" : "text-amber-400";
    const tournamentTitle = r.tournament_id?.title ?? "Tournament";
    return (
      <div key={r._id} className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <RotateCcw className="w-3 h-3 text-slate-500 shrink-0" />
              <p className="text-xs font-semibold text-slate-300 truncate">{tournamentTitle}</p>
            </div>
            <p className="text-[10px] text-slate-500">{r.reason?.replace(/_/g, " ") ?? "Entry fee refund"} · {fmtDate(r.created_at)}</p>
          </div>
          <div className="text-right shrink-0 space-y-1.5">
            <p className="text-sm font-bold text-emerald-300">{fmtGhs(r.amount)}</p>
            {canClaim && (
              <button
                onClick={() => setClaimTarget({
                  title: tournamentTitle,
                  amount: r.amount,
                  endpoint: `${TOURNAMENT_ENDPOINTS.REFUNDS_CLAIM}/${r._id}/claim`,
                })}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-300 border border-emerald-500/30 bg-emerald-500/8 hover:bg-emerald-500/15 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Claim
              </button>
            )}
            {!canClaim && (
              <p className={`text-[10px] capitalize ${statusColor}`}>{r.status}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Unclaimed — action required */}
      {(unclaimedWinnings.length > 0 || pendingRefunds.length > 0) && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest px-1">Action Required</p>
          {unclaimedWinnings.map(renderWinning)}
          {pendingRefunds.map(renderRefund)}
        </div>
      )}

      {/* Prize history */}
      {otherWinnings.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Prize History</p>
          {otherWinnings.map(renderWinning)}
        </div>
      )}

      {/* Refund history */}
      {otherRefunds.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Refund History</p>
          {otherRefunds.map(renderRefund)}
        </div>
      )}

      {claimTarget && (
        <ClaimModal
          title={claimTarget.title}
          amount={claimTarget.amount}
          placement={claimTarget.placement}
          claimEndpoint={claimTarget.endpoint}
          onClose={() => setClaimTarget(null)}
          onSuccess={() => {
            setClaimTarget(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "transactions" | "withdrawals" | "prizes";

const WalletPage = () => {
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

  const handleWithdrawSuccess = () => {
    setShowWithdrawModal(false);
    setRefreshKey(k => k + 1);
    void loadBalance();
    setActiveTab("withdrawals");
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "transactions", label: "Transactions" },
    { id: "withdrawals", label: "Withdrawals" },
    { id: "prizes", label: "Prizes & Refunds" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Wallet</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage your funds, prizes and payouts</p>
        </div>
        <button
          onClick={() => { void loadBalance(); setRefreshKey(k => k + 1); }}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${balanceLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Balance cards ── */}
      {balanceLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-800/60 rounded-2xl overflow-hidden animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-900/90 px-4 py-4 space-y-2">
              <div className="h-2.5 w-16 bg-slate-800 rounded" />
              <div className="h-5 w-24 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : balance ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-800/60 rounded-2xl overflow-hidden">
          {[
            { label: "Available", value: balance.availableBalance, cls: "text-emerald-400", highlight: true },
            { label: "Pending",   value: balance.pendingBalance,   cls: "text-amber-400",  highlight: false },
            { label: "In Escrow", value: balance.escrowLocked,     cls: "text-indigo-400", highlight: false },
            { label: "Total",     value: balance.totalBalance,     cls: "text-white",      highlight: false },
          ].map(({ label, value, cls, highlight }) => (
            <div key={label} className={`bg-slate-900/90 px-4 py-4 ${highlight ? "sm:col-span-1" : ""}`}>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">{label}</p>
              <p className={`font-display text-lg font-bold mt-1 tabular-nums ${cls}`}>{fmtGhs(value)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Could not load balance. Pull to refresh.
        </div>
      )}

      {/* ── Quick action ── */}
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
          onClick={() => setActiveTab("prizes")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/8 text-amber-300 text-sm font-semibold hover:bg-amber-500/15 transition-colors"
        >
          <Trophy className="w-4 h-4" />
          Prizes & Refunds
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-slate-800">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-3 text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? "text-white border-b-2 border-cyan-400 -mb-px bg-cyan-500/5"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4">
          {activeTab === "transactions" && <TransactionsTab />}
          {activeTab === "withdrawals" && (
            <WithdrawalsTab
              availableBalance={balance?.availableBalance ?? 0}
              onRequestNew={() => setShowWithdrawModal(true)}
              refresh={refreshKey}
            />
          )}
          {activeTab === "prizes" && <PrizesTab refresh={refreshKey} />}
        </div>
      </div>

      {/* ── Modals ── */}
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
