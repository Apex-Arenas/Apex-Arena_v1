import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Clock3, Loader2, RefreshCcw, Wallet } from "lucide-react";
import {
  organizerService,
  type WalletBalance,
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

function formatMoney(amountMinorUnits: number, currency: string) {
  const major = amountMinorUnits / 100;
  return `${currency} ${major.toFixed(2)}`;
}

function mapTransaction(raw: TransactionRaw): WalletTransaction {
  const amount = Number(raw.amount_minor ?? raw.amount_ghs ?? raw.amount ?? 0);

  return {
    id: String(
      raw._id ?? raw.id ?? raw.gateway_transaction_id ?? crypto.randomUUID(),
    ),
    reference: String(raw.gateway_transaction_id ?? raw.reference ?? "-"),
    type: String(raw.type ?? "transaction"),
    status: String(raw.status ?? "pending"),
    amountMinorUnits: Number.isFinite(amount) ? amount : 0,
    currency: String(raw.currency ?? "GHS"),
    createdAt: String(raw.created_at ?? raw.createdAt ?? ""),
    description: String(raw.description ?? ""),
  };
}

const statusClassByValue: Record<string, string> = {
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  successful: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  processing: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  failed: "bg-red-500/15 text-red-300 border-red-500/30",
  cancelled: "bg-slate-600/20 text-slate-300 border-slate-600/30",
};

const TransactionsPage = () => {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [walletAmountInput, setWalletAmountInput] = useState("10");
  const [isLoading, setIsLoading] = useState(true);
  const [isDepositing, setIsDepositing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

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
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Failed to load wallet and transactions.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWalletAndTransactions();
  }, [fetchWalletAndTransactions]);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [transactions]);

  const handleDeposit = async () => {
    const amount = Number(walletAmountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMsg("Enter a valid deposit amount greater than 0.");
      return;
    }

    setIsDepositing(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const result = await organizerService.initiateWalletTopUp(amount);
      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
        return;
      }

      setInfoMsg(
        "Deposit initiated. Check your payment app or recent transactions for updates.",
      );
      await fetchWalletAndTransactions();
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : "Failed to initiate deposit.",
      );
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Wallet & Transactions
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track your balance, deposit funds, and monitor payment activity.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void fetchWalletAndTransactions();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
        >
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {infoMsg && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-300">
          {infoMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4 h-fit">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-cyan-300" />
            Wallet Overview
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : (
            <>
              <div className="space-y-2 text-sm">
                <div className="rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2">
                  <p className="text-xs text-slate-400">Available Balance</p>
                  <p className="font-semibold text-emerald-300">
                    {formatMoney(
                      wallet?.availableBalance ?? 0,
                      wallet?.currency ?? "GHS",
                    )}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2">
                  <p className="text-xs text-slate-400">Pending Balance</p>
                  <p className="font-semibold text-amber-300">
                    {formatMoney(
                      wallet?.pendingBalance ?? 0,
                      wallet?.currency ?? "GHS",
                    )}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2">
                  <p className="text-xs text-slate-400">Escrow Locked</p>
                  <p className="font-semibold text-slate-200">
                    {formatMoney(
                      wallet?.escrowLocked ?? 0,
                      wallet?.currency ?? "GHS",
                    )}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2">
                  <p className="text-xs text-slate-400">Total Balance</p>
                  <p className="font-semibold text-cyan-300">
                    {formatMoney(
                      wallet?.totalBalance ?? 0,
                      wallet?.currency ?? "GHS",
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label
                  className="block text-xs text-slate-400"
                  htmlFor="wallet-top-up"
                >
                  Deposit Amount (GHS)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="wallet-top-up"
                    type="number"
                    min="1"
                    step="0.01"
                    value={walletAmountInput}
                    onChange={(e) => setWalletAmountInput(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    placeholder="e.g. 20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void handleDeposit();
                    }}
                    disabled={isDepositing}
                    className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
                  >
                    {isDepositing ? "Processing..." : "Deposit"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-white mb-3">
            Recent Transactions
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : sortedTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Clock3 className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">
                No transactions found yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedTransactions.map((transaction) => {
                const normalizedStatus = transaction.status.toLowerCase();
                const statusClass =
                  statusClassByValue[normalizedStatus] ??
                  "bg-slate-700/30 text-slate-300 border-slate-700";

                return (
                  <div
                    key={transaction.id}
                    className="rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate capitalize">
                          {transaction.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          Ref: {transaction.reference}
                        </p>
                        {transaction.description && (
                          <p className="text-xs text-slate-500 mt-1 truncate">
                            {transaction.description}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-cyan-300">
                          {formatMoney(
                            transaction.amountMinorUnits,
                            transaction.currency,
                          )}
                        </p>
                        <span
                          className={`inline-flex mt-1 rounded-full border px-2 py-0.5 text-[11px] capitalize ${statusClass}`}
                        >
                          {transaction.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-2">
                      {transaction.createdAt
                        ? new Date(transaction.createdAt).toLocaleString()
                        : "-"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default TransactionsPage;
