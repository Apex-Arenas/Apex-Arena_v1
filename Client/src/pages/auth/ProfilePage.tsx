import { useCallback, useEffect, useRef, useState } from "react";
import {
  User,
  Camera,
  Save,
  Edit3,
  Lock,
  Globe,
  Gamepad2,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  Trophy,
  BarChart2,
  Calendar,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { authService } from "../../services/auth.service";
import ImageUploadDropzone from "../../components/ImageUploadDropzone";
import { apiDelete, apiGet, apiPost, apiPut } from "../../utils/api.utils";
import { AUTH_ENDPOINTS, TOURNAMENT_ENDPOINTS } from "../../config/api.config";
import type {
  UpdateProfilePayload,
  UserGameProfile,
} from "../../types/auth.types";
import { tournamentService, type MyTournamentRegistration } from "../../services/tournament.service";

// ─── Helpers ────────────────────────────────────────────────────────────────

function initials(first: string, last: string, username: string) {
  const f = first?.[0]?.toUpperCase() ?? "";
  const l = last?.[0]?.toUpperCase() ?? "";
  return f + l || username?.[0]?.toUpperCase() || "?";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-base font-semibold text-white mb-4 flex items-center gap-2">
      {children}
    </h2>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

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
      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50 transition-colors"
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
      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
    />
  );
}

