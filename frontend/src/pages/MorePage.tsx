import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Music2, ChefHat, Sparkles, Swords, PiggyBank, CalendarDays,
  MoreHorizontal, ChevronRight, ArrowLeft, Settings, MessageCircle, MapPin,
  Package, Zap, FileDown, Loader2, Ticket,
} from "lucide-react";
import { useTranslation } from "../context/I18nContext";
import api from "../services/api";
import PlaylistSection from "./more/PlaylistSection";
import RecipesSection from "./more/RecipesSection";
import DreamBoardSection from "./more/DreamBoardSection";
import ChallengesSection from "./more/ChallengesSection";
import BudgetSection from "./more/BudgetSection";
import CalendarSection from "./more/CalendarSection";
import TimeCapsuleSection from "./more/TimeCapsuleSection";
import XPLevelSection from "./more/XPLevelSection";

const SECTION_DEFS = [
  { key: "playlist", labelKey: "more.playlist", descKey: "more.playlist.desc", icon: Music2, color: "from-verdigris-300 to-verdigris-500" },
  { key: "recipes", labelKey: "more.recipes", descKey: "more.recipes.desc", icon: ChefHat, color: "from-burnt-300 to-burnt-400" },
{ key: "dreams", labelKey: "more.dreams", descKey: "more.dreams.desc", icon: Sparkles, color: "from-tuscan-300 to-tuscan-400" },
{ key: "challenges", labelKey: "more.challenges", descKey: "more.challenges.desc", icon: Swords, color: "from-verdigris-400 to-verdigris-500" },
  { key: "budget", labelKey: "more.budget", descKey: "more.budget.desc", icon: PiggyBank, color: "from-burnt-200 to-sandy-300" },
  { key: "calendar", labelKey: "more.calendar", descKey: "more.calendar.desc", icon: CalendarDays, color: "from-tuscan-200 to-tuscan-400" },
  { key: "capsules", labelKey: "more.capsules", descKey: "more.capsules.desc", icon: Package, color: "from-burnt-400 to-tuscan-300" },
  { key: "xp", labelKey: "more.xp", descKey: "more.xp.desc", icon: Zap, color: "from-sandy-400 to-burnt-400" },
];

const SECTION_COMPONENTS: Record<string, React.FC> = {
  playlist: PlaylistSection,
  recipes: RecipesSection,
dreams: DreamBoardSection,
challenges: ChallengesSection,
  budget: BudgetSection,
  calendar: CalendarSection,
  capsules: TimeCapsuleSection,
  xp: XPLevelSection,
};

export default function MorePage() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const SECTIONS = SECTION_DEFS.map((s) => ({ ...s, label: t(s.labelKey), desc: t(s.descKey) }));

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const res = await api.get("/export/pdf", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `amory_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // ignore
    } finally {
      setExporting(false);
    }
  };

  // ─── Menu Screen ───
  if (!activeSection) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-charcoal-500 flex items-center gap-2">
            <MoreHorizontal size={24} className="text-burnt-300" />
            {t("more.title")}
          </h1>
          <p className="text-sm text-charcoal-300 mt-0.5">{t("more.desc")}</p>
        </div>

        {/* Featured links: Chat + Map + Tickets */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/chat"
            className="bg-gradient-to-br from-burnt-300 to-sandy-300 rounded-2xl p-4 shadow-elevated hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <MessageCircle size={20} className="text-white" />
            </div>
            <p className="font-semibold text-white text-sm">{t("more.chat")}</p>
            <p className="text-[11px] text-white/70 mt-0.5">{t("more.chat.desc")}</p>
          </Link>
          <Link
            to="/map"
            className="bg-gradient-to-br from-verdigris-400 to-verdigris-600 rounded-2xl p-4 shadow-elevated hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <MapPin size={20} className="text-white" />
            </div>
            <p className="font-semibold text-white text-sm">{t("more.map")}</p>
            <p className="text-[11px] text-white/70 mt-0.5">{t("more.map.desc")}</p>
          </Link>
          <Link
            to="/tickets"
            className="col-span-2 bg-gradient-to-br from-tuscan-300 to-burnt-400 rounded-2xl p-4 shadow-elevated hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Ticket size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">Boletas</p>
                <p className="text-[11px] text-white/80 mt-0.5">Sigue eventos y recibe aviso cuando salgan las boletas</p>
              </div>
              <ChevronRight size={16} className="text-white/70 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SECTIONS.map((section) => {
            const SIcon = section.icon;
            return (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className="bg-white rounded-2xl p-4 shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all text-left group border border-warm-200/30"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                      <SIcon size={20} className="text-white" />
                    </div>
                    <ChevronRight size={14} className="text-warm-300 group-hover:text-sandy-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <p className="font-semibold text-charcoal-600 text-sm leading-tight">{section.label}</p>
                    <p className="text-[11px] text-charcoal-300 mt-0.5 leading-snug">{section.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Export PDF */}
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className="w-full flex items-center gap-3 bg-gradient-to-r from-burnt-50 to-sandy-50 rounded-2xl p-4 shadow-soft hover:shadow-elevated transition-all border border-burnt-100/40 group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-burnt-400 to-tuscan-400 flex items-center justify-center">
            {exporting ? (
              <Loader2 size={20} className="text-white animate-spin" />
            ) : (
              <FileDown size={20} className="text-white" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-charcoal-600 text-sm">
              {exporting ? t("more.exporting") : t("more.export")}
            </p>
            <p className="text-[11px] text-charcoal-300">{t("more.export.desc")}</p>
          </div>
          <ChevronRight size={14} className="text-warm-300 group-hover:text-burnt-300 group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Settings link */}
        <Link
          to="/settings"
          className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-soft hover:shadow-elevated transition-all border border-warm-200/30 group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-charcoal-300 to-charcoal-400 flex items-center justify-center">
            <Settings size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-charcoal-600 text-sm">{t("nav.settings")}</p>
            <p className="text-[11px] text-charcoal-300">{t("settings.appearance")}</p>
          </div>
          <ChevronRight size={14} className="text-warm-300 group-hover:text-sandy-400 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </motion.div>
    );
  }

  const sectionData = SECTIONS.find((s) => s.key === activeSection)!;
  const SectionIcon = sectionData.icon;
  const SectionComponent = SECTION_COMPONENTS[activeSection];

  // ─── Section View ───
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 pb-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveSection(null)}
          className="p-2 -ml-1 rounded-xl hover:bg-warm-100 transition-colors text-charcoal-400"
        >
          <ArrowLeft size={20} />
        </button>
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${sectionData.color} flex items-center justify-center`}>
          <SectionIcon size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-display font-bold text-charcoal-500">{sectionData.label}</h1>
          <p className="text-xs text-charcoal-300">{sectionData.desc}</p>
        </div>
      </div>

      {SectionComponent && <SectionComponent />}
    </motion.div>
  );
}
