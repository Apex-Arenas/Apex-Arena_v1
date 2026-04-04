import { useCallback, useEffect, useRef, useState } from "react";
import {
  User,
  AtSign,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  Trophy,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "../../lib/auth-context";
import { useGoogleAuth } from "../../lib/use-google-auth";
import { ApiRequestError } from "../../services/auth.service";

const Register = () => {
  const navigate = useNavigate();
  const { register, loginWithGoogle } = useAuth();
  const reduceMotion = useReducedMotion();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const handleGoogleToken = useCallback(
    async (idToken: string) => {
      setServerError("");
      setIsLoading(true);

      try {
        await loginWithGoogle(idToken);
        navigate("/auth", { replace: true });
      } catch (error) {
        if (error instanceof ApiRequestError) {
          if (error.code === "ACCOUNT_EXISTS_LINK_REQUIRED") {
            setServerError(
              "An account with this email already exists. Please log in and link Google from there.",
            );
          } else {
            setServerError(error.message);
          }
        } else {
          setServerError("Google Sign-Up failed. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [loginWithGoogle, navigate],
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

  const validate = () => {
    const newErrors = {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
      confirm: "",
    };
    let isValid = true;

    if (!form.firstName.trim()) {
      newErrors.firstName = "First name is required.";
      isValid = false;
    } else if (form.firstName.trim().length < 2) {
      newErrors.firstName = "At least 2 characters.";
      isValid = false;
    }

    if (!form.lastName.trim()) {
      newErrors.lastName = "Last name is required.";
      isValid = false;
    } else if (form.lastName.trim().length < 2) {
      newErrors.lastName = "At least 2 characters.";
      isValid = false;
    }

    if (!form.username.trim()) {
      newErrors.username = "Username is required.";
      isValid = false;
    } else if (!/^[a-zA-Z0-9_]{3,30}$/.test(form.username)) {
      newErrors.username = "3-30 chars: letters, numbers, underscore.";
      isValid = false;
    }

    if (!form.email.trim()) {
      newErrors.email = "Email is required.";
      isValid = false;
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email.";
      isValid = false;
    }

    if (!form.password) {
      newErrors.password = "Password is required.";
      isValid = false;
    } else if (form.password.length < 8) {
      newErrors.password = "At least 8 characters.";
      isValid = false;
    } else if (
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}|;:'",.<>?/`~\\])/.test(
        form.password,
      )
    ) {
      newErrors.password =
        "Include uppercase, lowercase, number & special character.";
      isValid = false;
    }

    if (!form.confirm) {
      newErrors.confirm = "Confirm your password.";
      isValid = false;
    } else if (form.confirm !== form.password) {
      newErrors.confirm = "Passwords do not match.";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (serverError) setServerError("");
    if (errors[name as keyof typeof errors]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    setServerError("");

    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: "player",
      });

      navigate(
        `/verify-otp?email=${encodeURIComponent(form.email.trim())}&next=${encodeURIComponent("/login")}`,
      );
    } catch (error) {
      if (error instanceof ApiRequestError) {
        const friendlyMessages: Record<string, string> = {
          EMAIL_ALREADY_EXISTS:
            "An account with this email already exists. Try logging in instead.",
          USERNAME_ALREADY_EXISTS:
            "This username is already taken. Please choose another.",
          VALIDATION_ERROR: error.message,
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

  const passwordStrength = () => {
    if (!form.password) return 0;
    let strength = 0;
    if (form.password.length >= 8) strength++;
    if (/[a-z]/.test(form.password)) strength++;
    if (/[A-Z]/.test(form.password)) strength++;
    if (/\d/.test(form.password)) strength++;
    if (/[^A-Za-z0-9]/.test(form.password)) strength++;
    return strength;
  };

  return (
    <div className="min-h-screen bg-transparent text-white flex items-center justify-center p-4">
      <div className="w-full max-w-6xl rounded-3xl border border-slate-800 bg-slate-900/50 shadow-2xl overflow-hidden">
        <div className="md:flex">
          {/* Left side - Form */}
          <div className="md:w-3/5 p-8 lg:p-10 font-body">
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center space-x-2">
                <div className="bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 w-10 h-10 rounded-lg flex items-center justify-center text-slate-950">
                  <Trophy className="w-6 h-6" />
                </div>
                <span className="font-display font-bold text-xl text-white">
                  APEX ARENAS
                </span>
              </div>
            </div>

            <h1 className="font-display text-3xl font-bold text-white text-center mb-6">
              Create Your Account
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              {serverError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {serverError}
                </div>
              )}

              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      className={`pl-10 pr-3 py-3 w-full rounded-lg border ${
                        errors.firstName ? "border-red-500" : "border-slate-700"
                      } bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent`}
                      placeholder="First name"
                    />
                  </div>
                  {errors.firstName && (
                    <p className="text-red-400 text-xs mt-1">
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Last Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      className={`pl-10 pr-3 py-3 w-full rounded-lg border ${
                        errors.lastName ? "border-red-500" : "border-slate-700"
                      } bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent`}
                      placeholder="Last name"
                    />
                  </div>
                  {errors.lastName && (
                    <p className="text-red-400 text-xs mt-1">
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Username
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    className={`pl-10 pr-3 py-3 w-full rounded-lg border ${
                      errors.username ? "border-red-500" : "border-slate-700"
                    } bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent`}
                    placeholder="your_username"
                    autoComplete="username"
                  />
                </div>
                {errors.username && (
                  <p className="text-red-400 text-xs mt-1">{errors.username}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className={`pl-10 pr-3 py-3 w-full rounded-lg border ${
                      errors.email ? "border-red-500" : "border-slate-700"
                    } bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent`}
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className={`pl-10 pr-10 py-3 w-full rounded-lg border ${
                      errors.password ? "border-red-500" : "border-slate-700"
                    } bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent`}
                    placeholder="Create a strong password"
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

                {/* Password Strength */}
                {form.password && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{ width: `${passwordStrength() * 20}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">
                        {passwordStrength() >= 4
                          ? "Strong"
                          : passwordStrength() >= 3
                            ? "Good"
                            : "Weak"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-slate-400">
                      <div className="flex items-center">
                        <Check
                          className={`w-3 h-3 mr-1 ${
                            form.password.length >= 8
                              ? "text-green-500"
                              : "text-slate-600"
                          }`}
                        />
                        <span>8+ characters</span>
                      </div>
                      <div className="flex items-center">
                        <Check
                          className={`w-3 h-3 mr-1 ${
                            /[A-Z]/.test(form.password)
                              ? "text-green-500"
                              : "text-slate-600"
                          }`}
                        />
                        <span>Uppercase letter</span>
                      </div>
                      <div className="flex items-center">
                        <Check
                          className={`w-3 h-3 mr-1 ${
                            /[a-z]/.test(form.password)
                              ? "text-green-500"
                              : "text-slate-600"
                          }`}
                        />
                        <span>Lowercase letter</span>
                      </div>
                      <div className="flex items-center">
                        <Check
                          className={`w-3 h-3 mr-1 ${
                            /\d/.test(form.password)
                              ? "text-green-500"
                              : "text-slate-600"
                          }`}
                        />
                        <span>Number</span>
                      </div>
                      <div className="flex items-center">
                        <Check
                          className={`w-3 h-3 mr-1 ${
                            /[^A-Za-z0-9]/.test(form.password)
                              ? "text-green-500"
                              : "text-slate-600"
                          }`}
                        />
                        <span>Special character</span>
                      </div>
                    </div>
                  </div>
                )}
                {errors.password && (
                  <p className="text-red-400 text-xs mt-1">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    name="confirm"
                    value={form.confirm}
                    onChange={handleChange}
                    className={`pl-10 pr-10 py-3 w-full rounded-lg border ${
                      errors.confirm ? "border-red-500" : "border-slate-700"
                    } bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showConfirm ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.confirm && (
                  <p className="text-red-400 text-xs mt-1">{errors.confirm}</p>
                )}
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                className="mt-6 w-full py-3 px-4 rounded-lg bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 text-slate-950 font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={reduceMotion || isLoading ? undefined : { y: -1 }}
                whileTap={
                  reduceMotion || isLoading ? undefined : { scale: 0.98 }
                }
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Creating Account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-slate-700"></div>
              <span className="px-4 text-sm text-slate-400">
                Or sign up with
              </span>
              <div className="flex-1 border-t border-slate-700"></div>
            </div>

            {/* Google Sign Up */}
            <div className="w-full flex justify-center">
              <div
                ref={googleButtonRef}
                className={isLoading ? "pointer-events-none opacity-60" : ""}
              />
            </div>

            {/* Terms and Login */}
            <div className="mt-6 text-center space-y-3">
              <p className="text-xs text-slate-400">
                By signing up, you agree to our{" "}
                <Link to="/terms" className="text-cyan-300 hover:underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-cyan-300 hover:underline">
                  Privacy Policy
                </Link>
                . Must be 18+.
              </p>
              <p className="text-sm text-slate-300">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-cyan-300 font-medium hover:underline"
                >
                  Log in here
                </Link>
              </p>
            </div>
          </div>

          {/* Right side - Info */}
          <div className="md:w-2/5 bg-linear-to-b from-slate-900 via-slate-950 to-slate-900 text-white p-8 lg:p-10 flex flex-col justify-center border-l border-slate-800">
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-bold">
                Why Join Apex Arenas?
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Check className="w-5 h-5 mr-3 shrink-0 mt-0.5 text-cyan-300" />
                  <span>100% guaranteed prizes via escrow</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 mr-3 shrink-0 mt-0.5 text-cyan-300" />
                  <span>Instant Mobile Money payouts</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 mr-3 shrink-0 mt-0.5 text-cyan-300" />
                  <span>Professional tournament tools</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 mr-3 shrink-0 mt-0.5 text-cyan-300" />
                  <span>Fair play verification tools</span>
                </li>
              </ul>
              <div className="bg-white/5 border border-slate-700 rounded-xl p-4 mt-6">
                <p className="text-sm text-slate-300">
                  Compete with confidence knowing all prizes are secured before
                  tournaments begin.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
