import { useCallback, useEffect, useState } from "react";
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Loader2,
  CheckCircle2, XCircle, Clock, AlertCircle, X,
  CreditCard, Phone, ChevronRight,
} from "lucide-react";
import { apiGet, apiPost } from "../../utils/api.utils";
import { FINANCE_ENDPOINTS } from "../../config/api.config";
import { generateUniqueIdempotencyKey } from "../../utils/idempotency.utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WalletBalance {
  balance: number;           // minor units (pesewas)
  currency: string;
  lastUpdated?: string;
}

interface PayoutRequest {
  id: string;
  amount: number;            // minor units
  status: "pending" | "processing" | "completed" | "failed" | "rejected";
  momoNumber?: string;
  momoNetwork?: string;
  createdAt: string;
  processedAt?: string;
  rejectionReason?: string;
}

type ModalView = null | "deposit" | "withdraw";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtGhs(minor: number) {
  return `GHS ${(minor / 100).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GH", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const STATUS_CHIP: Record<PayoutRequest["status"], { cls: string; label: string }> = {
  pending:    { cls: "bg-amber-500/15 text-amber-300 border-amber-500/25",    label: "Pending"    },
  processing: { cls: "bg-blue-500/15  text-blue-300  border-blue-500/25",     label: "Processing" },
  completed:  { cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", label: "Paid"    },
  failed:     { cls: "bg-red-500/15   text-red-300   border-red-500/25",      label: "Failed"     },
  rejected:   { cls: "bg-red-500/15   text-red-300   border-red-500/25",      label: "Rejected"   },
};

const MOMO_NETWORKS = ["MTN", "Vodafone", "AirtelTigo"];

// ─── Deposit Modal ────────────────────────────────────────────────────────────

function DepositModal({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const amountNum = parseFloat(amount);
  const isValid = !isNaN(amountNum) && amountNum >= 1;

  async function handleDeposit() {
    if (!isValid) return;
    setSubmitting(true);
    setError("");
    try {
      const callbackUrl = `${FINANCE_ENDPOINTS.DEPOSIT_VERIFY}?return_to=${encodeURIComponent(window.location.origin)}`;
      const res = await apiPost(FINANCE_ENDPOINTS.DEPOSIT, {
        amount_ghs: amountNum,
        callback_url: callbackUrl,
        idempotency_key: generateUniqueIdempotencyKey(),
      });
      if (!res.success) {
        setError((res as { error?: { message?: string } }).error?.message ?? "Deposit initiation failed.");
        return;
      }
      const data = res.data as Record<string, unknown>;
      // API returns authorization_url directly on data (same shape as escrow deposit)
      // Fall back to other common gateway field names just in case
      const inner = (typeof data.data === "object" && data.data !== null ? data.data : data) as Record<string, unknown>;
      const paymentUrl =
        (data.authorization_url as string | undefined) ??
        (data.payment_url as string | undefined) ??
        (data.redirect_url as string | undefined) ??
        (data.checkout_url as string | undefined) ??
        (data.link as string | undefined) ??
        (inner.authorization_url as string | undefined) ??
        (inner.payment_url as string | undefined) ??
        (inner.redirect_url as string | undefined);

      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        setError(`No payment URL in response. Keys: ${Object.keys(data).join(", ") || "none"}`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white">Add Funds</h2>
              <p className="text-xs text-slate-400">via Mobile Money or card</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Amount input */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">Amount (GHS)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">GHS</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(""); }}
                placeholder="0.00"
                className="w-full pl-12 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors text-lg font-semibold"
              />
            </div>
          </div>

          {/* Quick amount chips */}
          <div>
            <p className="text-xs text-slate-500 mb-2">Quick add</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => { setAmount(String(q)); setError(""); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    amount === String(q)
                      ? "border-cyan-500 bg-cyan-500/15 text-cyan-300"
                      : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-xs text-slate-400">
            <CreditCard className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
            You'll be redirected to complete payment securely via our payment provider.
          </div>

          <button
            onClick={handleDeposit}
            disabled={!isValid || submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 font-bold text-sm hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownLeft className="w-4 h-4" />}
            {submitting ? "Redirecting…" : isValid ? `Deposit GHS ${amountNum.toFixed(2)}` : "Enter an amount"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Withdraw Modal ───────────────────────────────────────────────────────────

function WithdrawModal({ balance, onClose, onSuccess }: { balance: number; onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [momoNetwork, setMomoNetwork] = useState(MOMO_NETWORKS[0]);
  const [accountName, setAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const amountNum = parseFloat(amount);
  const amountMinor = Math.round(amountNum * 100);
  const isValid =
    !isNaN(amountNum) &&
    amountNum >= 1 &&
    amountMinor <= balance &&
    /^0[235]\d{8}$/.test(momoNumber) &&
    accountName.trim().length >= 2;

  async function handleWithdraw() {
    if (!isValid) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await apiPost(FINANCE_ENDPOINTS.PAYOUT_REQUEST, {
        amount_ghs: amountNum,
        request_type: "wallet_withdrawal",
        momo_number: momoNumber,
        network: momoNetwork,
        account_name: accountName.trim(),
        idempotency_key: generateUniqueIdempotencyKey(),
      });
      if (!res.success) {
        setError((res as { error?: { message?: string } }).error?.message ?? "Withdrawal request failed.");
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white">Withdraw</h2>
              <p className="text-xs text-slate-400">Available: {fmtGhs(balance)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">Amount (GHS)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">GHS</span>
              <input
                type="number"
                min="1"
                max={balance / 100}
                step="0.01"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(""); }}
                placeholder="0.00"
                className="w-full pl-12 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors text-lg font-semibold"
              />
            </div>
            {amountNum > 0 && amountMinor > balance && (
              <p className="text-xs text-red-400 mt-1">Exceeds available balance.</p>
            )}
          </div>

          {/* MoMo network */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">Mobile Money Network</label>
            <div className="grid grid-cols-3 gap-2">
              {MOMO_NETWORKS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMomoNetwork(n)}
                  className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    momoNetwork === n
                      ? "border-orange-500 bg-orange-500/15 text-orange-300"
                      : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* MoMo number */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">MoMo Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                value={momoNumber}
                onChange={(e) => { setMomoNumber(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                placeholder="0241234567"
                className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            {momoNumber.length > 0 && !/^0[235]\d{8}$/.test(momoNumber) && (
              <p className="text-xs text-red-400 mt-1">Enter a valid 10-digit Ghanaian MoMo number.</p>
            )}
          </div>

          {/* Account name */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">Account Name</label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => { setAccountName(e.target.value); setError(""); }}
              placeholder="Name registered on the MoMo account"
              className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
            Withdrawals are reviewed and processed within 1–2 business days.
          </div>

          <button
            onClick={handleWithdraw}
            disabled={!isValid || submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 font-bold text-sm hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
            {submitting ? "Submitting…" : isValid ? `Withdraw GHS ${amountNum.toFixed(2)}` : "Complete the form"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── WalletPage ───────────────────────────────────────────────────────────────

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalView>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [walletRes, payoutsRes] = await Promise.all([
        apiGet(FINANCE_ENDPOINTS.WALLET),
        apiGet(FINANCE_ENDPOINTS.PAYOUT_MY_REQUESTS),
      ]);

      if (walletRes.success) {
        const d = walletRes.data as Record<string, unknown>;
        setWallet({
          balance: Number(d.available_balance ?? d.balance ?? d.wallet_balance ?? 0),
          currency: (d.currency as string | undefined) ?? "GHS",
          lastUpdated: d.updated_at as string | undefined,
        });
      }

      if (payoutsRes.success) {
        const d = payoutsRes.data as Record<string, unknown>;
        const list = (Array.isArray(payoutsRes.data) ? payoutsRes.data : (d.requests ?? d.payouts ?? [])) as Record<string, unknown>[];
        setPayouts(list.map((p) => {
          const pd = (p.payout_details ?? {}) as Record<string, unknown>;
          return {
            id: (p._id ?? p.id) as string,
            amount: Number(p.amount ?? 0),
            status: (p.status as PayoutRequest["status"]) ?? "pending",
            momoNumber: (pd.momo_number ?? p.momo_number) as string | undefined,
            momoNetwork: (pd.network ?? p.momo_network) as string | undefined,
            createdAt: (p.created_at ?? p.createdAt) as string,
            processedAt: (p.processed_at ?? p.processedAt) as string | undefined,
            rejectionReason: (p.rejection_reason ?? p.rejectionReason) as string | undefined,
          };
        }));
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const balance = wallet?.balance ?? 0;

  const statusIcon = (status: PayoutRequest["status"]) => {
    if (status === "completed") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (status === "failed" || status === "rejected") return <XCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-amber-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Wallet</h1>

      {/* Success toast */}
      {successMsg && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="flex-1">{successMsg}</span>
          <button onClick={() => setSuccessMsg("")}><X className="w-4 h-4 opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      {/* Balance card */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 p-6 sm:p-8">
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-cyan-500/[0.07] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-indigo-500/6 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
            <Wallet className="w-4 h-4" />
            Available Balance
          </div>
          <p className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight">
            {fmtGhs(balance)}
          </p>
          {wallet?.lastUpdated && (
            <p className="text-xs text-slate-500 mt-2">Updated {fmtDate(wallet.lastUpdated)}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              onClick={() => setModal("deposit")}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 font-bold text-sm hover:shadow-lg hover:shadow-orange-500/25 transition-all"
            >
              <ArrowDownLeft className="w-4 h-4" />
              Add Funds
            </button>
            <button
              onClick={() => setModal("withdraw")}
              disabled={balance === 0}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-700 text-slate-300 font-semibold text-sm hover:border-slate-500 hover:bg-slate-800/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ArrowUpRight className="w-4 h-4" />
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Info strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        {[
          { icon: CreditCard, text: "MTN MoMo · Vodafone · AirtelTigo", sub: "Payment methods" },
          { icon: CheckCircle2, text: "Escrow-secured", sub: "Tournament entry fees held safely" },
          { icon: Clock, text: "1–2 business days", sub: "Withdrawal processing time" },
        ].map(({ icon: Icon, text, sub }) => (
          <div key={sub} className="flex items-start gap-3 px-4 py-3 rounded-xl border border-slate-800/80 bg-slate-900">
            <Icon className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium text-xs">{text}</p>
              <p className="text-slate-500 text-[11px] mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Payout history */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="font-display text-sm font-semibold text-white">Withdrawal History</h2>
          <button onClick={() => void load()} className="text-xs text-slate-400 hover:text-white transition-colors">Refresh</button>
        </div>

        {payouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
            <ArrowUpRight className="w-8 h-8 text-slate-700" />
            <p className="text-slate-400 text-sm">No withdrawal requests yet.</p>
            <p className="text-slate-600 text-xs">Requests you submit will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {payouts.map((p) => {
              const chip = STATUS_CHIP[p.status];
              return (
                <li key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-800/30 transition-colors">
                  <div className="shrink-0">{statusIcon(p.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{fmtGhs(p.amount)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${chip.cls}`}>
                        {chip.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {p.momoNetwork && `${p.momoNetwork} · `}{p.momoNumber} · {fmtDate(p.createdAt)}
                    </p>
                    {p.rejectionReason && (
                      <p className="text-xs text-red-400 mt-0.5">{p.rejectionReason}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Modals */}
      {modal === "deposit" && (
        <DepositModal onClose={() => setModal(null)} />
      )}
      {modal === "withdraw" && (
        <WithdrawModal
          balance={balance}
          onClose={() => setModal(null)}
          onSuccess={() => {
            setSuccessMsg("Withdrawal request submitted. You'll be notified once it's processed.");
            void load();
          }}
        />
      )}
    </div>
  );
}
