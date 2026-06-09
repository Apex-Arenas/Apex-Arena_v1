import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CreditCard, Loader2, X } from "lucide-react";
import {
  tournamentService,
  type Tournament,
} from "../../services/tournament.service";
import { apiPost } from "../../utils/api.utils";
import { FINANCE_ENDPOINTS } from "../../config/api.config";

function formatFee(isFree: boolean, fee: number, currency: string) {
  if (isFree || fee === 0) return "Free";
  return `${currency} ${(fee / 100).toFixed(2)}`;
}

function isPaid(isFree: boolean, fee: number) {
  return !isFree && fee > 0;
}

type RegisterModalProps = {
  tournament: Tournament;
  onClose: () => void;
  onSuccess: () => void;
};

export default function RegisterModal({
  tournament,
  onClose,
  onSuccess,
}: RegisterModalProps) {
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  const [canJoin, setCanJoin] = useState(false);
  const [eligibilityReason, setEligibilityReason] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    tournamentService
      .canRegister(tournament.id)
      .then((result) => {
        if (!active) return;
        setCanJoin(result.canRegister);
        setEligibilityReason(
          result.canRegister
            ? null
            : (result.reason ??
                "You are not eligible to join this tournament."),
        );
      })
      .catch(() => {
        if (!active) return;
        setCanJoin(false);
        setEligibilityReason("Unable to verify eligibility right now.");
      })
      .finally(() => {
        if (active) setIsCheckingEligibility(false);
      });

    return () => {
      active = false;
    };
  }, [tournament.id]);

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    if (!canJoin) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await tournamentService.register(tournament.id);

      if (result.status === "pending_payment") {
        // Paid tournament — initiate gateway payment
        const payRes = await apiPost(FINANCE_ENDPOINTS.TOURNAMENT_PAYMENT_INITIATE, {
          registration_id: result.registrationId,
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
          return; // page is navigating away
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
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleJoin} className="p-5 space-y-4">
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

          {isPaid(tournament.isFree, tournament.entryFee) && (
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

          {isCheckingEligibility ? (
            <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              Checking eligibility...
            </div>
          ) : !canJoin && eligibilityReason ? (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5 text-sm text-amber-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {eligibilityReason}
            </div>
          ) : null}

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
              disabled={isSubmitting || isCheckingEligibility || !canJoin}
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
