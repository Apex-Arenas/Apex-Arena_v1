import { CalendarDays } from "lucide-react";
import type { Tournament } from "../../services/tournament.service";
import { formatDateTime } from "./tournament-detail.utils";

interface ScheduleCardProps {
  tournament: Tournament;
  checkInStart?: string;
  checkInEnd?: string;
}

export default function ScheduleCard({ tournament, checkInStart, checkInEnd }: ScheduleCardProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
        <CalendarDays className="w-3.5 h-3.5 text-orange-400" />
        <h2 className="font-display text-sm font-bold text-white">
          Schedule
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-px bg-slate-800/60 p-px">
        {[
          {
            label: "Reg. Opens",
            value: tournament.schedule.registrationStart,
            dot: "bg-emerald-400",
          },
          {
            label: "Reg. Closes",
            value: tournament.schedule.registrationEnd,
            dot: "bg-red-400",
          },
          {
            label: "Starts",
            value: tournament.schedule.tournamentStart,
            dot: "bg-orange-400",
          },
          {
            label: "Ends",
            value: tournament.schedule.tournamentEnd,
            dot: "bg-slate-400",
          },
          {
            label: "Check-in Open",
            value: tournament.schedule.checkInStart ?? checkInStart,
            dot: "bg-cyan-400",
          },
          {
            label: "Check-in End",
            value: tournament.schedule.checkInEnd ?? checkInEnd,
            dot: "bg-amber-400",
          },
        ]
          .filter((r) => Boolean(r.value))
          .map((r) => (
            <div
              key={r.label}
              className="flex flex-col gap-1.5 px-4 py-3 bg-slate-900/60"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.dot}`}
                />
                <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">
                  {r.label}
                </span>
              </div>
              <span className="text-xs font-semibold text-white pl-4">
                {formatDateTime(r.value)}
              </span>
            </div>
          ))}
      </div>
    </section>
  );
}
