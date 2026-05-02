import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, parse, isValid } from "date-fns";
import { CalendarDays, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import "react-day-picker/style.css";

interface DateTimePickerProps {
  value: string;          // "YYYY-MM-DDTHH:mm"
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

function parseLocal(v: string): Date | null {
  if (!v) return null;
  const d = parse(v, "yyyy-MM-dd'T'HH:mm", new Date());
  return isValid(d) ? d : null;
}

function toLocal(d: Date, h: number, m: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${format(d, "yyyy-MM-dd")}T${pad(h)}:${pad(m)}`;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & time",
  className = "",
}: DateTimePickerProps) {
  const parsed  = parseLocal(value);
  const [open, setOpen]   = useState(false);
  const [month, setMonth] = useState<Date>(parsed ?? new Date());
  const [hour, setHour]   = useState(parsed ? parsed.getHours()   : 12);
  const [minute, setMinute] = useState(parsed ? parsed.getMinutes() : 0);
  const [selected, setSelected] = useState<Date | undefined>(parsed ?? undefined);
  const ref = useRef<HTMLDivElement>(null);

  // Keep internal state in sync when value prop changes from outside
  useEffect(() => {
    const d = parseLocal(value);
    if (d) {
      setSelected(d);
      setMonth(d);
      setHour(d.getHours());
      setMinute(d.getMinutes());
    } else {
      setSelected(undefined);
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const emit = (day: Date, h: number, m: number) => {
    onChange(toLocal(day, h, m));
  };

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) return;
    setSelected(day);
    emit(day, hour, minute);
  };

  const handleHour = (h: number) => {
    setHour(h);
    if (selected) emit(selected, h, minute);
  };

  const handleMinute = (m: number) => {
    setMinute(m);
    if (selected) emit(selected, hour, m);
  };

  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayAmPm = hour < 12 ? "AM" : "PM";
  const displayValue = selected
    ? `${format(selected, "MMM d, yyyy")}  ${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${displayAmPm}`
    : "";

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 bg-slate-800/50 border rounded-xl px-4 py-2.5 text-sm transition-colors text-left ${
          open
            ? "border-orange-500/70 bg-slate-800"
            : "border-slate-700 hover:border-slate-600"
        }`}
      >
        <CalendarDays className="w-4 h-4 text-slate-500 shrink-0" />
        <span className={displayValue ? "text-white" : "text-slate-500"}>
          {displayValue || placeholder}
        </span>
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute z-50 mt-2 left-0 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden min-w-[300px]">
          {/* Calendar */}
          <div className="p-3">
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleDaySelect}
              month={month}
              onMonthChange={setMonth}
              classNames={{
                root:         "text-white select-none",
                months:       "flex flex-col",
                month:        "space-y-2",
                month_caption: "flex items-center justify-between px-1 py-1",
                caption_label: "text-sm font-semibold text-white",
                nav:          "flex items-center gap-1",
                button_previous: "p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors",
                button_next:     "p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors",
                weeks:        "space-y-1",
                weekdays:     "flex",
                weekday:      "w-9 text-center text-[11px] font-semibold text-slate-500 uppercase",
                week:         "flex",
                day:          "w-9 h-9",
                day_button:   "w-9 h-9 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center justify-center",
                selected:     "bg-orange-500 text-white rounded-lg",
                today:        "font-bold text-orange-400",
                outside:      "opacity-30",
                disabled:     "opacity-20 cursor-not-allowed",
              }}
              components={{
                Chevron: ({ orientation }) =>
                  orientation === "left"
                    ? <ChevronLeft className="w-4 h-4" />
                    : <ChevronRight className="w-4 h-4" />,
              }}
            />
          </div>

          {/* Time picker */}
          <div className="border-t border-slate-800 px-4 py-4 bg-slate-950/40">
            <div className="flex items-center gap-1.5 mb-3">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Time</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              {/* Hour stepper */}
              <div className="flex flex-col items-center gap-1">
                <button type="button" onClick={() => handleHour((hour + 1) % 24)}
                  className="w-9 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center">
                  <ChevronLeft className="w-3.5 h-3.5 -rotate-90" />
                </button>
                <input
                  type="number" min={0} max={23}
                  value={String(hour).padStart(2, "0")}
                  onChange={(e) => {
                    const v = Math.min(23, Math.max(0, Number(e.target.value)));
                    if (!isNaN(v)) handleHour(v);
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-14 h-11 bg-slate-800 border border-slate-700 rounded-xl text-xl font-bold text-white text-center tabular-nums focus:outline-none focus:border-orange-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button type="button" onClick={() => handleHour((hour - 1 + 24) % 24)}
                  className="w-9 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center">
                  <ChevronLeft className="w-3.5 h-3.5 rotate-90" />
                </button>
                <span className="text-[10px] text-slate-600 uppercase tracking-wide mt-0.5">Hour</span>
              </div>

              <span className="text-2xl font-bold text-slate-600 mb-5">:</span>

              {/* Minute stepper */}
              <div className="flex flex-col items-center gap-1">
                <button type="button" onClick={() => handleMinute((Math.round(minute / 5) * 5 + 5) % 60)}
                  className="w-9 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center">
                  <ChevronLeft className="w-3.5 h-3.5 -rotate-90" />
                </button>
                <input
                  type="number" min={0} max={59}
                  value={String(minute).padStart(2, "0")}
                  onChange={(e) => {
                    const v = Math.min(59, Math.max(0, Number(e.target.value)));
                    if (!isNaN(v)) handleMinute(v);
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-14 h-11 bg-slate-800 border border-slate-700 rounded-xl text-xl font-bold text-white text-center tabular-nums focus:outline-none focus:border-orange-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button type="button" onClick={() => handleMinute((Math.round(minute / 5) * 5 - 5 + 60) % 60)}
                  className="w-9 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center">
                  <ChevronLeft className="w-3.5 h-3.5 rotate-90" />
                </button>
                <span className="text-[10px] text-slate-600 uppercase tracking-wide mt-0.5">Min</span>
              </div>

              {/* AM/PM display */}
              <div className="flex flex-col gap-1.5 mb-5 ml-1">
                <button type="button"
                  onClick={() => handleHour(hour < 12 ? hour : hour - 12)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${hour < 12 ? "bg-orange-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                  AM
                </button>
                <button type="button"
                  onClick={() => handleHour(hour >= 12 ? hour : hour + 12)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${hour >= 12 ? "bg-orange-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* Confirm */}
          <div className="px-4 py-3 border-t border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-1.5 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
