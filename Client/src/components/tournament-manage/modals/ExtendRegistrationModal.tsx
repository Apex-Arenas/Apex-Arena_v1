import type { Dispatch, SetStateAction } from "react";
import { CalendarDays, X, Loader2 } from "lucide-react";
import { DateTimePicker } from "../../ui/DateTimePicker";
import type { Tournament } from "../../../services/tournament.service";

interface ExtendRegistrationModalProps {
  tournament: Tournament | null;
  extendDate: string;
  setExtendDate: Dispatch<SetStateAction<string>>;
  isExtending: boolean;
  onExtend: () => void;
  onClose: () => void;
}

export default function ExtendRegistrationModal({
  tournament,
  extendDate,
  setExtendDate,
  isExtending,
  onExtend,
  onClose,
}: ExtendRegistrationModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80 bg-slate-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-white">
                Extend Registration
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Give players more time to register
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
              New Deadline
            </label>
            <DateTimePicker
              value={extendDate}
              onChange={setExtendDate}
              placeholder="Pick new deadline"
              minDate={
                tournament?.schedule.registrationEnd
                  ? new Date(tournament.schedule.registrationEnd)
                  : new Date()
              }
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
            onClick={onExtend}
            disabled={!extendDate || isExtending}
            className="flex-1 inline-flex items-center justify-center py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExtending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Extend Deadline"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
