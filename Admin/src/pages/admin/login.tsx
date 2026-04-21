import { useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import QRCode from "react-qr-code";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useAdminAuth } from "../../lib/admin-auth-context";
import {
  adminAuthService,
  AdminApiError,
} from "../../services/admin-auth.service";
import type { AdminLoginResult } from "../../types/admin.types";

type Step = "credentials" | "2fa-setup" | "2fa-backup" | "2fa-verify";
type CredentialsMode = "login" | "activate-2fa";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { setSession } = useAdminAuth();
  const reduceMotion = useReducedMotion();

  const [step, setStep] = useState<Step>("credentials");
  const [form, setForm] = useState({
    email: "",
    password: "",
    adminSecret: "",
  });
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [credentialsMode, setCredentialsMode] =
    useState<CredentialsMode>("login");
  const [serverError, setServerError] = useState("");

  // 2FA state
  const [twoFACode, setTwoFACode] = useState("");
  const [pendingUserId, setPendingUserId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (serverError) setServerError("");
    setErrors((e) => ({ ...e, [name]: "" }));
  };

  const validate = () => {
    const newErrors = { email: "", password: "" };
    if (!form.email.trim()) newErrors.email = "Email is required.";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim()))
      newErrors.email = "Please enter a valid email.";
    if (!form.password) newErrors.password = "Password is required.";
    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleLoginSuccess = (result: AdminLoginResult) => {
    if (result.tokens?.accessToken) {
      setSession(result.tokens, result.user ?? null);
      navigate("/admin", { replace: true });
    }
  };

  const submitCredentials = async (mode: CredentialsMode) => {
    if (!validate()) return;

    setCredentialsMode(mode);
    setIsLoading(true);
    setServerError("");

    try {
      const result = await adminAuthService.login({
        email: form.email.trim(),
        password: form.password,
        adminSecret: form.adminSecret || undefined,
      });

      if (result.requires2FASetup) {
        setPendingUserId(result.userId!);
        setQrCode(result.qrCode!);
        setSetupSecret(result.secret!);
        setStep("2fa-setup");
      } else if (result.requires2FA) {
        setPendingUserId(result.userId!);
        setStep("2fa-verify");
        if (mode === "activate-2fa") {
          setServerError(
            "2FA is already active on this account. Enter your authenticator code to continue.",
          );
        }
      } else if (mode === "activate-2fa") {
        setServerError(
          "2FA setup is not available for this account from this screen yet. Contact a super admin to enforce 2FA, then try Activate 2FA again.",
        );
      } else {
        handleLoginSuccess(result);
      }
    } catch (error) {
      if (error instanceof AdminApiError) {
        const friendly: Record<string, string> = {
          INVALID_CREDENTIALS: "Incorrect email or password.",
          INVALID_ADMIN_SECRET: "Invalid admin secret key.",
          ACCOUNT_LOCKED: error.message,
          ACCOUNT_BANNED: "This admin account has been suspended.",
        };
        setServerError(friendly[error.code] ?? error.message);
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
      setCredentialsMode("login");
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCredentials("login");
  };

  const handleActivate2FA = async () => {
    await submitCredentials("activate-2fa");
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFACode || twoFACode.length < 6) {
      setServerError("Please enter a valid 6-digit code.");
      return;
    }

    setIsLoading(true);
    setServerError("");

    try {
      if (step === "2fa-setup") {
        // Setup verification — returns backup codes, no tokens
        const result = await adminAuthService.verify2FASetup({
          userId: pendingUserId,
          code: twoFACode,
        });
        if (result.setupComplete) {
          setBackupCodes(result.backupCodes ?? []);
          setTwoFACode("");
          setStep("2fa-backup");
        }
      } else {
        // Login verification — returns tokens
        const result = await adminAuthService.verify2FA({
          userId: pendingUserId,
          code: twoFACode,
        });
        handleLoginSuccess(result);
      }
    } catch (error) {
      if (error instanceof AdminApiError) {
        const friendly: Record<string, string> = {
          INVALID_2FA_CODE: "Invalid code. Please try again.",
          OTP_EXPIRED: "Code has expired. Please generate a new one.",
          OTP_MAX_ATTEMPTS: "Too many attempts. Please try again later.",
        };
        setServerError(friendly[error.code] ?? error.message);
      } else {
        setServerError("Verification failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-slate-950 text-white px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white p-0.5 shrink-0">
              <img
                src="/apex-logo.png"
                alt="Apex Arenas"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-display font-bold text-lg text-white">
              APEX ARENAS
            </span>
          </Link>
        </div>

        <div className="bg-slate-900/60 rounded-3xl shadow-2xl p-8 border border-slate-800 font-body">
          {/* Header */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="font-display text-2xl font-bold text-white">
              Admin Portal
            </h1>
          </div>
          <p className="text-center text-slate-400 text-sm mb-8">
            {step === "credentials" && "Sign in to the admin dashboard"}
            {step === "2fa-setup" && "Set up two-factor authentication"}
            {step === "2fa-backup" && "Save your backup codes"}
            {step === "2fa-verify" && "Enter your authenticator code"}
          </p>

          {serverError && (
            <div className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {serverError}
            </div>
          )}

          {/* Step 1: Credentials */}
          {step === "credentials" && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-5">
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
                    } bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent`}
                    placeholder="admin@apexarenas.com"
                    autoComplete="email"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  className="block text-sm font-medium text-slate-200 mb-1"
                  htmlFor="password"
                >
                  Password
                </label>
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
                    } bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent`}
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

              {/* Admin Secret (optional) */}
              <div>
                <label
                  className="block text-sm font-medium text-slate-200 mb-1"
                  htmlFor="adminSecret"
                >
                  Admin Secret{" "}
                  <span className="text-slate-500 text-xs">(optional)</span>
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="password"
                    name="adminSecret"
                    id="adminSecret"
                    value={form.adminSecret}
                    onChange={handleChange}
                    className="pl-10 pr-3 py-3 w-full rounded-lg border border-slate-700 bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent"
                    placeholder="Secret key"
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg bg-linear-to-r from-amber-400 via-orange-400 to-red-400 text-slate-950 font-semibold text-lg shadow hover:shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={reduceMotion || isLoading ? undefined : { y: -1 }}
                whileTap={
                  reduceMotion || isLoading ? undefined : { scale: 0.98 }
                }
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {credentialsMode === "activate-2fa"
                      ? "Starting 2FA setup..."
                      : "Signing in..."}
                  </span>
                ) : (
                  "Sign In"
                )}
              </motion.button>

              <motion.button
                type="button"
                onClick={handleActivate2FA}
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 font-medium text-sm hover:bg-amber-500/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                whileHover={reduceMotion || isLoading ? undefined : { y: -1 }}
                whileTap={
                  reduceMotion || isLoading ? undefined : { scale: 0.98 }
                }
              >
                <Shield className="w-4 h-4" />
                Activate 2FA
              </motion.button>
            </form>
          )}

          {/* Step 2: 2FA Setup (QR Code) */}
          {step === "2fa-setup" && (
            <form onSubmit={handle2FASubmit} className="space-y-5">
              <div className="text-center space-y-4">
                <p className="text-sm text-slate-300">
                  Scan this QR code with{" "}
                  <strong className="text-white">Google Authenticator</strong>{" "}
                  or <strong className="text-white">Authy</strong>, then enter
                  the 6-digit code below.
                </p>

                {/* QR Code
                    Backend returns qr_code_data_url (base64 PNG) in data.setup.
                    Render as <img> directly. Fall back to react-qr-code if only secret available. */}
                <div className="flex justify-center">
                  {qrCode ? (
                    <img
                      src={qrCode}
                      alt="2FA QR Code"
                      className="w-52 h-52 rounded-xl bg-white p-2 mx-auto"
                    />
                  ) : setupSecret ? (
                    <div className="bg-white p-3 rounded-xl inline-block">
                      <QRCode
                        value={`otpauth://totp/ApexArenas:admin?secret=${setupSecret.replace(/\s/g, "")}&issuer=ApexArenas`}
                        size={180}
                      />
                    </div>
                  ) : (
                    <div className="w-52 h-52 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto">
                      <p className="text-xs text-slate-500 text-center px-4">
                        QR code unavailable — use the manual key below
                      </p>
                    </div>
                  )}
                </div>

                {/* Manual secret key */}
                {setupSecret && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">
                      Or enter this key manually in your app:
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-sm text-amber-300 bg-slate-800 px-3 py-1.5 rounded-lg select-all tracking-widest font-mono">
                        {setupSecret}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(setupSecret);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Copy secret"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-slate-200 mb-1"
                  htmlFor="twoFACode"
                >
                  Verification Code
                </label>
                <input
                  type="text"
                  id="twoFACode"
                  value={twoFACode}
                  onChange={(e) => {
                    setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    if (serverError) setServerError("");
                  }}
                  className="w-full py-3 px-4 rounded-lg border border-slate-700 bg-slate-950/60 text-white text-center text-2xl tracking-[0.5em] font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
              </div>

              <motion.button
                type="submit"
                disabled={isLoading || twoFACode.length < 6}
                className="w-full py-3 rounded-lg bg-linear-to-r from-amber-400 via-orange-400 to-red-400 text-slate-950 font-semibold text-lg shadow hover:shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={reduceMotion || isLoading ? undefined : { y: -1 }}
                whileTap={
                  reduceMotion || isLoading ? undefined : { scale: 0.98 }
                }
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Verifying...
                  </span>
                ) : (
                  "Verify & Continue"
                )}
              </motion.button>
            </form>
          )}

          {/* Step 3: Backup Codes (after first-time setup) */}
          {step === "2fa-backup" && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm text-amber-300">
                <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Save these backup codes somewhere safe. Each code can only be
                  used once to access your account if you lose your
                  authenticator.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <code
                    key={i}
                    className="text-sm text-amber-300 bg-slate-800 px-3 py-2 rounded-lg text-center font-mono tracking-wider select-all"
                  >
                    {code}
                  </code>
                ))}
              </div>

              <motion.button
                type="button"
                onClick={() => {
                  setStep("2fa-verify");
                  setServerError("");
                }}
                className="w-full py-3 rounded-lg bg-linear-to-r from-amber-400 via-orange-400 to-red-400 text-slate-950 font-semibold text-lg shadow hover:shadow-lg hover:shadow-amber-500/30 transition-all"
                whileHover={reduceMotion ? undefined : { y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              >
                I've saved my codes — Continue to Login
              </motion.button>
            </div>
          )}

          {/* Step 4: 2FA Verify (returning admin, or after setup) */}
          {step === "2fa-verify" && (
            <form onSubmit={handle2FASubmit} className="space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-8 h-8 text-amber-400" />
                </div>
                <p className="text-sm text-slate-300">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div>
                <input
                  type="text"
                  value={twoFACode}
                  onChange={(e) => {
                    setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    if (serverError) setServerError("");
                  }}
                  className="w-full py-3 px-4 rounded-lg border border-slate-700 bg-slate-950/60 text-white text-center text-2xl tracking-[0.5em] font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
              </div>

              <motion.button
                type="submit"
                disabled={isLoading || twoFACode.length < 6}
                className="w-full py-3 rounded-lg bg-linear-to-r from-amber-400 via-orange-400 to-red-400 text-slate-950 font-semibold text-lg shadow hover:shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={reduceMotion || isLoading ? undefined : { y: -1 }}
                whileTap={
                  reduceMotion || isLoading ? undefined : { scale: 0.98 }
                }
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Verifying...
                  </span>
                ) : (
                  "Verify"
                )}
              </motion.button>

              <button
                type="button"
                onClick={() => {
                  setStep("credentials");
                  setTwoFACode("");
                  setPendingUserId("");
                  setServerError("");
                }}
                className="w-full text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Back to login
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          <Link to="/login" className="hover:text-slate-300 transition-colors">
            Player / Organizer Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
