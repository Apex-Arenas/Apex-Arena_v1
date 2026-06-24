import type { Dispatch, SetStateAction } from "react";
import { UserPlus, Loader2, AlertCircle, X } from "lucide-react";
import type {
  CoOrganizerEntry,
  OrganizerSearchResult,
} from "./tournament-manage.utils";

interface CoOrganizersCardProps {
  inviteIdentifier: string;
  setInviteIdentifier: Dispatch<SetStateAction<string>>;
  setCoOrgError: Dispatch<SetStateAction<string | null>>;
  handleCoOrgSearch: (q: string) => void;
  isInvitingCoOrg: boolean;
  handleInviteCoOrg: () => void;
  isSearchingCoOrg: boolean;
  coOrgSearchResults: OrganizerSearchResult[];
  setCoOrgSearchResults: Dispatch<SetStateAction<OrganizerSearchResult[]>>;
  coOrgError: string | null;
  isLoadingCoOrgs: boolean;
  coOrganizers: CoOrganizerEntry[];
  handleRemoveCoOrg: (targetUserId: string, name: string) => void;
}

export default function CoOrganizersCard({
  inviteIdentifier,
  setInviteIdentifier,
  setCoOrgError,
  handleCoOrgSearch,
  isInvitingCoOrg,
  handleInviteCoOrg,
  isSearchingCoOrg,
  coOrgSearchResults,
  setCoOrgSearchResults,
  coOrgError,
  isLoadingCoOrgs,
  coOrganizers,
  handleRemoveCoOrg,
}: CoOrganizersCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-800/60 bg-slate-950/20">
        <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
          <UserPlus className="w-4 h-4 text-violet-400" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-sm font-bold text-white">
            Co-organizers
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
            Invite others to help manage
          </p>
        </div>
      </div>

      <div className="p-3.5 space-y-3">
        {/* Invite input row */}
        <div className="relative">
          <input
            type="text"
            value={inviteIdentifier}
            onChange={(e) => {
              setInviteIdentifier(e.target.value);
              setCoOrgError(null);
              handleCoOrgSearch(e.target.value);
            }}
            placeholder="Email or username"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-3 pr-16 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/60 transition-colors"
          />
          <button
            type="button"
            onClick={handleInviteCoOrg}
            disabled={isInvitingCoOrg || !inviteIdentifier.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500 text-white text-[11px] font-semibold hover:bg-violet-400 disabled:opacity-60 transition-colors"
          >
            {isInvitingCoOrg ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : null}
            Invite
          </button>
          {isSearchingCoOrg && (
            <div className="absolute right-16 top-1/2 -translate-y-1/2">
              <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
            </div>
          )}
          {/* Dropdown */}
          {coOrgSearchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl border border-slate-700 bg-slate-800 shadow-xl overflow-hidden">
              {coOrgSearchResults.map((r) => (
                <button
                  key={r.user_id}
                  type="button"
                  onClick={() => {
                    setInviteIdentifier(r.email);
                    setCoOrgSearchResults([]);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700/60 transition-colors text-left"
                >
                  {r.avatar_url ? (
                    <img
                      src={r.avatar_url}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-600"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30 border border-slate-600 flex items-center justify-center shrink-0 text-[10px] font-bold text-violet-300">
                      {(r.name || r.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {r.name || r.username}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      @{r.username}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {coOrgError && (
          <div className="flex items-center gap-1.5 text-[11px] text-red-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {coOrgError}
          </div>
        )}

        {/* List */}
        {isLoadingCoOrgs ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading…
          </div>
        ) : coOrganizers.length === 0 ? (
          <p className="text-[11px] text-slate-600 italic">
            No co-organizers yet.
          </p>
        ) : (
          <div className="space-y-1.5">
            {coOrganizers.map((co, idx) => {
              const u =
                typeof co.user_id === "object" && co.user_id !== null
                  ? (co.user_id as Record<string, any>)
                  : null;
              const coUserId =
                u?._id ?? (typeof co.user_id === "string" ? co.user_id : "");
              const coName = u
                ? `${u.profile?.first_name ?? ""} ${u.profile?.last_name ?? ""}`.trim() ||
                  u.username ||
                  "Organizer"
                : "Organizer";
              const coUsername = u?.username ?? "";
              const coAvatarUrl = u?.profile?.avatar_url ?? "";
              const statusColor =
                co.status === "accepted"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                  : co.status === "declined"
                    ? "bg-red-500/15 text-red-300 border-red-500/25"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/25";

              return (
                <div
                  key={String(coUserId) || String(idx)}
                  className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/50 rounded-xl px-2.5 py-2"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30 border border-slate-600 flex items-center justify-center shrink-0 text-[10px] font-bold text-violet-300 overflow-hidden">
                    {coAvatarUrl ? (
                      <img
                        src={coAvatarUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      coName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {coName}
                    </p>
                    {coUsername && (
                      <p className="text-[10px] text-slate-500 truncate">
                        @{coUsername}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border capitalize shrink-0 ${statusColor}`}
                  >
                    {co.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCoOrg(String(coUserId), coName)}
                    title="Remove"
                    className="p-0.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
