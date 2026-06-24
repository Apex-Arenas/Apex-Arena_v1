import {
  Trophy,
  CalendarDays,
  DollarSign,
  Users,
  Globe,
  AlertCircle,
  Loader2,
  GitBranch,
  Shuffle,
  LayoutGrid,
  Repeat,
  Sword,
  ListOrdered,
} from "lucide-react";
import ImageUploadDropzone from "../ImageUploadDropzone";
import { DateTimePicker } from "../ui/DateTimePicker";
import { SectionCard, Field } from "./FormControls";
import {
  COUNTRIES,
  inputCls,
  selectCls,
  isTeamFormat,
  inferTeamSize,
  type GameOption,
} from "./create-tournament.utils";

interface FullTournamentFormProps {
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isEditMode: boolean;
  error: string | null;
  games: GameOption[];
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  gameId: string;
  setGameId: (value: string) => void;
  format: string;
  setFormat: (value: string) => void;
  tournamentType: string;
  setTournamentType: (value: string) => void;
  leagueLegs: "1" | "2";
  setLeagueLegs: (value: "1" | "2") => void;
  visibility: string;
  setVisibility: (value: string) => void;
  region: string;
  setRegion: (value: string) => void;
  timezone: string;
  setTimezone: (value: string) => void;
  contactEmail: string;
  setContactEmail: (value: string) => void;
  thumbnailUrl: string;
  setThumbnailUrl: (value: string) => void;
  registrationStart: string;
  setRegistrationStart: (value: string) => void;
  registrationEnd: string;
  setRegistrationEnd: (value: string) => void;
  tournamentStart: string;
  setTournamentStart: (value: string) => void;
  tournamentEnd: string;
  setTournamentEnd: (value: string) => void;
  checkInStart: string;
  setCheckInStart: (value: string) => void;
  checkInEnd: string;
  setCheckInEnd: (value: string) => void;
  waitlistEnabled: boolean;
  setWaitlistEnabled: (value: boolean) => void;
  maxParticipants: string;
  setMaxParticipants: (value: string) => void;
  minParticipants: string;
  setMinParticipants: (value: string) => void;
  teamSize: string;
  setTeamSize: (value: string) => void;
  isFree: boolean;
  setIsFree: (value: boolean) => void;
  entryFee: string;
  setEntryFee: (value: string) => void;
  prizePool: string;
  setPrizePool: (value: string) => void;
  firstPrizePercentage: string;
  setFirstPrizePercentage: (value: string) => void;
  secondPrizePercentage: string;
  setSecondPrizePercentage: (value: string) => void;
  thirdPrizePercentage: string;
  setThirdPrizePercentage: (value: string) => void;
  rules: string;
  setRules: (value: string) => void;
}

