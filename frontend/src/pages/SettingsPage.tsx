import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme, COLOR_THEMES } from "../context/ThemeContext";
import { useTranslation } from "../context/I18nContext";
import { LOCALES } from "../i18n";
import api from "../services/api";
import type { User, CoupleResponse } from "../types";
import {
  Heart, Key, Copy, Check,
  Save, Users, LogOut, Pencil,
  Sun, Moon, Camera, Bell, BellOff, Palette,
} from "lucide-react";
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed, isPushSupported } from "../utils/pushNotifications";
import DatePicker from "../components/shared/DatePicker";
import CustomSelect from "../components/shared/CustomSelect";

import Avatar from "../components/shared/Avatar";

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const { isDark, toggleTheme, colorTheme, setColorTheme, customColor, setCustomColor } = useTheme();
  const { locale, setLocale, t } = useTranslation();
  const [couple, setCouple] = useState<CoupleResponse | null>(null);
  const [partner, setPartner] = useState<User | null>(null);
  const [name, setName] = useState(user?.name || "");
  const [editingName, setEditingName] = useState(false);
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [passwordCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const pushSupported = isPushSupported();

  useEffect(() => {
    isPushSubscribed().then(setPushEnabled);
  }, []);

  const togglePush = async () => {
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
      } else {
        const ok = await subscribeToPush();
        setPushEnabled(ok);
      }
    } catch {} finally {
      setPushLoading(false);
    }
  };

  useEffect(() => {
    api.get("/auth/couple").then((res) => {
      setCouple(res.data);
      setAnniversaryDate(res.data.anniversary_date.split("T")[0]);
    }).catch(() => {});
    api.get("/auth/partner").then((res) => setPartner(res.data)).catch(() => {});
  }, []);

  const copyInviteCode = () => {
    if (couple?.invite_code) {
      navigator.clipboard.writeText(couple.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const saveName = async () => {
    setSaving(true);
    const res = await api.put(`/auth/me?name=${encodeURIComponent(name)}`);
    updateUser(res.data);
    setSaving(false);
    setEditingName(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveCouple = async () => {
    if (!anniversaryDate) return;
    setSaving(true);
    await api.put("/auth/couple", {
      anniversary_date: new Date(anniversaryDate).toISOString(),
      password_code: passwordCode || couple?.invite_code || "",
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const uploadAvatar = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.put("/auth/me/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateUser(res.data);
      window.location.reload();
    } catch (err: any) {
      alert("上传头像失败：" + (err?.response?.data?.detail || err?.message || "未知错误"));
    }
  };

  const uploadCouplePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.put("/auth/couple/photo", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCouple(res.data);
    } catch (err: any) {
      alert("上传照片失败：" + (err?.response?.data?.detail || err?.message || "未知错误"));
    }
  };

  return (
    <div className="space-y-4 py-4 md:py-6 max-w-2xl mx-auto">

      {/* Couple photo banner */}
      {couple && (
        <div className="relative rounded-2xl overflow-hidden shadow-soft">
          {couple.photo_url ? (
            <img
              src={couple.photo_url}
              alt={t("settings.couple.photo")}
              className="w-full h-36 object-cover"
            />
          ) : (
            <div className="w-full h-36 bg-gradient-to-br from-burnt-100 to-sandy-100 dark:from-burnt-800/30 dark:to-sandy-800/30" />
          )}
          <label className="absolute bottom-2 right-2 p-2 bg-white/80 dark:bg-charcoal-800/80 rounded-xl cursor-pointer hover:bg-white transition-colors backdrop-blur-sm">
            <Camera size={16} className="text-charcoal-500" />
            <input type="file" accept="image/*" className="hidden" onChange={uploadCouplePhoto} />
          </label>
        </div>
      )}

      {/* Profile card — both users side by side */}
      <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-soft p-4 md:p-6">
        <div className="flex items-center gap-4">
          {/* Current user */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            <Avatar
              src={user?.avatar_url || null}
              name={user?.name || ""}
              size="lg"
              gradient="primary"
              editable
              onUpload={uploadAvatar}
            />
            <div className="mt-2 text-center min-w-0 w-full">
              {editingName ? (
                <div className="flex gap-1.5">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    className="flex-1 min-w-0 px-2 py-1 bg-warm-50 border border-warm-200 rounded-lg text-xs text-center outline-none focus:ring-1 focus:ring-tuscan-200"
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                  />
                  <button onClick={saveName} className="p-1 rounded-lg bg-burnt-300 text-white">
                    <Check size={12} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setEditingName(true)} className="group flex items-center justify-center gap-1 w-full">
                  <span className="font-semibold text-sm text-charcoal-700 dark:text-warm-300 truncate">{user?.name}</span>
                  <Pencil size={10} className="text-warm-300 group-hover:text-burnt-300 transition-colors shrink-0" />
                </button>
              )}
              <p className="text-[10px] text-charcoal-400 truncate mt-0.5">{user?.email}</p>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-burnt-50 text-burnt-500 rounded text-[9px] font-medium mt-1">
                {user?.role === "partner_1" ? t("settings.creator") : t("settings.partner")}
              </span>
            </div>
          </div>

          {/* Heart connector */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <div className="w-px h-4 bg-burnt-200/40" />
            <Heart size={16} className="text-burnt-300 fill-burnt-300" />
            <div className="w-px h-4 bg-burnt-200/40" />
          </div>

          {/* Partner */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            {partner ? (
              <>
                <Avatar
                  src={partner.avatar_url || null}
                  name={partner.name}
                  size="lg"
                  gradient="secondary"
                />
                <div className="mt-2 text-center min-w-0 w-full">
                  <p className="font-semibold text-sm text-charcoal-700 dark:text-warm-300 truncate">{partner.name}</p>
                  <p className="text-[10px] text-charcoal-400 truncate mt-0.5">{partner.email}</p>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-sandy-50 text-sandy-600 rounded text-[9px] font-medium mt-1">
                    {t("settings.partner")}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-warm-100 dark:bg-charcoal-700 border-2 border-dashed border-warm-300 dark:border-charcoal-500 flex items-center justify-center">
                  <Users size={20} className="text-warm-300" />
                </div>
                <div className="mt-2 text-center">
                  <p className="text-xs text-warm-400 font-medium">{t("settings.waiting")}</p>
                  <p className="text-[10px] text-warm-300 mt-0.5">{t("settings.share.code")}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Saved toast */}
        {saved && (
          <div className="mt-3 text-center">
            <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-lg">
              <Check size={12} /> {t("saved")}
            </span>
          </div>
        )}
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={toggleTheme}
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-charcoal-800 rounded-2xl shadow-soft border border-warm-200/30 dark:border-charcoal-600/30 hover:border-burnt-200/50 transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-charcoal-500 dark:bg-tuscan-500/20 flex items-center justify-center shrink-0">
            {isDark ? <Moon size={14} className="text-tuscan-300" /> : <Sun size={14} className="text-white" />}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-charcoal-600 dark:text-warm-300">{isDark ? t("settings.dark.mode") : t("settings.light.mode")}</p>
            <p className="text-[10px] text-charcoal-400">{t("settings.appearance")}</p>
          </div>
        </div>
        <div className={`w-11 h-6 rounded-full p-0.5 transition-colors ${isDark ? "bg-burnt-400" : "bg-warm-300"}`}>
          <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isDark ? "translate-x-5" : "translate-x-0"}`} />
        </div>
      </button>

      {/* Push notifications toggle */}
      {pushSupported && (
        <button
          onClick={togglePush}
          disabled={pushLoading}
          className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-charcoal-800 rounded-2xl shadow-soft border border-warm-200/30 dark:border-charcoal-600/30 hover:border-burnt-200/50 transition-colors group disabled:opacity-60"
        >
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${pushEnabled ? "bg-verdigris-100 dark:bg-verdigris-500/20" : "bg-warm-100 dark:bg-charcoal-700"}`}>
              {pushEnabled ? <Bell size={14} className="text-verdigris-500" /> : <BellOff size={14} className="text-warm-400" />}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-charcoal-600 dark:text-warm-300">{t("settings.notifications")}</p>
              <p className="text-[10px] text-charcoal-400">{pushEnabled ? t("settings.notifications.on") : t("settings.notifications.off")}</p>
            </div>
          </div>
          <div className={`w-11 h-6 rounded-full p-0.5 transition-colors ${pushEnabled ? "bg-verdigris-400" : "bg-warm-300"}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${pushEnabled ? "translate-x-5" : "translate-x-0"}`} />
          </div>
        </button>
      )}

      {/* Color theme selector */}
      <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-soft p-4 border border-warm-200/30 dark:border-charcoal-600/30 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-burnt-300 to-sandy-300 flex items-center justify-center shrink-0">
            <Palette size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-charcoal-600 dark:text-warm-300">{t("settings.theme")}</p>
            <p className="text-[10px] text-charcoal-400">{t("settings.theme.desc")}</p>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {COLOR_THEMES.map((ct) => (
            <button
              key={ct.key}
              onClick={() => setColorTheme(ct.key)}
              className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                colorTheme === ct.key
                  ? "bg-warm-100 dark:bg-charcoal-700 ring-2 ring-burnt-300 dark:ring-burnt-400"
                  : "bg-warm-50/50 dark:bg-charcoal-700/50 hover:bg-warm-100 dark:hover:bg-charcoal-700"
              }`}
            >
              <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${ct.preview} shadow-sm`} />
              <span className="text-[8px] font-medium text-charcoal-500 dark:text-warm-400 leading-tight text-center">{t(`theme.${ct.key}`)}</span>
              {colorTheme === ct.key && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-burnt-400 flex items-center justify-center">
                  <Check size={8} className="text-white" />
                </div>
              )}
            </button>
          ))}
          {/* Custom color picker */}
          <button
            onClick={() => setColorTheme("custom" as any)}
            className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              colorTheme === "custom"
                ? "bg-warm-100 dark:bg-charcoal-700 ring-2 ring-burnt-300 dark:ring-burnt-400"
                : "bg-warm-50/50 dark:bg-charcoal-700/50 hover:bg-warm-100 dark:hover:bg-charcoal-700"
            }`}
          >
            <div className="w-7 h-7 rounded-full shadow-sm border-2 border-dashed border-charcoal-300 dark:border-charcoal-500 flex items-center justify-center overflow-hidden">
              {colorTheme === "custom" ? (
                <div className="w-full h-full rounded-full" style={{ backgroundColor: customColor }} />
              ) : (
                <Palette size={12} className="text-charcoal-400" />
              )}
            </div>
            <span className="text-[8px] font-medium text-charcoal-500 dark:text-warm-400 leading-tight text-center">{t("theme.custom") || "自定义"}</span>
            {colorTheme === "custom" && (
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-burnt-400 flex items-center justify-center">
                <Check size={8} className="text-white" />
              </div>
            )}
          </button>
        </div>
        {/* Custom color input */}
        {colorTheme === "custom" && (
          <div className="flex items-center gap-3 pt-2 border-t border-warm-200/30 dark:border-charcoal-600/30">
            <label className="relative w-10 h-10 rounded-xl overflow-hidden cursor-pointer shadow-sm border border-warm-200/50 dark:border-charcoal-600">
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-full h-full" style={{ backgroundColor: customColor }} />
            </label>
            <div className="flex-1">
              <p className="text-xs font-medium text-charcoal-600 dark:text-warm-300">{t("theme.custom.pick") || "选择你的颜色"}</p>
              <p className="text-[10px] text-charcoal-400 font-mono">{customColor}</p>
            </div>
          </div>
        )}
      </div>

      {/* Language selector */}
      <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-soft p-4 border border-warm-200/30 dark:border-charcoal-600/30 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-verdigris-300 to-verdigris-500 flex items-center justify-center shrink-0">
            <span className="text-sm">🌐</span>
          </div>
          <div>
            <p className="text-sm font-medium text-charcoal-600 dark:text-warm-300">{t("settings.language")}</p>
            <p className="text-[10px] text-charcoal-400">{t("settings.language.desc")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {LOCALES.map((l) => (
            <button
              key={l.key}
              onClick={() => setLocale(l.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                locale === l.key
                  ? "bg-burnt-100 dark:bg-burnt-400/20 text-burnt-600 dark:text-burnt-300 ring-2 ring-burnt-300 dark:ring-burnt-400"
                  : "bg-warm-50 dark:bg-charcoal-700 text-charcoal-500 dark:text-warm-400 hover:bg-warm-100 dark:hover:bg-charcoal-600"
              }`}
            >
              <span className="text-base">{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invite code */}
      {couple && (
        <button
          onClick={copyInviteCode}
          className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-charcoal-800 rounded-2xl shadow-soft border border-warm-200/30 dark:border-charcoal-600/30 hover:border-burnt-200/50 transition-colors group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-burnt-50 dark:bg-burnt-800/30 flex items-center justify-center shrink-0">
              <Key size={14} className="text-burnt-400" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-[10px] text-charcoal-400 font-medium">{t("settings.invite.code")}</p>
              <p className="font-mono font-bold text-sm text-burnt-500 tracking-wider truncate">{couple.invite_code}</p>
            </div>
          </div>
          <span className="shrink-0 flex items-center gap-1 text-xs text-charcoal-400 group-hover:text-burnt-400 transition-colors bg-warm-50 dark:bg-charcoal-700 px-2.5 py-1.5 rounded-lg">
            {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
            {copied ? t("settings.copied") : t("settings.copy")}
          </span>
        </button>
      )}

      {/* Couple settings */}
      <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-soft p-4 md:p-6 space-y-3">
        <h3 className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider">{t("settings.couple.data")}</h3>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-charcoal-500 dark:text-warm-400 mb-1">
            {t("settings.anniversary")}
          </label>
          <DatePicker value={anniversaryDate} onChange={setAnniversaryDate} placeholder={t("settings.anniversary.placeholder")} />
        </div>

        <button
          onClick={saveCouple}
          disabled={saving}
          className="w-full py-2.5 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white rounded-xl text-sm font-medium hover:from-burnt-400 hover:to-sandy-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-burnt-200/20"
        >
          <Save size={14} /> {saving ? t("settings.saving") : t("settings.save")}
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full py-3 bg-white/60 dark:bg-charcoal-800/60 border border-burnt-200/30 dark:border-charcoal-600/30 text-burnt-400 rounded-2xl text-sm font-medium hover:bg-burnt-50 transition-colors flex items-center justify-center gap-2"
      >
        <LogOut size={15} />
        {t("auth.logout")}
      </button>
    </div>
  );
}
