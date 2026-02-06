import { useState } from "react";
import { Mail, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = () => {
    const value = email.trim();
    if (!value) return "Email is required.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) return "Invalid email.";
    return "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nextError = validate();
    setError(nextError);
    if (nextError) return;

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setSent(true);
    }, 1000);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-transparent py-12 px-4 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl shadow-2xl p-8 border border-slate-800 bg-slate-900/60"
        autoComplete="off"
      >
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-linear-to-r from-blue-600 to-blue-400 w-10 h-10 rounded-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-lg text-white">APEX ARENAS</span>
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2 text-white">
          Reset Password
        </h1>
        <p className="text-center text-slate-300 text-sm mb-8">
          Enter your email and we’ll send a reset link.
        </p>

        {sent ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">
              If an account exists for <span className="font-medium text-white">{email.trim()}</span>,
              a password reset link has been sent.
            </div>

            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center py-3 rounded-lg bg-linear-to-r from-blue-600 to-blue-400 text-white font-semibold text-lg shadow hover:shadow-lg hover:shadow-blue-500/30 transition-all"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Email */}
            <div>
              <label
                className="block text-sm font-medium text-slate-200 mb-1"
                htmlFor="email"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  className={`pl-10 pr-3 py-3 w-full rounded-lg border ${
                    error ? "border-red-500" : "border-slate-700"
                  } focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent bg-slate-950/60 text-white placeholder-slate-500`}
                  placeholder="you@email.com"
                />
              </div>
              {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-3 rounded-lg bg-linear-to-r from-blue-600 to-blue-400 text-white font-semibold text-lg shadow hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Sending...
                </span>
              ) : (
                "Send Reset Link"
              )}
            </button>

            <div className="text-center">
              <Link to="/login" className="text-sm text-cyan-300 hover:underline">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default ForgotPassword;
