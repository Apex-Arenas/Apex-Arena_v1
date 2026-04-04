import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mail, Lock, Eye, EyeOff, Trophy } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "../../lib/auth-context";
import { useGoogleAuth } from "../../lib/use-google-auth";
import { ApiRequestError } from "../../services/auth.service";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, linkGoogle } = useAuth();
  const [googleLinkState, setGoogleLinkState] = useState<{
    idToken: string;
    message: string;
  } | null>(null);
  const [linkPassword, setLinkPassword] = useState("");

  const nextPath = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("next") || "/auth";
  }, [location.search]);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();

  const handleGoogleToken = useCallback(
    async (idToken: string) => {
      setServerError("");
      setIsLoading(true);
      setGoogleLinkState(null);

      try {
        await loginWithGoogle(idToken);
        navigate(nextPath, { replace: true });
      } catch (error) {
        if (error instanceof ApiRequestError) {
          if (error.code === "ACCOUNT_EXISTS_LINK_REQUIRED") {
            setGoogleLinkState({
              idToken,
              message:
                "This email already has a password account. Enter your password to link Google Sign-In.",
            });
          } else if (error.code === "EMAIL_NOT_VERIFIED") {
            setServerError(
              "Please verify your email first, then try Google Sign-In.",
            );
          } else {
            const friendly: Record<string, string> = {
              ACCOUNT_BANNED:
                "This account has been suspended. Contact support for help.",
              GOOGLE_AUTH_FAILED: "Google Sign-In failed. Please try again.",
            };
            setServerError(friendly[error.code] ?? error.message);
          }
        } else {
          setServerError("Google Sign-In failed. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [loginWithGoogle, navigate, nextPath],
  );

  const { isReady: isGoogleReady, renderGoogleButton } = useGoogleAuth({
    onToken: handleGoogleToken,
  });

  useEffect(() => {
    if (!isGoogleReady || !googleButtonRef.current) return;

    renderGoogleButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      width: 360,
    });
  }, [isGoogleReady, renderGoogleButton]);

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleLinkState || !linkPassword) return;

    setIsLoading(true);
    setServerError("");

    try {
      await linkGoogle(googleLinkState.idToken, linkPassword);
      navigate(nextPath, { replace: true });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        const friendly: Record<string, string> = {
          INVALID_CREDENTIALS: "Incorrect password. Please try again.",
        };
        setServerError(friendly[error.code] ?? error.message);
      } else {
        setServerError("Failed to link Google account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const validate = () => {
    const newErrors = { email: "", password: "" };
    const value = form.email.trim();

    if (!value) newErrors.email = "Email is required.";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value))
      newErrors.email = "Please enter a valid email.";

    if (!form.password) newErrors.password = "Password is required.";
    else if (form.password.length < 6)
      newErrors.password = "At least 6 characters.";
    setErrors(newErrors);
    return Object.values(newErrors).every((v) => !v);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (serverError) setServerError("");
    setErrors({ ...errors, [name]: "" });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    setServerError("");

    try {
      await login({
        email: form.email.trim(),
        password: form.password,
      });
      setForm({ email: "", password: "" });
      setSubmitted(false);
      navigate(nextPath, { replace: true });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        if (error.code === "EMAIL_NOT_VERIFIED") {
          navigate(
            `/verify-otp?email=${encodeURIComponent(form.email.trim())}&next=${encodeURIComponent("/login")}`,
          );
          return;
        }

        // Map backend error codes to user-friendly messages
        const friendlyMessages: Record<string, string> = {
          INVALID_CREDENTIALS: "Incorrect email or password. Please try again.",
          GOOGLE_ONLY_ACCOUNT:
            "This account uses Google Sign-In. Please use the Google button below.",
          ACCOUNT_LOCKED: error.message,
          ACCOUNT_BANNED:
            "This account has been suspended. Contact support for help.",
          LOGIN_FAILED:
            "Something went wrong on our end. Please try again shortly.",
        };

        setServerError(friendlyMessages[error.code] ?? error.message);
      } else {
        setServerError(
          "Something went wrong. Please check your connection and try again.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-transparent text-white py-12 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-slate-900/60 rounded-3xl shadow-2xl p-8 border border-slate-800 font-body"
        autoComplete="off"
      >
        {/* Logo */}
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

        <h1 className="font-display text-3xl font-bold text-center mb-2 text-white">
          Welcome Back
        </h1>
        <p className="text-center text-slate-300 text-sm mb-8">
          Log in to your account to continue
        </p>

        {serverError && (
          <div className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {serverError}
          </div>
        )}

        <div className="space-y-5">
          {/* Email */}
          <div>
            <label
              className="block text-sm font-medium text-slate-200 mb-1"
              htmlFor="email"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="email"
                name="email"
                id="email"
                value={form.email}
                onChange={handleChange}
                className={`pl-10 pr-3 py-3 w-full rounded-lg border ${
                  errors.email ? "border-red-500" : "border-slate-700"
                } bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent`}
                placeholder="you@email.com"
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                className="block text-sm font-medium text-slate-200"
                htmlFor="password"
              >
                Password
              </label>
              <Link
                to="/forgot"
                className="text-xs text-cyan-300 hover:underline"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                id="password"
                value={form.password}
                onChange={handleChange}
                className={`pl-10 pr-10 py-3 w-full rounded-lg border ${
                  errors.password ? "border-red-500" : "border-slate-700"
                } bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent`}
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password}</p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={isLoading}
          className="mt-8 w-full py-3 rounded-lg bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 text-slate-950 font-semibold text-lg shadow hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={reduceMotion || isLoading ? undefined : { y: -1 }}
          whileTap={reduceMotion || isLoading ? undefined : { scale: 0.98 }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Signing in...
            </span>
          ) : (
            "Sign In"
          )}
        </motion.button>

        {submitted && !Object.values(errors).every((v) => !v) && (
          <p className="text-center text-red-400 text-sm mt-4">
            Please fix the errors above.
          </p>
        )}

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-slate-700"></div>
          <span className="px-4 text-sm text-slate-400">Or</span>
          <div className="flex-1 border-t border-slate-700"></div>
        </div>

        {/* Google Sign In */}
        <div className="w-full flex justify-center">
          <div
            ref={googleButtonRef}
            className={isLoading ? "pointer-events-none opacity-60" : ""}
          />
        </div>

        {/* Google Link Account — shown when user has a password account that needs linking */}
        {googleLinkState && (
          <form onSubmit={handleLinkSubmit} className="mt-4 space-y-3">
            <p className="text-sm text-amber-300 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              {googleLinkState.message}
            </p>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="password"
                value={linkPassword}
                onChange={(e) => setLinkPassword(e.target.value)}
                className="pl-10 pr-3 py-3 w-full rounded-lg border border-slate-700 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                placeholder="Enter your password to link"
              />
            </div>
            <motion.button
              type="submit"
              disabled={isLoading || !linkPassword}
              className="w-full py-3 rounded-lg bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 text-slate-950 font-semibold shadow hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={reduceMotion || isLoading ? undefined : { y: -1 }}
              whileTap={reduceMotion || isLoading ? undefined : { scale: 0.98 }}
            >
              {isLoading ? "Linking..." : "Link & Sign In"}
            </motion.button>
          </form>
        )}

        {/* Sign Up Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-300">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="text-cyan-300 font-medium hover:underline"
            >
              Create one here
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Login;
