import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/I18nContext";
import api from "../services/api";
import {
  Heart, Users, Calendar, Camera, ArrowRight, ArrowLeft,
  Check, Copy, Sparkles, UserPlus, Link2,
} from "lucide-react";
import DatePicker from "../components/shared/DatePicker";
import Avatar from "../components/shared/Avatar";

const STEPS = [
  { titleKey: "onboarding.step1", icon: Users, subtitleKey: "onboarding.step1.desc" },
  { titleKey: "onboarding.step2", icon: Calendar, subtitleKey: "onboarding.step2.desc" },
  { titleKey: "onboarding.step3", icon: Camera, subtitleKey: "onboarding.step3.desc" },
  { titleKey: "onboarding.step4", icon: Heart, subtitleKey: "onboarding.step4.desc" },
];

export default function OnboardingPage() {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 1 — names
  const [name1, setName1] = useState(user?.name || "");
  const [partnerName, setPartnerName] = useState("");

  // Step 2 — anniversary + password
  const [anniversaryDate, setAnniversaryDate] = useState("");

  // Step 3 — photos
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [couplePreview, setCouplePreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coupleFile, setCoupleFile] = useState<File | null>(null);

  // Step 4 — invite
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinedViaCode, setJoinedViaCode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 3));
  };
  const goBack = () => {
    setDirection(-1);
    if (joinedViaCode && step === 2) {
      // If joined via code, skip back over anniversary step
      setStep(0);
    } else {
      setStep((s) => Math.max(s - 1, 0));
    }
  };

  const handleAvatarSelect = (file: File) => {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCoupleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoupleFile(file);
      setCouplePreview(URL.createObjectURL(file));
    }
  };

  const handleStep1 = async () => {
    if (!name1.trim()) return;
    setLoading(true);
    try {
      const res = await api.put(`/auth/me?name=${encodeURIComponent(name1.trim())}`);
      updateUser(res.data);
      goNext();
    } catch { setError(t("onboarding.error.name")); }
    setLoading(false);
  };

  const handleStep2 = async () => {
    if (!anniversaryDate) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/couple", {
        anniversary_date: new Date(anniversaryDate).toISOString(),
        password_code: "amory",
      });
      setInviteCode(res.data.invite_code);
      const meRes = await api.get("/auth/me");
      updateUser(meRes.data);
      goNext();
    } catch {
      // If already has couple, just go next
      try {
        const coupleRes = await api.get("/auth/couple");
        setInviteCode(coupleRes.data.invite_code);
        goNext();
      } catch {
        setError(t("onboarding.error.couple"));
      }
    }
    setLoading(false);
  };

  const handleStep3 = async () => {
    setLoading(true);
    try {
      if (avatarFile) {
        const fd = new FormData();
        fd.append("file", avatarFile);
        const res = await api.put("/auth/me/avatar", fd);
        updateUser(res.data);
      }
      if (coupleFile) {
        const fd = new FormData();
        fd.append("file", coupleFile);
        await api.put("/auth/couple/photo", fd);
      }
      if (joinedViaCode) {
        // Skip invite step, go straight to home
        window.location.href = "/";
      } else {
        goNext();
      }
    } catch { setError(t("error")); }
    setLoading(false);
  };

  const handleFinish = () => {
    // Redirect to home — the PrivateRoute already checks couple_id
    window.location.href = "/";
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    setError("");
    try {
      await api.post("/auth/couple/join", { invite_code: joinCode.trim() });
      const meRes = await api.get("/auth/me");
      updateUser(meRes.data);
      setJoinedViaCode(true);
      // Skip anniversary & invite steps, go straight to photos
      setDirection(1);
      setStep(2);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "";
      console.error("Join error:", err?.response?.status, detail);
      setError(detail || t("onboarding.join.error"));
    }
    setJoining(false);
  };

  const canProceed = () => {
    if (step === 0) return name1.trim().length > 0;
    if (step === 1) return anniversaryDate.length > 0;
    return true;
  };

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-warm-50 via-burnt-50/30 to-warm-50 dark:from-charcoal-900 dark:via-charcoal-800 dark:to-charcoal-900 px-4 py-8">
      {/* Background blobs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-burnt-100/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-tuscan-200/20 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative">
        {/* Progress bar */}
        <div className="flex gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-warm-200 dark:bg-charcoal-600">
              <motion.div
                className="h-full bg-gradient-to-r from-burnt-300 to-sandy-300 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              />
            </div>
          ))}
        </div>

        {/* Step indicator */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-burnt-50 dark:bg-burnt-800/30 rounded-full mb-3">
            {(() => { const Icon = STEPS[step].icon; return <Icon size={14} className="text-burnt-400" />; })()}
            <span className="text-xs font-semibold text-burnt-500">{t("onboarding.progress", { current: step + 1, total: STEPS.length })}</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-charcoal-700 dark:text-warm-300">
            {t(STEPS[step].titleKey)}
          </h2>
          <p className="text-sm text-charcoal-400 mt-1">{t(STEPS[step].subtitleKey)}</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-charcoal-800 rounded-3xl shadow-elevated p-6 min-h-[280px]">
          {error && (
            <div className="bg-burnt-50 dark:bg-burnt-800/30 text-burnt-500 p-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {/* STEP 0: Names */}
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-charcoal-500 dark:text-warm-400 mb-1.5 block">{t("onboarding.your.name")}</label>
                    <input
                      value={name1}
                      onChange={(e) => setName1(e.target.value)}
                      className="w-full px-4 py-3 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-tuscan-200"
                      placeholder={t("onboarding.your.name.q")}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-charcoal-500 dark:text-warm-400 mb-1.5 block">{t("onboarding.partner.name")} <span className="text-warm-400 text-xs">{t("onboarding.optional")}</span></label>
                    <input
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      className="w-full px-4 py-3 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-tuscan-200"
                      placeholder={t("onboarding.add.later")}
                    />
                  </div>
                </div>
              )}

              {/* STEP 1: Anniversary OR Join with code */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-charcoal-500 dark:text-warm-400 mb-1.5 block">
                      {t("onboarding.anniversary")}
                    </label>
                    <DatePicker
                      value={anniversaryDate}
                      onChange={setAnniversaryDate}
                      placeholder={t("onboarding.anniversary.q")}
                    />
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-warm-200 dark:bg-charcoal-600" />
                    <span className="text-xs text-charcoal-400 font-medium">{t("or")}</span>
                    <div className="flex-1 h-px bg-warm-200 dark:bg-charcoal-600" />
                  </div>

                  {/* Join with code */}
                  <div className="bg-warm-50 dark:bg-charcoal-700 border border-warm-200/30 dark:border-charcoal-600 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Link2 size={16} className="text-verdigris-500" />
                      <span className="text-sm font-semibold text-charcoal-600 dark:text-warm-300">{t("onboarding.join.title")}</span>
                    </div>
                    <p className="text-xs text-charcoal-400">{t("onboarding.join.desc")}</p>
                    <div className="flex gap-2">
                      <input
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        placeholder={t("onboarding.join.placeholder")}
                        className="flex-1 px-4 py-2.5 bg-white dark:bg-charcoal-800 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm font-mono tracking-wider outline-none focus:ring-2 focus:ring-verdigris-200"
                      />
                      <button
                        onClick={handleJoin}
                        disabled={joining || !joinCode.trim()}
                        className="px-4 py-2.5 bg-verdigris-500 hover:bg-verdigris-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 transition-colors whitespace-nowrap"
                      >
                        {joining ? t("loading") : t("onboarding.join.btn")}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Photos */}
              {step === 2 && (
                <div className="space-y-6">
                  {/* Avatar */}
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm font-medium text-charcoal-500 dark:text-warm-400">{t("onboarding.profile.photo")}</p>
                    <Avatar
                      src={avatarPreview}
                      name={name1}
                      size="xl"
                      editable
                      onUpload={handleAvatarSelect}
                    />
                    <p className="text-xs text-warm-400">{t("onboarding.tap.change")}</p>
                  </div>

                  {/* Couple photo */}
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm font-medium text-charcoal-500 dark:text-warm-400">{t("onboarding.couple.photo")}</p>
                    {couplePreview ? (
                      <label className="cursor-pointer">
                        <img
                          src={couplePreview}
                          alt={t("onboarding.couple.photo")}
                          className="w-32 h-32 rounded-2xl object-cover shadow-lg ring-2 ring-burnt-200/30"
                        />
                        <input type="file" accept="image/*" className="hidden" onChange={handleCoupleSelect} />
                      </label>
                    ) : (
                      <label className="cursor-pointer w-32 h-32 rounded-2xl border-2 border-dashed border-warm-300 dark:border-charcoal-500 flex flex-col items-center justify-center gap-2 hover:border-burnt-300 transition-colors">
                        <Camera size={24} className="text-warm-400" />
                        <span className="text-xs text-warm-400">{t("onboarding.upload.photo")}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleCoupleSelect} />
                      </label>
                    )}
                    <p className="text-xs text-warm-400">{t("onboarding.upload.hint")}</p>
                  </div>
                </div>
              )}

              {/* STEP 3: Invite code (only when user created a couple) */}
              {step === 3 && (
                <div className="space-y-5">
                  {inviteCode && (
                    <div className="bg-gradient-to-br from-burnt-50 to-sandy-50 dark:from-burnt-800/20 dark:to-sandy-800/20 border border-burnt-200/30 dark:border-burnt-700/30 p-5 rounded-2xl text-center">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Sparkles size={16} className="text-burnt-400" />
                        <span className="text-sm font-semibold text-charcoal-600 dark:text-warm-300">{t("onboarding.invite.code")}</span>
                      </div>
                      <div className="flex gap-2 items-center justify-center">
                        <div className="px-5 py-3 bg-white dark:bg-charcoal-700 rounded-xl text-2xl font-mono font-bold text-burnt-400 tracking-[0.2em] shadow-sm">
                          {inviteCode}
                        </div>
                        <button
                          onClick={copyCode}
                          className="p-3 bg-white dark:bg-charcoal-700 rounded-xl hover:bg-warm-50 transition-colors shadow-sm"
                        >
                          {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} className="text-charcoal-400" />}
                        </button>
                      </div>
                      <p className="text-xs text-charcoal-400 mt-3">
                        {t("onboarding.invite.hint")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-5">
          {step > 0 && (
            <button
              onClick={goBack}
              className="flex-1 py-3 border-2 border-warm-200 dark:border-charcoal-600 text-charcoal-500 dark:text-warm-400 rounded-2xl font-medium flex items-center justify-center gap-2 hover:border-burnt-200 transition-colors"
            >
              <ArrowLeft size={16} /> {t("onboarding.back")}
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={step === 0 ? handleStep1 : step === 1 ? handleStep2 : handleStep3}
              disabled={loading || !canProceed()}
              className="flex-1 py-3 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white rounded-2xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-burnt-200/30 hover:from-burnt-400 hover:to-sandy-400 transition-all"
            >
              {loading ? t("saving") : t("onboarding.next")} {!loading && <ArrowRight size={16} />}
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex-1 py-3.5 bg-burnt-400 hover:bg-burnt-500 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-burnt-400/30 transition-all whitespace-nowrap text-sm"
            >
              <Heart size={16} className="fill-white shrink-0" /> {t("onboarding.start")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
