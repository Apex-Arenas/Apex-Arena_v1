import { AlertCircle, Loader2, X } from "lucide-react";
import type { BracketMatch } from "./types";

type DisputeResultModalProps = {
  match: BracketMatch | null;
  reason: string;
  onReasonChange: (value: string) => void;
  evidenceUrl: string;
  onEvidenceUrlChange: (value: string) => void;
  onScreenshotChange: (file: File | null) => void;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export default function DisputeResultModal({
  match,
  reason,
  onReasonChange,
  evidenceUrl,
  onEvidenceUrlChange,
  onScreenshotChange,
  isSubmitting,
  onClose,
  onSubmit,
}: DisputeResultModalProps) {
  if (!match) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-start justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Dispute Match Result
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Provide your reason and evidence for organizer review.
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
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">
              Dispute Reason
            </span>
            <textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              rows={3}
              placeholder="Explain what happened..."
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">
              Screenshot Evidence (optional)
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                onScreenshotChange(file);
              }}
              className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-100 hover:file:bg-slate-600"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">
              Evidence URL (optional)
            </span>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(event) => onEvidenceUrlChange(event.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </label>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={isSubmitting || reason.trim().length < 5}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 disabled:opacity-60 transition-colors"
              type="button"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {isSubmitting ? "Submitting..." : "Submit Dispute"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
