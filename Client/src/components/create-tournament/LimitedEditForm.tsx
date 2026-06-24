import { Trophy, Loader2 } from "lucide-react";
import ImageUploadDropzone from "../ImageUploadDropzone";
import { DateTimePicker } from "../ui/DateTimePicker";
import { SectionCard, Field } from "./FormControls";
import { COUNTRIES, inputCls, selectCls } from "./create-tournament.utils";

interface LimitedEditFormProps {
  status: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  canEditThumbnailAfterPublish: boolean;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  contactEmail: string;
  setContactEmail: (value: string) => void;
  visibility: string;
  setVisibility: (value: string) => void;
  region: string;
  setRegion: (value: string) => void;
  thumbnailUrl: string;
  setThumbnailUrl: (value: string) => void;
  rules: string;
  setRules: (value: string) => void;
  mapPool: string;
  setMapPool: (value: string) => void;
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
  maxParticipants: string;
  setMaxParticipants: (value: string) => void;
  minParticipants: string;
  setMinParticipants: (value: string) => void;
  waitlistEnabled: boolean;
  setWaitlistEnabled: (value: boolean) => void;
}

export default function LimitedEditForm({
  status,
  onSubmit,
  onCancel,
  isSubmitting,
  canEditThumbnailAfterPublish,
  title,
  setTitle,
  description,
  setDescription,
  contactEmail,
  setContactEmail,
  visibility,
  setVisibility,
  region,
  setRegion,
  thumbnailUrl,
  setThumbnailUrl,
  rules,
  setRules,
  mapPool,
  setMapPool,
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
  maxParticipants,
  setMaxParticipants,
  minParticipants,
  setMinParticipants,
  waitlistEnabled,
  setWaitlistEnabled,
}: LimitedEditFormProps) {
  const st = status;
  const canEditTitle      = ["draft","awaiting_deposit","published"].includes(st);
  const canEditSchedule   = ["draft","awaiting_deposit","published","open","locked"].includes(st);
  const canEditRegStart   = ["draft","awaiting_deposit","published"].includes(st);
  const canEditCapacity   = ["draft","awaiting_deposit","published","open"].includes(st);
  const canEditMinPart    = ["draft","awaiting_deposit","published"].includes(st);
  const canEditRules      = ["draft","awaiting_deposit","published","open"].includes(st);
  const canEditVisibility = ["draft","awaiting_deposit","published"].includes(st);
  const canEditCheckin    = ["draft","awaiting_deposit","published","open","locked"].includes(st);

  const statusLabel: Record<string, string> = {
    awaiting_deposit: "awaiting deposit",
    open: "open for registration",
    locked: "locked",
    published: "published",
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Status banner */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        This tournament is <strong>{statusLabel[st] ?? st}</strong>. Some fields are locked to protect registered players.
      </div>

      {/* ── Two-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

        {/* ── LEFT — Info & Rules ── */}
        <div className="space-y-5">
          <SectionCard step={1} title="Basic Info" icon={Trophy}>
            {canEditTitle && (
              <Field label="Title" required>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  maxLength={100} className={inputCls} />
              </Field>
            )}
            <Field label="Description">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Organizer notes, rules summary, event details…"
                rows={4} maxLength={2000} className={`${inputCls} resize-none`} />
            </Field>
            <Field label="Contact Email">
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                placeholder="organizer@example.com" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              {canEditVisibility && (
                <Field label="Visibility">
                  <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className={selectCls}>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="invite_only">Invite Only</option>
                  </select>
                </Field>
              )}
              <Field label="Region">
                <select value={region} onChange={(e) => setRegion(e.target.value)} className={inputCls}>
                  <option value="GLOBAL">Global (Open to Everyone)</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            {canEditThumbnailAfterPublish && (
              <Field label="Thumbnail Image">
                <ImageUploadDropzone value={thumbnailUrl} onChange={setThumbnailUrl}
                  folder="apex-arenas/tournaments/thumbnails" />
              </Field>
            )}
          </SectionCard>

          {canEditRules && (
            <SectionCard step={2} title="Rules" icon={Trophy}>
              <Field label="Rules / Description">
                <textarea value={rules} onChange={(e) => setRules(e.target.value)}
                  placeholder="Tournament rules, format details, code of conduct…"
                  rows={4} maxLength={5000} className={`${inputCls} resize-none`} />
              </Field>
              <Field label="Map Pool">
                <input type="text" value={mapPool} onChange={(e) => setMapPool(e.target.value)}
                  placeholder="e.g. Dust2, Mirage, Inferno" className={inputCls} />
              </Field>
            </SectionCard>
          )}
        </div>

        {/* ── RIGHT — Schedule & Participants ── */}
        <div className="space-y-5">
          {canEditSchedule && (
            <SectionCard step={3} title="Schedule" icon={Trophy}>
              {canEditRegStart && (
                <Field label="Registration Opens">
                  <DateTimePicker value={registrationStart} onChange={setRegistrationStart} placeholder="Pick date & time" />
                </Field>
              )}
              <Field label="Registration Closes">
                <DateTimePicker value={registrationEnd} onChange={setRegistrationEnd} placeholder="Pick date & time" />
              </Field>
              <Field label="Tournament Start">
                <DateTimePicker value={tournamentStart} onChange={setTournamentStart} placeholder="Pick date & time" />
              </Field>
              <Field label="Tournament End">
                <DateTimePicker value={tournamentEnd} onChange={setTournamentEnd} placeholder="Pick date & time" />
              </Field>
              {canEditCheckin && (
                <>
                  <Field label="Check-in Opens">
                    <DateTimePicker value={checkInStart} onChange={setCheckInStart} placeholder="Pick date & time" />
                  </Field>
                  <Field label="Check-in Closes">
                    <DateTimePicker value={checkInEnd} onChange={setCheckInEnd} placeholder="Pick date & time" />
                  </Field>
                </>
              )}
            </SectionCard>
          )}

          {canEditCapacity && (
            <SectionCard step={4} title="Participants" icon={Trophy}>
              <Field label="Max Players" required>
                <input type="number" min={canEditMinPart ? 2 : Number(maxParticipants)}
                  value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} className={inputCls} />
              </Field>
              {canEditMinPart && (
                <Field label="Min Players" required>
                  <input type="number" min={2} value={minParticipants}
                    onChange={(e) => setMinParticipants(e.target.value)} className={inputCls} />
                </Field>
              )}
              <label className="flex items-center gap-3 cursor-pointer mt-1">
                <input type="checkbox" checked={waitlistEnabled}
                  onChange={(e) => setWaitlistEnabled(e.target.checked)}
                  className="w-4 h-4 rounded accent-orange-500" />
                <span className="text-sm text-slate-300">Enable waitlist when full</span>
              </label>
            </SectionCard>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pb-6">
        <button type="button" onClick={onCancel}
          className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-linear-to-r from-orange-400 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-60 transition-all">
          {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Trophy className="w-4 h-4" />Save Changes</>}
        </button>
      </div>
    </form>
  );
}
