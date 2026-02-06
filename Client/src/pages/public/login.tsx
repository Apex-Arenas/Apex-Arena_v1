import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

const Login = () => {
  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    identifier: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const newErrors = { identifier: "", password: "" };
    const value = form.identifier.trim();

    if (!value) newErrors.identifier = "Username or email is required.";
    else if (value.includes("@")) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value))
        newErrors.identifier = "Invalid email.";
    } else {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(value))
        newErrors.identifier = "Invalid username.";
    }

    if (!form.password) newErrors.password = "Password is required.";
    else if (form.password.length < 6)
      newErrors.password = "At least 6 characters.";
    setErrors(newErrors);
    return Object.values(newErrors).every((v) => !v);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setErrors({ ...errors, [name]: "" });
  };

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setSubmitted(true);
    if (validate()) {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        alert("Logged in! (Demo only)");
        setForm({ identifier: "", password: "" });
        setIsLoading(false);
        setSubmitted(false);
      }, 1000);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-transparent text-white py-12 px-4">
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap");
        .font-display { font-family: "Rajdhani", sans-serif; }
        .font-body { font-family: "Space Grotesk", sans-serif; }
      `}</style>
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

        <div className="space-y-5">
          {/* Username / Email */}
          <div>
            <label
              className="block text-sm font-medium text-slate-200 mb-1"
              htmlFor="identifier"
            >
              Username or Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                name="identifier"
                id="identifier"
                value={form.identifier}
                onChange={handleChange}
                className={`pl-10 pr-3 py-3 w-full rounded-lg border ${
                  errors.identifier ? "border-red-500" : "border-slate-700"
                } bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent`}
                placeholder="username or you@email.com"
                autoComplete="username"
              />
            </div>
            {errors.identifier && (
              <p className="text-red-400 text-xs mt-1">{errors.identifier}</p>
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
        <button
          type="submit"
          disabled={isLoading}
          className="mt-8 w-full py-3 rounded-lg bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 text-slate-950 font-semibold text-lg shadow hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Signing in...
            </span>
          ) : (
            "Sign In"
          )}
        </button>

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

        {/* Social Sign In */}
        <button
          type="button"
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-lg border border-slate-700 hover:border-slate-600 hover:bg-white/5 transition-colors flex items-center justify-center font-medium text-slate-200 disabled:opacity-50"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Sign Up Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-300">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-cyan-300 font-medium hover:underline">
              Create one here
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Login;