export default function FullTournamentForm({
  onSubmit,
  onCancel,
  isSubmitting,
  isEditMode,
  error,
  games,
  title,
  setTitle,
  description,
  setDescription,
  gameId,
  setGameId,
  format,
  setFormat,
  tournamentType,
  setTournamentType,
  leagueLegs,
  setLeagueLegs,
  visibility,
  setVisibility,
  region,
  setRegion,
  timezone,
  setTimezone,
  contactEmail,
  setContactEmail,
  thumbnailUrl,
  setThumbnailUrl,
  registrationStart,
  setRegistrationStart,
  registrationEnd,
  setRegistrationEnd,
  tournamentStart,
  setTournamentStart,
  tournamentEnd,
  setTournamentEnd,
  checkInStart,
  setCheckInStart,
  checkInEnd,
  setCheckInEnd,
  waitlistEnabled,
  setWaitlistEnabled,
  maxParticipants,
  setMaxParticipants,
  minParticipants,
  setMinParticipants,
  teamSize,
  setTeamSize,
  isFree,
  setIsFree,
  entryFee,
  setEntryFee,
  prizePool,
  setPrizePool,
  firstPrizePercentage,
  setFirstPrizePercentage,
  secondPrizePercentage,
  setSecondPrizePercentage,
  thirdPrizePercentage,
  setThirdPrizePercentage,
  rules,
  setRules,
}: FullTournamentFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

        {/* ── LEFT column ─────────────────────────────────────── */}
        <div className="space-y-5">

          {/* 1 · Basic Info */}
          <SectionCard step={1} title="Basic Info" icon={Trophy}>
            <Field label="Tournament Title" required>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Apex Arenas Season 1" maxLength={100} className={inputCls} />
            </Field>

            <Field label="Description">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your tournament…" rows={3} maxLength={2000}
                className={`${inputCls} resize-none`} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              {/* Row 1 — Game | Format */}
              <Field label="Game" required>
                <select value={gameId} onChange={(e) => setGameId(e.target.value)} className={selectCls}>
                  <option value="">Select a game</option>
                  {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </Field>
              <Field label="Format" required>
                <select value={format} onChange={(e) => setFormat(e.target.value)} className={selectCls}>
                  <option value="1v1">1v1</option>
                  {["2v2", "3v3", "4v4", "5v5", "solo", "squad"].map((f) => (
                    <option key={f} value={f} disabled>{f} (coming soon)</option>
                  ))}
                </select>
              </Field>

              {/* Row 2 — Tournament Type (full width) */}
              <div className="col-span-2">
                <Field label="Tournament Type" required>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { value: "single_elimination", label: "Single Elim",   sub: "One loss and out",  icon: <GitBranch className="w-4 h-4" />, accent: "cyan",    disabled: false },
                      { value: "double_elimination", label: "Double Elim",   sub: "Two losses out",    icon: <Repeat className="w-4 h-4" />,    accent: "indigo",  disabled: false },
                      { value: "round_robin",        label: "Round Robin",   sub: "Coming soon",       icon: <LayoutGrid className="w-4 h-4" />, accent: "emerald", disabled: true },
                      { value: "swiss",              label: "Swiss",         sub: "Coming soon",       icon: <Shuffle className="w-4 h-4" />,   accent: "amber",   disabled: true },
                      { value: "battle_royale",      label: "Battle Royale", sub: "Coming soon",       icon: <Sword className="w-4 h-4" />,     accent: "red",     disabled: true },
                      { value: "league",             label: "League",        sub: "PL style",          icon: <ListOrdered className="w-4 h-4" />, accent: "orange", disabled: false },
                    ].map(({ value, label, sub, icon, accent, disabled }) => {
                      const selected = tournamentType === value;
                      const colors: Record<string, string> = {
                        cyan:    selected ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"         : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-cyan-500/50 hover:text-slate-200",
                        indigo:  selected ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"   : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-indigo-500/50 hover:text-slate-200",
                        emerald: "border-slate-800 bg-slate-800/20 text-slate-600",
                        amber:   "border-slate-800 bg-slate-800/20 text-slate-600",
                        red:     "border-slate-800 bg-slate-800/20 text-slate-600",
                        orange:  selected ? "border-orange-500 bg-orange-500/10 text-orange-300"   : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-orange-500/50 hover:text-slate-200",
                      };
                      return (
                        <button
                          key={value}
                          type="button"
                          disabled={disabled}
                          onClick={() => !disabled && setTournamentType(value)}
                          className={`relative flex flex-col items-center gap-1 sm:gap-1.5 py-2.5 sm:py-3 px-1 sm:px-2 rounded-xl border text-center transition-all ${colors[accent]} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <span className="shrink-0">{icon}</span>
                          <span className="text-[10px] sm:text-[11px] font-bold leading-tight">{label}</span>
                          <span className="hidden sm:block text-[9px] leading-tight">{sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>

              {/* League Legs — full width when league (sits above visibility|region row) */}
              {tournamentType === "league" && (
                <div className="col-span-2">
                  <Field label="League Legs" required>
                    <select value={leagueLegs} onChange={(e) => setLeagueLegs(e.target.value as "1" | "2")} className={selectCls}>
                      <option value="1">Single Leg (home only)</option>
                      <option value="2">Double Leg (home &amp; away)</option>
                    </select>
                  </Field>
                </div>
              )}

              {/* Double Elim info banner — full width */}
              {tournamentType === 'double_elimination' && (
                <div className="col-span-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-3 py-2.5">
                  <p className="text-xs font-semibold text-indigo-300">Two Legs — UCL Style</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Each tie is played over two legs. Aggregate score decides the winner. Penalties if level.</p>
                </div>
              )}

              {/* Row — Visibility | Region */}
              <Field label="Visibility">
                <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className={selectCls}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="invite_only">Invite Only</option>
                </select>
              </Field>
              <Field label="Region">
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className={`${selectCls} appearance-none cursor-pointer [&>option]:bg-slate-800 [&>option]:text-white`}
                >
                  <option value="">Select a region</option>
                  <option value="GLOBAL">Global (Open to Everyone)</option>
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
              </Field>

              {/* Row — Timezone | Contact Email */}
              <Field label="Timezone">
                <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)}
                  placeholder="Africa/Accra" className={inputCls} />
              </Field>
              <Field label="Contact Email">
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="organizer@example.com" className={inputCls} />
              </Field>
            </div>

            <Field label="Thumbnail Image">
              <ImageUploadDropzone value={thumbnailUrl} onChange={setThumbnailUrl}
                folder="apex-arenas/tournaments/thumbnails" />
            </Field>
          </SectionCard>

          {/* 3 · Schedule */}
          <SectionCard step={3} title="Schedule" icon={CalendarDays}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Registration Opens" required>
                <DateTimePicker value={registrationStart} onChange={setRegistrationStart} placeholder="Pick date & time" />
              </Field>
              <Field label="Registration Closes" required>
                <DateTimePicker value={registrationEnd} onChange={setRegistrationEnd} placeholder="Pick date & time"
                  minDate={registrationStart ? new Date(registrationStart) : undefined} />
              </Field>
              <Field label="Tournament Starts" required>
                <DateTimePicker value={tournamentStart} onChange={setTournamentStart} placeholder="Pick date & time"
                  minDate={registrationEnd ? new Date(registrationEnd) : undefined} />
              </Field>
              <Field label="Tournament Ends">
                <DateTimePicker value={tournamentEnd} onChange={setTournamentEnd} placeholder="Pick date & time"
                  minDate={tournamentStart ? new Date(tournamentStart) : undefined} />
              </Field>
              <Field label="Check-In Opens">
                <DateTimePicker value={checkInStart} onChange={setCheckInStart} placeholder="Pick date & time"
                  minDate={registrationEnd ? new Date(registrationEnd) : undefined} />
              </Field>
              <Field label="Check-In Closes">
                <DateTimePicker value={checkInEnd} onChange={setCheckInEnd} placeholder="Pick date & time"
                  minDate={checkInStart ? new Date(checkInStart) : undefined} />
              </Field>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={waitlistEnabled} onChange={(e) => setWaitlistEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-orange-500" />
              Enable waitlist when tournament is full
            </label>

            {/* Match Play Deadline hidden for now */}
          </SectionCard>
        </div>

        {/* ── RIGHT column ─────────────────────────────────────── */}
        <div className="space-y-5 lg:sticky lg:top-6">

          {/* 2 · Participants */}
          <SectionCard step={2} title="Participants" icon={Users}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Max Players" required>
                <input
                  type="number"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  min={tournamentType === 'double_elimination' ? 4 : 2}
                  max={1024}
                  className={inputCls}
                />
                {tournamentType === 'double_elimination' && (() => {
                  const n = Number(maxParticipants);
                  const isPow2 = n > 0 && (n & (n - 1)) === 0;
                  if (!isPow2 && n >= 4) {
                    const next = Math.pow(2, Math.ceil(Math.log2(n)));
                    const prev = Math.pow(2, Math.floor(Math.log2(n)));
                    return (
                      <p className="text-[11px] text-amber-400 mt-1.5">
                        {n} isn't a power of 2 — players outside slots will get auto-byes. Use {prev} or {next} for a clean bracket.
                      </p>
                    );
                  }
                  return <p className="text-[11px] text-slate-500 mt-1.5">Use powers of 2 (4, 8, 16, 32, 64, 128…) for a clean bracket with no auto-byes.</p>;
                })()}
              </Field>
              <Field label="Min Players" required>
                <input type="number" value={minParticipants} onChange={(e) => setMinParticipants(e.target.value)}
                  min={tournamentType === 'double_elimination' ? 4 : 2} className={inputCls} />
                {tournamentType === 'double_elimination' && (
                  <p className="text-[11px] text-slate-500 mt-1.5">Minimum 4 for double elimination.</p>
                )}
              </Field>
            </div>
            {isTeamFormat(format) && (
              <Field label="Team Size" required>
                <input type="number" value={teamSize} onChange={(e) => setTeamSize(e.target.value)}
                  min={1} max={100} readOnly={inferTeamSize(format) !== null} className={inputCls} />
              </Field>
            )}
          </SectionCard>

          {/* 4 · Entry & Prize */}
          <SectionCard step={4} title="Entry Fee & Prize" icon={DollarSign}>
            <div className="flex gap-3">
              <button type="button" onClick={() => setIsFree(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  isFree ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" : "border-slate-700 text-slate-400 hover:border-slate-600"
                }`}>
                Free
              </button>
              <button type="button" onClick={() => setIsFree(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  !isFree ? "bg-orange-500/15 text-orange-300 border-orange-500/40" : "border-slate-700 text-slate-400 hover:border-slate-600"
                }`}>
                Paid
              </button>
            </div>

            {!isFree && (
              <div className="space-y-4">
                <Field label="Entry Fee (GHS)" required>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₵</span>
                    <input type="number" value={entryFee} onChange={(e) => setEntryFee(e.target.value)}
                      placeholder="0.00" min={0} step={0.01} className={`${inputCls} pl-8`} />
                  </div>
                </Field>
                <Field label="Prize Pool (GHS)" required>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₵</span>
                    <input type="number" value={prizePool} onChange={(e) => setPrizePool(e.target.value)}
                      placeholder="0.00" min={0} step={0.01} className={`${inputCls} pl-8`} />
                  </div>
                  {(() => {
                    const val = Number.parseFloat(prizePool);
                    if (!Number.isFinite(val) || val <= 0) return null;
                    const fee = Math.round(val * 5) / 100;
                    const net = val - fee;
                    return (
                      <div className="mt-2 flex items-center justify-between text-[11px] bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2">
                        <span className="text-slate-400">Platform fee (5%)</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400">₵{fee.toFixed(2)} deducted</span>
                          <span className="font-semibold text-emerald-400">Net pool: ₵{net.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="1st %" required>
                    <input type="number" value={firstPrizePercentage} onChange={(e) => setFirstPrizePercentage(e.target.value)}
                      min={0} step={0.01} className={inputCls} />
                  </Field>
                  <Field label="2nd %" required>
                    <input type="number" value={secondPrizePercentage} onChange={(e) => setSecondPrizePercentage(e.target.value)}
                      min={0} step={0.01} className={inputCls} />
                  </Field>
                  <Field label="3rd %" required>
                    <input type="number" value={thirdPrizePercentage} onChange={(e) => setThirdPrizePercentage(e.target.value)}
                      min={0} step={0.01} className={inputCls} />
                  </Field>
                </div>
              </div>
            )}
          </SectionCard>

          {/* 5 · Rules */}
          <SectionCard step={5} title="Rules & Info" icon={Globe}>
            <Field label="Rules">
              <textarea value={rules} onChange={(e) => setRules(e.target.value)}
                placeholder="Tournament rules, code of conduct, etc."
                rows={5} maxLength={5000} className={`${inputCls} resize-none`} />
            </Field>
          </SectionCard>

          {/* Submit */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900 px-5 py-4 space-y-3">
            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {error}
              </div>
            )}
            <button type="submit" disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-60 transition-all">
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{isEditMode ? "Saving…" : !isFree ? "Redirecting to payment…" : "Publishing…"}</>
              ) : (
                <><Trophy className="w-4 h-4" />{isEditMode ? "Save Changes" : !isFree ? "Create & Pay Prize Pool" : "Create & Publish"}</>
              )}
            </button>
            <button type="button" onClick={onCancel}
              className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-medium hover:bg-white/5 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
