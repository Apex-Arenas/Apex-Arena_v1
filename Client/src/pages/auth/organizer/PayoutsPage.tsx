import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle, CheckCircle2, Clock3, Loader2,
  Send, X, DollarSign, Banknote, ArrowDownToLine,
} from "lucide-react";
import { organizerService, type PayoutRequest } from "../../../services/organizer.service";

// ─── Constants ────────────────────────────────────────────────────────────────

const NETWORKS = ["MTN", "Vodafone", "AirtelTigo"] as const;

const NETWORK_COLORS: Record<string, string> = {
  MTN:        "bg-yellow-400/15 text-yellow-300 border-yellow-400/20",
  Vodafone:   "bg-red-400/15 text-red-300 border-red-400/20",
  AirtelTigo: "bg-blue-400/15 text-blue-300 border-blue-400/20",
};

const STATUS_META: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  pending:   { label: "Pending",   dot: "bg-amber-400",   text: "text-amber-300",   bg: "bg-amber-400/10 border-amber-400/20"   },
  approved:  { label: "Approved",  dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-400/10 border-emerald-400/20" },
  completed: { label: "Paid",      dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-400/10 border-emerald-400/20" },
  rejected:  { label: "Rejected",  dot: "bg-red-400",     text: "text-red-300",     bg: "bg-red-400/10 border-red-400/20"         },
  cancelled: { label: "Cancelled", dot: "bg-slate-500",   text: "text-slate-400",   bg: "bg-slate-700/20 border-slate-700"        },
};

const inputCls = "w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/70 focus:bg-slate-800 transition-colors";
const selectCls = "w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/70 focus:bg-slate-800 transition-colors";

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PayoutsPage() {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [network, setNetwork] = useState<typeof NETWORKS[number]>("MTN");
  const [accountName, setAccountName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRequests(await organizerService.getMyPayoutRequests());
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(null); }
    else { setSuccess(msg); setError(null); }
    setTimeout(() => { setSuccess(null); setError(null); }, 5000);
  };

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 1) { showMsg("Enter a valid amount (min GHS 1).", true); return; }
    if (!momoNumber.trim()) { showMsg("Enter your mobile money number.", true); return; }
    if (!accountName.trim()) { showMsg("Enter account holder name.", true); return; }
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
      showMsg("Payout request submitted. Processing typically takes 1–3 business days.");
      setShowForm(false);
      setAmount(""); setMomoNumber(""); setAccountName(""); setNotes("");
      void load();
    } catch (e) {
      showMsg(e instanceof Error ? e.message : "Request failed.", true);
    } finally {
      setSubmitting(false);
    }
  };

  // Summary stats
  const totalPaid = requests
    .filter(r => r.status === "completed")
    .reduce((s, r) => s + r.amountGhs, 0);
  const totalPending = requests
    .filter(r => r.status === "pending" || r.status === "approved")
    .reduce((s, r) => s + r.amountGhs, 0);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-6">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-orange-500/[0.12] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-violet-600/[0.08] blur-3xl pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none [background-image:linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:48px_48px]" />

        <div className="relative px-6 py-7 sm:px-8">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-white">Payouts</h1>
                <p className="text-sm text-slate-400">Request and track your withdrawals.</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(v => !v)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 transition-all shrink-0"
            >
              <Send className="w-4 h-4" />
              New Request
            </button>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-slate-800/60 rounded-xl overflow-hidden border border-slate-800/60">
            {[
              { label: "Total Requests",  value: String(requests.length),                                           accent: "text-white" },
              { label: "Total Paid Out",  value: totalPaid > 0 ? `GHS ${totalPaid.toFixed(2)}` : "—",             accent: "text-emerald-400" },
              { label: "Pending Amount",  value: totalPending > 0 ? `GHS ${totalPending.toFixed(2)}` : "—",       accent: "text-amber-400" },
            ].map(s => (
              <div key={s.label} className="bg-slate-900 px-5 py-4">
                <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                <p className={`font-display text-xl font-bold tabular-nums ${s.accent}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Alerts ────────────────────────────────────────────── */}
      {success && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess(null)}><X className="w-4 h-4 opacity-50 hover:opacity-100" /></button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4 opacity-50 hover:opacity-100" /></button>
        </div>
      )}

      {/* ── New Request Form ───────────────────────────────────── */}
      {showForm && (
        <div className="rounded-2xl border border-orange-500/20 bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-orange-400" />
              <h2 className="font-display text-base font-bold text-white">New Payout Request</h2>
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
                <select value={network} onChange={e => setNetwork(e.target.value as typeof NETWORKS[number])} className={selectCls}>
                  {NETWORKS.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-2">MoMo Number <span className="text-orange-400">*</span></label>
                <input value={momoNumber} onChange={e => setMomoNumber(e.target.value)}
                  placeholder="e.g. 0241234567" className={inputCls} />
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

            <button onClick={() => { void submit(); }} disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-60 transition-all mt-2">
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
                : <><Send className="w-4 h-4" />Submit Request</>}
            </button>
          </div>
        </div>
      )}

      {/* ── History ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-white">Request History</h2>
          {requests.length > 0 && (
            <span className="text-xs text-slate-500">{requests.length} request{requests.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {loading ? (
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
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold">
              <Send className="w-4 h-4" /> New Request
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {requests.map(req => {
              const meta = STATUS_META[req.status] ?? STATUS_META.cancelled;
              const netColor = NETWORK_COLORS[req.network] ?? "bg-slate-700/40 text-slate-400 border-slate-700";
              return (
                <div key={req.id} className="px-6 py-5 flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center shrink-0 mt-0.5">
                    <ArrowDownToLine className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-lg font-bold text-white">
                        GHS {req.amountGhs.toFixed(2)}
                      </span>
                      <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${meta.bg} ${meta.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${netColor}`}>
                        {req.network}
                      </span>
                      <span className="text-xs text-slate-500">{req.momoNumber}</span>
                      <span className="text-slate-700">·</span>
                      <span className="text-xs text-slate-500">{req.accountName}</span>
                    </div>
                    {req.notes && (
                      <p className="text-xs text-slate-500 italic">"{req.notes}"</p>
                    )}
                    {req.rejectionReason && (
                      <div className="flex items-center gap-1.5 text-xs text-red-400">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {req.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Date */}
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">{fmtDate(req.createdAt)}</p>
                    {req.status === "completed" && (
                      <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 justify-end">
                        <CheckCircle2 className="w-3 h-3" /> Paid
                      </p>
                    )}
                    {req.status === "pending" && (
                      <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1 justify-end">
                        <Clock3 className="w-3 h-3" /> Processing
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
