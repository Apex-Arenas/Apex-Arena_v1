import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, CreditCard, Loader2, X } from "lucide-react";
import {
  tournamentService,
  type Tournament,
} from "../../services/tournament.service";
import { formatFee, isPaid } from "./utils";
import { apiGet, apiPost, apiPut } from "../../utils/api.utils";
import { FINANCE_ENDPOINTS, TOURNAMENT_ENDPOINTS } from "../../config/api.config";

interface RegisterModalProps {
  tournament: Tournament;
  onClose: () => void;
  onSuccess: () => void;
}

interface GameOption {
  id: string;
  name: string;
}

const SKILL_LEVELS = ["beginner", "intermediate", "advanced", "pro"] as const;

const inputCls =
  "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors";

export function RegisterModal({
  tournament,
  onClose,
  onSuccess,
}: RegisterModalProps) {
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  const [canJoin, setCanJoin] = useState(true);
  const [eligibilityReason, setEligibilityReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In-game ID / game profile form
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [availableGames, setAvailableGames] = useState<GameOption[]>([]);
  const [selectedGameId, setSelectedGameId] = useState(tournament.game?.id ?? "");
  const [inGameId, setInGameId] = useState("");
  const [skillLevel, setSkillLevel] = useState<string>("beginner");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const gamesFetched = useRef(false);

  useEffect(() => {
    let active = true;
    const init = async () => {
      setIsCheckingEligibility(true);
      try {
        const [eligibility, profileRes] = await Promise.all([
          tournamentService.canRegister(tournament.id),
          tournament.game?.id
            ? apiGet(`${TOURNAMENT_ENDPOINTS.GAME_PROFILE_DETAIL}/${encodeURIComponent(tournament.game.id)}`)
            : Promise.resolve(null),
        ]);
        if (!active) return;

        setCanJoin(eligibility.canRegister);
        setEligibilityReason(
          eligibility.canRegister ? null : (eligibility.reason ?? "You are not eligible to join this tournament yet."),
        );

        if (tournament.game?.id) {
          let profile: Record<string, unknown> | null = null;

          if (profileRes?.success && profileRes.data) {
            profile = profileRes.data as Record<string, unknown>;
          } else {
            // Single-profile fetch failed — try the full list as fallback
            try {
              const listRes = await apiGet(TOURNAMENT_ENDPOINTS.GAME_PROFILES);
              if (listRes?.success) {
                const raw = listRes.data as Record<string, unknown>;
                const list = (Array.isArray(listRes.data)
                  ? listRes.data
                  : (raw.game_profiles ?? raw.gameProfiles ?? raw.data ?? [])) as Record<string, unknown>[];
                const match = list.find((p) => {
                  const gid = p.game_id as Record<string, unknown> | string | undefined;
                  if (!gid) return false;
                  const id = typeof gid === "object" ? String(gid._id ?? "") : String(gid);
                  return id === tournament.game!.id;
                });
                if (match) profile = match;
              }
            } catch { /* ignore, will show form */ }
          }

          if (profile) {
            const existingId = String(profile.in_game_id ?? profile.inGameId ?? "");
            if (existingId) {
              setInGameId(existingId);
              setSkillLevel(String(profile.skill_level ?? profile.skillLevel ?? "beginner"));
              setProfileSaved(true);
            } else {
              setShowProfileForm(true);
            }
          } else {
            setShowProfileForm(true);
          }
        }
      } catch {
        if (!active) return;
        setCanJoin(false);
        setEligibilityReason("Unable to verify registration eligibility right now.");
      } finally {
        if (active) setIsCheckingEligibility(false);
      }
    };
    void init();
    return () => { active = false; };
  }, [tournament.id, tournament.game?.id]);

  // Fetch available games when profile form is shown
  useEffect(() => {
    if (!showProfileForm || gamesFetched.current) return;
    gamesFetched.current = true;
    apiGet(TOURNAMENT_ENDPOINTS.GAMES_LIST, { skipAuth: false }).then((res) => {
      if (!res.success) return;
      const raw = (Array.isArray(res.data) ? res.data : (res.data as Record<string, unknown>)?.games ?? []) as Record<string, unknown>[];
      setAvailableGames(raw.map((g) => ({ id: String(g._id ?? g.id ?? ""), name: String(g.name ?? "") })).filter((g) => g.id));
      // Auto-select the tournament's game if not already set
      if (!selectedGameId && tournament.game?.id) {
        setSelectedGameId(tournament.game.id);
      }
    }).catch(() => {});
  }, [showProfileForm, selectedGameId, tournament.game?.id]);

  const handleSaveProfile = async () => {
    if (!selectedGameId || !inGameId.trim()) {
      setError("Select a game and enter an in-game ID before saving.");
      return;
    }
    setIsSavingProfile(true);
    setError(null);
    try {
      const response = await apiPost(TOURNAMENT_ENDPOINTS.GAME_PROFILES, {
        game_id: selectedGameId,
        in_game_id: inGameId.trim(),
        skill_level: skillLevel,
      });
      if (!response.success) {
        // Try PUT in case profile already exists
        const putRes = await apiPut(
          `${TOURNAMENT_ENDPOINTS.GAME_PROFILE_DETAIL}/${encodeURIComponent(selectedGameId)}`,
          { in_game_id: inGameId.trim(), skill_level: skillLevel },
        );
        if (!putRes.success) {
          setError(putRes.error?.message ?? "Failed to save game profile.");
          return;
        }
      }
      setProfileSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save game profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!canJoin) {
      setError(eligibilityReason ?? "You are not eligible to join this tournament.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await tournamentService.register(tournament.id, {
        inGameId: inGameId.trim() || undefined,
      });

      if (result.status === "pending_payment") {
        let registrationId = result.registrationId;
        if (!registrationId) {
          const myRegs = await tournamentService.getMyRegistrations();
          const pending = myRegs.find(
            (r) => r.tournamentId === tournament.id && r.status === "pending_payment",
          );
          registrationId = pending?.registrationId ?? "";
        }
        if (!registrationId) {
          throw new Error(
            "Registration was saved but we could not retrieve its ID. Please refresh and use the 'Complete Payment' button from your registrations.",
          );
        }

        const payRes = await apiPost(FINANCE_ENDPOINTS.TOURNAMENT_PAYMENT_INITIATE, {
          registration_id: registrationId,
          callback_url: `${window.location.origin}/payment-callback.html?type=entry`,
        });
        if (!payRes.success) {
          const err = (payRes as { error?: string | { message?: string } }).error;
          throw new Error(
            (typeof err === "string" ? err : err?.message) ?? "Could not initiate payment. Please try again."
          );
        }
        const payData = payRes.data as { authorization_url?: string };
        if (payData.authorization_url) {
          window.location.href = payData.authorization_url;
          return;
        }
        throw new Error("No payment URL returned. Please try again.");
      }

      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed.";
      if (msg.toLowerCase().includes("in-game id") || msg.toLowerCase().includes("in_game_id")) {
        setShowProfileForm(true);
        setError("This tournament requires an in-game ID. Please save your game profile below.");
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    !isSubmitting &&
    !isCheckingEligibility &&
    canJoin &&
    (!showProfileForm || profileSaved);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-start justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Join Tournament</h2>
            <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">{tournament.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-800/60 rounded-lg px-3 py-2">
              <p className="text-slate-400 text-xs">Entry Fee</p>
              <p className="font-semibold text-white mt-0.5">
                {formatFee(tournament.isFree, tournament.entryFee, tournament.currency)}
              </p>
            </div>
            <div className="bg-slate-800/60 rounded-lg px-3 py-2">
              <p className="text-slate-400 text-xs">Format</p>
              <p className="font-semibold text-white mt-0.5 capitalize">{tournament.format ?? "Solo"}</p>
            </div>
          </div>

          {isPaid(tournament.isFree, tournament.entryFee) && (
            <div className="flex items-start gap-2 bg-cyan-500/10 border border-cyan-500/25 rounded-lg px-3 py-2.5 text-sm text-cyan-300">
              <CreditCard className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                You'll be redirected to pay{" "}
                <strong>{formatFee(tournament.isFree, tournament.entryFee, tournament.currency)}</strong>{" "}
                via Mobile Money or card.
              </span>
            </div>
          )}

          {isCheckingEligibility && (
            <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              Checking eligibility...
            </div>
          )}

          {!isCheckingEligibility && !canJoin && eligibilityReason && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5 text-sm text-amber-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {eligibilityReason}
            </div>
          )}

          {showProfileForm && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 space-y-3">
              <p className="text-xs font-medium text-slate-400">Game Profile</p>

              <select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                disabled={profileSaved}
                className={inputCls}
              >
                <option value="">Select game</option>
                {availableGames.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>

              <input
                type="text"
                value={inGameId}
                onChange={(e) => { setInGameId(e.target.value); setError(null); }}
                placeholder="In-game ID"
                disabled={profileSaved}
                className={inputCls}
              />

              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                disabled={profileSaved}
                className={inputCls}
              >
                {SKILL_LEVELS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>

              {profileSaved ? (
                <p className="text-xs text-emerald-400 font-medium">Game profile saved. You can now join.</p>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSaveProfile()}
                  disabled={isSavingProfile || !selectedGameId || !inGameId.trim()}
                  className="w-full py-2.5 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 disabled:opacity-60 transition-colors"
                >
                  {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save"}
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2.5 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 disabled:opacity-60 transition-colors"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting
                ? (isPaid(tournament.isFree, tournament.entryFee) ? "Redirecting..." : "Registering...")
                : isPaid(tournament.isFree, tournament.entryFee) ? "Pay & Join" : "Confirm & Join"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
