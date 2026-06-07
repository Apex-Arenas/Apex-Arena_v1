import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CreditCard, Gamepad2, Loader2, X } from "lucide-react";
import {
  tournamentService,
  type Tournament,
} from "../../services/tournament.service";
import { formatFee } from "./utils";
import { apiPost } from "../../utils/api.utils";
import { FINANCE_ENDPOINTS } from "../../config/api.config";

interface RegisterModalProps {
  tournament: Tournament;
  onClose: () => void;
  onSuccess: () => void;
}

export function RegisterModal({
  tournament,
  onClose,
  onSuccess,
}: RegisterModalProps) {
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  const [canJoin, setCanJoin] = useState(true);
  const [eligibilityReason, setEligibilityReason] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inGameId, setInGameId] = useState("");

  useEffect(() => {
    let active = true;

    const checkEligibility = async () => {
      setIsCheckingEligibility(true);
      try {
        const result = await tournamentService.canRegister(tournament.id);
        if (!active) return;

        setCanJoin(result.canRegister);
        setEligibilityReason(
          result.canRegister
            ? null
            : (result.reason ??
                "You are not eligible to join this tournament yet."),
        );
      } catch {
        if (!active) return;
        setCanJoin(false);
        setEligibilityReason(
          "Unable to verify registration eligibility right now.",
        );
      } finally {
        if (active) setIsCheckingEligibility(false);
      }
    };

    void checkEligibility();
    return () => {
      active = false;
    };
  }, [tournament.id]);

  const needsInGameId =
    tournament.requiresInGameId ||
    eligibilityReason?.toLowerCase().includes("in-game id") === true;

  // If the only block is a missing in-game ID and the user has now typed one, let them proceed
  const inGameIdProvided = inGameId.trim().length > 0;
  const effectiveCanJoin =
    canJoin || (needsInGameId && inGameIdProvided && !canJoin &&
      eligibilityReason?.toLowerCase().includes("in-game id") === true);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (needsInGameId && !inGameIdProvided) {
      setError("Please enter your in-game ID to continue.");
      return;
    }

    if (!effectiveCanJoin) {
      setError(
        eligibilityReason ?? "You are not eligible to join this tournament.",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await tournamentService.register(tournament.id, {
        inGameId: inGameId.trim() || undefined,
      });

      if (result.status === "pending_payment") {
        // Resolve the registration ID. The server should return it directly, but
        // older deployed builds may omit it — fall back to fetching registrations.
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
            (typeof err === 'string' ? err : err?.message) ??
            "Could not initiate payment. Please try again."
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
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-start justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Join Tournament
            </h2>
            <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">
              {tournament.title}
            </p>
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
                {formatFee(
                  tournament.isFree,
                  tournament.entryFee,
                  tournament.currency,
                )}
              </p>
            </div>
            <div className="bg-slate-800/60 rounded-lg px-3 py-2">
              <p className="text-slate-400 text-xs">Format</p>
              <p className="font-semibold text-white mt-0.5 capitalize">
                {tournament.format ?? "Solo"}
              </p>
            </div>
          </div>

          {!tournament.isFree && (
            <div className="flex items-start gap-2 bg-cyan-500/10 border border-cyan-500/25 rounded-lg px-3 py-2.5 text-sm text-cyan-300">
              <CreditCard className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                You'll be redirected to pay{" "}
                <strong>
                  {formatFee(
                    tournament.isFree,
                    tournament.entryFee,
                    tournament.currency,
                  )}
                </strong>{" "}
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

          {needsInGameId && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1.5">
                <Gamepad2 className="w-3.5 h-3.5" />
                In-Game ID
                <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={inGameId}
                onChange={(e) => setInGameId(e.target.value)}
                placeholder="Enter team and/or player name"
                className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          )}

          {!isCheckingEligibility && !canJoin && eligibilityReason && !needsInGameId && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5 text-sm text-amber-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {eligibilityReason}
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
              disabled={isSubmitting || isCheckingEligibility || !effectiveCanJoin || (needsInGameId && !inGameIdProvided)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 disabled:opacity-60 transition-colors"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting
                ? (tournament.isFree ? "Registering..." : "Redirecting...")
                : tournament.isFree ? "Confirm & Join" : "Pay & Join"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
