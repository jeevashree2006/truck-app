import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, IndianRupee, Loader2, Mail, Phone, Route, Truck, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";

type Mode = "login" | "signup";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const { t } = useI18n();

  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<"id" | "otp">("id");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const emailValid = EMAIL_RE.test(email.trim());
  const canContinue = emailValid && (mode === "login" || name.trim().length > 0);

  function switchMode(next: Mode) {
    setMode(next);
    setStep("id");
    setError(null);
    setHint(null);
    setCode(Array(6).fill(""));
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canContinue) {
      setError(emailValid ? "Please enter your name" : "Enter a valid email address");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.requestOtp(email.trim().toLowerCase(), name.trim() || undefined, mode === "signup");
      setHint(res.dev_code ? `Dev only — connect SendGrid to email this: ${res.dev_code}` : null);
      setStep("otp");
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function verify(fullCode?: string) {
    const value = fullCode ?? code.join("");
    if (value.length < 4) return;
    setError(null);
    setLoading(true);
    try {
      await api.verifyOtp(email.trim().toLowerCase(), value, {
        name: name.trim() || undefined,
        mobile: mobile.trim() || undefined,
      });
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  function fill(start: number, raw: string) {
    const digits = raw.replace(/\D/g, "").split("");
    if (digits.length === 0) {
      const cleared = [...code];
      cleared[start] = "";
      setCode(cleared);
      return;
    }
    const next = [...code];
    let idx = start;
    for (const d of digits) {
      if (idx > 5) break;
      next[idx] = d;
      idx += 1;
    }
    setCode(next);
    inputs.current[Math.min(idx, 5)]?.focus();
    if (next.every((x) => x) && next.join("").length === 6) verify(next.join(""));
  }

  const isSignup = mode === "signup";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-brand-gradient p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(600px_300px_at_80%_-5%,#fff,transparent),radial-gradient(500px_400px_at_10%_110%,#a78bfa,transparent)]" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Truck size={24} />
          </div>
          <span className="text-xl font-extrabold tracking-tight">{t("app.name")}</span>
        </div>
        <div className="relative">
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-md text-4xl font-extrabold leading-tight">
            Track every load. Know your real profit.
          </motion.h2>
          <p className="mt-4 max-w-md text-white/80">
            Enroll your lorries, run multi-leg loads, log diesel, advances, commission and FASTag — and see the profit on every trip, per vehicle.
          </p>
          <div className="mt-8 space-y-3">
            {[
              { icon: Route, text: "Multi-leg trips (e.g. Namakkal → Mumbai → Madurai)" },
              { icon: IndianRupee, text: "Auto profit = rent − diesel − commission − salary − FASTag" },
              { icon: Truck, text: "Live vehicle status: empty, on the way, waiting to unload" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-white/90">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"><Icon size={16} /></span>
                {text}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} Fleet Owner · Built for lorry & container owners</p>
      </div>

      {/* Auth panel */}
      <div className="flex items-center justify-center bg-slate-50 px-6 py-12 dark:bg-ink-900">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              <Truck size={24} />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("app.name")}</span>
          </div>

          {/* No mode="wait": the next step must never depend on the previous step's exit
              animation finishing (e.g. if rAF is throttled in a backgrounded tab). */}
          <AnimatePresence>
            {step === "id" ? (
              <motion.form key={`id-${mode}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={sendCode}>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {isSignup ? "Create your account" : "Log in to your fleet"}
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  We'll email you a one-time code — no password needed.
                </p>

                <div className="mt-6 space-y-4">
                  {isSignup && (
                    <div>
                      <label className="label">Full name</label>
                      <div className="relative">
                        <UserRound size={17} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="input pl-10" required />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="label">Email address</label>
                    <div className="relative">
                      <Mail size={17} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" className="input pl-10" required autoComplete="email" />
                    </div>
                  </div>
                  {isSignup && (
                    <div>
                      <label className="label">Mobile number <span className="text-slate-400">(optional)</span></label>
                      <div className="relative">
                        <Phone size={17} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
                        <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="9876543210" className="input pl-10" inputMode="tel" />
                      </div>
                    </div>
                  )}
                </div>

                {error && <p className="mt-3 text-sm font-medium text-status-expired">{error}</p>}

                <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <>{isSignup ? "Create account" : "Send code"} <ArrowRight size={18} /></>}
                </button>

                <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
                  {isSignup ? "Already have an account?" : "New to Fleet Owner?"}{" "}
                  <button type="button" onClick={() => switchMode(isSignup ? "login" : "signup")} className="font-semibold text-brand-600 hover:underline">
                    {isSignup ? "Log in" : "Create an account"}
                  </button>
                </p>
              </motion.form>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Enter the 6-digit code</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Emailed to <span className="font-semibold text-slate-700 dark:text-slate-200">{email}</span>
                </p>

                <div className="mt-6 flex justify-between gap-2">
                  {code.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => (inputs.current[i] = el)}
                      value={d}
                      onChange={(e) => fill(i, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onPaste={(e) => { e.preventDefault(); fill(0, e.clipboardData.getData("text")); }}
                      onKeyDown={(e) => { if (e.key === "Backspace" && !code[i] && i > 0) inputs.current[i - 1]?.focus(); }}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className="h-14 w-full rounded-xl border border-slate-200 bg-white text-center text-xl font-bold text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:border-ink-600 dark:bg-ink-800 dark:text-white"
                    />
                  ))}
                </div>

                {hint && <p className="mt-3 text-center text-xs font-semibold text-brand-600">{hint}</p>}
                {error && <p className="mt-3 text-center text-sm font-medium text-status-expired">{error}</p>}

                <button onClick={() => verify()} disabled={loading} className="btn-primary mt-6 w-full">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Verify & continue"}
                </button>
                <button onClick={() => { setStep("id"); setCode(Array(6).fill("")); setError(null); }} className="mt-3 w-full text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400">
                  ← Use a different email
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
