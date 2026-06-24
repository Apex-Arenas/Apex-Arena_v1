import type { Dispatch, SetStateAction } from "react";
import { Gavel, X, Loader2 } from "lucide-react";

interface ResolveDisputeModalProps {
  disputeWinnerId: string;
  setDisputeWinnerId: Dispatch<SetStateAction<string>>;
  disputeResolution: string;
  setDisputeResolution: Dispatch<SetStateAction<string>>;
  isResolving: boolean;
  onResolve: () => void;
  onClose: () => void;
}

export default function ResolveDisputeModal({
  disputeWinnerId,
  setDisputeWinnerId,
  disputeResolution,
  setDisputeResolution,
  isResolving,
  onResolve,
  onClose,
}: ResolveDisputeModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80 bg-slate-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Gavel className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-white">
                Resolve Dispute
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Award winner and add resolution note
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Winner In-Game ID
            </label>
            <input
              type="text"
              value={disputeWinnerId}
              onChange={(e) => setDisputeWinnerId(e.target.value)}
              placeholder="Winning player's in-game ID"
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Resolution Notes
            </label>
            <textarea
              value={disputeResolution}
              onChange={(e) => setDisputeResolution(e.target.value)}
              rows={3}
              placeholder="Explain the reason for your decision…"
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors resize-none"
            />
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onResolve}
            disabled={
              isResolving ||
              !disputeWinnerId.trim() ||
              !disputeResolution.trim()
            }
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-400 disabled:opacity-60 transition-colors"
          >
            {isResolving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Gavel className="w-4 h-4" />
            )}
            Resolve
          </button>
        </div>
      </div>
    </div>
  );
}
