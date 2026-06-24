import type { Dispatch, SetStateAction } from "react";
import { Pencil, X, Loader2, CheckCircle2 } from "lucide-react";
import type { OrganizerBracketMatch } from "../tournament-manage.utils";

interface SetScoreInput {
  score1: string;
  score2: string;
  reason: string;
  penalty1: string;
  penalty2: string;
}

interface SetScoreModalProps {
  target: OrganizerBracketMatch;
  setScoreInput: SetScoreInput;
  setSetScoreInput: Dispatch<SetStateAction<SetScoreInput>>;
  isSettingScore: boolean;
  onSetScore: () => void;
  onClose: () => void;
}

export default function SetScoreModal({
  target,
  setScoreInput,
  setSetScoreInput,
  isSettingScore,
  onSetScore,
  onClose,
}: SetScoreModalProps) {
  const isPenaltySubmission = target.status === "awaiting_penalties";
  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80 bg-slate-950/30">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPenaltySubmission ? "bg-amber-500/15 border border-amber-500/25" : "bg-orange-500/15 border border-orange-500/25"}`}>
              <Pencil className={`w-4 h-4 ${isPenaltySubmission ? "text-amber-400" : "text-orange-400"}`} />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-white">{isPenaltySubmission ? "Penalty Shootout" : "Set Match Score"}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                R{target.round} · M{target.matchNumber} · {isPenaltySubmission ? "Aggregate level — enter penalty scores" : "Manual override"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {/* Quick outcome shortcuts — hidden when submitting penalties */}
          {!isPenaltySubmission && <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Quick Set</p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setSetScoreInput(prev => ({ ...prev, score1: "1", score2: "0", penalty1: "", penalty2: "" }))}
                className={`py-1.5 rounded-lg text-[11px] font-bold border transition-colors truncate px-1 ${
                  setScoreInput.score1 === "1" && setScoreInput.score2 === "0"
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                }`}
              >
                {target.participants[0]?.inGameId?.split(" ")[0] || "P1"} Win
              </button>
              <button
                type="button"
                onClick={() => setSetScoreInput(prev => ({ ...prev, score1: "0", score2: "0", penalty1: "", penalty2: "" }))}
                className={`py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                  setScoreInput.score1 === setScoreInput.score2 && setScoreInput.score1 !== ""
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                }`}
              >
                {(target.format?.best_of ?? 1) === 1 ? "Draw+Pen" : "Draw"}
              </button>
              <button
                type="button"
                onClick={() => setSetScoreInput(prev => ({ ...prev, score1: "0", score2: "1", penalty1: "", penalty2: "" }))}
                className={`py-1.5 rounded-lg text-[11px] font-bold border transition-colors truncate px-1 ${
                  setScoreInput.score1 === "0" && setScoreInput.score2 === "1"
                    ? "bg-orange-500/20 border-orange-500/40 text-orange-300"
                    : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                }`}
              >
                {target.participants[1]?.inGameId?.split(" ")[0] || "P2"} Win
              </button>
            </div>
          </div>}

          {/* Manual score inputs — hidden when submitting penalties */}
          {!isPenaltySubmission && <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                {target.participants[0]?.inGameId || "Player 1"}
              </label>
              <input
                type="number"
                min="0"
                value={setScoreInput.score1}
                onChange={e => setSetScoreInput(prev => ({ ...prev, score1: e.target.value }))}
                placeholder="0"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-center text-xl font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                {target.participants[1]?.inGameId || "Player 2"}
              </label>
              <input
                type="number"
                min="0"
                value={setScoreInput.score2}
                onChange={e => setSetScoreInput(prev => ({ ...prev, score2: e.target.value }))}
                placeholder="0"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-center text-xl font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>
          </div>}

          {/* Penalty-only mode: aggregate level after two legs */}
          {isPenaltySubmission && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2.5">
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Penalty Shootout — Required</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                    {target.participants[0]?.inGameId || "Player 1"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={setScoreInput.score1}
                    onChange={e => setSetScoreInput(prev => ({ ...prev, score1: e.target.value }))}
                    placeholder="0"
                    className="w-full bg-slate-800/60 border border-amber-500/30 rounded-xl px-3 py-2 text-center text-lg font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/60 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                    {target.participants[1]?.inGameId || "Player 2"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={setScoreInput.score2}
                    onChange={e => setSetScoreInput(prev => ({ ...prev, score2: e.target.value }))}
                    placeholder="0"
                    className="w-full bg-slate-800/60 border border-amber-500/30 rounded-xl px-3 py-2 text-center text-lg font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/60 transition-colors"
                  />
                </div>
              </div>
              {(() => {
                const p1 = parseInt(setScoreInput.score1, 10);
                const p2 = parseInt(setScoreInput.score2, 10);
                if (!isNaN(p1) && !isNaN(p2) && setScoreInput.score1 !== "" && setScoreInput.score2 !== "") {
                  if (p1 === p2) return <p className="text-[11px] text-rose-400">Penalty scores must not be equal — a winner is required.</p>;
                  const winner = p1 > p2 ? target.participants[0]?.inGameId || "Player 1" : target.participants[1]?.inGameId || "Player 2";
                  return <p className="text-[11px] text-cyan-300 font-semibold">{winner} wins on penalties</p>;
                }
                return null;
              })()}
            </div>
          )}

          {!isPenaltySubmission && setScoreInput.score1 !== "" && setScoreInput.score2 !== "" && (() => {
            const s1 = parseInt(setScoreInput.score1, 10);
            const s2 = parseInt(setScoreInput.score2, 10);
            if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) return null;
            const isDraw = s1 === s2;
            const p1 = parseInt(setScoreInput.penalty1, 10);
            const p2 = parseInt(setScoreInput.penalty2, 10);
            const penaltiesEntered = !isNaN(p1) && !isNaN(p2) && setScoreInput.penalty1 !== "" && setScoreInput.penalty2 !== "";
            const penaltyWinner = penaltiesEntered && p1 !== p2
              ? (p1 > p2
                ? target.participants[0]?.inGameId || "Player 1"
                : target.participants[1]?.inGameId || "Player 2")
              : null;
            const resultText = isDraw
              ? penaltyWinner ? `${penaltyWinner} wins (on penalties)` : "Draw — enter penalties below"
              : s1 > s2
                ? `${target.participants[0]?.inGameId || "Player 1"} wins`
                : `${target.participants[1]?.inGameId || "Player 2"} wins`;
            return (
              <>
                <div className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border ${
                  isDraw && !penaltyWinner
                    ? "bg-amber-500/8 border-amber-500/25"
                    : isDraw && penaltyWinner
                      ? "bg-cyan-500/8 border-cyan-500/20"
                      : "bg-cyan-500/8 border-cyan-500/20"
                }`}>
                  <span className="text-xs text-slate-400">Result:</span>
                  <span className={`text-xs font-bold ${isDraw && !penaltyWinner ? "text-amber-300" : "text-cyan-300"}`}>{resultText}</span>
                </div>

                {isDraw && (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2.5">
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                      Penalty Shootout{(target.format?.best_of ?? 1) === 1 ? " — Required" : ""}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                          {target.participants[0]?.inGameId || "Player 1"}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={setScoreInput.penalty1}
                          onChange={e => setSetScoreInput(prev => ({ ...prev, penalty1: e.target.value }))}
                          placeholder="0"
                          className="w-full bg-slate-800/60 border border-amber-500/30 rounded-xl px-3 py-2 text-center text-lg font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/60 transition-colors"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                          {target.participants[1]?.inGameId || "Player 2"}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={setScoreInput.penalty2}
                          onChange={e => setSetScoreInput(prev => ({ ...prev, penalty2: e.target.value }))}
                          placeholder="0"
                          className="w-full bg-slate-800/60 border border-amber-500/30 rounded-xl px-3 py-2 text-center text-lg font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/60 transition-colors"
                        />
                      </div>
                    </div>
                    {penaltiesEntered && p1 === p2 && (
                      <p className="text-[11px] text-rose-400">Penalty scores must not be equal — a winner is required.</p>
                    )}
                  </div>
                )}
              </>
            );
          })()}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Reason <span className="text-slate-700 normal-case font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={setScoreInput.reason}
              onChange={e => setSetScoreInput(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. Score confirmed via screenshot"
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/60 transition-colors"
            />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-300 hover:border-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSetScore}
            disabled={(() => {
              if (isSettingScore) return true;
              if (isPenaltySubmission) {
                if (setScoreInput.score1 === "" || setScoreInput.score2 === "") return true;
                const p1 = parseInt(setScoreInput.score1, 10);
                const p2 = parseInt(setScoreInput.score2, 10);
                return isNaN(p1) || isNaN(p2) || p1 < 0 || p2 < 0 || p1 === p2;
              }
              if (setScoreInput.score1 === "" || setScoreInput.score2 === "") return true;
              const s1 = parseInt(setScoreInput.score1, 10);
              const s2 = parseInt(setScoreInput.score2, 10);
              if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) return true;
              if (s1 === s2) {
                const p1 = parseInt(setScoreInput.penalty1, 10);
                const p2 = parseInt(setScoreInput.penalty2, 10);
                if (setScoreInput.penalty1 === "" || setScoreInput.penalty2 === "") return true;
                if (isNaN(p1) || isNaN(p2) || p1 < 0 || p2 < 0 || p1 === p2) return true;
              }
              return false;
            })()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-400 text-slate-950 text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSettingScore ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {isSettingScore ? "Setting…" : isPenaltySubmission ? "Confirm Penalties" : "Confirm Score"}
          </button>
        </div>
      </div>
    </div>
  );
}
