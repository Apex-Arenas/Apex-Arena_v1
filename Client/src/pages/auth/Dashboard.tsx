import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, User, Mail, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import {
  ApiRequestError,
  authService,
  type AuthUser,
} from "../../services/auth.service";

const Dashboard = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { user, tokens, refreshAccessToken, setSession, logout } = useAuth();

  const [profile, setProfile] = useState<AuthUser | null>(user);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProfile = useCallback(async () => {
    if (!tokens?.accessToken) {
      setIsLoading(false);
      setError("No active session. Please sign in again.");
      return;
    }

    setIsLoading(true);
    setError("");

    const run = async (accessToken: string) => {
      const result = await authService.getProfile(accessToken);
      const nextUser = result.user ?? user;

      if (nextUser) {
        setProfile(nextUser);
        setSession(tokens, nextUser);
      }
    };

    try {
      await run(tokens.accessToken);
    } catch (error) {
      const isAuthError =
        error instanceof ApiRequestError &&
        (error.status === 401 || error.status === 403);

      if (!isAuthError) {
        setError(
          error instanceof ApiRequestError
            ? error.message
            : "Could not load your dashboard. Please try again.",
        );
        setIsLoading(false);
        return;
      }

      const refreshedToken = await refreshAccessToken();
      if (!refreshedToken) {
        await logout();
        navigate("/login", { replace: true });
        return;
      }

      try {
        await run(refreshedToken);
      } catch (secondError) {
        setError(
          secondError instanceof ApiRequestError
            ? secondError.message
            : "Could not load your dashboard. Please try again.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout, navigate, refreshAccessToken, setSession, tokens, user]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const displayName = useMemo(() => {
    return profile?.name || profile?.username || "Player";
  }, [profile?.name, profile?.username]);

  const roleLabel = useMemo(() => {
    return (profile?.role ?? "player").replace(/^\w/, (ch) => ch.toUpperCase());
  }, [profile?.role]);

  const profilePath =
    profile?.role === "organizer"
      ? "/auth/organizer/profile"
      : "/auth/player/profile";

  return (
    <div className="min-h-[80vh] bg-transparent text-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                <Sparkles className="h-4 w-4" />
                Authenticated Session
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold">
                Welcome, {displayName}
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Your account is active and protected by token-based auth.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void fetchProfile()}
              disabled={isLoading}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Role
              </p>
              <p className="mt-2 inline-flex items-center gap-2 text-slate-100">
                <ShieldCheck className="h-4 w-4 text-cyan-300" />
                {roleLabel}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Username
              </p>
              <p className="mt-2 inline-flex items-center gap-2 text-slate-100">
                <User className="h-4 w-4 text-cyan-300" />
                {profile?.username ?? "Not set"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Email
              </p>
              <p className="mt-2 inline-flex items-center gap-2 text-slate-100">
                <Mail className="h-4 w-4 text-cyan-300" />
                {profile?.email ?? "Not available"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold">Quick Actions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <motion.div
              whileHover={reduceMotion ? undefined : { y: -1 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            >
              <Link
                to={profilePath}
                className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-slate-100 hover:border-cyan-400/40 hover:bg-cyan-400/5"
              >
                <span>View profile</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <motion.div
              whileHover={reduceMotion ? undefined : { y: -1 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            >
              <Link
                to={
                  profile?.role === "organizer"
                    ? "/auth/organizer/create-tournament"
                    : "/auth/player/join-tournament"
                }
                className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-slate-100 hover:border-cyan-400/40 hover:bg-cyan-400/5"
              >
                <span>
                  {profile?.role === "organizer"
                    ? "Create tournament"
                    : "Join tournament"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
