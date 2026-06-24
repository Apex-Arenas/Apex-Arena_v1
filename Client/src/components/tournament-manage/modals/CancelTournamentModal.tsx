import type { Dispatch, SetStateAction } from "react";
import { AlertCircle } from "lucide-react";

interface CancelTournamentModalProps {
  cancelReason: string;
  setCancelReason: Dispatch<SetStateAction<string>>;
  onCancel: () => void;
  onClose: () => void;
}

export default function CancelTournamentModal({
  cancelReason,
  setCancelReason,
  onCancel,
  onClose,
}: CancelTournamentModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl shadow-black/60">
        <div className="px-6 pt-6 pb-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white">
                Cancel Tournament?
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                All players will be refunded
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            This will cancel the tournament and refund all registered
            players. This action cannot be undone.
          </p>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Reason
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Short reason for participants (min 5 chars)"
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500/50 transition-colors resize-none"
            />
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 hover:text-white transition-colors"
          >
            Keep Tournament
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-400 transition-colors"
          >
            Cancel Tournament
          </button>
        </div>
      </div>
    </div>
  );
}