function Alert({
  type,
  message,
  onClose,
}: {
  type: "success" | "error";
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm ${
        type === "success"
          ? "bg-green-500/10 border border-green-500/30 text-green-300"
          : "bg-red-500/10 border border-red-500/30 text-red-300"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
      )}
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        className="shrink-0 opacity-60 hover:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

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
  const [savedGameProfiles, setSavedGameProfiles] = useState<
    SavedGameProfile[]
  >([]);
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
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [passwordAlert, setPasswordAlert] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const [registrations, setRegistrations] = useState<MyTournamentRegistration[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const hasFetched = useRef(false);

  const mapSavedGameProfile = useCallback(
    (item: Record<string, unknown>): SavedGameProfile => {
      const gameObj = (item.game_id ?? item.game ?? {}) as Record<
        string,
        unknown
      >;
      const gameId = String(
        gameObj._id ?? gameObj.id ?? item.game_id ?? item.gameId ?? "",
      );

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
      const profile = (rootUser.profile ?? raw.profile ?? {}) as Record<
        string,
        unknown
      >;

      const list = (raw.game_profiles ??
        raw.gameProfiles ??
        rootUser.game_profiles ??
        rootUser.gameProfiles ??
        profile.game_profiles ??
        profile.gameProfiles ??
        []) as Record<string, unknown>[];

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

      const result = await authService.updateProfile({
        gameProfiles: payloadProfiles,
      });

      if (tokens) {
        const fallbackUserProfiles: UserGameProfile[] = nextProfiles.map(
          (profile) => ({
            gameId: profile.gameId,
            gameName: profile.gameName,
            inGameId: profile.inGameId,
            skillLevel:
              (profile.skillLevel as
                | "beginner"
                | "intermediate"
                | "advanced"
                | "pro"
                | undefined) ?? "beginner",
          }),
        );

        const nextUser = result.user
          ? {
              ...result.user,
              gameProfiles:
                (result.user.gameProfiles?.length ?? 0) > 0
                  ? result.user.gameProfiles
                  : fallbackUserProfiles,
            }
          : user
            ? {
                ...user,
                gameProfiles: fallbackUserProfiles,
              }
            : null;

        if (nextUser) {
          setSession(tokens, nextUser);
        }
      }

      setSavedGameProfiles(nextProfiles);
    },
    [setSession, tokens, user],
  );

  const fetchSavedGameProfiles = useCallback(async () => {
    const response = await apiGet(TOURNAMENT_ENDPOINTS.GAME_PROFILES, {
      skipCache: true,
      cache: "no-store",
    });

    if (!response.success) {
      const profileResponse = await apiGet(AUTH_ENDPOINTS.PROFILE, {
        skipCache: true,
        cache: "no-store",
      });

      if (profileResponse.success) {
        const fallbackProfiles = mapSavedGameProfilesFromProfilePayload(
          profileResponse.data as Record<string, unknown>,
        );
        setSavedGameProfiles(fallbackProfiles);
        return;
      }

      setSavedGameProfiles(mapAuthUserGameProfiles(user?.gameProfiles));
      return;
    }

    const raw = response.data as
      | Record<string, unknown>
      | Record<string, unknown>[];
    const list = Array.isArray(raw)
      ? raw
      : ((raw.game_profiles ?? raw.gameProfiles ?? raw.data ?? []) as Record<
          string,
          unknown
        >[]);
    const mapped = list.map(mapSavedGameProfile).filter((gp) => gp.gameId);

    setSavedGameProfiles(mapped);
  }, [
    mapAuthUserGameProfiles,
    mapSavedGameProfile,
    mapSavedGameProfilesFromProfilePayload,
    user,
  ]);

  // Fetch full profile on mount
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const load = async () => {
      setStatsLoading(true);
      tournamentService.getMyRegistrations().then((regs) => {
        setRegistrations(regs);
        setStatsLoading(false);
      }).catch(() => setStatsLoading(false));

      try {
        const [profileRes, gamesRes] = await Promise.all([
          apiGet(AUTH_ENDPOINTS.PROFILE, {
            skipCache: true,
            cache: "no-store",
          }),
          apiGet(TOURNAMENT_ENDPOINTS.GAMES),
        ]);

        if (profileRes.success) {
          const raw = profileRes.data as Record<string, unknown>;
          const rootUser = (raw.user ?? {}) as Record<string, unknown>;
          const profile = (raw.profile ?? rootUser.profile ?? {}) as Record<
            string,
            unknown
          >;
          const social = (profile.social_links ?? {}) as Record<
            string,
            unknown
          >;

          setForm({
            firstName: String(
              profile.first_name ?? raw.first_name ?? user?.firstName ?? "",
            ),
            lastName: String(
              profile.last_name ?? raw.last_name ?? user?.lastName ?? "",
            ),
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
          const list = Array.isArray(raw)
            ? raw
            : ((raw.games ?? raw.data ?? []) as Record<string, unknown>[]);
          setAvailableGames(
            list.map((g) => ({
              id: String(g._id ?? g.id ?? ""),
              name: String(g.name ?? ""),
            })),
          );
        }

        await fetchSavedGameProfiles();
      } catch {
        await fetchSavedGameProfiles();
      }
    };

    void load();
  }, [fetchSavedGameProfiles, user]);

  const setField = useCallback(
    <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSave = async () => {
    setIsSaving(true);
    setAlert(null);
    try {
      const payload: UpdateProfilePayload = {
        firstName: form.firstName,
        lastName: form.lastName,
        bio: form.bio || undefined,
        country: form.country || undefined,
        phone: form.phone || undefined,
        avatarUrl: form.avatarUrl || undefined,
        discord:
          form.discord && isValidHttpUrl(form.discord)
            ? form.discord
            : undefined,
        twitter:
          form.twitter && isValidHttpUrl(form.twitter)
            ? form.twitter
            : undefined,
        twitch:
          form.twitch && isValidHttpUrl(form.twitch) ? form.twitch : undefined,
        youtube:
          form.youtube && isValidHttpUrl(form.youtube)
            ? form.youtube
            : undefined,
      };

      const result = await authService.updateProfile(payload);
      if (result.user && tokens) {
        setSession(tokens, result.user);
      }
      setAlert({ type: "success", msg: "Profile updated successfully." });
    } catch (err) {
      setAlert({
        type: "error",
        msg: err instanceof Error ? err.message : "Failed to save changes.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current || !passwordForm.next) {
      setPasswordAlert({
        type: "error",
        msg: "Please fill in all password fields.",
      });
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordAlert({ type: "error", msg: "New passwords do not match." });
      return;
    }
    if (passwordForm.next.length < 8) {
      setPasswordAlert({
        type: "error",
        msg: "New password must be at least 8 characters.",
      });
      return;
    }

    setIsSavingPassword(true);
    setPasswordAlert(null);
    try {
      const response = await apiPost(AUTH_ENDPOINTS.PASSWORD_CHANGE, {
        current_password: passwordForm.current,
        new_password: passwordForm.next,
      });
      if (!response.success) {
        const msg =
          (response as { error?: { message?: string } }).error?.message ??
          "Failed to change password.";
        setPasswordAlert({ type: "error", msg });
        return;
      }
      setPasswordAlert({
        type: "success",
        msg: "Password changed successfully.",
      });
      setPasswordForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setPasswordAlert({
        type: "error",
        msg: err instanceof Error ? err.message : "Failed to change password.",
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const addGame = () => {
    setGames((prev) => [
      ...prev,
      { gameId: "", gameName: "", inGameId: "", skillLevel: "beginner" },
    ]);
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
      setAlert({
        type: "error",
        msg: "Select a game and enter an in-game ID before saving.",
      });
      return;
    }

    setIsSavingGameProfile(true);
    setAlert(null);

    try {
      const exists = savedGameProfiles.some((gp) => gp.gameId === draft.gameId);
      const resolvedGameName =
        draft.gameName ||
        availableGames.find((game) => game.id === draft.gameId)?.name ||
        "";
      const nextProfiles = exists
        ? savedGameProfiles.map((profile) =>
            profile.gameId === draft.gameId
              ? {
                  ...profile,
                  gameName: resolvedGameName,
                  inGameId: draft.inGameId,
                  skillLevel: draft.skillLevel,
                }
              : profile,
          )
        : [
            ...savedGameProfiles,
            {
              gameId: draft.gameId,
              gameName: resolvedGameName,
              inGameId: draft.inGameId,
              skillLevel: draft.skillLevel,
            },
          ];

      const response = exists
        ? await apiPut(
            `${TOURNAMENT_ENDPOINTS.GAME_PROFILE_DETAIL}/${encodeURIComponent(draft.gameId)}`,
            {
              in_game_id: draft.inGameId,
              skill_level: draft.skillLevel,
            },
          )
        : await apiPost(TOURNAMENT_ENDPOINTS.GAME_PROFILES, {
            game_id: draft.gameId,
            in_game_id: draft.inGameId,
            skill_level: draft.skillLevel,
          });

      if (!response.success) {
        try {
          await saveProfilesViaAuthProfile(nextProfiles);
          setGames((prev) => prev.filter((_, i) => i !== index));
          setAlert({
            type: "success",
            msg: exists ? "Game profile updated." : "Game profile saved.",
          });
          return;
        } catch {
          // Fall through to API error handling below.
        }

        setAlert({
          type: "error",
          msg:
            response.error?.message ??
            (exists
              ? "Failed to update game profile."
              : "Failed to save game profile."),
        });
        return;
      }

      await fetchSavedGameProfiles();
      setGames((prev) => prev.filter((_, i) => i !== index));
      setAlert({
        type: "success",
        msg: exists ? "Game profile updated." : "Game profile saved.",
      });
    } catch (err) {
      setAlert({
        type: "error",
        msg:
          err instanceof Error ? err.message : "Failed to save game profile.",
      });
    } finally {
      setIsSavingGameProfile(false);
    }
  };

  const startEditSavedGameProfile = (profile: SavedGameProfile) => {
    setGames([
      {
        gameId: profile.gameId,
        gameName: profile.gameName,
        inGameId: profile.inGameId,
        skillLevel: profile.skillLevel,
      },
    ]);
  };

  const deleteSavedGameProfile = async (gameId: string) => {
    setDeletingGameId(gameId);
    setAlert(null);

    try {
      const response = await apiDelete(
        `${TOURNAMENT_ENDPOINTS.GAME_PROFILE_DETAIL}/${encodeURIComponent(gameId)}`,
      );

      if (!response.success) {
        try {
          const nextProfiles = savedGameProfiles.filter(
            (profile) => profile.gameId !== gameId,
          );
          await saveProfilesViaAuthProfile(nextProfiles);
          setGames((prev) => prev.filter((g) => g.gameId !== gameId));
          setAlert({ type: "success", msg: "Game profile deleted." });
          return;
        } catch {
          // Fall through to API error handling below.
        }

        setAlert({
          type: "error",
          msg: response.error?.message ?? "Failed to delete game profile.",
        });
        return;
      }

      await fetchSavedGameProfiles();
      setGames((prev) => prev.filter((g) => g.gameId !== gameId));
      setAlert({ type: "success", msg: "Game profile deleted." });
    } catch (err) {
      setAlert({
        type: "error",
        msg:
          err instanceof Error ? err.message : "Failed to delete game profile.",
      });
    } finally {
      setDeletingGameId(null);
    }
  };

  const displayName =
    `${form.firstName} ${form.lastName}`.trim() || user?.username || "User";

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {form.avatarUrl ? (
            <img
              src={form.avatarUrl}
              alt=""
              className="w-16 h-16 rounded-full object-cover border-2 border-slate-700"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xl font-bold text-slate-300">
              {initials(form.firstName, form.lastName, user?.username ?? "")}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Camera className="w-3 h-3 text-slate-400" />
          </div>
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            {displayName}
          </h1>
          <p className="text-sm text-slate-400">
            @{user?.username}
            <span className="ml-2 px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 text-xs capitalize">
              {user?.role}
            </span>
          </p>
        </div>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.msg}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Personal Info */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <SectionTitle>
          <User className="w-4 h-4 text-cyan-400" />
          Personal Info
        </SectionTitle>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First Name">
            <Input
              value={form.firstName}
              onChange={(v) => setField("firstName", v)}
              placeholder="First name"
            />
          </Field>
          <Field label="Last Name">
            <Input
              value={form.lastName}
              onChange={(v) => setField("lastName", v)}
              placeholder="Last name"
            />
          </Field>
        </div>

        <Field label="Bio">
          <Textarea
            value={form.bio}
            onChange={(v) => setField("bio", v)}
            placeholder="Tell others about yourself (max 500 characters)"
            rows={3}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Country">
            <Input
              value={form.country}
              onChange={(v) => setField("country", v)}
              placeholder="e.g. Ghana"
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(v) => setField("phone", v)}
              placeholder="e.g. +233 50 000 0000"
            />
          </Field>
        </div>

        <Field label="Avatar Image">
          <ImageUploadDropzone
            value={form.avatarUrl}
            onChange={(v) => setField("avatarUrl", v)}
            folder="apex-arenas/users/avatars"
          />
        </Field>

        <Field label="Email">
          <Input value={user?.email ?? ""} onChange={() => {}} disabled />
        </Field>
      </div>

      {/* Social Links */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <SectionTitle>
          <Globe className="w-4 h-4 text-cyan-400" />
          Social Links
        </SectionTitle>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(
            [
              {
                key: "discord",
                label: "Discord",
                placeholder: "Your Discord tag",
              },
              {
                key: "twitter",
                label: "Twitter / X",
                placeholder: "https://twitter.com/you",
              },
              {
                key: "twitch",
                label: "Twitch",
                placeholder: "https://twitch.tv/you",
              },
              {
                key: "youtube",
                label: "YouTube",
                placeholder: "https://youtube.com/@you",
              },
            ] as {
              key: keyof ProfileForm;
              label: string;
              placeholder: string;
            }[]
          ).map(({ key, label, placeholder }) => (
            <Field key={key} label={label}>
              <Input
                value={form[key] as string}
                onChange={(v) => setField(key, v)}
                placeholder={placeholder}
              />
            </Field>
          ))}
        </div>
      </div>

      {/* Game Profiles */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <SectionTitle>
            <Gamepad2 className="w-4 h-4 text-cyan-400" />
            Game Profiles
          </SectionTitle>
          <button
            onClick={addGame}
            className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Game
          </button>
        </div>

        {games.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            No draft game profile. Click Add Game to create or edit one.
          </p>
        ) : (
          <div className="space-y-3">
            {games.map((g, i) => (
              <div
                key={i}
                className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end"
              >
                <Field label="Game">
                  <select
                    value={g.gameId}
                    onChange={(e) => updateGame(i, "gameId", e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="">Select game</option>
                    {availableGames.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="In-Game ID">
                  <Input
                    value={g.inGameId}
                    onChange={(v) => updateGame(i, "inGameId", v)}
                    placeholder="Your in-game username"
                  />
                </Field>

                <Field label="Skill Level">
                  <select
                    value={g.skillLevel}
                    onChange={(e) =>
                      updateGame(i, "skillLevel", e.target.value)
                    }
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    {["beginner", "intermediate", "advanced", "pro"].map(
                      (s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <button
                  onClick={() => void saveGameProfile(i)}
                  disabled={isSavingGameProfile}
                  className="mb-0.5 px-3 py-2 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-60 transition-colors"
                >
                  {isSavingGameProfile ? "Saving..." : "Save"}
                </button>

                <button
                  onClick={() => removeGame(i)}
                  className="mb-0.5 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">
            Saved Game Profiles
          </h3>

          {savedGameProfiles.length === 0 ? (
            <p className="text-sm text-slate-500">
              No saved game profiles yet.
            </p>
          ) : (
            <div className="space-y-2">
              {savedGameProfiles.map((profile) => (
                <div
                  key={profile.gameId}
                  className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 font-medium truncate">
                      {profile.gameName || "Unknown Game"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      Game ID: {profile.gameId}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      In-Game ID: {profile.inGameId} · Skill:{" "}
                      {profile.skillLevel}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => startEditSavedGameProfile(profile)}
                      className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        void deleteSavedGameProfile(profile.gameId)
                      }
                      disabled={deletingGameId === profile.gameId}
                      className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-60 transition-colors"
                    >
                      {deletingGameId === profile.gameId
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats & Tournament History */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <SectionTitle>
          <BarChart2 className="w-4 h-4 text-cyan-400" />
          Stats & Tournament History
        </SectionTitle>

        {statsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 rounded-full border-2 border-cyan-500/40 border-t-cyan-400 animate-spin" />
          </div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No tournament history yet. Join a tournament to get started!</p>
          </div>
        ) : (
          <>
            {/* Quick stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Joined",
                  value: registrations.length,
                  color: "text-cyan-300",
                },
                {
                  label: "Completed",
                  value: registrations.filter((r) => r.tournamentStatus === "completed").length,
                  color: "text-emerald-300",
                },
                {
                  label: "Ongoing",
                  value: registrations.filter((r) => ["ongoing", "in_progress", "active"].includes(r.tournamentStatus ?? "")).length,
                  color: "text-amber-300",
                },
                {
                  label: "Checked In",
                  value: registrations.filter((r) => r.checkedIn).length,
                  color: "text-indigo-300",
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2.5 text-center">
                  <p className={`text-xl font-bold font-display ${color}`}>{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Tournament list */}
            <div className="space-y-2 pt-1">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Recent Tournaments</h3>
              {registrations.slice(0, 8).map((reg) => {
                const statusColors: Record<string, string> = {
                  completed:   "text-emerald-300",
                  active:      "text-cyan-300",
                  ongoing:     "text-cyan-300",
                  in_progress: "text-cyan-300",
                  cancelled:   "text-slate-400",
                  pending:     "text-amber-300",
                  registered:  "text-indigo-300",
                };
                const statusColor = statusColors[reg.tournamentStatus ?? ""] ?? "text-slate-400";

                return (
                  <div key={reg.registrationId} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Trophy className="w-4 h-4 text-slate-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-200 font-medium truncate">{reg.tournamentTitle}</p>
                        {reg.tournamentGameName && (
                          <p className="text-xs text-slate-500 truncate">{reg.tournamentGameName}</p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-xs font-medium capitalize ${statusColor}`}>
                        {reg.tournamentStatus?.replace(/_/g, " ") ?? "unknown"}
                      </p>
                      {reg.tournamentStart && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 justify-end mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(reg.tournamentStart).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 disabled:opacity-60 transition-colors"
        >
          {isSaving ? (
            <div className="h-4 w-4 rounded-full border-2 border-slate-950/40 border-t-transparent animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Change Password */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <SectionTitle>
          <Lock className="w-4 h-4 text-cyan-400" />
          Change Password
        </SectionTitle>

        {passwordAlert && (
          <Alert
            type={passwordAlert.type}
            message={passwordAlert.msg}
            onClose={() => setPasswordAlert(null)}
          />
        )}

        <div className="space-y-3">
          <Field label="Current Password">
            <Input
              type="password"
              value={passwordForm.current}
              onChange={(v) => setPasswordForm((p) => ({ ...p, current: v }))}
              placeholder="Enter current password"
            />
          </Field>
          <Field label="New Password">
            <Input
              type="password"
              value={passwordForm.next}
              onChange={(v) => setPasswordForm((p) => ({ ...p, next: v }))}
              placeholder="At least 8 characters"
            />
          </Field>
          <Field label="Confirm New Password">
            <Input
              type="password"
              value={passwordForm.confirm}
              onChange={(v) => setPasswordForm((p) => ({ ...p, confirm: v }))}
              placeholder="Repeat new password"
            />
          </Field>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleChangePassword}
            disabled={isSavingPassword}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-700 text-white text-sm font-semibold hover:bg-slate-600 disabled:opacity-60 transition-colors"
          >
            {isSavingPassword ? (
              <div className="h-4 w-4 rounded-full border-2 border-white/40 border-t-transparent animate-spin" />
            ) : (
              <Edit3 className="w-4 h-4" />
            )}
            {isSavingPassword ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
