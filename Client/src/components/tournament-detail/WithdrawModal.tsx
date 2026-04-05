import { AlertCircle, Loader2, X } from "lucide-react";

type WithdrawModalProps = {
  open: boolean;
  tournamentTitle: string;
  reason: string;
  onReasonChange: (value: string) => void;
  isWithdrawing: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function WithdrawModal({
  open,
  tournamentTitle,
  reason,
  onReasonChange,
  isWithdrawing,
  onClose,
  onConfirm,
}: WithdrawModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-start justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Withdraw
            </h2>
            <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">
              {tournamentTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5 text-sm text-amber-300">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Please provide a reason for withdrawing.</span>
          </div>
          <textarea
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            rows={3}
            maxLength={300}
            placeholder="e.g. Scheduling conflict..."
            className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isWithdrawing || reason.trim().length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-400 disabled:opacity-60 transition-colors"
              type="button"
            >
              {isWithdrawing && <Loader2 className="w-4 h-4 animate-spin" />}
              {isWithdrawing ? "Withdrawing..." : "Confirm Withdraw"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
