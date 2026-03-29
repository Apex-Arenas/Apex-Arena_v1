import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Shield, KeyRound, Trophy } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAdminAuth } from '../../lib/admin-auth-context';
import { adminAuthService, AdminApiError } from '../../services/admin-auth.service';
import type { AdminLoginResult } from '../../types/admin.types';

type Step = 'credentials' | '2fa-setup' | '2fa-verify';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { setSession } = useAdminAuth();
  const reduceMotion = useReducedMotion();

  const [step, setStep] = useState<Step>('credentials');
  const [form, setForm] = useState({ email: '', password: '', adminSecret: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // 2FA state
  const [twoFACode, setTwoFACode] = useState('');
  const [pendingUserId, setPendingUserId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [setupSecret, setSetupSecret] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (serverError) setServerError('');
    setErrors((e) => ({ ...e, [name]: '' }));
  };

  const validate = () => {
    const newErrors = { email: '', password: '' };
    if (!form.email.trim()) newErrors.email = 'Email is required.';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim()))
      newErrors.email = 'Please enter a valid email.';
    if (!form.password) newErrors.password = 'Password is required.';
    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleLoginSuccess = (result: AdminLoginResult) => {
    if (result.tokens?.accessToken) {
      setSession(result.tokens, result.user ?? null);
      navigate('/admin', { replace: true });
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setServerError('');

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
        setStep('2fa-setup');
      } else if (result.requires2FA) {
        setPendingUserId(result.userId!);
        setStep('2fa-verify');
      } else {
        handleLoginSuccess(result);
      }
    } catch (error) {
      if (error instanceof AdminApiError) {
        const friendly: Record<string, string> = {
          INVALID_CREDENTIALS: 'Incorrect email or password.',
          INVALID_ADMIN_SECRET: 'Invalid admin secret key.',
          ACCOUNT_LOCKED: error.message,
          ACCOUNT_BANNED: 'This admin account has been suspended.',
        };
        setServerError(friendly[error.code] ?? error.message);
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFACode || twoFACode.length < 6) {
      setServerError('Please enter a valid 6-digit code.');
      return;
    }

    setIsLoading(true);
    setServerError('');

    try {
      const verifyFn =
        step === '2fa-setup'
          ? adminAuthService.verify2FASetup
          : adminAuthService.verify2FA;

      const result = await verifyFn({ userId: pendingUserId, code: twoFACode });
      handleLoginSuccess(result);
    } catch (error) {
      if (error instanceof AdminApiError) {
        const friendly: Record<string, string> = {
          INVALID_2FA_CODE: 'Invalid code. Please try again.',
          OTP_EXPIRED: 'Code has expired. Please generate a new one.',
          OTP_MAX_ATTEMPTS: 'Too many attempts. Please try again later.',
        };
        setServerError(friendly[error.code] ?? error.message);
      } else {
        setServerError('Verification failed. Please try again.');
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
            <div className="bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 w-10 h-10 rounded-lg flex items-center justify-center text-slate-950">
              <Trophy className="w-6 h-6" />
            </div>
            <span className="font-display font-bold text-lg text-white">
              APEX ARENAS
            </span>
          </Link>
        </div>

        <div className="bg-slate-900/60 rounded-3xl shadow-2xl p-8 border border-slate-800 font-body">
          {/* Header */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-6 h-6 text-amber-400" />
            <h1 className="font-display text-2xl font-bold text-white">Admin Portal</h1>
          </div>
          <p className="text-center text-slate-400 text-sm mb-8">
            {step === 'credentials' && 'Sign in to the admin dashboard'}
            {step === '2fa-setup' && 'Set up two-factor authentication'}
            {step === '2fa-verify' && 'Enter your authenticator code'}
          </p>

          {serverError && (
            <div className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {serverError}
            </div>
          )}

          {/* Step 1: Credentials */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1" htmlFor="email">
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
                      errors.email ? 'border-red-500' : 'border-slate-700'
                    } bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent`}
                    placeholder="admin@apexarenas.com"
                    autoComplete="email"
                  />
                </div>
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    id="password"
                    value={form.password}
                    onChange={handleChange}
                    className={`pl-10 pr-10 py-3 w-full rounded-lg border ${
                      errors.password ? 'border-red-500' : 'border-slate-700'
                    } bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent`}
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
              </div>

              {/* Admin Secret (optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1" htmlFor="adminSecret">
                  Admin Secret <span className="text-slate-500 text-xs">(optional)</span>
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
                whileTap={reduceMotion || isLoading ? undefined : { scale: 0.98 }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </motion.button>
            </form>
          )}

          {/* Step 2: 2FA Setup (QR Code) */}
          {step === '2fa-setup' && (
            <form onSubmit={handle2FASubmit} className="space-y-5">
              <div className="text-center space-y-3">
                <p className="text-sm text-slate-300">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                {qrCode && (
                  <div className="flex justify-center">
                    <img
                      src={qrCode}
                      alt="2FA QR Code"
                      className="w-48 h-48 rounded-lg bg-white p-2"
                    />
                  </div>
                )}
                {setupSecret && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-400 mb-1">Or enter this key manually:</p>
                    <code className="text-sm text-amber-300 bg-slate-800 px-3 py-1.5 rounded-lg select-all">
                      {setupSecret}
                    </code>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1" htmlFor="twoFACode">
                  Verification Code
                </label>
                <input
                  type="text"
                  id="twoFACode"
                  value={twoFACode}
                  onChange={(e) => {
                    setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    if (serverError) setServerError('');
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
                whileTap={reduceMotion || isLoading ? undefined : { scale: 0.98 }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Verifying...
                  </span>
                ) : (
                  'Verify & Continue'
                )}
              </motion.button>
            </form>
          )}

          {/* Step 3: 2FA Verify (returning admin) */}
          {step === '2fa-verify' && (
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
                    setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    if (serverError) setServerError('');
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
                whileTap={reduceMotion || isLoading ? undefined : { scale: 0.98 }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Verifying...
                  </span>
                ) : (
                  'Verify'
                )}
              </motion.button>

              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setTwoFACode('');
                  setPendingUserId('');
                  setServerError('');
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
