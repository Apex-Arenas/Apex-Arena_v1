// @ts-nocheck
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronDown,
  Loader2,
  AlertCircle,
  Trash2,
  Pencil,
  Save,
  X,
  Trophy,
  Calendar,
  Users,
  Gamepad2,
  DollarSign,
  Clock,
  CheckCircle2,
  User,
  MapPin,
  Zap,
  Activity,
  Eye,
  Shield,
  Hash,
  Search,
  UserCheck,
  RefreshCw,
  Swords,
  Crown,
} from "lucide-react";
import { adminService } from "../../services/admin.service";
import { apiGet, apiPatch } from "../../utils/api.utils";
import { API_BASE_URLS } from "../../config/api.config";
import { getAdminAccessToken } from "../../utils/auth.utils";
import { toast } from "react-toastify";

const STATUS_META: Record<string, { label: string; dot: string; badge: string; glow: string }> = {
  draft:            { label: "Draft",            dot: "bg-slate-400",   badge: "bg-slate-500/20 text-slate-300 border-slate-500/40",   glow: "" },
  awaiting_deposit: { label: "Awaiting Deposit", dot: "bg-amber-400",   badge: "bg-amber-400/20 text-amber-300 border-amber-400/40",   glow: "shadow-amber-500/20" },
  published:        { label: "Published",        dot: "bg-cyan-400",    badge: "bg-cyan-400/20 text-cyan-300 border-cyan-400/40",       glow: "shadow-cyan-500/20" },
  open:             { label: "Open",             dot: "bg-emerald-400", badge: "bg-emerald-400/20 text-emerald-300 border-emerald-400/40", glow: "shadow-emerald-500/20" },
  locked:           { label: "Locked",           dot: "bg-amber-400",   badge: "bg-amber-400/20 text-amber-300 border-amber-400/40",   glow: "" },
  started:          { label: "Live",             dot: "bg-orange-400",  badge: "bg-orange-400/20 text-orange-300 border-orange-400/40", glow: "shadow-orange-500/30" },
  ongoing:          { label: "Live",             dot: "bg-orange-400",  badge: "bg-orange-400/20 text-orange-300 border-orange-400/40", glow: "shadow-orange-500/30" },
  in_progress:      { label: "Live",             dot: "bg-orange-400",  badge: "bg-orange-400/20 text-orange-300 border-orange-400/40", glow: "shadow-orange-500/30" },
  ready_to_start:   { label: "Ready",            dot: "bg-violet-400",  badge: "bg-violet-400/20 text-violet-300 border-violet-400/40", glow: "shadow-violet-500/20" },
  completed:        { label: "Completed",        dot: "bg-slate-400",   badge: "bg-slate-400/20 text-slate-400 border-slate-400/30",   glow: "" },
  cancelled:        { label: "Cancelled",        dot: "bg-red-400",     badge: "bg-red-400/20 text-red-400 border-red-400/30",         glow: "" },
};

const BLOCKED_STATUSES = new Set(["started", "ongoing", "in_progress", "ready_to_start"]);
const LIVE_STATUSES    = new Set(["open", "started", "ongoing", "in_progress"]);

