import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCcw,
  Wallet,
  X,
} from "lucide-react";
import {
  organizerService,
  type WalletBalance,
  type PayoutRequest,
} from "../../services/organizer.service";
import { apiGet } from "../../utils/api.utils";
import { FINANCE_ENDPOINTS } from "../../config/api.config";

interface WalletTransaction {
  id: string;
  reference: string;
  type: string;
  status: string;
  amountMinorUnits: number;
  currency: string;
  createdAt: string;
  description: string;
}

interface TransactionRaw {
  _id?: string;
  id?: string;
  gateway_transaction_id?: string;
  reference?: string;
  type?: string;
  status?: string;
  amount?: number;
  amount_ghs?: number;
  amount_minor?: number;
  currency?: string;
  created_at?: string;
  createdAt?: string;
  description?: string;
}

const CREDIT_TYPES = new Set([
  "deposit", "wallet_topup", "topup", "winnings", "prize", "refund",
  "credit", "reward", "bonus", "cashback",
]);

function isCredit(type: string) {
  return CREDIT_TYPES.has(type.toLowerCase().replace(/\s+/g, "_"));
}

function formatMoney(amountMinorUnits: number, currency: string) {
  const major = amountMinorUnits / 100;
  return `${currency} ${major.toFixed(2)}`;
}

function mapTransaction(raw: TransactionRaw): WalletTransaction {
  const amount = Number(raw.amount_minor ?? raw.amount_ghs ?? raw.amount ?? 0);
  return {
    id: String(raw._id ?? raw.id ?? raw.gateway_transaction_id ?? crypto.randomUUID()),
    reference: String(raw.gateway_transaction_id ?? raw.reference ?? "-"),
    type: String(raw.type ?? "transaction"),
    status: String(raw.status ?? "pending"),
    amountMinorUnits: Number.isFinite(amount) ? amount : 0,
    currency: String(raw.currency ?? "GHS"),
    createdAt: String(raw.created_at ?? raw.createdAt ?? ""),
    description: String(raw.description ?? ""),
  };
}

const statusColors: Record<string, string> = {
  completed:  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  successful: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  pending:    "bg-amber-500/15 text-amber-300 border-amber-500/30",
  processing: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  failed:     "bg-red-500/15 text-red-300 border-red-500/30",
  cancelled:  "bg-slate-600/20 text-slate-300 border-slate-600/30",
};

