import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/I18nContext";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, KeyRound, ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle, Shield } from "lucide-react";
import api from "../../services/api";
import AuthShell, { serifStyle } from "./AuthShell";

export default function ResetPasswordForm() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [coupleCode, setCoupleCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError(t("auth.reset.mismatch"));
      return;
    }

    if (newPassword.length < 6) {
      setError(t("auth.reset.min.length"));
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email,
        couple_code: coupleCode,
        new_password: newPassword,
      });
      await login(email, newPassword);
      navigate("/");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail === "Usuario no encontrado") {
        setError(t("auth.reset.user.not.found"));
      } else if (detail === "Codigo de pareja incorrecto") {
        setError(t("auth.reset.wrong.code"));
      } else {
        setError(t("auth.reset.error"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      heroEyebrow="Volver al libro"
      heroHeadline={{ lead: "Recupera tu llave,", accent: "continúa la historia." }}
      heroSubtitle={t("auth.reset.tagline")}
    >
      <div className="mb-1 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-burnt-400 dark:text-burnt-300">
        <Shield size={11} />
        Recuperación segura
      </div>

      <h1
        className="text-3xl sm:text-[34px] font-medium tracking-tight text-charcoal-600 dark:text-warm-100 mt-2"
        style={serifStyle}
      >
        {t("auth.reset.title")}
      </h1>
      <p className="mt-2 text-sm text-charcoal-400 dark:text-charcoal-200">
        {t("auth.reset.description")}
      </p>

      {error && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2.5 rounded-xl border border-burnt-200/60 dark:border-burnt-500/30 bg-burnt-50 dark:bg-burnt-500/10 px-3.5 py-3 text-sm text-burnt-600 dark:text-burnt-200"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
        <div>
          <label
            htmlFor="reset-email"
            className="block text-xs font-medium text-charcoal-500 dark:text-warm-300 mb-2"
          >
            {t("auth.email")}
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400 dark:text-charcoal-300"
              aria-hidden="true"
            />
            <input
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t("auth.email.placeholder")}
              className="w-full h-12 pl-10 pr-3.5 rounded-xl bg-white dark:bg-dark-input border border-warm-200 dark:border-dark-border text-sm text-charcoal-600 dark:text-warm-100 placeholder:text-warm-400 dark:placeholder:text-charcoal-300 outline-none transition-all focus:border-burnt-300 dark:focus:border-burnt-400 focus:ring-4 focus:ring-burnt-200/40 dark:focus:ring-burnt-400/20"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="reset-code"
            className="block text-xs font-medium text-charcoal-500 dark:text-warm-300 mb-2"
          >
            {t("auth.reset.couple.code")}
          </label>
          <div className="relative">
            <KeyRound
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400 dark:text-charcoal-300"
              aria-hidden="true"
            />
            <input
              id="reset-code"
              name="couple_code"
              type="text"
              autoComplete="one-time-code"
              value={coupleCode}
              onChange={(e) => setCoupleCode(e.target.value)}
              required
              placeholder={t("auth.reset.couple.code.placeholder")}
              className="w-full h-12 pl-10 pr-3.5 rounded-xl bg-white dark:bg-dark-input border border-warm-200 dark:border-dark-border text-sm text-charcoal-600 dark:text-warm-100 placeholder:text-warm-400 dark:placeholder:text-charcoal-300 outline-none transition-all focus:border-burnt-300 dark:focus:border-burnt-400 focus:ring-4 focus:ring-burnt-200/40 dark:focus:ring-burnt-400/20"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-charcoal-400 dark:text-charcoal-300">
            {t("auth.reset.couple.code.hint")}
          </p>
        </div>

        <div>
          <label
            htmlFor="reset-password"
            className="block text-xs font-medium text-charcoal-500 dark:text-warm-300 mb-2"
          >
            {t("auth.reset.new.password")}
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400 dark:text-charcoal-300"
              aria-hidden="true"
            />
            <input
              id="reset-password"
              name="new_password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full h-12 pl-10 pr-11 rounded-xl bg-white dark:bg-dark-input border border-warm-200 dark:border-dark-border text-sm text-charcoal-600 dark:text-warm-100 placeholder:text-warm-400 dark:placeholder:text-charcoal-300 outline-none transition-all focus:border-burnt-300 dark:focus:border-burnt-400 focus:ring-4 focus:ring-burnt-200/40 dark:focus:ring-burnt-400/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-warm-400 dark:text-charcoal-300 hover:text-charcoal-500 dark:hover:text-warm-200 hover:bg-warm-100/60 dark:hover:bg-dark-card-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt-300"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="reset-confirm"
            className="block text-xs font-medium text-charcoal-500 dark:text-warm-300 mb-2"
          >
            {t("auth.reset.confirm.password")}
          </label>
          <div className="relative">
            <CheckCircle
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400 dark:text-charcoal-300"
              aria-hidden="true"
            />
            <input
              id="reset-confirm"
              name="confirm_password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full h-12 pl-10 pr-3.5 rounded-xl bg-white dark:bg-dark-input border border-warm-200 dark:border-dark-border text-sm text-charcoal-600 dark:text-warm-100 placeholder:text-warm-400 dark:placeholder:text-charcoal-300 outline-none transition-all focus:border-burnt-300 dark:focus:border-burnt-400 focus:ring-4 focus:ring-burnt-200/40 dark:focus:ring-burnt-400/20"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group relative w-full h-12 rounded-xl bg-gradient-to-r from-burnt-400 via-burnt-300 to-sandy-400 text-white text-sm font-semibold tracking-tight shadow-[0_8px_24px_-8px_rgba(240,126,122,0.6)] hover:shadow-[0_12px_32px_-8px_rgba(240,126,122,0.7)] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-burnt-200/60 dark:focus-visible:ring-burnt-400/30"
        >
          <span className="inline-flex items-center justify-center gap-2">
            {loading ? (
              <>
                <span
                  className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                {t("auth.reset.resetting")}
              </>
            ) : (
              <>
                {t("auth.reset.submit")}
                <ArrowRight
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                />
              </>
            )}
          </span>
        </button>
      </form>

      <div className="relative mt-10 mb-6 flex items-center">
        <div className="flex-1 h-px bg-warm-200/70 dark:bg-dark-border" />
        <span className="px-3 text-[11px] uppercase tracking-[0.14em] text-charcoal-300 dark:text-charcoal-300">
          {t("auth.reset.remember")}
        </span>
        <div className="flex-1 h-px bg-warm-200/70 dark:bg-dark-border" />
      </div>

      <Link
        to="/login"
        className="flex h-12 items-center justify-center rounded-xl border border-warm-200 dark:border-dark-border bg-white dark:bg-dark-card text-sm font-medium text-charcoal-600 dark:text-warm-100 hover:border-burnt-300 dark:hover:border-burnt-400 hover:text-burnt-500 dark:hover:text-burnt-200 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-burnt-200/40"
      >
        {t("auth.login")}
      </Link>
    </AuthShell>
  );
}