function formatDate(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatShortDate(iso?: string) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatGhs(amount?: number) {
  if (!amount || amount === 0) return "Free";
  return `GHS ${(amount / 100).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;
}

/* ── Reusable Info Row ─────────────────────────────────── */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-slate-800/60 last:border-0">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide shrink-0 mt-0.5">{label}</span>
      <span className="text-sm font-medium text-slate-200 text-right wrap-break-word">{value}</span>
    </div>
  );
}

/* ── Stat Tile ─────────────────────────────────────────── */
function StatTile({
  icon: Icon,
  label,
  value,
  accent = "text-amber-400",
  sub,
}: {
  icon: React.ComponentType<{ className: string }>;
  label: string;
  value: React.ReactNode;
  accent?: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600/60 transition-colors">
      <div className={`w-9 h-9 rounded-xl bg-slate-700/60 flex items-center justify-center ${accent}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
        <p className="text-xl font-bold text-white leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Section Card ──────────────────────────────────────── */
function Section({ title, icon: Icon, children }: { title: string; icon?: React.ComponentType<{ className: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
      {title && (
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800 bg-slate-800/30">
          {Icon && <Icon className="w-4 h-4 text-amber-400" />}
          <h2 className="text-sm font-semibold text-white">{title}</h2>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ── Delete Modal ──────────────────────────────────────── */
function DeleteModal({ tournament, onClose, onConfirm, loading }) {
  const [nameInput, setNameInput] = useState("");
  const [reason, setReason] = useState("");

  if (!tournament) return null;
  const status = String(tournament.status || "");
  const isBlocked = BLOCKED_STATUSES.has(status);
  const title = String(tournament.title || "Tournament");

  const nameMatches = nameInput.trim() === title.trim();
  const canDelete = !isBlocked && nameMatches && reason.trim().length >= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Tournament</h3>
              <p className="text-xs text-slate-400 truncate max-w-65">{title}</p>
            </div>
          </div>

          {isBlocked ? (
            <div className="flex items-start gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300 leading-relaxed">
                Cannot delete an active tournament ({status.replace(/_/g, " ")}). Wait until it ends.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300 leading-relaxed">
                  This will permanently remove the tournament and <strong>all associated data</strong> including matches, registrations, and payouts. This cannot be undone.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">
                  Type <span className="text-white font-semibold">{title}</span> to confirm
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Tournament name"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/60 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">
                  Reason for deletion <span className="text-slate-600">(min 10 chars)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this tournament is being deleted…"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/60 transition-colors resize-none"
                />
                {reason.trim().length > 0 && reason.trim().length < 10 && (
                  <p className="text-[11px] text-red-400">{10 - reason.trim().length} more characters required</p>
                )}
              </div>
            </>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
            >
              Cancel
            </button>
            {!isBlocked && (
              <button
                onClick={() => onConfirm(reason.trim())}
                disabled={loading || !canDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…</> : "Delete Tournament"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────── */
function toDatetimeLocal(iso?: string) {
  if (!iso) return "";
  try { return new Date(iso).toISOString().slice(0, 16); } catch { return ""; }
}
function fromDatetimeLocal(val: string) {
  if (!val) return undefined;
  return new Date(val).toISOString();
}

/* ── Edit Modal ────────────────────────────────────────── */
const EDIT_TABS = ["Basic", "Schedule", "Settings"] as const;
type EditTab = typeof EDIT_TABS[number];

function EditModal({ tournament, onClose, onSaved }: {
  tournament: Record<string, unknown>;
  onClose: () => void;
  onSaved: (updated: Record<string, unknown>) => void;
}) {
  const id       = String(tournament._id ?? tournament.id ?? "");
  const schedule = (tournament.schedule ?? {}) as Record<string, unknown>;
  const capacity = (tournament.capacity ?? {}) as Record<string, unknown>;

  const [tab, setTab]     = useState<EditTab>("Basic");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    // Basic
    title:         String(tournament.title ?? ""),
    description:   String(tournament.description ?? ""),
    visibility:    String(tournament.visibility ?? "public"),
    region:        String(tournament.region ?? ""),
    thumbnail_url: String(tournament.thumbnail_url ?? ""),
    banner_url:    String(tournament.banner_url ?? ""),
    rules:         String(tournament.rules ?? ""),
    // Schedule
    reg_start:      toDatetimeLocal(String(schedule.registration_start ?? "")),
    reg_end:        toDatetimeLocal(String(schedule.registration_end ?? "")),
    tourn_start:    toDatetimeLocal(String(schedule.tournament_start ?? "")),
    tourn_end:      toDatetimeLocal(String(schedule.tournament_end ?? "")),
    checkin_start:  toDatetimeLocal(String(schedule.check_in_start ?? "")),
    checkin_end:    toDatetimeLocal(String(schedule.check_in_end ?? "")),
    // Settings
    max_participants: String(capacity.max_participants ?? ""),
    waitlist_enabled: Boolean(capacity.waitlist_enabled ?? false),
  });

  function set(key: string, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const payload: Record<string, unknown> = {
      title:         form.title.trim(),
      description:   form.description.trim(),
      visibility:    form.visibility,
      region:        form.region,
      // Global tournaments have no region restrictions
      ...(form.region === "GLOBAL" ? { requirements: { allowed_regions: [] } } : {}),
      thumbnail_url: form.thumbnail_url.trim() || undefined,
      banner_url:    form.banner_url.trim() || undefined,
      rules:         form.rules.trim() || undefined,
      schedule: {
        ...(schedule as object),
        registration_start: fromDatetimeLocal(form.reg_start),
        registration_end:   fromDatetimeLocal(form.reg_end),
        tournament_start:   fromDatetimeLocal(form.tourn_start),
        tournament_end:     fromDatetimeLocal(form.tourn_end),
        check_in_start:     fromDatetimeLocal(form.checkin_start),
        check_in_end:       fromDatetimeLocal(form.checkin_end),
      },
      capacity: {
        ...(capacity as object),
        max_participants: form.max_participants ? Number(form.max_participants) : undefined,
        waitlist_enabled: form.waitlist_enabled,
      },
    };

    // strip undefined
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    const url = `${API_BASE_URLS.TOURNAMENT}/admin/tournaments/${id}`;
    const res = await apiPatch(url, payload) as any;

    if (!res.success) {
      toast.error(res.error?.message ?? "Failed to save changes");
      setSaving(false);
      return;
    }

    toast.success("Tournament updated");
    onSaved(res.data ?? { ...tournament, ...payload });
    setSaving(false);
    onClose();
  }

  const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60 focus:bg-slate-800 transition-colors";
  const labelCls = "block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/25 flex items-center justify-center">
              <Pencil className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Edit Tournament</h3>
              <p className="text-[11px] text-slate-500 truncate max-w-80">{String(tournament.title ?? "")}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-6 shrink-0">
          {EDIT_TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "text-amber-400 border-amber-400"
                  : "text-slate-500 border-transparent hover:text-slate-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {tab === "Basic" && (
            <>
              <div>
                <label className={labelCls}>Title</label>
                <input className={inputCls} value={form.title} onChange={e => set("title", e.target.value)} placeholder="Tournament title" />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea className={`${inputCls} resize-none`} rows={4} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe the tournament…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Visibility</label>
                  <select className={inputCls} value={form.visibility} onChange={e => set("visibility", e.target.value)}>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="invite_only">Invite Only</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Region</label>
                  <select className={inputCls} value={form.region} onChange={e => set("region", e.target.value)}>
                    <option value="GLOBAL">Global (Open to Everyone)</option>
                    <option value="GH">Ghana</option>
                    <option value="NG">Nigeria</option>
                    <option value="KE">Kenya</option>
                    <option value="ZA">South Africa</option>
                    <option value="NA">North America</option>
                    <option value="EU">Europe</option>
                    <option value="ASIA">Asia</option>
                    <option value="LATAM">Latin America</option>
                    <option value="OCE">Oceania</option>
                    <option value="ME">Middle East</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Thumbnail URL</label>
                <input className={inputCls} value={form.thumbnail_url} onChange={e => set("thumbnail_url", e.target.value)} placeholder="https://…" />
              </div>
              <div>
                <label className={labelCls}>Banner URL</label>
                <input className={inputCls} value={form.banner_url} onChange={e => set("banner_url", e.target.value)} placeholder="https://…" />
              </div>
              <div>
                <label className={labelCls}>Rules</label>
                <textarea className={`${inputCls} resize-none`} rows={5} value={form.rules} onChange={e => set("rules", e.target.value)} placeholder="Tournament rules…" />
              </div>
            </>
          )}

          {tab === "Schedule" && (
            <>
              <div className="p-3.5 bg-amber-400/8 border border-amber-400/20 rounded-xl">
                <p className="text-xs text-amber-300">Times are shown and saved in your local timezone. The server stores them as UTC.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Registration Opens</label>
                  <input type="datetime-local" className={inputCls} value={form.reg_start} onChange={e => set("reg_start", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Registration Closes</label>
                  <input type="datetime-local" className={inputCls} value={form.reg_end} onChange={e => set("reg_end", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Tournament Start</label>
                  <input type="datetime-local" className={inputCls} value={form.tourn_start} onChange={e => set("tourn_start", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Tournament End</label>
                  <input type="datetime-local" className={inputCls} value={form.tourn_end} onChange={e => set("tourn_end", e.target.value)} />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Check-in Window</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Check-in Opens</label>
                    <input type="datetime-local" className={inputCls} value={form.checkin_start} onChange={e => set("checkin_start", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Check-in Closes</label>
                    <input type="datetime-local" className={inputCls} value={form.checkin_end} onChange={e => set("checkin_end", e.target.value)} />
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "Settings" && (
            <>
              <div>
                <label className={labelCls}>Max Participants</label>
                <input
                  type="number"
                  min={2}
                  className={inputCls}
                  value={form.max_participants}
                  onChange={e => set("max_participants", e.target.value)}
                  placeholder="e.g. 64"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">Cannot be reduced below the current registered count.</p>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-white">Waitlist</p>
                  <p className="text-xs text-slate-500 mt-0.5">Allow players to join a waitlist when the tournament is full.</p>
                </div>
                <button
                  onClick={() => set("waitlist_enabled", !form.waitlist_enabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.waitlist_enabled ? "bg-amber-500" : "bg-slate-700"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.waitlist_enabled ? "left-6" : "left-1"}`} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

const REGISTRANT_STATUS_COLORS: Record<string, string> = {
  registered:      "bg-cyan-500/20 text-cyan-300 border-cyan-500/25",
  checked_in:      "bg-emerald-500/20 text-emerald-300 border-emerald-500/25",
  pending_payment: "bg-amber-500/20 text-amber-300 border-amber-500/25",
  disqualified:    "bg-red-500/20 text-red-400 border-red-500/25",
  withdrawn:       "bg-slate-600/20 text-slate-400 border-slate-600/25",
  cancelled:       "bg-slate-600/20 text-slate-400 border-slate-600/25",
  waitlist:        "bg-violet-500/20 text-violet-300 border-violet-500/25",
};

function ParticipantsSection({ tournamentId }: { tournamentId: string }) {
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!tournamentId) return;
    setLoading(true);
    const token = getAdminAccessToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const url = `${API_BASE_URLS.TOURNAMENT}/admin/tournaments/${tournamentId}/registrations`;

    apiGet(url, { headers })
      .then((res: any) => {
        const raw = res.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.registrations)
            ? raw.registrations
            : Array.isArray(raw?.data)
              ? raw.data
              : [];
        setParticipants(list);
      })
      .finally(() => setLoading(false));
  }, [tournamentId]);

  const filtered = participants.filter((p) => {
    if (p.status === "withdrawn" || p.status === "disqualified") return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const user    = (p.user_id ?? {}) as Record<string, unknown>;
    const profile = (user.profile ?? {}) as Record<string, unknown>;
    const fullName = `${user.first_name ?? profile.first_name ?? ""} ${user.last_name ?? profile.last_name ?? ""}`.trim();
    const username = String(user.username ?? p.username ?? "");
    const inGameId = String(p.in_game_id ?? "");
    return fullName.toLowerCase().includes(q) || username.toLowerCase().includes(q) || inGameId.toLowerCase().includes(q);
  });

  const checkedInCount = participants.filter((p) => {
    const checkInObj = (p.check_in ?? {}) as Record<string, unknown>;
    return Boolean(checkInObj.checked_in) || p.status === "checked_in";
  }).length;

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 px-5 py-4 border-b border-slate-800 bg-slate-800/30 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/25 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              Participants
              <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-full">
                {participants.length}
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              {checkedInCount} checked in
            </p>
          </div>
        </div>

        <div className="relative flex-1 sm:flex-none sm:w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players…"
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 focus:bg-slate-800 transition-colors"
          />
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-14 text-slate-500 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading participants…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center px-6 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center">
            <Users className="w-5 h-5 text-slate-600" />
          </div>
          <p className="text-sm text-slate-400 font-medium">
            {search ? "No players match your search" : "No players registered yet"}
          </p>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-160">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-950/20">
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Player</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">In-Game ID</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registered</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Check-in</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                // API returns user_id as a populated object, check_in as nested
                const user        = (p.user_id ?? {}) as Record<string, unknown>;
                const checkInObj  = (p.check_in ?? {}) as Record<string, unknown>;
                const profile     = (user.profile ?? {}) as Record<string, unknown>;
                const firstName   = String(user.first_name ?? profile.first_name ?? "");
                const lastName    = String(user.last_name ?? profile.last_name ?? "");
                const displayName = `${firstName} ${lastName}`.trim() || String(user.username ?? p.username ?? "—");
                const username    = String(user.username ?? p.username ?? "");
                const avatarUrl   = String(user.avatar_url ?? profile.avatar_url ?? p.avatar_url ?? "");
                const inGameId    = String(p.in_game_id ?? p.inGameId ?? "");
                const status      = String(p.status ?? "registered");
                const isCheckedIn = Boolean(checkInObj.checked_in ?? p.checked_in ?? p.checkedIn ?? status === "checked_in");
                const registeredAt = String(p.created_at ?? p.registered_at ?? p.registeredAt ?? "");
                const statusColor = REGISTRANT_STATUS_COLORS[status] ?? "bg-slate-700/50 text-slate-400 border-slate-700/50";
                const initials = displayName[0]?.toUpperCase() ?? "?";

                return (
                  <tr key={p.registration_id ?? p.registrationId ?? p._id ?? i}
                    className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                    {/* Player */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-700" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-linear-to-br from-amber-500/30 to-orange-500/30 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-300">
                              {initials}
                            </div>
                          )}
                          {isCheckedIn && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate leading-tight">{displayName}</p>
                          {username && <p className="text-[11px] text-slate-500 truncate">@{username}</p>}
                        </div>
                      </div>
                    </td>
                    {/* In-Game ID */}
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-mono text-slate-300 bg-slate-800/60 px-2 py-1 rounded-md border border-slate-700/50">
                        {inGameId || <span className="text-slate-600 italic">—</span>}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border capitalize ${statusColor}`}>
                        {status.replace(/_/g, " ")}
                      </span>
                    </td>
                    {/* Registered At */}
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-slate-500">{registeredAt ? formatDate(registeredAt) : "—"}</span>
                    </td>
                    {/* Check-in */}
                    <td className="px-5 py-3.5">
                      {isCheckedIn ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Checked in
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   BRACKET VIEW
══════════════════════════════════════════════════════════ */

// ── Bracket constants ─────────────────────────────────────
const BC_CARD_H   = 96;
const BC_BASE_U   = 116;
const BC_COL_W    = 240;
const BC_CONN_OUT = 20;
const BC_CONN_IN  = 32;

// ── Round layout ──────────────────────────────────────────
function bcRoundLayout(roundIndex, matchCount) {
  const factor    = Math.pow(2, roundIndex);
  const topOffset = ((factor - 1) * BC_BASE_U) / 2;
  const gap       = Math.max(16, factor * BC_BASE_U - BC_CARD_H);
  const height    = topOffset + matchCount * BC_CARD_H + Math.max(0, matchCount - 1) * gap;
  return { topOffset, gap, height };
}

// ── Extract rounds from flat matches ──────────────────────
function bcBuildRounds(matches) {
  // Detect double elimination by presence of 'upper'/'lower'/'grand_final' positions
  const isDE = matches.some((m) =>
    ["upper", "lower", "grand_final"].includes(m.bracket_position)
  );

  if (isDE) {
    const wbMatches = matches.filter((m) =>
      m.bracket_position === "upper" || m.bracket_position === "main"
    );
    const lbMatches = matches.filter((m) => m.bracket_position === "lower");
    const gfMatches = matches.filter((m) => m.bracket_position === "grand_final");

    const groupByRound = (arr) => {
      const map = new Map();
      for (const m of arr) {
        const r = Number(m.round ?? 1) || 1;
        const list = map.get(r) ?? [];
        list.push(m);
        map.set(r, list);
      }
      return Array.from(map.entries()).sort(([a], [b]) => a - b);
    };

    const wbEntries = groupByRound(wbMatches);
    const lbEntries = groupByRound(lbMatches);
    const wbTotal = wbEntries.length;
    const lbTotal = lbEntries.length;

    const rounds: any[] = [];

    for (const [r, ms] of wbEntries) {
      rounds.push({
        round: r,
        round_number: r,
        bracket: "upper",
        round_name: wbTotal === 1 || r === wbTotal ? "WB Finals" : `WB Round ${r}`,
        matches: [...ms].sort((a, b) => (a.match_number ?? 999) - (b.match_number ?? 999)),
      });
    }
    for (const [r, ms] of lbEntries) {
      rounds.push({
        round: r,
        round_number: r,
        bracket: "lower",
        round_name: r === lbTotal ? "LB Finals" : `LB Round ${r}`,
        matches: [...ms].sort((a, b) => (a.match_number ?? 999) - (b.match_number ?? 999)),
      });
    }
    if (gfMatches.length > 0) {
      rounds.push({
        round: 1,
        round_number: 1,
        bracket: "grand_final",
        round_name: "Grand Final",
        matches: [...gfMatches].sort((a, b) => (a.match_number ?? 999) - (b.match_number ?? 999)),
      });
    }
    return rounds;
  }

  // Single elimination / round robin: group by round number
  const byRound = new Map();
  for (const m of matches) {
    const r = Number(m.round ?? m.round_number ?? 1) || 1;
    const arr = byRound.get(r) ?? [];
    arr.push(m);
    byRound.set(r, arr);
  }
  return Array.from(byRound.entries())
    .sort(([a], [b]) => a - b)
    .map(([round, ms]) => ({
      round,
      round_number: round,
      round_name: ms[0]?.round_name,
      matches: [...ms].sort((a, b) => (a.match_number ?? 999) - (b.match_number ?? 999)),
    }));
}

function bcExtractRounds(payload) {
  if (Array.isArray(payload)) return bcBuildRounds(payload);
  if (!payload || typeof payload !== "object") return [];
  const candidate = payload.rounds ?? payload.bracket;
  if (!Array.isArray(candidate)) return [];
  const hasRoundShape = candidate.some(
    (item) => item && typeof item === "object" && Array.isArray(item.matches)
  );
  return hasRoundShape ? candidate : bcBuildRounds(candidate);
}

// ── Round title & style ───────────────────────────────────
function bcRoundTitle(round, index, total) {
  const raw = round.name ?? round.round_name;
  if (raw?.trim()) {
    const n = raw.trim().toLowerCase();
    const named = { final: "Final", grand_final: "Grand Final", semi_final: "Semifinal", semi_finals: "Semifinals", quarter_final: "Quarterfinal", quarter_finals: "Quarterfinals" };
    if (named[n]) return named[n];
    const m = n.match(/^round[_\s-]?(\d+)$/);
    if (m) return `Round ${m[1]}`;
    return raw.trim().split(/[_-]+/).map(w => w[0]?.toUpperCase() + w.slice(1)).join(" ");
  }
  const num = round.round_number ?? round.round ?? index + 1;
  if (total >= 2 && num === total) return "Final";
  if (total >= 3 && num === total - 1) return "Semifinal";
  if (total >= 4 && num === total - 2) return "Quarterfinal";
  return `Round ${num}`;
}

function bcRoundStyle(title, bracket?) {
  const t = title.toLowerCase();
  if (bracket === "grand_final" || (t.includes("grand") && t.includes("final")))
    return { pill: "bg-amber-500/20 text-amber-300 border-amber-500/40", glow: "shadow-[0_0_32px_rgba(251,191,36,0.18)]" };
  if (bracket === "lower" || t.includes("lb"))
    return { pill: "bg-red-500/15 text-red-300 border-red-500/30", glow: "" };
  if (bracket === "upper" || t.includes("wb"))
    return { pill: "bg-violet-500/15 text-violet-300 border-violet-500/30", glow: "" };
  if (t.includes("final") && !t.includes("semi") && !t.includes("quarter"))
    return { pill: "bg-amber-500/15 text-amber-300 border-amber-500/30", glow: "shadow-[0_0_24px_rgba(251,191,36,0.12)]" };
  if (t.includes("semi"))
    return { pill: "bg-violet-500/15 text-violet-300 border-violet-500/30", glow: "" };
  if (t.includes("quarter"))
    return { pill: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30", glow: "" };
  return { pill: "bg-slate-700/60 text-slate-400 border-slate-600/40", glow: "" };
}

// ── Status colors ─────────────────────────────────────────
const BC_DOT: Record<string, string> = {
  completed: "bg-emerald-400",
  in_progress: "bg-orange-400 animate-pulse",
  live: "bg-orange-400 animate-pulse",
  pending: "bg-slate-500",
  scheduled: "bg-cyan-400",
};
const BC_TXT: Record<string, string> = {
  completed: "text-emerald-400",
  in_progress: "text-orange-400",
  live: "text-orange-400",
  pending: "text-slate-500",
  scheduled: "text-cyan-400",
};

// ── Participant label ─────────────────────────────────────
function bcLabel(p) {
  if (!p) return "TBD";
  if (p.in_game_id) return p.in_game_id;
  if (p.username) return p.username;
  if (p.user_id && typeof p.user_id === "object" && p.user_id.username) return p.user_id.username;
  return "TBD";
}

// ── Parse penalty from reason string ─────────────────────
function bcParsePenalty(match) {
  const raw = match as Record<string, unknown>;
  const adminOverride = raw.admin_override as Record<string, unknown> | undefined;
  const r = String(adminOverride?.reason ?? match.reason ?? raw.score_note ?? "");
  const m = r.match(/Regular time:\s*(\d+)[-\u2013](\d+).*?Penalties:\s*(\d+)[-\u2013](\d+)/i);
  if (!m) return null;
  return { rt1: Number(m[1]), rt2: Number(m[2]), pen1: Number(m[3]), pen2: Number(m[4]) };
}

// ── Match Detail Modal ────────────────────────────────────
function BcMatchModal({ match, onClose, onOverrideComplete }: { match: any; onClose: () => void; onOverrideComplete: () => void }) {
  const [showOverride, setShowOverride]   = useState(false);
  const [ovS1, setOvS1]                   = useState("");
  const [ovS2, setOvS2]                   = useState("");
  const [ovPen1, setOvPen1]               = useState("");
  const [ovPen2, setOvPen2]               = useState("");
  const [ovReason, setOvReason]           = useState("");
  const [overriding, setOverriding]       = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const p          = match.participants ?? [];
  const p1         = p[0] ?? {};
  const p2         = p[1] ?? {};
  const p1Win      = p1.result === "win";
  const p2Win      = p2.result === "win";
  const p1Label    = p1.in_game_id || p1.username || (typeof p1.user_id === "object" ? p1.user_id?.username : null) || "TBD";
  const p2Label    = p2.in_game_id || p2.username || (typeof p2.user_id === "object" ? p2.user_id?.username : null) || "TBD";
  const pen        = bcParsePenalty(match);
  const displayP1  = pen ? pen.rt1 : (p1.score ?? null);
  const displayP2  = pen ? pen.rt2 : (p2.score ?? null);
  const decidedOnPen = !pen && displayP1 === displayP2 && (p1Win || p2Win);
  const statusRaw  = (match.status ?? "pending").toLowerCase();
  const dotCls     = BC_DOT[statusRaw] ?? BC_DOT.pending;
  const txtCls     = BC_TXT[statusRaw] ?? BC_TXT.pending;
  const dispute    = match.dispute ?? {};
  const adminOvr   = match.admin_override ?? {};
  const proof      = match.proof ?? {};
  const sched      = match.schedule ?? {};
  const screenshots = (proof.screenshots ?? []) as string[];
  const neither    = !p1Win && !p2Win;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0 bg-slate-800/30">
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${txtCls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dotCls}`} />
              {statusRaw.replace(/_/g, " ")}
            </span>
            <span className="text-slate-700">·</span>
            <span className="text-xs text-slate-500">
              {match.round_name ? match.round_name.replace(/_/g, " ") : `Round ${match.round ?? "?"}`}
              {match.match_number != null ? ` · Match #${match.match_number}` : ""}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Score Hero ── */}
          <div className="px-5 pt-5 pb-0">
            <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">

              {/* Player rows */}
              <div className="divide-y divide-slate-700/40">
                {[
                  { label: p1Label, seed: p1.seed_number, score: displayP1, penScore: pen?.pen1 ?? null, isWinner: p1Win },
                  { label: p2Label, seed: p2.seed_number, score: displayP2, penScore: pen?.pen2 ?? null, isWinner: p2Win },
                ].map((player, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between gap-4 px-5 py-4 ${
                      player.isWinner
                        ? "bg-orange-500/8"
                        : !neither && !player.isWinner
                        ? "opacity-50"
                        : ""
                    }`}
                  >
                    {/* Name + seed */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      {player.isWinner
                        ? <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                        : <div className="w-4 h-4 shrink-0" />
                      }
                      <div className="min-w-0">
                        <p className={`text-base font-bold truncate leading-tight ${player.isWinner ? "text-white" : "text-slate-400"}`}>
                          {player.label}
                        </p>
                        {player.seed != null && (
                          <p className="text-[11px] text-slate-600 mt-0.5">Seed #{player.seed}</p>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex items-baseline gap-1.5 shrink-0">
                      <span className={`text-4xl font-black tabular-nums leading-none ${player.isWinner ? "text-white" : neither ? "text-slate-500" : "text-slate-700"}`}>
                        {player.score ?? "—"}
                      </span>
                      {player.penScore !== null && player.penScore !== undefined && (
                        <span className="text-xl font-bold text-amber-400 tabular-nums leading-none">
                          ({player.penScore})
                        </span>
                      )}
                      {decidedOnPen && player.isWinner && (
                        <span className="text-sm font-bold text-amber-400 leading-none">(P)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Penalty footer */}
              {pen && (
                <div className="flex items-center justify-between px-5 py-3 bg-amber-500/8 border-t border-amber-500/20">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">Penalties</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-black tabular-nums ${pen.pen1 > pen.pen2 ? "text-amber-300" : "text-slate-500"}`}>{pen.pen1}</span>
                    <span className="text-slate-600 text-sm">—</span>
                    <span className={`text-base font-black tabular-nums ${pen.pen2 > pen.pen1 ? "text-amber-300" : "text-slate-500"}`}>{pen.pen2}</span>
                    <span className="text-[10px] text-slate-600 ml-2">RT: {pen.rt1}–{pen.rt2}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Timeline + Result Chain ── */}
          <div className="grid grid-cols-2 gap-3 px-5 pt-4">

            {/* Timeline */}
            <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 overflow-hidden">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 py-2.5 border-b border-slate-700/40">Timeline</p>
              <div className="divide-y divide-slate-700/30">
                {[
                  { label: "Scheduled", val: sched.scheduled_time },
                  { label: "Started",   val: sched.started_at },
                  { label: "Completed", val: sched.completed_at },
                  { label: "Deadline",  val: match.play_deadline },
                ].map(({ label, val }) => (
                  <div key={label} className="px-4 py-2">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wide">{label}</p>
                    <p className="text-xs font-medium text-slate-300 mt-0.5 leading-tight">{fmtDate(val)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Result chain */}
            <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 overflow-hidden">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 py-2.5 border-b border-slate-700/40">Result Chain</p>
              <div className="divide-y divide-slate-700/30">
                {[
                  { label: "Reported",    val: match.result_reported_at },
                  { label: "Confirmed",   val: match.result_confirmed_at },
                  { label: "Conf. deadline", val: match.result_confirmation_deadline },
                ].map(({ label, val }) => (
                  <div key={label} className="px-4 py-2">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wide">{label}</p>
                    <p className="text-xs font-medium text-slate-300 mt-0.5 leading-tight">{fmtDate(val)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Proof ── */}
          {(screenshots.length > 0 || proof.video_url) && (
            <div className="px-5 pt-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">
                Proof{screenshots.length > 0 ? ` (${screenshots.length})` : ""}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {screenshots.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-video rounded-xl overflow-hidden border border-slate-700/60 hover:border-violet-500/50 transition-colors block bg-slate-800 w-full max-w-70"
                  >
                    <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover group-hover:opacity-70 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/40">
                      <Eye className="w-7 h-7 text-white drop-shadow" />
                    </div>
                  </a>
                ))}
              </div>
              {proof.video_url && (
                <a href={String(proof.video_url)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                  <Eye className="w-3.5 h-3.5" /> View video proof
                </a>
              )}
            </div>
          )}

          {/* ── Dispute ── */}
          {dispute.is_disputed && (
            <div className="mx-5 mt-4 p-4 rounded-xl bg-red-500/8 border border-red-500/25 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Dispute</p>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${dispute.resolved ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" : "bg-red-500/15 text-red-400 border-red-500/25"}`}>
                  {dispute.resolved ? "Resolved" : "Open"}
                </span>
              </div>
              {dispute.dispute_reason && <p className="text-xs text-slate-300 leading-relaxed">{dispute.dispute_reason}</p>}
              {dispute.disputed_at && <p className="text-[11px] text-slate-500">Raised: {fmtDate(dispute.disputed_at)}</p>}
              {dispute.resolution && (
                <div className="pt-2 border-t border-red-500/15">
                  <p className="text-xs text-slate-300">{dispute.resolution}</p>
                  {dispute.resolved_at && <p className="text-[11px] text-slate-500 mt-1">Resolved: {fmtDate(dispute.resolved_at)}</p>}
                </div>
              )}
              {(dispute.evidence ?? []).length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {(dispute.evidence ?? []).map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="aspect-video rounded-lg overflow-hidden border border-red-500/30 hover:border-red-500/60 block bg-slate-800 transition-colors">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Admin Override ── */}
          {adminOvr.overridden && (
            <div className="mx-5 mt-4 p-4 rounded-xl bg-amber-500/8 border border-amber-500/20 space-y-1.5">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">Admin Override</p>
              {adminOvr.reason && <p className="text-xs text-slate-300 leading-relaxed">{adminOvr.reason}</p>}
              {adminOvr.overridden_at && <p className="text-[11px] text-slate-500">At: {fmtDate(adminOvr.overridden_at)}</p>}
            </div>
          )}

          {/* ── Override Score ── */}
          <div className="mx-5 mt-4 mb-1">
            <button
              onClick={() => { setShowOverride(v => !v); }}
              className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <span className={`transition-transform duration-200 ${showOverride ? "rotate-90" : ""}`}>▶</span>
              Override Score
            </button>

            {showOverride && (
              <div className="mt-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Admin Score Override</p>

                {/* Score inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">{p1Label} score</label>
                    <input
                      type="number"
                      min="0"
                      value={ovS1}
                      onChange={e => setOvS1(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">{p2Label} score</label>
                    <input
                      type="number"
                      min="0"
                      value={ovS2}
                      onChange={e => setOvS2(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 tabular-nums"
                    />
                  </div>
                </div>

                {/* Penalty inputs — only when scores are equal and both filled */}
                {ovS1 !== "" && ovS2 !== "" && Number(ovS1) === Number(ovS2) && (
                  <div>
                    <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-widest mb-2">Tie — set penalty shootout scores</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">{p1Label} penalties</label>
                        <input
                          type="number"
                          min="0"
                          value={ovPen1}
                          onChange={e => setOvPen1(e.target.value)}
                          placeholder="0"
                          className="w-full bg-slate-900 border border-amber-500/40 rounded-lg px-3 py-2 text-sm text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-500 tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">{p2Label} penalties</label>
                        <input
                          type="number"
                          min="0"
                          value={ovPen2}
                          onChange={e => setOvPen2(e.target.value)}
                          placeholder="0"
                          className="w-full bg-slate-900 border border-amber-500/40 rounded-lg px-3 py-2 text-sm text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-500 tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Reason */}
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Reason <span className="text-red-400">*</span></label>
                  <textarea
                    value={ovReason}
                    onChange={e => setOvReason(e.target.value)}
                    placeholder="Explain why this score is being overridden…"
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  disabled={overriding || ovS1 === "" || ovS2 === "" || !ovReason.trim()}
                  onClick={async () => {
                    const s1 = Number(ovS1);
                    const s2 = Number(ovS2);
                    const hasPen = s1 === s2 && ovPen1 !== "" && ovPen2 !== "";
                    const builtReason = hasPen
                      ? `Regular time: ${s1}\u2013${s2} \u00b7 Penalties: ${ovPen1}\u2013${ovPen2} \u00b7 ${ovReason.trim()}`
                      : ovReason.trim();
                    const matchId = String(match._id ?? match.id ?? "");
                    setOverriding(true);
                    try {
                      await adminService.adminSetMatchScore(matchId, s1, s2, builtReason);
                      setShowOverride(false);
                      setOvS1(""); setOvS2(""); setOvPen1(""); setOvPen2(""); setOvReason("");
                      onOverrideComplete();
                    } catch (err: any) {
                      alert(err.message ?? "Failed to override score");
                    } finally {
                      setOverriding(false);
                    }
                  }}
                  className="w-full py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-500 text-white"
                >
                  {overriding ? "Saving…" : "Apply Override"}
                </button>
              </div>
            )}
          </div>

          {/* Match ID */}
          <p className="text-[10px] text-slate-800 font-mono text-center py-4">{String(match._id ?? match.id ?? "")}</p>
        </div>
      </div>
    </div>
  );
}

// ── Match Card ────────────────────────────────────────────
function BcMatchCard({ match, isFinal, onClick }) {
  const p = match.participants ?? [];
  const p1Label = bcLabel(p[0]);
  const p2Label = bcLabel(p[1]);
  const p1Win = p[0]?.result === "win";
  const p2Win = p[1]?.result === "win";
  const statusRaw = (match.status ?? "pending").toLowerCase();
  const SCORED = new Set(["completed", "in_progress", "live", "ongoing", "awaiting_results", "verifying_results"]);
  const isScored = SCORED.has(statusRaw);

  const p1Score = isScored ? (p[0]?.score ?? null) : null;
  const p2Score = isScored ? (p[1]?.score ?? null) : null;
  const hasScores = isScored && (p1Score !== null || p2Score !== null);

  const penaltyData = bcParsePenalty(match);
  const displayP1 = penaltyData ? penaltyData.rt1 : p1Score;
  const displayP2 = penaltyData ? penaltyData.rt2 : p2Score;
  const decidedOnPen = !penaltyData && displayP1 === displayP2 && (p1Win || p2Win);

  const dotCls = BC_DOT[statusRaw] ?? BC_DOT.pending;
  const txtCls = BC_TXT[statusRaw] ?? BC_TXT.pending;
  const scheduledAt = match.scheduled_at ?? match.scheduled_time ?? match.schedule?.scheduled_time;

  function renderScore(score, pen, isWinner) {
    if (!hasScores) return <span className="text-slate-700">—</span>;
    if (pen !== null) {
      return (
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-xs font-bold tabular-nums ${isWinner ? "text-orange-300" : "text-slate-500"}`}>{score ?? "—"}</span>
          <span className="text-[9px] text-amber-500/80 font-bold tabular-nums">({pen})</span>
        </div>
      );
    }
    if (decidedOnPen && isWinner) {
      return (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs font-bold tabular-nums text-orange-300">{score ?? "—"}</span>
          <span className="text-[9px] text-amber-500/80 font-bold">(P)</span>
        </div>
      );
    }
    return (
      <span className={`text-xs font-bold tabular-nums shrink-0 ${isWinner ? "text-orange-300" : "text-slate-600"}`}>
        {score ?? "—"}
      </span>
    );
  }

  const isDisputed = match.dispute?.is_disputed && !match.dispute?.resolved;

  const borderCls = isDisputed
    ? "border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
    : isFinal
    ? "border-amber-500/30 shadow-[0_0_20px_rgba(251,191,36,0.08)]"
    : "border-slate-700/60";

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border bg-slate-900/90 backdrop-blur-sm transition-all duration-200 cursor-pointer hover:border-slate-500/70 hover:shadow-lg hover:shadow-black/40 hover:-translate-y-px ${borderCls}`}
      style={{ minHeight: `${BC_CARD_H}px` }}
    >
      {isFinal && (
        <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 via-transparent to-orange-500/5 pointer-events-none" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-size-[20px_20px] pointer-events-none" />

      {/* Disputed badge */}
      {isDisputed && (
        <div className="absolute top-1 right-1 z-10 px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-[9px] font-bold text-red-400 uppercase tracking-wider">
          Dispute
        </div>
      )}

      {/* Participant 1 */}
      <div className={`relative flex items-center justify-between gap-2 px-3 py-2.5 ${
        p1Win
          ? "bg-linear-to-r from-orange-500/10 to-transparent border-l-2 border-orange-400"
          : p2Win ? "border-l-2 border-transparent opacity-50" : "border-l-2 border-transparent"
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          {p1Win && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
          <span className={`text-xs font-semibold truncate ${p1Win ? "text-white" : p2Win ? "text-slate-500" : "text-slate-300"}`}>
            {p1Label}
          </span>
        </div>
        {renderScore(displayP1, penaltyData ? penaltyData.pen1 : null, p1Win)}
      </div>

      <div className="h-px bg-slate-800/80 mx-2" />

      {/* Participant 2 */}
      <div className={`relative flex items-center justify-between gap-2 px-3 py-2.5 ${
        p2Win
          ? "bg-linear-to-r from-orange-500/10 to-transparent border-l-2 border-orange-400"
          : p1Win ? "border-l-2 border-transparent opacity-50" : "border-l-2 border-transparent"
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          {p2Win && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
          <span className={`text-xs font-semibold truncate ${p2Win ? "text-white" : p1Win ? "text-slate-500" : "text-slate-300"}`}>
            {p2Label}
          </span>
        </div>
        {renderScore(displayP2, penaltyData ? penaltyData.pen2 : null, p2Win)}
      </div>

      {/* Footer */}
      <div className="h-px bg-slate-800/60 mx-2" />
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide ${txtCls}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
          {statusRaw.replace(/_/g, " ")}
        </span>
        <span className="text-[10px] text-slate-600 tabular-nums">
          {scheduledAt
            ? new Date(scheduledAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
            : "TBD"}
        </span>
      </div>
    </div>
  );
}

// ── Bracket Board ─────────────────────────────────────────
function BcBoard({ rounds, onMatchClick }) {
  const layouts    = rounds.map((r, i) => bcRoundLayout(i, (r.matches ?? []).length));
  const boardHeight = Math.max(...layouts.map((l) => l.height), 0);

  return (
    <div
      className="relative flex gap-14"
      style={{
        minWidth:  `${rounds.length * (BC_COL_W + 56)}px`,
        minHeight: `${boardHeight + 48}px`,
      }}
    >
      {rounds.map((round, ri) => {
        const layout     = layouts[ri];
        const matches    = round.matches ?? [];
        const title      = bcRoundTitle(round, ri, rounds.length);
        const style      = bcRoundStyle(title, round.bracket);
        const isFinalRnd = title.toLowerCase().includes("final") && !title.toLowerCase().includes("semi") && !title.toLowerCase().includes("quarter");
        const connLeft   = BC_COL_W;

        return (
          <div key={ri} className="relative shrink-0" style={{ width: `${BC_COL_W}px`, minHeight: `${boardHeight}px` }}>
            {/* Round header */}
            <div className="flex justify-center mb-5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.14em] border ${style.pill} ${style.glow}`}>
                {isFinalRnd && <Crown className="w-3 h-3" />}
                {title}
              </span>
            </div>

            {/* Match cards */}
            <div className="relative" style={{ paddingTop: `${layout.topOffset}px` }}>
              <div className="flex flex-col" style={{ rowGap: `${layout.gap}px` }}>
                {matches.map((match, mi) => {
                  const matchId = match._id ?? match.id;
                  return (
                    <BcMatchCard
                      key={matchId ?? mi}
                      match={match}
                      isFinal={isFinalRnd}
                      onClick={() => onMatchClick?.(match)}
                    />
                  );
                })}
              </div>

              {/* Connector lines */}
              {ri < rounds.length - 1 && matches.length > 0 && (
                <div className="absolute inset-0 pointer-events-none" style={{ overflow: "visible" }}>
                  {matches.map((_, mi) => {
                    const cy = layout.topOffset + mi * (BC_CARD_H + layout.gap) + BC_CARD_H / 2;
                    return (
                      <div key={`out-${mi}`} className="absolute bg-slate-600/60"
                        style={{ left: `${connLeft}px`, top: `${cy}px`, width: `${BC_CONN_OUT}px`, height: "1.5px" }} />
                    );
                  })}
                  {Array.from({ length: Math.floor(matches.length / 2) }).map((_, pi) => {
                    const top = pi * 2, bot = top + 1;
                    const yTop = layout.topOffset + top * (BC_CARD_H + layout.gap) + BC_CARD_H / 2;
                    const yBot = layout.topOffset + bot * (BC_CARD_H + layout.gap) + BC_CARD_H / 2;
                    const yMid = (yTop + yBot) / 2;
                    const xV = connLeft + BC_CONN_OUT;
                    return (
                      <div key={`pair-${pi}`}>
                        <div className="absolute bg-slate-600/60" style={{ left: `${xV}px`, top: `${yTop}px`, width: "1.5px", height: `${yBot - yTop}px` }} />
                        <div className="absolute bg-slate-600/60" style={{ left: `${xV}px`, top: `${yMid}px`, width: `${BC_CONN_IN}px`, height: "1.5px" }} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Admin Bracket Section ─────────────────────────────────
function AdminBracketSection({ tournamentId }: { tournamentId: string }) {
  const [rounds, setRounds]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  useEffect(() => {
    if (!tournamentId) return;
    setLoading(true);
    setError(null);
    adminService.fetchBracket(tournamentId)
      .then((data) => {
        setRounds(bcExtractRounds(data));
      })
      .catch((e) => setError(e.message ?? "Failed to load bracket"))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  const totalMatches   = rounds.reduce((acc, r) => acc + (r.matches?.length ?? 0), 0);
  const completedCount = rounds.reduce((acc, r) => acc + (r.matches ?? []).filter((m) => m.status === "completed").length, 0);
  const liveCount      = rounds.reduce((acc, r) => acc + (r.matches ?? []).filter((m) => ["in_progress", "live", "ongoing"].includes(m.status ?? "")).length, 0);
  const disputeCount   = rounds.reduce((acc, r) => acc + (r.matches ?? []).filter((m) => m.dispute?.is_disputed && !m.dispute?.resolved).length, 0);

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-800 bg-slate-800/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-400/15 border border-violet-400/25 flex items-center justify-center shrink-0">
            <Swords className="w-4 h-4 text-violet-400" />
          </div>
          <h2 className="text-sm font-semibold text-white">Bracket</h2>
        </div>
        {!loading && !error && rounds.length > 0 && (
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <span className="text-xs text-slate-500">{rounds.length} rounds · {totalMatches} matches</span>
            {liveCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-orange-400/15 text-orange-300 border-orange-400/25">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                {liveCount} live
              </span>
            )}
            {completedCount > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-400/10 text-emerald-400 border-emerald-400/20">
                {completedCount}/{totalMatches} done
              </span>
            )}
            {disputeCount > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-red-500/15 text-red-400 border-red-500/25">
                {disputeCount} dispute{disputeCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-14 text-slate-500 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading bracket…</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-14 text-center px-6 gap-3">
          <AlertCircle className="w-8 h-8 text-slate-600" />
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      ) : rounds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center px-6 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center">
            <Swords className="w-5 h-5 text-slate-600" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Bracket not generated yet</p>
          <p className="text-xs text-slate-600">Use "Regenerate Bracket" once players are registered.</p>
        </div>
      ) : (
        <div className="overflow-x-auto p-5 pb-6">
          <BcBoard rounds={rounds} onMatchClick={(m) => setSelectedMatch(m)} />
        </div>
      )}

      {selectedMatch && (
        <BcMatchModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onOverrideComplete={() => {
            // Re-fetch bracket so scores update, then refresh the open modal with updated match data
            adminService.fetchBracket(tournamentId).then((data) => {
              const newRounds = bcExtractRounds(data);
              setRounds(newRounds);
              // Find the updated match by ID and keep modal open with fresh data
              const matchId = String(selectedMatch._id ?? selectedMatch.id ?? "");
              let updated: any = null;
              for (const r of newRounds) {
                const found = (r.matches ?? []).find((m: any) => String(m._id ?? m.id ?? "") === matchId);
                if (found) { updated = found; break; }
              }
              setSelectedMatch(updated ?? null);
            }).catch(() => {});
          }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
const TournamentDetail = () => {
  const navigate = useNavigate();
  const { tournamentId } = useParams<{ tournamentId: string }>();

  const [tournament, setTournament] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [isGeneratingBracket, setIsGeneratingBracket] = useState(false);

  const load = useCallback(async () => {
    if (!tournamentId) return;
    setIsLoading(true);
    try {
      const result = await adminService.listTournaments({ limit: 1000 });
      const found = result.data.find((t: any) => t._id === tournamentId || t.id === tournamentId);
      if (found) {
        setTournament(found);
      } else {
        toast.error("Tournament not found");
        navigate("/admin/tournaments");
      }
    } catch {
      toast.error("Failed to load tournament");
      navigate("/admin/tournaments");
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId, navigate]);

  useEffect(() => { void load(); }, [load]);

  const handleConfirmDelete = async (reason: string) => {
    if (!tournament || !tournamentId) return;
    setIsDeleting(true);
    try {
      const success = await adminService.deleteTournament(tournamentId);
      if (success) {
        console.info(`[Admin] Tournament "${String(tournament.title)}" deleted. Reason: ${reason}`);
        toast.success("Tournament deleted successfully");
        navigate("/admin/tournaments");
      } else {
        toast.error("Failed to delete tournament");
      }
    } catch (error: any) {
      toast.error(error.message || "Error deleting tournament");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateBracket = async (force = false) => {
    if (!tournamentId) return;
    setIsGeneratingBracket(true);
    try {
      await adminService.generateBracket(tournamentId, force);
      toast.success(force ? "Bracket regenerated successfully" : "Bracket generated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate bracket");
    } finally {
      setIsGeneratingBracket(false);
    }
  };

  /* ── Loading ── */
  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm">Loading tournament…</span>
      </div>
    </div>
  );

  if (!tournament) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <AlertCircle className="w-10 h-10" />
        <span className="text-sm">Tournament not found</span>
      </div>
    </div>
  );

  /* ── Derived values ── */
  const status        = String(tournament.status ?? "unknown");
  const meta          = STATUS_META[status] ?? STATUS_META.draft;
  const isBlocked     = BLOCKED_STATUSES.has(status);
  const isLive        = LIVE_STATUSES.has(status);
  const title         = String(tournament.title ?? "Untitled");
  const schedule      = tournament.schedule as Record<string, unknown> | undefined;
  const organizer     = tournament.organizer_id as Record<string, unknown> | undefined;
  const game          = tournament.game_id as Record<string, unknown> | undefined;
  const prizeStruct   = tournament.prize_structure as Record<string, unknown> | undefined;
  const capacity      = tournament.capacity as Record<string, unknown> | undefined;
  const metadata      = tournament.metadata as Record<string, unknown> | undefined;

  const currentCount    = Number(capacity?.current_participants ?? tournament.current_count ?? 0);
  const maxParticipants = Number(capacity?.max_participants ?? tournament.max_participants ?? 0);
  const checkedIn       = Number(capacity?.checked_in_count ?? tournament.checked_in_count ?? 0);
  const waitlistCount   = Number(capacity?.waitlist_count ?? 0);
  const entryFee        = Number(tournament.entry_fee ?? 0);
  const prizePool       = Number(prizeStruct?.net_prize_pool ?? tournament.prizePool ?? 0);
  const platformFee     = Number(prizeStruct?.platform_fee_amount ?? 0);
  const fundingType     = String(tournament.funding_type ?? "free");
  const format          = String(tournament.format ?? "—");
  const REGION_LABELS: Record<string, string> = {
    GLOBAL: "Global", GH: "Ghana", NG: "Nigeria", KE: "Kenya", ZA: "South Africa",
    NA: "North America", EU: "Europe", ASIA: "Asia", LATAM: "Latin America",
    OCE: "Oceania", ME: "Middle East",
  };
  const regionRaw       = String(tournament.region ?? "");
  const region          = REGION_LABELS[regionRaw] ?? (regionRaw || "—");
  const visibility      = String(tournament.visibility ?? "public");
  const tournamentType  = String(tournament.tournament_type ?? "—");
  const fillPct         = maxParticipants > 0 ? Math.round((currentCount / maxParticipants) * 100) : 0;
  const id              = String(tournament._id ?? tournament.id ?? "");

  const gameName    = game ? String(game.name ?? "Unknown") : "Unknown";
  const gameLogoUrl = game ? String(game.logo_url ?? game.icon_url ?? game.banner_url ?? game.logoUrl ?? "") : "";
  const orgUsername = organizer ? String(organizer.username ?? "Unknown") : "Unknown";
  const orgEmail    = organizer ? String(organizer.email ?? "") : "";

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-slate-900 border-b border-slate-800 px-6 py-7 sm:px-8 sm:py-8">
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-orange-500/12 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-violet-600/8 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-size-[48px_48px]" />

        <div className="relative">
          {/* Top nav */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate("/admin/tournaments")}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Back to Tournaments</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void handleGenerateBracket(true)}
                disabled={isGeneratingBracket}
                title="Regenerate bracket (deletes existing matches)"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border text-violet-400 bg-violet-500/10 border-violet-500/25 hover:bg-violet-500/20 hover:border-violet-500/40 disabled:opacity-50 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isGeneratingBracket ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{isGeneratingBracket ? "Generating…" : "Regenerate Bracket"}</span>
              </button>
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border text-amber-400 bg-amber-400/10 border-amber-400/25 hover:bg-amber-400/20 hover:border-amber-400/40 transition-all"
              >
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={() => setDeleteTarget(tournament)}
                disabled={isBlocked}
                title={isBlocked ? "Cannot delete active tournaments" : "Delete tournament"}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  isBlocked
                    ? "text-slate-600 border-slate-800 cursor-not-allowed opacity-40"
                    : "text-red-400 bg-red-500/10 border-red-500/25 hover:bg-red-500/20 hover:border-red-500/40"
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </div>

          {/* Title block — centered on mobile, left on desktop */}
          <div className="flex flex-col items-center text-center gap-4 sm:flex-row sm:items-center sm:text-left">
            {/* Game icon */}
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
              {gameLogoUrl ? (
                <img src={gameLogoUrl} alt={gameName} className="w-9 h-9 object-contain" />
              ) : (
                <Gamepad2 className="w-7 h-7 text-slate-600" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">{title}</h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${meta.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${isLive ? "animate-pulse" : ""}`} />
                  {meta.label}
                </span>
              </div>
              <div className="flex flex-col items-center sm:flex-row sm:items-center sm:flex-wrap sm:justify-start gap-y-1 gap-x-4 text-sm text-slate-400 mt-1">
                <span className="flex items-center gap-1.5"><Gamepad2 className="w-3.5 h-3.5" />{gameName}</span>
                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{orgUsername}</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{format} · {region}</span>
              </div>
            </div>
          </div>

          {/* Quick stat strip — collapsible on mobile, always visible on desktop */}
          <div className="mt-6">
            {/* Mobile toggle */}
            <button
              onClick={() => setStatsOpen(o => !o)}
              className="sm:hidden w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm font-medium text-slate-300"
            >
              <span>Tournament Stats</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${statsOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Cards */}
            <div className={`sm:grid sm:grid-cols-4 sm:gap-3 sm:mt-3 ${statsOpen ? "grid grid-cols-1 gap-2 mt-2" : "hidden"}`}>
              {[
                { label: "Players",    value: `${currentCount} / ${maxParticipants}`, icon: Users },
                { label: "Entry Fee",  value: formatGhs(entryFee),                    icon: DollarSign },
                { label: "Prize Pool", value: formatGhs(prizePool),                   icon: Trophy },
                { label: "Starts",     value: formatShortDate(String(schedule?.tournament_start ?? "")), icon: Calendar },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <Icon className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="text-sm font-bold text-white">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="px-6 sm:px-8 py-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN (2/3) ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Participation */}
            <Section title="Participation" icon={Users}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <StatTile icon={Users} label="Registered" value={currentCount}
                  sub={`of ${maxParticipants} slots`} accent="text-emerald-400" />
                <StatTile icon={CheckCircle2} label="Checked In" value={checkedIn}
                  sub={currentCount > 0 ? `${Math.round((checkedIn / currentCount) * 100)}% rate` : "—"} accent="text-cyan-400" />
                <StatTile icon={Activity} label="Waitlist" value={waitlistCount}
                  accent="text-violet-400" />
                <StatTile icon={Eye} label="Visibility" value={visibility}
                  accent="text-slate-400" />
              </div>

              {/* Fill bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span>Registration fill</span>
                  <span className="font-semibold text-white">{fillPct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      fillPct >= 100 ? "bg-orange-400" : fillPct >= 60 ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                    style={{ width: `${Math.min(fillPct, 100)}%` }}
                  />
                </div>
              </div>
            </Section>

            {/* Schedule */}
            <Section title="Schedule" icon={Calendar}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    icon: Clock,
                    label: "Registration",
                    start: String(schedule?.registration_start ?? ""),
                    end: String(schedule?.registration_end ?? ""),
                    color: "text-cyan-400 bg-cyan-400/10",
                  },
                  {
                    icon: Zap,
                    label: "Tournament",
                    start: String(schedule?.tournament_start ?? ""),
                    end: String(schedule?.tournament_end ?? ""),
                    color: "text-amber-400 bg-amber-400/10",
                  },
                  ...(schedule?.check_in_start
                    ? [{
                        icon: CheckCircle2,
                        label: "Check-in",
                        start: String(schedule?.check_in_start ?? ""),
                        end: String(schedule?.check_in_end ?? ""),
                        color: "text-emerald-400 bg-emerald-400/10",
                      }]
                    : []),
                ].map(({ icon: Icon, label, start, end, color }) => (
                  <div key={label} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                    <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-3`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{label}</p>
                    <p className="text-sm font-semibold text-white">{formatDate(start)}</p>
                    <p className="text-xs text-slate-500 mt-1">→ {formatDate(end)}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* Financials */}
            <Section title="Financials" icon={DollarSign}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatTile icon={DollarSign} label="Entry Fee" value={formatGhs(entryFee)} accent="text-slate-400" />
                <StatTile icon={Trophy} label="Net Prize Pool" value={formatGhs(prizePool)} accent="text-amber-400" />
                <StatTile icon={Shield} label="Platform Fee" value={formatGhs(platformFee)} accent="text-violet-400" />
              </div>

              <div className="mt-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/40">
                <InfoRow label="Funding Type" value={<span className="capitalize">{fundingType.replace(/_/g, " ")}</span>} />
                {tournament.escrow_status && (
                  <InfoRow label="Escrow Status" value={String(tournament.escrow_status)} />
                )}
                {tournament.escrow_id && (
                  <InfoRow
                    label="Escrow ID"
                    value={<span className="font-mono text-xs text-slate-400">{String(tournament.escrow_id)}</span>}
                  />
                )}
              </div>
            </Section>

            {/* Participants */}
            <ParticipantsSection tournamentId={id} />

            {/* Bracket */}
            <AdminBracketSection tournamentId={id} />

            {/* Description */}
            {tournament.description && (
              <Section title="Description">
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap wrap-break-word">
                  {String(tournament.description)}
                </p>
              </Section>
            )}
          </div>

          {/* ── RIGHT COLUMN (1/3) ── */}
          <div className="space-y-6">

            {/* Tournament Details */}
            <Section title="Details" icon={Hash}>
              <InfoRow label="Format" value={format} />
              <InfoRow label="Type" value={<span className="capitalize">{tournamentType.replace(/_/g, " ")}</span>} />
              <InfoRow label="Region" value={region} />
              <InfoRow label="Status" value={
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${meta.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
              } />
              <InfoRow label="Visibility" value={<span className="capitalize">{visibility}</span>} />
              <InfoRow label="Created" value={formatShortDate(String(tournament.created_at ?? ""))} />
            </Section>

            {/* Organizer */}
            <Section title="Organizer" icon={User}>
              {(() => {
                const profile      = organizer?.profile as Record<string, unknown> | undefined;
                const vstatus      = organizer?.verification_status as Record<string, unknown> | undefined;
                const ostats       = organizer?.stats as Record<string, unknown> | undefined;
                const avatarUrl    = String(profile?.avatar_url ?? "");
                const firstName    = String(profile?.first_name ?? "");
                const lastName     = String(profile?.last_name ?? "");
                const fullName     = [firstName, lastName].filter(Boolean).join(" ");
                const country      = String(profile?.country ?? "");
                const momoAccount  = organizer?.momo_account as Record<string, unknown> | undefined;
                const phone        = String(profile?.phone_number ?? momoAccount?.phone_number ?? "");
                const role         = String(organizer?.role ?? "");
                const isActive     = organizer?.is_active !== false;
                const isBanned     = Boolean(organizer?.is_banned);
                const emailVerif   = Boolean(vstatus?.email_verified);
                const orgVerif     = Boolean(vstatus?.organizer_verified);
                const lastLogin    = String(organizer?.last_login ?? "");
                const memberSince  = String(organizer?.created_at ?? "");
                const tournsPlayed = Number(ostats?.tournaments_played ?? 0);
                const tournsWon    = Number(ostats?.tournaments_won ?? 0);
                const totalEarned  = Number(ostats?.total_earnings ?? 0);

                return (
                  <>
                    {/* Avatar + name row */}
                    <div className="flex items-center justify-between gap-3 mb-6">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0 overflow-hidden">
                          {avatarUrl
                            ? <img src={avatarUrl} alt={orgUsername} className="w-full h-full object-cover" />
                            : <User className="w-6 h-6 text-slate-400" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{orgUsername}</p>
                          {fullName && <p className="text-xs text-slate-400 truncate">{fullName}</p>}
                          {orgEmail && <p className="text-xs text-slate-500 truncate">{orgEmail}</p>}
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 ${
                        isActive && !isBanned
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-red-500/15 text-red-400 border-red-500/30"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive && !isBanned ? "bg-emerald-400" : "bg-red-400"}`} />
                        {isBanned ? "Banned" : isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Info rows */}
                    <div className="space-y-1">
                      {country   && <InfoRow label="Country"      value={country} />}
                      <InfoRow label="Phone" value={phone || "—"} />
                      {memberSince && <InfoRow label="Member Since" value={formatShortDate(memberSince)} />}
                      {lastLogin && <InfoRow label="Last Login"   value={formatDate(lastLogin)} />}
                      {organizer?._id && (
                        <InfoRow label="User ID" value={
                          <span className="font-mono text-xs text-slate-500">{String(organizer._id).slice(0, 20)}…</span>
                        } />
                      )}
                    </div>

                    {/* Stats */}
                    {(tournsPlayed > 0 || totalEarned > 0) && (
                      <div className="mt-5 pt-5 border-t border-slate-800 grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-lg font-bold text-white">{tournsPlayed}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Played</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-amber-400">{tournsWon}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Won</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-emerald-400">{formatGhs(totalEarned)}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Earned</p>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </Section>

            {/* Game */}
            <Section title="Game" icon={Gamepad2}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                  {gameLogoUrl ? (
                    <img src={gameLogoUrl} alt={gameName} className="w-8 h-8 object-contain" />
                  ) : (
                    <Gamepad2 className="w-6 h-6 text-slate-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{gameName}</p>
                  {game?._id && <p className="text-xs font-mono text-slate-500 mt-0.5">{String(game._id).slice(0, 16)}…</p>}
                </div>
              </div>
            </Section>

            {/* Prize Distribution */}
            {prizeStruct?.distribution && Array.isArray(prizeStruct.distribution) && prizeStruct.distribution.length > 0 && (
              <Section title="Prize Distribution" icon={Trophy}>
                <div className="space-y-2">
                  {(prizeStruct.distribution as any[]).map((d: any) => (
                    <div key={d.position} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          d.position === 1 ? "bg-amber-400/20 text-amber-300" :
                          d.position === 2 ? "bg-slate-400/20 text-slate-300" :
                          d.position === 3 ? "bg-orange-700/20 text-orange-400" :
                          "bg-slate-800 text-slate-500"
                        }`}>
                          {d.position}
                        </span>
                        <span className="text-sm text-slate-300">{d.percentage}%</span>
                      </div>
                      <span className="text-sm font-semibold text-white">{formatGhs(d.amount)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editOpen && tournament && (
        <EditModal
          tournament={tournament}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => setTournament(prev => ({ ...prev, ...updated }))}
        />
      )}

      {/* ── Delete Modal ── */}
      <DeleteModal
        tournament={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
      />
    </div>
  );
};

export default TournamentDetail;
