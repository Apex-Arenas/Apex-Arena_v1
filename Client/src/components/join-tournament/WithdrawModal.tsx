import { AlertCircle, Loader2, X } from "lucide-react";
import { type MyTournamentRegistration } from "../../services/tournament.service";

interface WithdrawModalProps {
  target: MyTournamentRegistration;
  reason: string;
  reasonError: string | null;
  isSubmitting: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function WithdrawModal({
  target,
  reason,
  reasonError,
  isSubmitting,
  onReasonChange,
  onClose,
  onConfirm,
}: WithdrawModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-start justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Withdraw Registration
            </h2>
            <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">
              {target.tournamentTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5 text-sm text-amber-300">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Please provide a short reason for this withdrawal.</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Withdrawal Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={4}
              maxLength={300}
              placeholder="e.g., Scheduling conflict, unavailable at tournament time..."
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
            />
            {reasonError && (
              <p className="text-xs text-red-400 mt-1">{reasonError}</p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 disabled:opacity-60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting || reason.trim().length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-400 disabled:opacity-60 transition-colors"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Withdrawing..." : "Confirm Withdraw"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
