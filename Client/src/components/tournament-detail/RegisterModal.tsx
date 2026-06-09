import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, CreditCard, Loader2, X } from "lucide-react";
import {
  tournamentService,
  type Tournament,
} from "../../services/tournament.service";
import { apiGet, apiPost, apiPut } from "../../utils/api.utils";
import { FINANCE_ENDPOINTS, TOURNAMENT_ENDPOINTS } from "../../config/api.config";

function formatFee(isFree: boolean, fee: number, currency: string) {
  if (isFree || fee === 0) return "Free";
  return `${currency} ${(fee / 100).toFixed(2)}`;
}

function isPaid(isFree: boolean, fee: number) {
  return !isFree && fee > 0;
}

const SKILL_LEVELS = ["beginner", "intermediate", "advanced", "pro"] as const;

const inputCls =
  "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors";

interface GameOption { id: string; name: string; }

type RegisterModalProps = {
  tournament: Tournament;
  onClose: () => void;
  onSuccess: () => void;
  onAlreadyRegistered?: () => void;
};

export default function RegisterModal({ tournament, onClose, onSuccess, onAlreadyRegistered }: RegisterModalProps) {
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  const [canJoin, setCanJoin] = useState(false);
  const [eligibilityReason, setEligibilityReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Game profile form
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [availableGames, setAvailableGames] = useState<GameOption[]>([]);
  const [selectedGameId, setSelectedGameId] = useState(tournament.game?.id ?? "");
  const [inGameId, setInGameId] = useState("");
  const [skillLevel, setSkillLevel] = useState("beginner");
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
          eligibility.canRegister ? null : (eligibility.reason ?? "You are not eligible to join this tournament."),
        );

        if (tournament.game?.id) {
          let found: Record<string, unknown> | null = null;

          if (profileRes?.success && profileRes.data) {
            found = profileRes.data as Record<string, unknown>;
          }

          if (!found) {
            try {
              const listRes = await apiGet(TOURNAMENT_ENDPOINTS.GAME_PROFILES, { skipCache: true });
              if (listRes?.success) {
                const raw = listRes.data as Record<string, unknown>;
                const list = (Array.isArray(listRes.data)
                  ? listRes.data
                  : (raw.game_profiles ?? raw.data ?? [])) as Record<string, unknown>[];
                found = list.find((item) => {
                  const gid = item.game_id as Record<string, unknown> | string | undefined;
                  if (!gid) return false;
                  const id = typeof gid === "object" ? String(gid._id ?? "") : String(gid);
                  if (id === tournament.game!.id) return true;
                  if (tournament.game?.name && typeof gid === "object") {
                    return String(gid.name ?? "").toLowerCase() === tournament.game.name.toLowerCase();
                  }
                  return false;
                }) ?? null;
              }
            } catch { /* fall through to show form */ }
          }

          if (found) {
            setInGameId(String(found.in_game_id ?? found.inGameId ?? ""));
            setSkillLevel(String(found.skill_level ?? found.skillLevel ?? "beginner"));
            setProfileSaved(true);
          } else {
            setShowProfileForm(true);
          }
        }
      } catch {
        if (!active) return;
        setCanJoin(false);
        setEligibilityReason("Unable to verify eligibility right now.");
      } finally {
        if (active) setIsCheckingEligibility(false);
      }
    };
    void init();
    return () => { active = false; };
  }, [tournament.id, tournament.game?.id]);

  useEffect(() => {
    if (!showProfileForm || gamesFetched.current) return;
    gamesFetched.current = true;
    apiGet(TOURNAMENT_ENDPOINTS.GAMES_LIST).then((res) => {
      if (!res.success) return;
      const raw = (Array.isArray(res.data) ? res.data : (res.data as Record<string, unknown>)?.games ?? []) as Record<string, unknown>[];
      setAvailableGames(raw.map((g) => ({ id: String(g._id ?? g.id ?? ""), name: String(g.name ?? "") })).filter((g) => g.id));
      if (!selectedGameId && tournament.game?.id) setSelectedGameId(tournament.game.id);
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
      const res = await apiPost(TOURNAMENT_ENDPOINTS.GAME_PROFILES, {
        game_id: selectedGameId,
        in_game_id: inGameId.trim(),
        skill_level: skillLevel,
      });
      if (!res.success) {
        const putRes = await apiPut(
          `${TOURNAMENT_ENDPOINTS.GAME_PROFILE_DETAIL}/${encodeURIComponent(selectedGameId)}`,
          { in_game_id: inGameId.trim(), skill_level: skillLevel },
        );
        if (!putRes.success) {
          setError("Failed to save game profile.");
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

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    if (!canJoin) return;

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
        const payRes = await apiPost(FINANCE_ENDPOINTS.TOURNAMENT_PAYMENT_INITIATE, {
          registration_id: registrationId,
          callback_url: `${window.location.origin}/payment-callback.html?type=entry`,
        });
        if (!payRes.success) {
          const err = (payRes as { error?: string | { message?: string } }).error;
          throw new Error((typeof err === "string" ? err : err?.message) ?? "Could not initiate payment.");
        }
        const payData = payRes.data as { authorization_url?: string };
        if (payData.authorization_url) { window.location.href = payData.authorization_url; return; }
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

  const canSubmit = !isSubmitting && !isCheckingEligibility && canJoin && (!showProfileForm || profileSaved);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-start justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Join Tournament</h2>
            <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">{tournament.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors" type="button">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleJoin} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-800/60 rounded-lg px-3 py-2">
              <p className="text-slate-400 text-xs">Entry Fee</p>
              <p className="font-semibold text-white mt-0.5">{formatFee(tournament.isFree, tournament.entryFee, tournament.currency)}</p>
            </div>
            <div className="bg-slate-800/60 rounded-lg px-3 py-2">
              <p className="text-slate-400 text-xs">Format</p>
              <p className="font-semibold text-white mt-0.5 capitalize">{tournament.format ?? "Solo"}</p>
            </div>
          </div>

          {isPaid(tournament.isFree, tournament.entryFee) && (
            <div className="flex items-start gap-2 bg-cyan-500/10 border border-cyan-500/25 rounded-lg px-3 py-2.5 text-sm text-cyan-300">
              <CreditCard className="w-4 h-4 mt-0.5 shrink-0" />
              <span>You'll be redirected to pay <strong>{formatFee(tournament.isFree, tournament.entryFee, tournament.currency)}</strong> via Mobile Money or card.</span>
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
                {availableGames.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
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
                {SKILL_LEVELS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
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

          {isCheckingEligibility && (
            <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              Checking eligibility...
            </div>
          )}

          {!isCheckingEligibility && !canJoin && eligibilityReason && (
            eligibilityReason.toLowerCase().includes("already registered") ? (
              <div className="flex flex-col gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5 text-sm text-amber-300">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>You already have a registration for this tournament.</span>
                </div>
                <button
                  type="button"
                  onClick={() => { onAlreadyRegistered?.(); onClose(); }}
                  className="self-start text-xs text-amber-200 underline hover:text-amber-100 transition-colors"
                >
                  View my registration →
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5 text-sm text-amber-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {eligibilityReason}
              </div>
            )
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2.5 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 disabled:opacity-60 transition-colors"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting
                ? (isPaid(tournament.isFree, tournament.entryFee) ? "Redirecting..." : "Joining...")
                : isPaid(tournament.isFree, tournament.entryFee) ? "Pay & Join" : "Confirm & Join"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
