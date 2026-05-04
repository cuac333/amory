import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/I18nContext";
import api from "../../services/api";
import {
  Heart, Key, Copy, Check, Users, UserPlus,
  ArrowLeft, AlertCircle, Sparkles,
} from "lucide-react";
import DatePicker from "../shared/DatePicker";

export default function CoupleSetup() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [passwordCode, setPasswordCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [resultCode, setResultCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/couple", {
        anniversary_date: new Date(anniversaryDate).toISOString(),
        password_code: passwordCode,
      });
      setResultCode(res.data.invite_code);
      const meRes = await api.get("/auth/me");
      updateUser(meRes.data);
    } catch {
      setError(t("couple.error.create"));
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/couple/join", { invite_code: inviteCode });
      const meRes = await api.get("/auth/me");
      updateUser(meRes.data);
    } catch {
      setError(t("couple.error.join"));
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(resultCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (user?.couple_id) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-warm-50 via-burnt-50/30 to-warm-50 px-4">
      <div className="absolute top-20 left-10 w-64 h-64 bg-burnt-100/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-tuscan-200/20 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-charcoal-400 to-verdigris-400 flex items-center justify-center mx-auto mb-4 shadow-elevated">
            <Users size={28} className="text-white" />
          </div>
          <h2 className="text-3xl font-display font-bold text-charcoal-700">
            {t("couple.hello", { name: user?.name || "" })}
          </h2>
          <p className="text-charcoal-400 text-sm mt-2">{t("couple.link")}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-elevated p-8">
          {error && (
            <div className="flex items-center gap-2 bg-burnt-50 text-burnt-400 p-3 rounded-xl mb-4 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {resultCode && (
            <div className="bg-gradient-to-br from-verdigris-50 to-verdigris-50 border border-verdigris-200 p-5 rounded-2xl mb-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-verdigris-700" />
                <p className="text-verdigris-800 font-semibold text-sm">{t("couple.created")}</p>
              </div>
              <p className="text-xs text-verdigris-800 mb-3">{t("couple.share.code")}</p>
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-3 bg-white rounded-xl text-center text-2xl font-mono font-bold text-burnt-400 tracking-[0.2em]">
                  {resultCode}
                </div>
                <button onClick={copyCode} className="px-3 py-3 bg-white rounded-xl hover:bg-verdigris-50 transition-colors">
                  {copied ? <Check size={18} className="text-verdigris-700" /> : <Copy size={18} className="text-charcoal-400" />}
                </button>
              </div>
            </div>
          )}

          {mode === "choose" && (
            <div className="space-y-3">
              <button
                onClick={() => setMode("create")}
                className="w-full py-4 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white rounded-2xl font-medium hover:from-burnt-400 hover:to-sandy-400 transition-all flex items-center justify-center gap-3 shadow-lg shadow-burnt-200/30"
              >
                <Heart size={20} />
                {t("couple.create")}
              </button>
              <button
                onClick={() => setMode("join")}
                className="w-full py-4 border-2 border-warm-200 text-charcoal-600 rounded-2xl font-medium hover:border-tuscan-300 hover:text-burnt-500 transition-all flex items-center justify-center gap-3"
              >
                <UserPlus size={20} />
                {t("couple.join")}
              </button>
            </div>
          )}

          {mode === "create" && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-charcoal-500 mb-1.5">
                  {t("couple.anniversary")}
                </label>
                <DatePicker value={anniversaryDate} onChange={setAnniversaryDate} placeholder={t("couple.anniversary")} />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-charcoal-500 mb-1.5">
                  <Key size={14} /> {t("couple.book.password")}
                </label>
                <input
                  type="text"
                  value={passwordCode}
                  onChange={(e) => setPasswordCode(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:ring-2 focus:ring-tuscan-200 outline-none"
                  placeholder={t("couple.book.password.placeholder")}
                />
                <p className="text-xs text-warm-400 mt-1">{t("couple.book.password.hint")}</p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-lg shadow-burnt-200/30"
              >
                {loading ? t("couple.creating") : t("couple.create.btn")}
              </button>
              <button type="button" onClick={() => setMode("choose")} className="w-full flex items-center justify-center gap-1 text-sm text-charcoal-400 hover:text-charcoal-500">
                <ArrowLeft size={14} /> {t("back")}
              </button>
            </form>
          )}

          {mode === "join" && (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-500 mb-1.5">{t("couple.invite.code")}</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-warm-50 border border-warm-200 rounded-xl text-center text-lg font-mono font-bold tracking-[0.15em] focus:ring-2 focus:ring-tuscan-200 outline-none"
                  placeholder="abc12345"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-lg shadow-burnt-200/30"
              >
                {loading ? t("couple.joining") : t("couple.join.btn")}
              </button>
              <button type="button" onClick={() => setMode("choose")} className="w-full flex items-center justify-center gap-1 text-sm text-charcoal-400 hover:text-charcoal-500">
                <ArrowLeft size={14} /> {t("back")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
