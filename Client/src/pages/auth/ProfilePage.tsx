import { useCallback, useEffect, useRef, useState } from "react";
import {
  User,
  Camera,
  Save,
  Edit3,
  Lock,
  Globe,
  Gamepad2,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { authService } from "../../services/auth.service";
import ImageUploadDropzone from "../../components/ImageUploadDropzone";
import { apiDelete, apiGet, apiPost, apiPut } from "../../utils/api.utils";
import { AUTH_ENDPOINTS, TOURNAMENT_ENDPOINTS } from "../../config/api.config";
import { showSuccess, showError } from "../../utils/toast.utils";
import type {
  UpdateProfilePayload,
  UserGameProfile,
} from "../../types/auth.types";
import { tournamentService, type MyTournamentRegistration } from "../../services/tournament.service";

// ─── Countries List (ISO 3166-1 alpha-2 codes) ────────────────────────────────

const COUNTRIES = [
  { code: "GH", name: "Ghana" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" },
  { code: "UG", name: "Uganda" },
  { code: "TZ", name: "Tanzania" },
  { code: "RW", name: "Rwanda" },
  { code: "CM", name: "Cameroon" },
  { code: "ET", name: "Ethiopia" },
  { code: "SN", name: "Senegal" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "ML", name: "Mali" },
  { code: "BF", name: "Burkina Faso" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
  { code: "BW", name: "Botswana" },
  { code: "NA", name: "Namibia" },
  { code: "MU", name: "Mauritius" },
  { code: "SC", name: "Seychelles" },
  { code: "AO", name: "Angola" },
  { code: "BJ", name: "Benin" },
  { code: "BI", name: "Burundi" },
  { code: "CV", name: "Cape Verde" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CD", name: "Democratic Republic of the Congo" },
  { code: "DJ", name: "Djibouti" },
  { code: "EG", name: "Egypt" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "SZ", name: "Eswatini" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MR", name: "Mauritania" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "NE", name: "Niger" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SO", name: "Somalia" },
  { code: "SS", name: "South Sudan" },
  { code: "SD", name: "Sudan" },
  { code: "TG", name: "Togo" },
  { code: "TN", name: "Tunisia" },
  { code: "EH", name: "Western Sahara" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function initials(first: string, last: string, username: string) {
  const f = first?.[0]?.toUpperCase() ?? "";
  const l = last?.[0]?.toUpperCase() ?? "";
  return f + l || username?.[0]?.toUpperCase() || "?";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-orange-400" />
        </div>
        <h2 className="font-display text-sm font-bold text-white uppercase tracking-wide">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/70 focus:bg-slate-900 disabled:opacity-50 transition-colors";

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={inputCls}
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`${inputCls} resize-none`}
    />
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProfileForm {
  firstName: string;
  lastName: string;
  bio: string;
  country: string;
  phone: string;
  avatarUrl: string;
  discord: string;
  twitter: string;
  twitch: string;
  youtube: string;
}

interface GameEntry {
  gameId: string;
  gameName: string;
  inGameId: string;
  skillLevel: string;
}

interface SavedGameProfile {
  gameId: string;
  gameName: string;
  inGameId: string;
  skillLevel: string;
}

interface PasswordForm {
  current: string;
  next: string;
  confirm: string;
}

interface GameOption {
  id: string;
  name: string;
}

// ─── Main Component ──────────────────────────────────────────────────────────

const ProfilePage = () => {
  const { user, setSession, tokens } = useAuth();

  function isValidHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  const [form, setForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    bio: "",
    country: "",
    phone: "",
    avatarUrl: "",
    discord: "",
    twitter: "",
    twitch: "",
    youtube: "",
  });

  const [games, setGames] = useState<GameEntry[]>([]);
  const [savedGameProfiles, setSavedGameProfiles] = useState<SavedGameProfile[]>([]);
  const [availableGames, setAvailableGames] = useState<GameOption[]>([]);

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    current: "",
    next: "",
    confirm: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSavingGameProfile, setIsSavingGameProfile] = useState(false);
  const [deletingGameId, setDeletingGameId] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [registrations, setRegistrations] = useState<MyTournamentRegistration[]>([]);

  const hasFetched = useRef(false);

  const mapSavedGameProfile = useCallback(
    (item: Record<string, unknown>): SavedGameProfile => {
      const gameObj = (item.game_id ?? item.game ?? {}) as Record<string, unknown>;
      const gameId = String(gameObj._id ?? gameObj.id ?? item.game_id ?? item.gameId ?? "");
      return {
        gameId,
        gameName: String(gameObj.name ?? item.game_name ?? item.gameName ?? ""),
        inGameId: String(item.in_game_id ?? item.inGameId ?? ""),
        skillLevel: String(item.skill_level ?? item.skillLevel ?? "beginner"),
      };
    },
    [],
  );

  const mapAuthUserGameProfiles = useCallback(
    (profiles: UserGameProfile[] | undefined): SavedGameProfile[] => {
      return (profiles ?? [])
        .filter((g) => Boolean(g.gameId))
        .map((g) => ({
          gameId: String(g.gameId),
          gameName: String(g.gameName ?? ""),
          inGameId: String(g.inGameId ?? ""),
          skillLevel: String(g.skillLevel ?? "beginner"),
        }));
    },
    [],
  );

  const mapSavedGameProfilesFromProfilePayload = useCallback(
    (raw: Record<string, unknown>): SavedGameProfile[] => {
      const rootUser = (raw.user ?? raw) as Record<string, unknown>;
      const profile = (rootUser.profile ?? raw.profile ?? {}) as Record<string, unknown>;
      const list = (raw.game_profiles ?? raw.gameProfiles ?? rootUser.game_profiles ?? rootUser.gameProfiles ?? profile.game_profiles ?? profile.gameProfiles ?? []) as Record<string, unknown>[];
      return list.map(mapSavedGameProfile).filter((gp) => gp.gameId);
    },
    [mapSavedGameProfile],
  );

  const saveProfilesViaAuthProfile = useCallback(
    async (nextProfiles: SavedGameProfile[]) => {
      const payloadProfiles = nextProfiles.map((profile) => ({
        gameId: profile.gameId,
        inGameId: profile.inGameId,
        skillLevel: profile.skillLevel,
      }));

      const result = await authService.updateProfile({ gameProfiles: payloadProfiles });

      if (tokens) {
        const fallbackUserProfiles: UserGameProfile[] = nextProfiles.map((profile) => ({
          gameId: profile.gameId,
          gameName: profile.gameName,
          inGameId: profile.inGameId,
          skillLevel: (profile.skillLevel as "beginner" | "intermediate" | "advanced" | "pro" | undefined) ?? "beginner",
        }));

        const nextUser = result.user
          ? { ...result.user, gameProfiles: (result.user.gameProfiles?.length ?? 0) > 0 ? result.user.gameProfiles : fallbackUserProfiles }
          : user ? { ...user, gameProfiles: fallbackUserProfiles } : null;

        if (nextUser) setSession(tokens, nextUser);
      }

      setSavedGameProfiles(nextProfiles);
    },
    [setSession, tokens, user],
  );

  const fetchSavedGameProfiles = useCallback(async () => {
    const response = await apiGet(TOURNAMENT_ENDPOINTS.GAME_PROFILES, { skipCache: true, cache: "no-store" });

    if (!response.success) {
      const profileResponse = await apiGet(AUTH_ENDPOINTS.PROFILE, { skipCache: true, cache: "no-store" });
      if (profileResponse.success) {
        const fallbackProfiles = mapSavedGameProfilesFromProfilePayload(profileResponse.data as Record<string, unknown>);
        setSavedGameProfiles(fallbackProfiles);
        return;
      }
      setSavedGameProfiles(mapAuthUserGameProfiles(user?.gameProfiles));
      return;
    }

    const raw = response.data as Record<string, unknown> | Record<string, unknown>[];
    const list = Array.isArray(raw) ? raw : ((raw.game_profiles ?? raw.gameProfiles ?? raw.data ?? []) as Record<string, unknown>[]);
    setSavedGameProfiles(list.map(mapSavedGameProfile).filter((gp) => gp.gameId));
  }, [mapAuthUserGameProfiles, mapSavedGameProfile, mapSavedGameProfilesFromProfilePayload, user]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const load = async () => {
      tournamentService.getMyRegistrations()
        .then((regs) => { setRegistrations(regs); })
        .catch(() => {});

      try {
        const [profileRes, gamesRes] = await Promise.all([
          apiGet(AUTH_ENDPOINTS.PROFILE, { skipCache: true, cache: "no-store" }),
          apiGet(TOURNAMENT_ENDPOINTS.GAMES),
        ]);

        if (profileRes.success) {
          const raw = profileRes.data as Record<string, unknown>;
          const rootUser = (raw.user ?? {}) as Record<string, unknown>;
          const profile = (raw.profile ?? rootUser.profile ?? {}) as Record<string, unknown>;
          const social = (profile.social_links ?? {}) as Record<string, unknown>;
          setForm({
            firstName: String(profile.first_name ?? raw.first_name ?? user?.firstName ?? ""),
            lastName: String(profile.last_name ?? raw.last_name ?? user?.lastName ?? ""),
            bio: String(profile.bio ?? ""),
            country: String(profile.country ?? ""),
            phone: String(profile.phone_number ?? profile.phone ?? ""),
            avatarUrl: String(profile.avatar_url ?? ""),
            discord: String(social.discord ?? ""),
            twitter: String(social.twitter ?? ""),
            twitch: String(social.twitch ?? ""),
            youtube: String(social.youtube ?? ""),
          });
        }

        if (gamesRes.success) {
          const raw = gamesRes.data as Record<string, unknown>;
          const list = Array.isArray(raw) ? raw : ((raw.games ?? raw.data ?? []) as Record<string, unknown>[]);
          setAvailableGames(list.map((g) => ({ id: String(g._id ?? g.id ?? ""), name: String(g.name ?? "") })));
        }

        await fetchSavedGameProfiles();
      } catch {
        await fetchSavedGameProfiles();
      }
    };

    void load();
  }, [fetchSavedGameProfiles, user]);

  const setField = useCallback(<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: UpdateProfilePayload = {
        firstName: form.firstName,
        lastName: form.lastName,
        bio: form.bio || undefined,
        country: form.country || undefined,
        phone: form.phone || undefined,
        avatarUrl: form.avatarUrl || undefined,
        discord: form.discord && isValidHttpUrl(form.discord) ? form.discord : undefined,
        twitter: form.twitter && isValidHttpUrl(form.twitter) ? form.twitter : undefined,
        twitch: form.twitch && isValidHttpUrl(form.twitch) ? form.twitch : undefined,
        youtube: form.youtube && isValidHttpUrl(form.youtube) ? form.youtube : undefined,
      };
      const result = await authService.updateProfile(payload);
      if (result.user && tokens) setSession(tokens, result.user);
      showSuccess("Profile updated successfully.");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current || !passwordForm.next) {
      showError("Please fill in all password fields.");
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      showError("New passwords do not match.");
      return;
    }
    if (passwordForm.next.length < 8) {
      showError("New password must be at least 8 characters.");
      return;
    }
    setIsSavingPassword(true);
    try {
      const response = await apiPost(AUTH_ENDPOINTS.PASSWORD_CHANGE, {
        current_password: passwordForm.current,
        new_password: passwordForm.next,
      });
      if (!response.success) {
        const msg = (response as { error?: { message?: string } }).error?.message ?? "Failed to change password.";
        showError(msg);
        return;
      }
      showSuccess("Password changed successfully.");
      setPasswordForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const addGame = () => {
    setGames((prev) => [...prev, { gameId: "", gameName: "", inGameId: "", skillLevel: "beginner" }]);
  };

  const updateGame = (index: number, field: keyof GameEntry, value: string) => {
    setGames((prev) =>
      prev.map((g, i) => {
        if (i !== index) return g;
        if (field === "gameId") {
          const found = availableGames.find((ag) => ag.id === value);
          return { ...g, gameId: value, gameName: found?.name ?? "" };
        }
        return { ...g, [field]: value };
      }),
    );
  };

  const removeGame = (index: number) => {
    setGames((prev) => prev.filter((_, i) => i !== index));
  };

  const saveGameProfile = async (index: number) => {
    const draft = games[index];
    if (!draft) return;
    if (!draft.gameId || !draft.inGameId) {
      showError("Select a game and enter an in-game ID before saving.");
      return;
    }
    setIsSavingGameProfile(true);
    try {
      const exists = savedGameProfiles.some((gp) => gp.gameId === draft.gameId);
      const resolvedGameName = draft.gameName || availableGames.find((game) => game.id === draft.gameId)?.name || "";
      const nextProfiles = exists
        ? savedGameProfiles.map((profile) =>
            profile.gameId === draft.gameId
              ? { ...profile, gameName: resolvedGameName, inGameId: draft.inGameId, skillLevel: draft.skillLevel }
              : profile,
          )
        : [...savedGameProfiles, { gameId: draft.gameId, gameName: resolvedGameName, inGameId: draft.inGameId, skillLevel: draft.skillLevel }];

      const response = exists
        ? await apiPut(`${TOURNAMENT_ENDPOINTS.GAME_PROFILE_DETAIL}/${encodeURIComponent(draft.gameId)}`, { in_game_id: draft.inGameId, skill_level: draft.skillLevel })
        : await apiPost(TOURNAMENT_ENDPOINTS.GAME_PROFILES, { game_id: draft.gameId, in_game_id: draft.inGameId, skill_level: draft.skillLevel });

      if (!response.success) {
        try {
          await saveProfilesViaAuthProfile(nextProfiles);
          setGames((prev) => prev.filter((_, i) => i !== index));
          showSuccess(exists ? "Game profile updated." : "Game profile saved.");
          return;
        } catch { /* fall through */ }
        showError(response.error?.message ?? (exists ? "Failed to update game profile." : "Failed to save game profile."));
        return;
      }

      await fetchSavedGameProfiles();
      setGames((prev) => prev.filter((_, i) => i !== index));
      showSuccess(exists ? "Game profile updated." : "Game profile saved.");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save game profile.");
    } finally {
      setIsSavingGameProfile(false);
    }
  };

  const startEditSavedGameProfile = (profile: SavedGameProfile) => {
    setGames([{ gameId: profile.gameId, gameName: profile.gameName, inGameId: profile.inGameId, skillLevel: profile.skillLevel }]);
  };

  const deleteSavedGameProfile = async (gameId: string) => {
    setDeletingGameId(gameId);
    try {
      const response = await apiDelete(`${TOURNAMENT_ENDPOINTS.GAME_PROFILE_DETAIL}/${encodeURIComponent(gameId)}`);
      if (!response.success) {
        try {
          const nextProfiles = savedGameProfiles.filter((profile) => profile.gameId !== gameId);
          await saveProfilesViaAuthProfile(nextProfiles);
          setGames((prev) => prev.filter((g) => g.gameId !== gameId));
          showSuccess("Game profile deleted.");
          return;
        } catch { /* fall through */ }
        showError(response.error?.message ?? "Failed to delete game profile.");
        return;
      }
      await fetchSavedGameProfiles();
      setGames((prev) => prev.filter((g) => g.gameId !== gameId));
      showSuccess("Game profile deleted.");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete game profile.");
    } finally {
      setDeletingGameId(null);
    }
  };

  const displayName = `${form.firstName} ${form.lastName}`.trim() || user?.username || "User";
  const isOrganizer = user?.role === "organizer";

  // Quick stats derived from registrations
  const statJoined    = registrations.length;
  const statCompleted = registrations.filter((r) => r.tournamentStatus === "completed").length;
  const statOngoing   = registrations.filter((r) => ["ongoing", "in_progress", "active"].includes(r.tournamentStatus ?? "")).length;
  const statCheckedIn = registrations.filter((r) => r.checkedIn).length;

  return (
    <div className="min-h-screen bg-slate-950">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-slate-800/50">

        {/* ── Banner strip ── */}
        <div className="relative h-28 sm:h-36 bg-slate-900 overflow-hidden">
          {/* Grid */}
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
          {/* Orange glow top-right */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 120% at 80% -10%, rgba(249,115,22,0.35), transparent)" }} />
          {/* Amber mid-glow */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 40% 80% at 30% 120%, rgba(251,191,36,0.12), transparent)" }} />
          {/* Purple hint left */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 40% 60% at 0% 50%, rgba(139,92,246,0.12), transparent)" }} />
          {/* Decorative line across bottom */}
          <div className="absolute bottom-0 inset-x-0 h-px bg-linear-to-r from-transparent via-orange-500/30 to-transparent" />
        </div>

        {/* ── Identity (overlaps banner) ── */}
        <div className="relative max-w-5xl mx-auto px-6 sm:px-8">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-end sm:text-left gap-4 -mt-12 sm:-mt-14 pb-5">

            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-4 border-slate-950 shadow-2xl ring-2 ring-orange-500/30 bg-linear-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                {form.avatarUrl ? (
                  <img
                    src={form.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <span className="font-display text-3xl font-bold text-white">
                    {initials(form.firstName, form.lastName, user?.username ?? "")}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center shadow-lg">
                <Camera className="w-3.5 h-3.5 text-orange-400" />
              </div>
            </div>

            {/* Name + meta */}
            <div className="min-w-0 sm:pb-1">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">{displayName}</h1>
              <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap sm:justify-start">
                <span className="text-slate-400 text-sm">@{user?.username}</span>
                <span className="text-slate-700">·</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                  isOrganizer
                    ? "bg-orange-500/15 border border-orange-500/30 text-orange-300"
                    : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                }`}>
                  {user?.role ?? "player"}
                </span>
                {user?.country && (
                  <>
                    <span className="text-slate-700">·</span>
                    <span className="text-xs text-slate-500">{user.country}</span>
                  </>
                )}
              </div>
              {form.bio && (
                <p className="text-sm text-slate-400 mt-1.5 line-clamp-1">{form.bio}</p>
              )}
            </div>
          </div>

          {/* Quick stats strip */}
          <div className="pb-6 grid grid-cols-4 gap-px bg-slate-800/50 rounded-xl overflow-hidden">
            {[
              { label: "Joined",     value: statJoined,    color: "text-cyan-300"    },
              { label: "Done",       value: statCompleted, color: "text-emerald-300" },
              { label: "Active",     value: statOngoing,   color: "text-amber-300"   },
              { label: "Checked In", value: statCheckedIn, color: "text-violet-300"  },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-900/80 px-2 py-3 text-center">
                <p className={`font-display text-xl font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-10 sm:px-6 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

          {/* ── Left column ─────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Personal Info */}
            <SectionCard icon={User} title="Personal Info">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="First Name">
                    <Input value={form.firstName} onChange={(v) => setField("firstName", v)} placeholder="First name" />
                  </Field>
                  <Field label="Last Name">
                    <Input value={form.lastName} onChange={(v) => setField("lastName", v)} placeholder="Last name" />
                  </Field>
                </div>
                <Field label="Bio">
                  <Textarea value={form.bio} onChange={(v) => setField("bio", v)} placeholder="Tell others about yourself…" rows={3} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Country">
                    <select
                      value={form.country}
                      onChange={(e) => setField("country", e.target.value)}
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/70 transition-colors appearance-none cursor-pointer [&>option]:bg-slate-800 [&>option]:text-white"
                    >
                      <option value="">Select a country</option>
                      {COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>{country.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Phone">
                    <Input value={form.phone} onChange={(v) => setField("phone", v)} placeholder="e.g. +233 50 000 0000" />
                  </Field>
                </div>
                <Field label="Email">
                  <Input value={user?.email ?? ""} onChange={() => {}} disabled />
                </Field>
              </div>
            </SectionCard>

            {/* Social Links */}
            <SectionCard icon={Globe} title="Social Links">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  { key: "discord", label: "Discord",      placeholder: "Your Discord tag" },
                  { key: "twitter", label: "Twitter / X",  placeholder: "https://twitter.com/you" },
                  { key: "twitch",  label: "Twitch",       placeholder: "https://twitch.tv/you" },
                  { key: "youtube", label: "YouTube",      placeholder: "https://youtube.com/@you" },
                ] as { key: keyof ProfileForm; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
                  <Field key={key} label={label}>
                    <Input value={form[key] as string} onChange={(v) => setField(key, v)} placeholder={placeholder} />
                  </Field>
                ))}
              </div>
            </SectionCard>

            {/* Save Changes */}
            <button
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="w-full py-3 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:from-orange-400 hover:to-amber-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <><div className="w-4 h-4 rounded-full border-2 border-slate-950/40 border-t-transparent animate-spin" />Saving…</>
              ) : (
                <><Save className="w-4 h-4" />Save Changes</>
              )}
            </button>

          </div>

          {/* ── Right column (sticky) ────────────────────────────────────── */}
          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">

            {/* Avatar Upload */}
            <SectionCard icon={Camera} title="Profile Photo">
              <ImageUploadDropzone
                value={form.avatarUrl}
                onChange={(v) => setField("avatarUrl", v)}
                folder="apex-arenas/users/avatars"
              />
              <p className="text-xs text-slate-500 mt-3 text-center">
                Square image recommended · JPG or PNG
              </p>
            </SectionCard>

            {/* Game Profiles */}
            <SectionCard icon={Gamepad2} title="Game Profiles">
              {/* Saved profiles */}
              {savedGameProfiles.length > 0 && (
                <div className="space-y-2 mb-4">
                  {savedGameProfiles.map((profile) => (
                    <div key={profile.gameId} className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium truncate">
                            {profile.gameName || "Unknown Game"}
                          </p>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {profile.inGameId} · <span className="capitalize">{profile.skillLevel}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => startEditSavedGameProfile(profile)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => void deleteSavedGameProfile(profile.gameId)}
                            disabled={deletingGameId === profile.gameId}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                          >
                            {deletingGameId === profile.gameId
                              ? <div className="w-3.5 h-3.5 rounded-full border border-red-400/40 border-t-red-400 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Draft game entries */}
              {games.length > 0 && (
                <div className="space-y-3 mb-4">
                  {games.map((g, i) => (
                    <div key={i} className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 space-y-2">
                      <select
                        value={g.gameId}
                        onChange={(e) => updateGame(i, "gameId", e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Select game</option>
                        {availableGames.map((ag) => (
                          <option key={ag.id} value={ag.id}>{ag.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={g.inGameId}
                        onChange={(e) => updateGame(i, "inGameId", e.target.value)}
                        placeholder="In-game ID"
                        className={inputCls}
                      />
                      <select
                        value={g.skillLevel}
                        onChange={(e) => updateGame(i, "skillLevel", e.target.value)}
                        className={inputCls}
                      >
                        {["beginner", "intermediate", "advanced", "pro"].map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => void saveGameProfile(i)}
                          disabled={isSavingGameProfile}
                          className="flex-1 py-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 text-xs font-bold disabled:opacity-60 transition-opacity"
                        >
                          {isSavingGameProfile ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={() => removeGame(i)}
                          className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {games.length === 0 && savedGameProfiles.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4 mb-4">
                  No game profiles yet. Add one below.
                </p>
              )}

              <button
                onClick={addGame}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-700 text-sm text-slate-400 hover:border-orange-500/50 hover:text-orange-400 hover:bg-orange-500/5 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Game Profile
              </button>
            </SectionCard>

            {/* Change Password */}
            <SectionCard icon={Lock} title="Change Password">
              <div className="space-y-3">
                <Field label="Current Password">
                  <Input type="password" value={passwordForm.current} onChange={(v) => setPasswordForm((p) => ({ ...p, current: v }))} placeholder="Current password" />
                </Field>
                <Field label="New Password">
                  <Input type="password" value={passwordForm.next} onChange={(v) => setPasswordForm((p) => ({ ...p, next: v }))} placeholder="At least 8 characters" />
                </Field>
                <Field label="Confirm New Password">
                  <Input type="password" value={passwordForm.confirm} onChange={(v) => setPasswordForm((p) => ({ ...p, confirm: v }))} placeholder="Repeat new password" />
                </Field>
              </div>
              <button
                onClick={() => void handleChangePassword()}
                disabled={isSavingPassword}
                className="mt-5 w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-semibold hover:bg-slate-700 hover:border-slate-600 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              >
                {isSavingPassword ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Updating…</>
                ) : (
                  <><Edit3 className="w-4 h-4" />Update Password</>
                )}
              </button>
            </SectionCard>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
