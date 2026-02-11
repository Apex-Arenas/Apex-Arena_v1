import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, ShieldCheck, Trophy } from "lucide-react";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

const VerifyOtp = () => {
	const navigate = useNavigate();
	const location = useLocation();

	const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
	const email = (query.get("email") ?? "").trim();
	const nextPath = (query.get("next") ?? query.get("redirect") ?? "/login").trim() || "/login";

	const [digits, setDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
	const [error, setError] = useState("");
	const [info, setInfo] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [secondsLeft, setSecondsLeft] = useState(0);

	const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

	useEffect(() => {
		if (secondsLeft <= 0) return;
		const id = window.setInterval(() => {
			setSecondsLeft((s) => Math.max(0, s - 1));
		}, 1000);
		return () => window.clearInterval(id);
	}, [secondsLeft]);

	const focusIndex = (index: number) => {
		const el = inputRefs.current[index];
		if (!el) return;
		el.focus();
		el.select();
	};

	const setFromIndex = (startIndex: number, raw: string) => {
		const onlyDigits = raw.replace(/\D/g, "");
		if (!onlyDigits) return;

		setDigits((prev) => {
			const next = [...prev];
			let writeIndex = startIndex;
			for (const ch of onlyDigits) {
				if (writeIndex >= OTP_LENGTH) break;
				next[writeIndex] = ch;
				writeIndex++;
			}
			const nextFocus = Math.min(writeIndex, OTP_LENGTH - 1);
			queueMicrotask(() => focusIndex(nextFocus));
			return next;
		});
	};

	const handleChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
		if (error) setError("");
		if (info) setInfo("");

		const value = e.target.value;
		if (!value) {
			setDigits((prev) => {
				const next = [...prev];
				next[index] = "";
				return next;
			});
			return;
		}

		// If user types/pastes multiple chars into one box, distribute.
		if (value.length > 1) {
			setFromIndex(index, value);
			return;
		}

		const digit = value.replace(/\D/g, "");
		if (!digit) return;

		setDigits((prev) => {
			const next = [...prev];
			next[index] = digit;
			return next;
		});

		if (index < OTP_LENGTH - 1) {
			queueMicrotask(() => focusIndex(index + 1));
		}
	};

	const handleKeyDown = (index: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Backspace") {
			e.preventDefault();
			setDigits((prev) => {
				const next = [...prev];
				if (next[index]) {
					next[index] = "";
					queueMicrotask(() => focusIndex(index));
				} else if (index > 0) {
					next[index - 1] = "";
					queueMicrotask(() => focusIndex(index - 1));
				}
				return next;
			});
			return;
		}

		if (e.key === "ArrowLeft" && index > 0) {
			e.preventDefault();
			focusIndex(index - 1);
			return;
		}

		if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
			e.preventDefault();
			focusIndex(index + 1);
			return;
		}
	};

	const handlePaste = (index: number) => (e: React.ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();
		const text = e.clipboardData.getData("text");
		setFromIndex(index, text);
	};

	const code = digits.join("");
	const isComplete = code.length === OTP_LENGTH && /^\d{6}$/.test(code);

	const handleResend = () => {
		if (secondsLeft > 0) return;
		setSecondsLeft(RESEND_SECONDS);
		setInfo("A new verification code has been sent. (Demo)");
		setError("");
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setInfo("");

		if (!isComplete) {
			setError("Enter the 6-digit code.");
			focusIndex(0);
			return;
		}

		setIsLoading(true);
		// Simulate API verify
		window.setTimeout(() => {
			setIsLoading(false);
			navigate(nextPath);
		}, 900);
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
						<span className="font-display font-bold text-lg text-white">APEX ARENAS</span>
					</Link>
				</div>

				<div className="flex items-center justify-center gap-2 mb-2">
					<div className="w-9 h-9 rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 flex items-center justify-center">
						<ShieldCheck className="w-5 h-5" />
					</div>
					<h1 className="font-display text-3xl font-bold text-center text-white">Verify Code</h1>
				</div>

				<p className="text-center text-slate-300 text-sm mb-6">
					Enter the 6-digit code{email ? (
						<span className="inline-flex items-center gap-2">
							{" "}
							sent to
							<span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950/40 px-2 py-1 text-slate-100">
								<Mail className="w-4 h-4 text-slate-300" />
								<span className="font-medium">{email}</span>
							</span>
						</span>
					) : (
						"."
					)}
				</p>

				<div className="flex justify-center gap-2 mb-4">
					{digits.map((value, i) => (
						<input
							key={i}
							ref={(el) => {
								inputRefs.current[i] = el;
							}}
							inputMode="numeric"
							pattern="[0-9]*"
							maxLength={6}
							value={value}
							onChange={handleChange(i)}
							onKeyDown={handleKeyDown(i)}
							onPaste={handlePaste(i)}
							className={`w-11 h-12 text-center text-lg rounded-lg border ${
								error ? "border-red-500" : "border-slate-700"
							} bg-slate-950/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent`}
							aria-label={`Digit ${i + 1}`}
						/>
					))}
				</div>

				{error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}
				{info && <p className="text-emerald-200 text-sm text-center mb-3">{info}</p>}

				<button
					type="submit"
					disabled={isLoading}
					className="mt-2 w-full py-3 rounded-lg bg-linear-to-r from-cyan-300 via-sky-400 to-indigo-400 text-slate-950 font-semibold text-lg shadow hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isLoading ? (
						<span className="flex items-center justify-center">
							<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
							Verifying...
						</span>
					) : (
						"Verify"
					)}
				</button>

				<div className="mt-6 flex items-center justify-between">
					<button
						type="button"
						onClick={handleResend}
						disabled={secondsLeft > 0}
						className="text-sm text-cyan-300 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
					</button>

					<Link to="/login" className="text-sm text-slate-300 hover:text-white">
						Back to login
					</Link>
				</div>
			</form>
		</div>
	);
};

export default VerifyOtp;

