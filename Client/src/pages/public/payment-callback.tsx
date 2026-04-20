import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, XCircle, Loader2, Wallet } from "lucide-react";
import { apiGet } from "../../utils/api.utils";
import { FINANCE_ENDPOINTS } from "../../config/api.config";

type Status = "verifying" | "success" | "processing" | "failed";
type FlowType = "wallet" | "escrow";

interface TransactionRaw {
  gateway_transaction_id?: string;
  status?: string;
}

async function checkReference(reference: string): Promise<Status> {
  const response = await apiGet(`${FINANCE_ENDPOINTS.TRANSACTIONS}?limit=50`);
  if (!response.success) return "processing";

  const data = response.data as Record<string, unknown>;
  const list = Array.isArray(data)
    ? (data as TransactionRaw[])
    : ((data.transactions ?? data.data ?? []) as TransactionRaw[]);

  const match = list.find((t) => t.gateway_transaction_id === reference);
  if (!match) return "processing";
  if (match.status === "completed") return "success";
  if (match.status === "failed" || match.status === "cancelled") return "failed";
  return "processing";
}

const COPY: Record<
  FlowType,
  Record<Status, { heading: string; message: string }>
> = {
  wallet: {
    verifying:  { heading: "Verifying Payment…",   message: "Please wait while we confirm your deposit." },
    success:    { heading: "Deposit Confirmed",     message: "Your wallet has been topped up. Your new balance will reflect immediately." },
    processing: { heading: "Deposit Processing",   message: "Your payment was received and is being processed. Your wallet balance will update within a few seconds." },
    failed:     { heading: "Deposit Not Confirmed", message: "We could not confirm your payment. Please check your Wallet page or contact support if the issue persists." },
  },
  escrow: {
    verifying:  { heading: "Verifying Payment…",    message: "Please wait while we check your payment." },
    success:    { heading: "Payment Confirmed",      message: "Your prize pool deposit was completed. Your tournament will open for registration once the payment is confirmed by our system." },
    processing: { heading: "Payment Processing",    message: "Your payment was received and is being processed. Your tournament will open for registration once confirmed by the system — this usually takes a few seconds." },
    failed:     { heading: "Payment Not Confirmed", message: "We could not confirm your payment. Please check your My Tournaments page or contact support if the issue persists." },
  },
};

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>("verifying");

  const reference = useMemo(
    () => searchParams.get("reference") ?? searchParams.get("trxref") ?? "",
    [searchParams],
  );

  // "type=wallet" is appended by WalletPage; anything else (or absent) = escrow
  const flow: FlowType = searchParams.get("type") === "wallet" ? "wallet" : "escrow";

  useEffect(() => {
    if (!reference) { setStatus("failed"); return; }
    checkReference(reference).then(setStatus).catch(() => setStatus("processing"));
  }, [reference]);

  const copy = COPY[flow][status];

  const icon =
    status === "verifying"  ? <Loader2    className="mx-auto mb-4 h-14 w-14 text-cyan-400 animate-spin" /> :
    status === "success"    ? <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-400" /> :
    status === "processing" ? <Clock       className="mx-auto mb-4 h-14 w-14 text-amber-400" /> :
                              <XCircle     className="mx-auto mb-4 h-14 w-14 text-red-400" />;

  return (
    <section className="relative mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 py-16 sm:px-6">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.15),transparent_48%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.12),transparent_55%)]" />

      <div className="w-full rounded-3xl border border-white/15 bg-slate-900/65 p-6 backdrop-blur sm:p-8 text-center">
        {icon}

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300/80">
          Payment
        </p>

        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          {copy.heading}
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
          {copy.message}
        </p>

        {reference && status !== "verifying" && (
          <p className="mt-3 text-xs text-slate-500">
            Ref: <span className="font-mono text-slate-400">{reference}</span>
          </p>
        )}

        {status !== "verifying" && (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {flow === "wallet" ? (
              <>
                <Link
                  to="/auth/wallet"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:shadow-lg hover:shadow-orange-500/25"
                >
                  <Wallet className="w-4 h-4" />
                  Go to Wallet
                </Link>
                <Link
                  to="/auth"
                  className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-white/40 hover:bg-white/5"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/auth/organizer/tournaments"
                  className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400"
                >
                  View My Tournaments
                </Link>
                <Link
                  to="/auth"
                  className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-white/40 hover:bg-white/5"
                >
                  Go to Dashboard
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default PaymentCallback;
