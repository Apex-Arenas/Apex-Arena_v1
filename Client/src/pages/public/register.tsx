import { useState } from "react";
import { User, Mail, Lock, Eye, EyeOff, Check, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

const SignUp = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState("player");

  const validate = () => {
    const newErrors = { name: "", email: "", password: "", confirm: "" };
    let isValid = true;

    if (!form.name.trim()) {
      newErrors.name = "Name is required.";
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
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      newErrors.password = "Include uppercase, lowercase & number.";
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
    if (errors[name as keyof typeof errors]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (validate()) {
      setTimeout(() => {
        alert(
          `Welcome ${form.name}! Your ${userType} account has been created.`,
        );
        setForm({ name: "", email: "", password: "", confirm: "" });
        setIsLoading(false);
        // In real app, redirect to dashboard
        // navigate(userType === "organizer" ? "/organizer/dashboard" : "/dashboard");
      }, 1500);
    } else {
      setIsLoading(false);
    }
  };

  //   const handleGoogleSignUp = () => {
  //     setIsLoading(true);
  //     setTimeout(() => {
  //       alert(`Google sign up successful as ${userType}!`);
  //       setIsLoading(false);
  //     }, 1500);
  //   };

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
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="md:flex">
          {/* Left side - Form */}
          <div className="md:w-3/5 p-8">
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center space-x-2">
                <div className="bg-linear-to-r from-blue-600 to-blue-400 w-10 h-10 rounded-lg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-xl bg-linear-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                  APEX ARENAS
                </span>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">
              Create Your Account
            </h1>

            {/* User Type Toggle */}
            <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
              {["player", "organizer"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setUserType(type)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    userType === type
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {type === "player" ? "Player Account" : "Organizer Account"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className={`pl-10 pr-3 py-3 w-full rounded-lg border ${
                      errors.name ? "border-red-500" : "border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Your full name"
                  />
                </div>
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className={`pl-10 pr-3 py-3 w-full rounded-lg border ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className={`pl-10 pr-10 py-3 w-full rounded-lg border ${
                      errors.password ? "border-red-500" : "border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{ width: `${passwordStrength() * 20}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {passwordStrength() >= 4
                          ? "Strong"
                          : passwordStrength() >= 3
                            ? "Good"
                            : "Weak"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Check
                          className={`w-3 h-3 mr-1 ${form.password.length >= 8 ? "text-green-500" : "text-gray-300"}`}
                        />
                        <span>8+ characters</span>
                      </div>
                      <div className="flex items-center">
                        <Check
                          className={`w-3 h-3 mr-1 ${/[A-Z]/.test(form.password) ? "text-green-500" : "text-gray-300"}`}
                        />
                        <span>Uppercase letter</span>
                      </div>
                      <div className="flex items-center">
                        <Check
                          className={`w-3 h-3 mr-1 ${/[a-z]/.test(form.password) ? "text-green-500" : "text-gray-300"}`}
                        />
                        <span>Lowercase letter</span>
                      </div>
                      <div className="flex items-center">
                        <Check
                          className={`w-3 h-3 mr-1 ${/\d/.test(form.password) ? "text-green-500" : "text-gray-300"}`}
                        />
                        <span>Number</span>
                      </div>
                    </div>
                  </div>
                )}
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    name="confirm"
                    value={form.confirm}
                    onChange={handleChange}
                    className={`pl-10 pr-10 py-3 w-full rounded-lg border ${
                      errors.confirm ? "border-red-500" : "border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.confirm && (
                  <p className="text-red-500 text-xs mt-1">{errors.confirm}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="mt-6 w-full py-3 px-4 rounded-lg bg-linear-to-r from-blue-600 to-blue-400 text-white font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Creating Account...
                  </span>
                ) : (
                  `Create ${userType === "organizer" ? "Organizer" : "Player"} Account`
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-4 text-sm text-gray-500">
                Or sign up with
              </span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Social Sign Up */}
            <button
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center font-medium text-gray-700 disabled:opacity-50"
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

            {/* Terms and Login */}
            <div className="mt-6 text-center space-y-3">
              <p className="text-xs text-gray-500">
                By signing up, you agree to our{" "}
                <Link to="/terms" className="text-blue-600 hover:underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
                . Must be 18+.
              </p>
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-blue-600 font-medium hover:underline"
                >
                  Log in here
                </Link>
              </p>
            </div>
          </div>

          {/* Right side - Info */}
          <div className="md:w-2/5 bg-linear-to-b from-blue-600 to-blue-500 text-white p-8 flex flex-col justify-center">
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Why Join Apex Arenas?</h2>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Check className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                  <span>100% guaranteed prizes via escrow</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                  <span>Instant Mobile Money payouts</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                  <span>Professional tournament tools</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                  <span>AI-assisted fair play verification</span>
                </li>
              </ul>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mt-6">
                <p className="text-sm text-blue-100">
                  {userType === "player"
                    ? "Compete with confidence knowing all prizes are secured before tournaments begin."
                    : "Run professional tournaments with automated payments and built-in trust features."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