const payoutStatusColors: Record<string, string> = {
  pending:    "bg-amber-500/15 text-amber-300 border-amber-500/30",
  approved:   "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  processing: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  paid:       "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected:   "bg-red-500/15 text-red-300 border-red-500/30",
  cancelled:  "bg-slate-600/20 text-slate-300 border-slate-600/30",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-orange-400" />
          </div>
          <h2 className="font-display text-sm font-bold text-white uppercase tracking-wide">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/70 focus:bg-slate-900 transition-colors";

// ─── Main ─────────────────────────────────────────────────────────────────────

const TransactionsPage = () => {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [walletAmountInput, setWalletAmountInput] = useState("10");
  const [isLoading, setIsLoading] = useState(true);
  const [isDepositing, setIsDepositing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [isLoadingPayouts, setIsLoadingPayouts] = useState(false);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutType, setPayoutType] = useState<"wallet_withdrawal" | "tournament_winnings">("wallet_withdrawal");
  const [payoutMomo, setPayoutMomo] = useState("");
  const [payoutNetwork, setPayoutNetwork] = useState<"MTN" | "Vodafone" | "AirtelTigo">("MTN");
  const [payoutAccountName, setPayoutAccountName] = useState("");
  const [cancellingPayoutId, setCancellingPayoutId] = useState<string | null>(null);

  const fetchPayouts = useCallback(async () => {
    setIsLoadingPayouts(true);
    try {
      const requests = await organizerService.getMyPayoutRequests();
      setPayoutRequests(requests);
    } catch {
      // silently fail — players may not have payout access
    } finally {
      setIsLoadingPayouts(false);
    }
  }, []);

  const fetchWalletAndTransactions = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [walletResponse, transactionsResponse] = await Promise.all([
        organizerService.getWalletBalance().catch(() => null),
        apiGet(`${FINANCE_ENDPOINTS.TRANSACTIONS}?limit=50`),
      ]);
      setWallet(walletResponse);
      if (transactionsResponse.success) {
        const data = transactionsResponse.data as Record<string, unknown>;
        const list = Array.isArray(data)
          ? (data as TransactionRaw[])
          : ((data.transactions ?? data.data ?? []) as TransactionRaw[]);
        setTransactions(list.map(mapTransaction));
      } else {
        setTransactions([]);
      }
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to load wallet.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWalletAndTransactions();
    void fetchPayouts();
  }, [fetchWalletAndTransactions, fetchPayouts]);

  const sortedTransactions = useMemo(
    () => [...transactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [transactions],
  );

  const handleDeposit = async () => {
    const amount = Number(walletAmountInput);
    if (!Number.isFinite(amount) || amount <= 0) { setErrorMsg("Enter a valid deposit amount greater than 0."); return; }
    setIsDepositing(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const result = await organizerService.initiateWalletTopUp(amount);
      if (result.authorizationUrl) { window.location.href = result.authorizationUrl; return; }
      setInfoMsg("Deposit initiated. Check your payment app or recent transactions.");
      await fetchWalletAndTransactions();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to initiate deposit.");
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = Number(payoutAmount);
    if (!Number.isFinite(amount) || amount <= 0) { setErrorMsg("Enter a valid withdrawal amount."); return; }
    if (!payoutMomo.trim()) { setErrorMsg("Mobile Money number is required."); return; }
    if (!payoutAccountName.trim()) { setErrorMsg("Account name is required."); return; }
    setIsSubmittingPayout(true);
    setErrorMsg(null);
    try {
      await organizerService.requestPayout({
        amountGhs: amount,
        requestType: payoutType,
        momoNumber: payoutMomo.trim(),
        network: payoutNetwork,
        accountName: payoutAccountName.trim(),
      });
      setShowPayoutForm(false);
      setPayoutAmount(""); setPayoutMomo(""); setPayoutAccountName("");
      setInfoMsg("Withdrawal request submitted. It will be reviewed and processed shortly.");
      await fetchPayouts();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to submit withdrawal request.");
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const handleCancelPayout = async (id: string) => {
    setCancellingPayoutId(id);
    setErrorMsg(null);
    try {
      await organizerService.cancelPayoutRequest(id);
      setPayoutRequests((prev) => prev.filter((r) => r.id !== id));
      setInfoMsg("Withdrawal request cancelled.");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to cancel withdrawal request.");
    } finally {
      setCancellingPayoutId(null);
    }
  };

  const currency = wallet?.currency ?? "GHS";

  return (
    <div className="min-h-screen bg-slate-950">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-slate-800/50">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 55% 60% at 100% 0%, rgba(249,115,22,0.13), transparent)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 55% at 0% 100%, rgba(139,92,246,0.09), transparent)" }} />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-size-[48px_48px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-3xl font-bold text-white">Wallet & Transactions</h1>
              <p className="text-slate-400 text-sm mt-1">Track your balance, deposit funds, and monitor payment activity.</p>
            </div>
            <button
              onClick={() => { void fetchWalletAndTransactions(); void fetchPayouts(); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-white/5 hover:border-slate-600 transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Stats strip */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-800/60 rounded-xl overflow-hidden">
            {[
              { label: "Available",  value: formatMoney(wallet?.availableBalance ?? 0, currency), color: "text-emerald-300" },
              { label: "Pending",    value: formatMoney(wallet?.pendingBalance ?? 0, currency),   color: "text-amber-300"   },
              { label: "In Escrow",  value: formatMoney(wallet?.escrowLocked ?? 0, currency),     color: "text-slate-200"   },
              { label: "Total",      value: formatMoney(wallet?.totalBalance ?? 0, currency),     color: "text-cyan-300"    },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-900/70 px-4 py-3 text-center">
                {isLoading
                  ? <div className="h-5 w-20 mx-auto bg-slate-800 rounded animate-pulse mb-1" />
                  : <p className={`font-display text-lg font-bold ${color}`}>{value}</p>
                }
                <p className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Alerts */}
        {errorMsg && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4 opacity-60 hover:opacity-100" /></button>
          </div>
        )}
        {infoMsg && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-sm text-emerald-300">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1">{infoMsg}</span>
            <button onClick={() => setInfoMsg(null)}><X className="w-4 h-4 opacity-60 hover:opacity-100" /></button>
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">

          {/* Left: Deposit */}
          <SectionCard icon={Wallet} title="Deposit Funds">
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Add funds to your wallet via Mobile Money or card payment.</p>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                  Amount (GHS)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₵</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={walletAmountInput}
                    onChange={(e) => setWalletAmountInput(e.target.value)}
                    className={`${inputCls} pl-8`}
                    placeholder="e.g. 20"
                  />
                </div>
              </div>
              <button
                onClick={() => { void handleDeposit(); }}
                disabled={isDepositing || isLoading}
                className="w-full py-3 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:from-orange-400 hover:to-amber-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDepositing
                  ? <><div className="w-4 h-4 rounded-full border-2 border-slate-950/40 border-t-transparent animate-spin" />Processing…</>
                  : <><Plus className="w-4 h-4" />Deposit Funds</>
                }
              </button>

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {["10", "20", "50", "100"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setWalletAmountInput(v)}
                    className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      walletAmountInput === v
                        ? "border-orange-500/50 bg-orange-500/10 text-orange-300"
                        : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                    }`}
                  >
                    ₵{v}
                  </button>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* Right: Transactions list */}
          <SectionCard icon={ArrowDownLeft} title="Recent Transactions">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-slate-800/40 animate-pulse" />
                ))}
              </div>
            ) : sortedTransactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto mb-3">
                  <Clock3 className="w-5 h-5 text-slate-600" />
                </div>
                <p className="text-sm text-slate-400">No transactions yet</p>
                <p className="text-xs text-slate-600 mt-1">Deposit funds to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedTransactions.map((tx) => {
                  const credit = isCredit(tx.type);
                  const normalizedStatus = tx.status.toLowerCase();
                  const statusClass = statusColors[normalizedStatus] ?? "bg-slate-700/30 text-slate-300 border-slate-700";

                  return (
                    <div key={tx.id} className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 flex items-start gap-3">
                      <div className={`mt-0.5 w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${credit ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                        {credit
                          ? <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                          : <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate capitalize">
                              {tx.type.replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-slate-500 truncate">Ref: {tx.reference}</p>
                            {tx.description && (
                              <p className="text-xs text-slate-500 mt-0.5 truncate">{tx.description}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-bold font-display ${credit ? "text-emerald-300" : "text-red-300"}`}>
                              {credit ? "+" : "−"}{formatMoney(tx.amountMinorUnits, tx.currency)}
                            </p>
                            <span className={`inline-flex mt-1 rounded-full border px-2 py-0.5 text-[11px] capitalize ${statusClass}`}>
                              {tx.status.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Withdrawals */}
        <SectionCard
          icon={ArrowUpRight}
          title="Withdrawals"
          action={
            !showPayoutForm ? (
              <button
                onClick={() => setShowPayoutForm(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 text-xs font-bold hover:from-orange-400 hover:to-amber-300 transition-all"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Withdraw
              </button>
            ) : undefined
          }
        >
          {/* Withdraw form */}
          {showPayoutForm && (
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5 mb-5 space-y-4">
              <p className="text-xs text-slate-400">Funds will be sent to your Mobile Money account within 1–3 business days.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Amount (GHS)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₵</span>
                    <input type="number" min="1" step="0.01" value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)} placeholder="e.g. 50"
                      className={`${inputCls} pl-8`} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Type</label>
                  <select value={payoutType} onChange={(e) => setPayoutType(e.target.value as typeof payoutType)}
                    className={inputCls}>
                    <option value="wallet_withdrawal">Wallet Withdrawal</option>
                    <option value="tournament_winnings">Tournament Winnings</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">MoMo Number</label>
                  <input type="text" value={payoutMomo} onChange={(e) => setPayoutMomo(e.target.value)}
                    placeholder="e.g. 0241234567" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Network</label>
                  <select value={payoutNetwork} onChange={(e) => setPayoutNetwork(e.target.value as typeof payoutNetwork)}
                    className={inputCls}>
                    <option value="MTN">MTN</option>
                    <option value="Vodafone">Vodafone</option>
                    <option value="AirtelTigo">AirtelTigo</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Account Name</label>
                  <input type="text" value={payoutAccountName} onChange={(e) => setPayoutAccountName(e.target.value)}
                    placeholder="Name registered on the MoMo account" className={inputCls} />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button onClick={() => void handleWithdraw()} disabled={isSubmittingPayout}
                  className="flex-1 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 font-bold text-sm disabled:opacity-60 transition-opacity flex items-center justify-center gap-2">
                  {isSubmittingPayout
                    ? <><div className="w-4 h-4 rounded-full border-2 border-slate-950/40 border-t-transparent animate-spin" />Submitting…</>
                    : <><ArrowUpRight className="w-4 h-4" />Submit Request</>
                  }
                </button>
                <button onClick={() => setShowPayoutForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-white/5 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Payout history */}
          {isLoadingPayouts ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800/40 animate-pulse" />)}
            </div>
          ) : payoutRequests.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 rounded-full bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto mb-2">
                <ArrowUpRight className="w-4 h-4 text-slate-600" />
              </div>
              <p className="text-sm text-slate-500">No withdrawal requests yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payoutRequests.map((req) => {
                const statusClass = payoutStatusColors[req.status] ?? "bg-slate-700/30 text-slate-300 border-slate-700";
                return (
                  <div key={req.id} className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white capitalize">{req.requestType.replace(/_/g, " ")}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{req.network} · {req.momoNumber} · {req.accountName}</p>
                        {req.rejectionReason && (
                          <p className="text-xs text-red-400 mt-1">Rejected: {req.rejectionReason}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-display text-base font-bold text-white">₵{req.amountGhs.toFixed(2)}</p>
                        <span className={`inline-flex mt-1 rounded-full border px-2 py-0.5 text-[11px] capitalize ${statusClass}`}>
                          {req.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[11px] text-slate-500">
                        {req.createdAt ? new Date(req.createdAt).toLocaleString() : "—"}
                      </p>
                      {req.status === "pending" && (
                        <button onClick={() => void handleCancelPayout(req.id)}
                          disabled={cancellingPayoutId === req.id}
                          className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors">
                          {cancellingPayoutId === req.id ? "Cancelling…" : "Cancel"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default TransactionsPage;
