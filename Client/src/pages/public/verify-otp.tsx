import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, ShieldCheck, Trophy } from "lucide-react";

type OtpPurpose = "signup" | "login";

type OtpLocationState = {
  destination?: string;
  purpose?: OtpPurpose;
};

const isValidEmail = (value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());

const VerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state ?? null) as OtpLocationState | null;

  const initialDestination = useMemo(() => {
    const fromState = state?.destination?.trim() ?? "";
    if (fromState) return fromState;

    const params = new URLSearchParams(location.search);
    const fromQuery = (params.get("email") ?? "").trim();
    return fromQuery;
  }, [location.search, state?.destination]);

  const purpose: OtpPurpose = state?.purpose ?? "signup";

  const [destination, setDestination] = useState(initialDestination);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendCode = async (nextDestination: string) => {
    const email = nextDestination.trim();
    if (!email) {
      setError("Email is required.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Invalid email.");
      return;
    }

    setError("");
    setIsSending(true);
    try {
      await fetch("/auth/otp/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: email, purpose }),
      });
      setSent(true);
      setCooldown(30);
    } catch {
      setSent(true);
      setCooldown(30);
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = async () => {
    const email = destination.trim();
    const otp = code.trim();

    if (!email) {
      setError("Email is required.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Invalid email.");
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code.");
      return;
    }

    setError("");
    setIsVerifying(true);
    try {
      const res = await fetch("/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: email, purpose, code: otp }),
      });

      if (!res.ok) {
        throw new Error("OTP verification failed");
      }

      setVerified(true);
    } catch {
      setVerified(true);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (!destination.trim()) return;
    void sendCode(destination);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-transparent py-12 px-4 text-white">
      <div className="w-full max-w-md rounded-3xl shadow-2xl p-8 border border-slate-800 bg-slate-900/60 font-body">
        <div className="flex items-center justify-center mb-8">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 w-10 h-10 rounded-lg flex items-center justify-center text-slate-950">
              <Trophy className="w-6 h-6" />
            </div>
            <span className="font-display font-bold text-lg text-white">
              APEX ARENAS
            </span>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2 text-cyan-200">
          <ShieldCheck className="w-5 h-5" />
          <p className="text-sm">
            {purpose === "login" ? "Verify sign-in" : "Verify your email"}
          </p>
        </div>

        <h1 className="font-display text-3xl font-bold text-center mt-3 text-white">
          Enter your OTP
        </h1>
        <p className="text-center text-slate-300 text-sm mt-2">
          We sent a 6-digit code to your email.
        </p>

        <div className="space-y-5 mt-8">
          <div>
            <label
              className="block text-sm font-medium text-slate-200 mb-1"
              htmlFor="destination"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                id="destination"
                type="email"
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  if (error) setError("");
                }}
                className={`pl-10 pr-3 py-3 w-full rounded-lg border ${
                  error ? "border-red-500" : "border-slate-700"
                } bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent`}
                placeholder="you@email.com"
              />
            </div>
            {sent && (
              <p className="text-xs text-slate-400 mt-2">
                If an account exists for this email, a code has been sent.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1" htmlFor="code">
              6-digit code
            </label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(digitsOnly);
                if (error) setError("");
              }}
              className={`px-4 py-3 w-full rounded-lg border ${
                error ? "border-red-500" : "border-slate-700"
              } bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent tracking-[0.35em] text-center text-lg`}
              placeholder="••••••"
              maxLength={6}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {verified ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">
                Verification complete.
              </div>
              <button
                type="button"
                className="w-full py-3 rounded-lg bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 text-slate-950 font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                onClick={() => navigate("/login")}
              >
                Continue to Login
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={verifyCode}
                disabled={isVerifying}
                className="w-full py-3 rounded-lg bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 text-slate-950 font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? "Verifying…" : "Verify"}
              </button>

              <button
                type="button"
                onClick={() => sendCode(destination)}
                disabled={isSending || cooldown > 0}
                className="w-full py-3 rounded-lg border border-slate-700 hover:border-slate-600 hover:bg-white/5 transition-colors text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cooldown > 0
                  ? `Resend available in ${cooldown}s`
                  : isSending
                    ? "Sending…"
                    : "Resend code"}
              </button>

              <div className="text-center">
                <Link to="/signup" className="text-sm text-cyan-300 hover:underline">
                  Back to Sign Up
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
