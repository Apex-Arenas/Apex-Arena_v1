import type { Dispatch, SetStateAction } from "react";
import { Link } from "react-router-dom";
import { Wallet, ArrowRight } from "lucide-react";
import type { WalletBalance } from "../../../services/organizer.service";
import { formatGhs } from "../dashboard.utils";

interface WalletCardProps {
  playerWallet: WalletBalance | null;
  walletAmountInput: string;
  setWalletAmountInput: Dispatch<SetStateAction<string>>;
  handleDeposit: () => Promise<void>;
  isDepositing: boolean;
  walletError: string | null;
  walletInfo: string | null;
}

export default function WalletCard({
  playerWallet,
  walletAmountInput,
  setWalletAmountInput,
  handleDeposit,
  isDepositing,
  walletError,
  walletInfo,
}: WalletCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/60">
        <Wallet className="w-4 h-4 text-orange-400" />
        <h3 className="text-sm font-semibold text-white">Wallet</h3>
        <Link
          to="/auth/wallet"
          className="ml-auto text-[11px] text-slate-500 hover:text-orange-400 flex items-center gap-1 transition-colors"
        >
          Manage <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="p-4 space-y-3">
        {/* Balance */}
        <div className="text-center py-1">
          <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">Available Balance</p>
          <p className="font-display text-3xl font-bold text-white">{formatGhs(playerWallet?.availableBalance)}</p>
        </div>

        {/* Pending / Escrow */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-slate-800 px-3 py-2.5 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Pending</p>
            <p className="text-sm font-semibold text-amber-300">{formatGhs(playerWallet?.pendingBalance)}</p>
          </div>
          <div className="rounded-lg border border-slate-800 px-3 py-2.5 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">In Tournaments</p>
            <p className="text-sm font-semibold text-cyan-300">{formatGhs(playerWallet?.escrowLocked)}</p>
          </div>
        </div>

        {/* Quick Deposit */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs text-slate-400" htmlFor="wallet-amount">Quick Deposit (GHS)</label>
          <div className="flex gap-2">
            <input
              id="wallet-amount"
              type="number"
              min="5"
              step="0.01"
              value={walletAmountInput}
              onChange={(e) => setWalletAmountInput(e.target.value)}
              className="flex-1 min-w-0 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white focus:border-orange-500/70 focus:outline-none transition-colors"
              placeholder="e.g. 20"
            />
            <button
              type="button"
              onClick={() => { void handleDeposit(); }}
              disabled={isDepositing}
              className="shrink-0 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-bold text-slate-950 hover:shadow-md hover:shadow-orange-500/20 disabled:opacity-60 transition-all"
            >
              {isDepositing ? "…" : "Go"}
            </button>
          </div>
        </div>

        {walletError && (
          <p className="text-xs text-red-300 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2">{walletError}</p>
        )}
        {walletInfo && (
          <p className="text-xs text-orange-300 rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2">{walletInfo}</p>
        )}
      </div>
    </div>
  );
}
