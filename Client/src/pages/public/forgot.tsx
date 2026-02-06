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
    <div className="min-h-[80vh] flex items-center justify-center bg-linear-to-b from-blue-50 to-white py-12">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
        autoComplete="off"
      >
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-linear-to-r from-blue-600 to-blue-400 w-10 h-10 rounded-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">APEX ARENAS</span>
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
          Reset Password
        </h1>
        <p className="text-center text-gray-600 text-sm mb-8">
          Enter your email and we’ll send a reset link.
        </p>

        {sent ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              If an account exists for <span className="font-medium">{email.trim()}</span>,
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
                className="block text-sm font-medium text-gray-700 mb-1"
                htmlFor="email"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
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
                    error ? "border-red-500" : "border-gray-300"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-900`}
                  placeholder="you@email.com"
                />
              </div>
              {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
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
              <Link to="/login" className="text-sm text-blue-600 hover:underline">
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
