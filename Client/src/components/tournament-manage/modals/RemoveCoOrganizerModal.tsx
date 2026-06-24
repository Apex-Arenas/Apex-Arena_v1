import { UserPlus, Loader2 } from "lucide-react";

interface RemoveCoOrganizerModalProps {
  name: string;
  isRemoving: boolean;
  onRemove: () => void;
  onClose: () => void;
}

export default function RemoveCoOrganizerModal({
  name,
  isRemoving,
  onRemove,
  onClose,
}: RemoveCoOrganizerModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl shadow-black/60">
        <div className="px-6 pt-6 pb-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white">Remove Co-organizer?</h3>
              <p className="text-xs text-slate-500 mt-0.5">This can be undone by re-inviting them</p>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            <span className="font-semibold text-white">{name}</span> will lose access to co-manage this tournament.
          </p>
        </div>
        <div className="px-6 pb-6 flex gap-2.5">
          <button
            onClick={onClose}
            disabled={isRemoving}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onRemove}
            disabled={isRemoving}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
