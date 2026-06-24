import { Trash2 } from "lucide-react";

interface DeleteDraftModalProps {
  onDelete: () => void;
  onClose: () => void;
}

export default function DeleteDraftModal({ onDelete, onClose }: DeleteDraftModalProps) {
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
                Delete Draft?
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                This cannot be undone
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            This will permanently delete the tournament draft. You cannot
            recover it.
          </p>
        </div>
        <div className="px-6 pb-6 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 transition-colors"
          >
            Keep Draft
          </button>
          <button
            onClick={onDelete}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-400 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
