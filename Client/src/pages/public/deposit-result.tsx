import { Link, useLocation, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, XCircle, Wallet } from "lucide-react";

type DepositStatus = "success" | "failed" | "pending";

const CONFIG: Record<DepositStatus, {
  icon: React.ReactNode;
  badgeCls: string;
  heading: string;
  message: string;
  btnCls: string;
}> = {
  success: {
    icon: <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-400" />,
    badgeCls: "text-emerald-300/80",
    heading: "Deposit Confirmed",
    message: "Your wallet has been topped up. Your new balance will reflect immediately.",
    btnCls: "bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 hover:shadow-lg hover:shadow-orange-500/25",
  },
  pending: {
    icon: <Clock className="mx-auto mb-4 h-14 w-14 text-amber-400" />,
    badgeCls: "text-amber-300/80",
    heading: "Payment Processing",
    message: "Your payment was received and your wallet is being credited — this usually takes a few seconds. Refresh your wallet page to see the updated balance. Contact support if it doesn't reflect within 5 minutes.",
    btnCls: "bg-linear-to-r from-amber-500 to-orange-400 text-slate-950 hover:shadow-lg hover:shadow-amber-500/25",
  },
  failed: {
    icon: <XCircle className="mx-auto mb-4 h-14 w-14 text-red-400" />,
    badgeCls: "text-red-300/80",
    heading: "Payment Cancelled or Failed",
    message: "Your payment was not completed. No funds were deducted from your account. You can try again or contact support if this keeps happening.",
    btnCls: "bg-linear-to-r from-slate-700 to-slate-600 text-white hover:from-slate-600 hover:to-slate-500",
  },
};

export default function DepositResult() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get("transaction_id");
  const reason = searchParams.get("reason");

  const segment = pathname.split("/").pop() as DepositStatus;
  const status: DepositStatus = ["success", "failed", "pending"].includes(segment)
    ? segment
    : "failed";

  const c = CONFIG[status];

  return (
    <section className="relative mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 py-16 sm:px-6">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.12),transparent_48%),radial-gradient(circle_at_bottom,rgba(139,92,246,0.10),transparent_55%)]" />

      <div className="w-full rounded-3xl border border-white/15 bg-slate-900/65 p-6 backdrop-blur sm:p-8 text-center">
        {c.icon}

        <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.24em] ${c.badgeCls}`}>
          Wallet Deposit
        </p>

        <h1 className="text-2xl font-semibold text-white sm:text-3xl">{c.heading}</h1>

        <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">{c.message}</p>

        {reason && status !== "success" && (
          <p className="mt-3 text-xs text-slate-500">Reason: {reason}</p>
        )}

        {transactionId && (
          <p className="mt-2 text-xs text-slate-500">
            Ref: <span className="font-mono text-slate-400">{transactionId}</span>
          </p>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {status === "failed" && (
            <Link
              to="/auth/wallet"
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:shadow-lg hover:shadow-orange-500/25"
            >
              Try Again
            </Link>
          )}
          <Link
            to="/auth/wallet"
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              status !== "failed"
                ? c.btnCls
                : "border border-white/20 text-slate-100 hover:border-white/40 hover:bg-white/5"
            }`}
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
        </div>
      </div>
    </section>
  );
}
