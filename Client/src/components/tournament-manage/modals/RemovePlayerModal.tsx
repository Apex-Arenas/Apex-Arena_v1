import { Trash2, Loader2 } from "lucide-react";

interface RemovePlayerModalProps {
  displayName: string;
  isRemoving: boolean;
  onRemove: () => void;
  onClose: () => void;
}

export default function RemovePlayerModal({
  displayName,
  isRemoving,
  onRemove,
  onClose,
}: RemovePlayerModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl shadow-black/60">
        <div className="px-6 pt-6 pb-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white">
                Remove Player?
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {displayName}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            This player will be removed and their entry fee (if any)
            refunded to their wallet.
          </p>
        </div>
        <div className="px-6 pb-6 flex gap-2.5">
          <button
            onClick={onClose}
            disabled={isRemoving}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 disabled:opacity-50 transition-colors"
          >
            Keep Player
          </button>
          <button
            onClick={onRemove}
            disabled={isRemoving}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-400 disabled:opacity-60 transition-colors"
          >
            {isRemoving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            {isRemoving ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}
