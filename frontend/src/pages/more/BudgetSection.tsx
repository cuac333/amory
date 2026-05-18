import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, DollarSign, UtensilsCrossed, Film, Plane,
  Gift, MoreHorizontal, TrendingUp, Wallet, Settings,
  Tag, PiggyBank, ChevronLeft, ChevronRight, Search,
  Receipt, BarChart3, CalendarDays, StickyNote, Coins,
  ArrowDownRight, ArrowUpRight, CircleDollarSign,
} from "lucide-react";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveBar } from "@nivo/bar";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/I18nContext";
import type { DateExpense, BudgetSummary, DeletionRequest } from "../../types";
import CreatorBadge from "../../components/shared/CreatorBadge";
import DeleteButton from "../../components/shared/DeleteButton";

// ─── Default categories ───

const DEFAULT_CATEGORIES = [
  { key: "food", label: "美食", icon: UtensilsCrossed, color: "#c4734d" },
  { key: "entertainment", label: "娱乐", icon: Film, color: "#9b6b8a" },
  { key: "travel", label: "旅行", icon: Plane, color: "#2dd4bf" },
  { key: "gifts", label: "礼物", icon: Gift, color: "#dfc48e" },
  { key: "other", label: "其他", icon: MoreHorizontal, color: "#a0a0a0" },
];

const CUSTOM_COLORS = ["#f0a0ac", "#c084d8", "#f0d050", "#8b4226", "#6bb5e0", "#7dc87d", "#e08050", "#b0b0e0"];

const MONTH_NAME_KEYS = [
  "budget.month.jan", "budget.month.feb", "budget.month.mar", "budget.month.apr",
  "budget.month.may", "budget.month.jun", "budget.month.jul", "budget.month.aug",
  "budget.month.sep", "budget.month.oct", "budget.month.nov", "budget.month.dec",
];

function getCategoryInfo(key: string, customCategories: string[]) {
  const def = DEFAULT_CATEGORIES.find((c) => c.key === key);
  if (def) return { label: def.label, color: def.color, Icon: def.icon };
  const idx = customCategories.indexOf(key);
  return {
    label: key,
    color: CUSTOM_COLORS[idx % CUSTOM_COLORS.length] || "#a0a0a0",
    Icon: Tag,
  };
}

function daysInMonth(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export default function BudgetSection() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const [expenses, setExpenses] = useState<DateExpense[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "charts">("list");
  const [search, setSearch] = useState("");

  function formatMonth(ym: string): string {
    const [y, m] = ym.split("-");
    return `${t(MONTH_NAME_KEYS[parseInt(m) - 1])} ${y}`;
  }

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  // Form state
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "food",
    day: new Date().getDate().toString(),
    note: "",
  });
  const [customCatInput, setCustomCatInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Budget inputs
  const [defaultBudgetInput, setDefaultBudgetInput] = useState("");
  const [monthBudgetInput, setMonthBudgetInput] = useState("");

  const load = useCallback(async () => {
    try {
      const [expRes, sumRes, delRes] = await Promise.all([
        api.get("/budget"),
        api.get("/budget/summary"),
        api.get("/deletion-requests/", { params: { entity_type: "date_expense", status: "pending" } }),
      ]);
      setExpenses(expRes.data);
      setSummary(sumRes.data);
      setDeletionRequests(delRes.data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const goMonth = (dir: -1 | 1) => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const maxDay = daysInMonth(selectedMonth);
  const currentDay = Math.min(parseInt(form.day) || 1, maxDay);
  const isCurrentMonth = selectedMonth === new Date().toISOString().slice(0, 7);

  // Budget for the selected month
  const monthBudgetAmount = summary?.per_month_budgets?.[selectedMonth];
  const hasMonthBudget = monthBudgetAmount !== undefined;
  const selectedMonthBudgetBase = hasMonthBudget ? monthBudgetAmount : (summary?.default_budget ?? 0);

  // Filtered data
  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.expense_date.startsWith(selectedMonth)),
    [expenses, selectedMonth]
  );

  const filteredExpenses = useMemo(() => {
    if (!search.trim()) return monthExpenses;
    const q = search.toLowerCase();
    return monthExpenses.filter((e) =>
      e.title.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      (e.note && e.note.toLowerCase().includes(q))
    );
  }, [monthExpenses, search]);

  const monthTotal = useMemo(
    () => monthExpenses.reduce((s, e) => s + e.amount, 0),
    [monthExpenses]
  );

  const selectedEntry = useMemo(
    () => summary?.monthly_history.find((e) => e.month === selectedMonth) ?? null,
    [summary, selectedMonth]
  );

  const monthByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return map;
  }, [monthExpenses]);

  // Categories
  const allCategories = useMemo(() => {
    const customs = summary?.custom_categories ?? [];
    const base = DEFAULT_CATEGORIES.map((c) => ({
      key: c.key, label: c.label, Icon: c.icon, color: c.color, isCustom: false,
    }));
    const custom = customs.map((key, i) => ({
      key, label: key, Icon: Tag, color: CUSTOM_COLORS[i % CUSTOM_COLORS.length], isCustom: true,
    }));
    return [...base, ...custom];
  }, [summary?.custom_categories]);

  const canCreate = form.title.trim().length > 0 && parseFloat(form.amount) > 0;

  // ─── Actions ───

  const create = async () => {
    if (!canCreate) return;
    const d = String(Math.min(Math.max(parseInt(form.day) || 1, 1), maxDay)).padStart(2, "0");
    await api.post("/budget", {
      title: form.title,
      amount: parseFloat(form.amount),
      category: form.category,
      expense_date: `${selectedMonth}-${d}`,
      note: form.note || null,
    });
    setShowForm(false);
    setForm({ title: "", amount: "", category: "food", day: new Date().getDate().toString(), note: "" });
    load();
  };

  const addCustomCategory = async () => {
    const name = customCatInput.trim().toLowerCase();
    if (!name) return;
    const existing = allCategories.find((c) => c.key === name);
    if (existing) {
      setForm({ ...form, category: name });
      setCustomCatInput("");
      setShowCustomInput(false);
      return;
    }
    const customs = [...(summary?.custom_categories ?? []), name];
    await api.put("/budget/config", { custom_categories: customs });
    setForm({ ...form, category: name });
    setCustomCatInput("");
    setShowCustomInput(false);
    load();
  };

  const deleteCustomCategory = async (key: string) => {
    const customs = (summary?.custom_categories ?? []).filter((c) => c !== key);
    await api.put("/budget/config", { custom_categories: customs });
    load();
  };

  const saveDefaultBudget = async () => {
    const val = parseFloat(defaultBudgetInput);
    if (isNaN(val) || val < 0) return;
    await api.put("/budget/config", { default_budget: val });
    setDefaultBudgetInput("");
    load();
  };

  const saveMonthBudget = async () => {
    const val = parseFloat(monthBudgetInput);
    if (isNaN(val) || val < 0) return;
    await api.put("/budget/month-budget", { month: selectedMonth, amount: val });
    setMonthBudgetInput("");
    load();
  };

  const removeMonthBudget = async () => {
    await api.delete(`/budget/month-budget/${selectedMonth}`);
    load();
  };

  // ─── Chart data ───

  const pieData = useMemo(() => {
    const customs = summary?.custom_categories ?? [];
    return Object.entries(monthByCategory).map(([key, value]) => {
      const info = getCategoryInfo(key, customs);
      return { id: info.label, label: info.label, value, color: info.color };
    });
  }, [monthByCategory, summary?.custom_categories]);

  const monthlyBarData = useMemo(() => {
    if (!summary) return [];
    const history = summary.monthly_history;
    if (history.length > 0) {
      return history.slice(-6).map((entry) => ({
        month: new Date(entry.month + "-01").toLocaleDateString(locale, { month: "short" }),
        [t("budget.spent")]: entry.spent,
        [t("budget.budget")]: entry.budget,
      }));
    }
    if (!expenses.length) return [];
    const byMonth: Record<string, number> = {};
    expenses.forEach((e) => {
      const m = e.expense_date.slice(0, 7);
      byMonth[m] = (byMonth[m] || 0) + e.amount;
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, total]) => ({
        month: new Date(month + "-01").toLocaleDateString(locale, { month: "short" }),
        [t("budget.spent")]: total,
        [t("budget.budget")]: 0,
      }));
  }, [summary, expenses, locale, t]);

  const hasBudget = selectedMonthBudgetBase > 0;
  const effectiveBudget = selectedEntry?.budget ?? selectedMonthBudgetBase;
  const remaining = selectedEntry?.remaining ?? (hasBudget ? effectiveBudget - monthTotal : 0);
  const rollover = selectedEntry?.rollover ?? 0;
  const budgetPct = effectiveBudget > 0
    ? Math.min((monthTotal / effectiveBudget) * 100, 100)
    : 0;

  const expenseCount = monthExpenses.length;
  const avgExpense = expenseCount > 0 ? monthTotal / expenseCount : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-burnt-200 border-t-burnt-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 shadow-sm border border-warm-200/30 dark:border-charcoal-700/50 text-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-burnt-300 to-sandy-300 flex items-center justify-center mx-auto mb-1.5">
            <Receipt size={16} className="text-white" />
          </div>
          <p className="text-lg font-bold text-charcoal-700 dark:text-warm-100">{expenseCount}</p>
          <p className="text-[10px] text-charcoal-300 dark:text-warm-400">{t("budget.stat.expenses")}</p>
        </div>
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 shadow-sm border border-warm-200/30 dark:border-charcoal-700/50 text-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-verdigris-400 to-verdigris-500 flex items-center justify-center mx-auto mb-1.5">
            <Coins size={16} className="text-white" />
          </div>
          <p className="text-lg font-bold text-charcoal-700 dark:text-warm-100">¥{monthTotal.toLocaleString()}</p>
          <p className="text-[10px] text-charcoal-300 dark:text-warm-400">{t("budget.stat.total")}</p>
        </div>
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 shadow-sm border border-warm-200/30 dark:border-charcoal-700/50 text-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-tuscan-300 to-tuscan-400 flex items-center justify-center mx-auto mb-1.5">
            <CircleDollarSign size={16} className="text-white" />
          </div>
          <p className="text-lg font-bold text-charcoal-700 dark:text-warm-100">¥{avgExpense > 0 ? Math.round(avgExpense).toLocaleString() : "0"}</p>
          <p className="text-[10px] text-charcoal-300 dark:text-warm-400">{t("budget.stat.avg")}</p>
        </div>
      </div>

      {/* ── Month Selector ── */}
      <div className="flex items-center justify-between bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/30 dark:border-charcoal-700/50 px-2 py-2.5 shadow-sm">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => goMonth(-1)}
          className="p-2 rounded-xl hover:bg-warm-100 dark:hover:bg-charcoal-700 text-charcoal-400 dark:text-warm-300 transition-colors"
        >
          <ChevronLeft size={18} />
        </motion.button>
        <div className="text-center">
          <p className="text-sm font-bold text-charcoal-700 dark:text-warm-100">{formatMonth(selectedMonth)}</p>
          {!isCurrentMonth && (
            <button
              onClick={() => setSelectedMonth(new Date().toISOString().slice(0, 7))}
              className="text-[10px] text-burnt-400 hover:text-burnt-500 font-medium mt-0.5"
            >
              {t("budget.go.current")}
            </button>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => goMonth(1)}
          className="p-2 rounded-xl hover:bg-warm-100 dark:hover:bg-charcoal-700 text-charcoal-400 dark:text-warm-300 transition-colors"
        >
          <ChevronRight size={18} />
        </motion.button>
      </div>

      {/* ── Summary Card ── */}
      <motion.div
        key={selectedMonth}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-charcoal-700 to-charcoal-800 dark:from-charcoal-800 dark:to-charcoal-900 rounded-2xl p-5 text-white shadow-lg overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-10 -translate-x-10" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Wallet size={16} className="text-sandy-300" />
              </div>
              <span className="text-xs text-warm-300 font-medium">{formatMonth(selectedMonth)}</span>
            </div>
            <div className="flex items-center gap-2">
              {hasBudget && (
                <span className="text-[9px] px-2.5 py-1 rounded-full bg-white/10 text-warm-300 font-medium">
                  {hasMonthBudget ? t("budget.budget") : t("budget.default")}
                </span>
              )}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg transition-colors ${showSettings ? "bg-white/20 text-white" : "bg-white/10 text-warm-300 hover:bg-white/15"}`}
              >
                <Settings size={14} />
              </motion.button>
            </div>
          </div>

          {hasBudget ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-warm-400 uppercase tracking-wider mb-0.5">{t("budget.budget")}</p>
                  <p className="text-xl font-bold text-white">
                    ¥{effectiveBudget.toLocaleString()}
                  </p>
                  {rollover > 0 && (
                    <p className="text-[9px] text-emerald-300/80 flex items-center gap-0.5 mt-0.5">
                      <ArrowUpRight size={9} />
                      +¥{rollover.toLocaleString()} {t("budget.accumulated")}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-warm-400 uppercase tracking-wider mb-0.5">{t("budget.spent")}</p>
                  <p className="text-xl font-bold text-sandy-200 flex items-center gap-1">
                    <ArrowDownRight size={14} className="text-sandy-300/60" />
                    ¥{monthTotal.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-warm-400 uppercase tracking-wider mb-0.5">{t("budget.remaining")}</p>
                  <p className={`text-xl font-bold ${remaining >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    ¥{Math.abs(remaining).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="w-full h-2.5 bg-charcoal-600/60 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${budgetPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      budgetPct >= 90 ? "bg-gradient-to-r from-red-400 to-red-300" : budgetPct >= 70 ? "bg-gradient-to-r from-yellow-400 to-amber-300" : "bg-gradient-to-r from-emerald-400 to-green-300"
                    }`}
                  />
                </div>
                <div className="flex justify-between">
                  <p className="text-[10px] text-warm-400">
                    {t("budget.base")} ¥{selectedMonthBudgetBase.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-warm-400 font-medium">{budgetPct.toFixed(0)}% {t("budget.used.pct")}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-warm-400 uppercase tracking-wider mb-0.5">{t("budget.spent")}</p>
                <p className="text-2xl font-bold text-sandy-200">
                  ¥{monthTotal.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-warm-400 uppercase tracking-wider mb-0.5">{t("budget.total.historic")}</p>
                <p className="text-2xl font-bold text-white">
                  ¥{(summary?.total ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {hasBudget && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-warm-400">{t("budget.total.historic")}</span>
                <span className="text-sm font-bold text-warm-300">¥{(summary?.total ?? 0).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Settings Panel ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0, overflow: "hidden" }}
            animate={{ opacity: 1, height: "auto", overflow: "visible" }}
            exit={{ opacity: 0, height: 0, overflow: "hidden" }}
          >
            <div className="bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/30 dark:border-charcoal-700/50 shadow-sm overflow-hidden">
              {/* Settings header bar */}
              <div className="bg-gradient-to-r from-charcoal-100 to-warm-100 dark:from-charcoal-700 dark:to-charcoal-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-burnt-300 to-sandy-300 flex items-center justify-center">
                    <Settings size={13} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold text-charcoal-700 dark:text-warm-100">{t("budget.config")}</span>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-1 text-charcoal-300 dark:text-warm-400 hover:text-charcoal-500">
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Default budget */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-charcoal-600 dark:text-warm-200">
                    {t("budget.default")}
                  </label>
                  <p className="text-[10px] text-charcoal-300 dark:text-warm-400">{t("budget.default.hint")}</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
                      <input
                        type="number"
                        value={defaultBudgetInput}
                        onChange={(e) => setDefaultBudgetInput(e.target.value)}
                        placeholder={summary?.default_budget ? String(summary.default_budget) : "0"}
                        min="0"
                        step="1000"
                        className="w-full pl-8 pr-3 py-2.5 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:border-burnt-200 dark:focus:border-burnt-400 text-charcoal-700 dark:text-warm-100 placeholder:text-warm-400"
                      />
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={saveDefaultBudget}
                      disabled={!defaultBudgetInput.trim()}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-burnt-300 to-burnt-400 text-white text-sm font-medium disabled:opacity-40 shadow-sm"
                    >
                      {t("save")}
                    </motion.button>
                  </div>
                  {summary?.default_budget ? (
                    <p className="text-[10px] text-charcoal-300 dark:text-warm-400">{t("budget.current")} ¥{summary.default_budget.toLocaleString()}</p>
                  ) : null}
                </div>

                {/* Per-month budget */}
                <div className="space-y-2 pt-3 border-t border-warm-100 dark:border-charcoal-700">
                  <label className="text-xs font-semibold text-charcoal-600 dark:text-warm-200">
                    {t("budget.for.month")} {formatMonth(selectedMonth)}
                  </label>
                  {hasMonthBudget ? (
                    <div className="flex items-center gap-2 bg-verdigris-50 dark:bg-verdigris-900/20 rounded-xl px-3 py-2">
                      <span className="text-sm font-bold text-charcoal-600 dark:text-warm-200 flex-1">
                        ¥{monthBudgetAmount.toLocaleString()}
                      </span>
                      <button
                        onClick={removeMonthBudget}
                        className="text-[10px] text-red-400 hover:text-red-500 font-medium px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        {t("budget.use.default")}
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-charcoal-300 dark:text-warm-400">
                      {t("budget.using.default")} ¥{(summary?.default_budget ?? 0).toLocaleString()}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
                      <input
                        type="number"
                        value={monthBudgetInput}
                        onChange={(e) => setMonthBudgetInput(e.target.value)}
                        placeholder={t("budget.month.amount.placeholder")}
                        min="0"
                        step="1000"
                        className="w-full pl-8 pr-3 py-2.5 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:border-verdigris-300 dark:focus:border-verdigris-400 text-charcoal-700 dark:text-warm-100 placeholder:text-warm-400"
                      />
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={saveMonthBudget}
                      disabled={!monthBudgetInput.trim()}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-verdigris-400 to-verdigris-500 text-white text-sm font-medium disabled:opacity-40 shadow-sm"
                    >
                      {t("budget.set")}
                    </motion.button>
                  </div>
                </div>

                {/* Custom categories */}
                <div className="space-y-2 pt-3 border-t border-warm-100 dark:border-charcoal-700">
                  <label className="text-xs font-semibold text-charcoal-600 dark:text-warm-200">{t("budget.custom.cats")}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(summary?.custom_categories ?? []).map((cat, i) => (
                      <div
                        key={cat}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-warm-50 dark:bg-charcoal-700 text-charcoal-500 dark:text-warm-200 border border-warm-200/50 dark:border-charcoal-600"
                      >
                        <div className="w-3 h-3 rounded-full" style={{ background: CUSTOM_COLORS[i % CUSTOM_COLORS.length] }} />
                        {cat}
                        <button onClick={() => deleteCustomCategory(cat)} className="ml-0.5 text-warm-400 hover:text-red-400 transition-colors">
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
                      <input
                        value={customCatInput}
                        onChange={(e) => setCustomCatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addCustomCategory()}
                        placeholder={t("budget.new.cat")}
                        className="w-full pl-8 pr-3 py-2 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:border-burnt-200 dark:focus:border-burnt-400 text-charcoal-700 dark:text-warm-100 placeholder:text-warm-400"
                      />
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={addCustomCategory}
                      disabled={!customCatInput.trim()}
                      className="px-3 py-2 rounded-xl bg-warm-100 dark:bg-charcoal-700 text-charcoal-500 dark:text-warm-300 hover:bg-warm-200 dark:hover:bg-charcoal-600 transition-colors disabled:opacity-40"
                    >
                      <Plus size={14} />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-warm-50 dark:bg-charcoal-800 rounded-xl p-1 border border-warm-200/30 dark:border-charcoal-700/50">
        {(["list", "charts"] as const).map((tab) => {
          const TabIcon = tab === "list" ? Receipt : BarChart3;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab
                  ? "bg-white dark:bg-charcoal-700 text-charcoal-700 dark:text-warm-100 shadow-sm"
                  : "text-charcoal-400 dark:text-warm-400 hover:text-charcoal-500"
              }`}
            >
              <TabIcon size={13} />
              {tab === "list" ? t("budget.tab.expenses") : t("budget.tab.charts")}
            </button>
          );
        })}
      </div>

      {/* ── Charts Tab ── */}
      {activeTab === "charts" && (
        <div className="space-y-4">
          {pieData.length > 0 && (
            <div className="bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/30 dark:border-charcoal-700/50 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-tuscan-50 to-warm-50 dark:from-charcoal-700 dark:to-charcoal-700 px-4 py-3 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-tuscan-300 to-tuscan-400 flex items-center justify-center">
                  <TrendingUp size={13} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-charcoal-600 dark:text-warm-100">
                  {t("budget.categories")} — {formatMonth(selectedMonth)}
                </span>
              </div>
              <div className="p-4" style={{ height: 230 }}>
                <ResponsivePie
                  data={pieData}
                  margin={{ top: 10, right: 80, bottom: 10, left: 80 }}
                  innerRadius={0.55}
                  padAngle={2}
                  cornerRadius={6}
                  activeOuterRadiusOffset={6}
                  colors={{ datum: "data.color" }}
                  borderWidth={0}
                  arcLinkLabelsSkipAngle={15}
                  arcLinkLabelsTextColor="#888"
                  arcLinkLabelsThickness={1.5}
                  arcLinkLabelsColor={{ from: "color" }}
                  arcLabelsSkipAngle={20}
                  arcLabelsTextColor="#fff"
                  valueFormat={(v) => `¥${v.toLocaleString()}`}
                  enableArcLinkLabels={pieData.length <= 6}
                  enableArcLabels={false}
                  legends={pieData.length > 6 ? [{
                    anchor: "right",
                    direction: "column",
                    translateX: 70,
                    itemWidth: 60,
                    itemHeight: 16,
                    symbolSize: 8,
                    symbolShape: "circle",
                    itemTextColor: "#888",
                  }] : []}
                />
              </div>
            </div>
          )}

          {monthlyBarData.length > 0 && (
            <div className="bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/30 dark:border-charcoal-700/50 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-verdigris-50 to-warm-50 dark:from-charcoal-700 dark:to-charcoal-700 px-4 py-3 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-verdigris-400 to-verdigris-500 flex items-center justify-center">
                  <BarChart3 size={13} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-charcoal-600 dark:text-warm-100">
                  {t("budget.monthly.behavior")}
                </span>
              </div>
              <div className="p-4" style={{ height: 230 }}>
                <ResponsiveBar
                  data={monthlyBarData}
                  keys={summary && (summary.default_budget > 0 || Object.keys(summary.per_month_budgets).length > 0) ? [t("budget.budget"), t("budget.spent")] : [t("budget.spent")]}
                  indexBy="month"
                  groupMode="grouped"
                  margin={{ top: 10, right: 10, bottom: 30, left: 50 }}
                  padding={0.3}
                  colors={summary && (summary.default_budget > 0 || Object.keys(summary.per_month_budgets).length > 0) ? ["#2dd4bf", "#c4734d"] : ["#c4734d"]}
                  borderRadius={6}
                  axisBottom={{ tickSize: 0, tickPadding: 8 }}
                  axisLeft={{
                    tickSize: 0,
                    tickPadding: 8,
                    format: (v) => {
                      const n = Number(v);
                      return n >= 1000000 ? `¥${(n / 1000000).toFixed(1)}M` : `¥${(n / 1000).toFixed(0)}k`;
                    },
                  }}
                  enableGridY={false}
                  enableLabel={false}
                  valueFormat={(v) => `¥${Number(v).toLocaleString()}`}
                  theme={{ axis: { ticks: { text: { fontSize: 10, fill: "#999" } } } }}
                  legends={summary && (summary.default_budget > 0 || Object.keys(summary.per_month_budgets).length > 0) ? [{
                    dataFrom: "keys",
                    anchor: "top-right",
                    direction: "row",
                    translateY: -8,
                    itemWidth: 90,
                    itemHeight: 14,
                    symbolSize: 8,
                    symbolShape: "circle",
                    itemTextColor: "#888",
                  }] : []}
                />
              </div>
            </div>
          )}

          {pieData.length === 0 && monthlyBarData.length === 0 && (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-warm-100 to-warm-200 dark:from-charcoal-700 dark:to-charcoal-600 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="text-warm-400" size={24} />
              </div>
              <p className="text-sm text-charcoal-400 dark:text-warm-400">{t("budget.no.expenses")} {formatMonth(selectedMonth)}</p>
            </div>
          )}
        </div>
      )}

      {/* ── List Tab ── */}
      {activeTab === "list" && (
        <>
          {/* Add button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(!showForm)}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-burnt-300 to-sandy-300 text-white text-sm font-semibold shadow-md shadow-burnt-200/30 flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            {t("budget.new.expense")}
          </motion.button>

          {/* ── Form ── */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0, overflow: "hidden" }}
                animate={{ opacity: 1, height: "auto", overflow: "visible" }}
                exit={{ opacity: 0, height: 0, overflow: "hidden" }}
              >
                <div className="bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/30 dark:border-charcoal-700/50 shadow-sm overflow-hidden">
                  {/* Form header bar */}
                  <div className="bg-gradient-to-r from-burnt-50 to-sandy-50 dark:from-charcoal-700 dark:to-charcoal-700 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-burnt-300 to-sandy-300 flex items-center justify-center">
                        <DollarSign size={13} className="text-white" />
                      </div>
                      <span className="text-sm font-semibold text-charcoal-700 dark:text-warm-100">
                        {t("budget.new.expense")} — {formatMonth(selectedMonth)}
                      </span>
                    </div>
                    <button onClick={() => setShowForm(false)} className="p-1 text-charcoal-300 dark:text-warm-400 hover:text-charcoal-500">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Title */}
                    <div className="relative">
                      <Receipt size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
                      <input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder={t("budget.expense.title")}
                        className="w-full pl-9 pr-3 py-2.5 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:border-burnt-200 dark:focus:border-burnt-400 text-charcoal-700 dark:text-warm-100 placeholder:text-warm-400"
                      />
                    </div>

                    {/* Amount + Day */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
                        <input
                          type="number"
                          value={form.amount}
                          onChange={(e) => setForm({ ...form, amount: e.target.value })}
                          placeholder={t("budget.amount")}
                          min="0"
                          step="100"
                          className="w-full pl-9 pr-3 py-2.5 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:border-burnt-200 dark:focus:border-burnt-400 text-charcoal-700 dark:text-warm-100 placeholder:text-warm-400"
                        />
                      </div>
                      <div className="relative w-28">
                        <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 pointer-events-none" />
                        <select
                          value={currentDay}
                          onChange={(e) => setForm({ ...form, day: e.target.value })}
                          className="w-full pl-9 pr-2 py-2.5 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:border-burnt-200 dark:focus:border-burnt-400 text-charcoal-700 dark:text-warm-100 text-center appearance-none"
                        >
                          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>{t("budget.day")} {d}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Category selector */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-charcoal-500 dark:text-warm-300">{t("budget.categories")}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {allCategories.map((cat) => {
                          const Icon = cat.Icon;
                          const isActive = form.category === cat.key && !showCustomInput;
                          return (
                            <motion.button
                              key={cat.key}
                              whileTap={{ scale: 0.93 }}
                              onClick={() => { setForm({ ...form, category: cat.key }); setShowCustomInput(false); }}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                                isActive
                                  ? "text-white shadow-sm"
                                  : "bg-warm-50 dark:bg-charcoal-700 text-charcoal-400 dark:text-warm-400 hover:bg-warm-100 dark:hover:bg-charcoal-600"
                              }`}
                              style={isActive ? { background: cat.color } : undefined}
                            >
                              <Icon size={12} />
                              {cat.label}
                            </motion.button>
                          );
                        })}
                        <motion.button
                          whileTap={{ scale: 0.93 }}
                          onClick={() => setShowCustomInput(!showCustomInput)}
                          className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all border border-dashed ${
                            showCustomInput
                              ? "bg-burnt-100 dark:bg-burnt-900/20 text-burnt-600 dark:text-burnt-300 border-burnt-300"
                              : "bg-warm-50 dark:bg-charcoal-700 text-charcoal-400 dark:text-warm-400 border-warm-300 dark:border-charcoal-600 hover:bg-warm-100 dark:hover:bg-charcoal-600"
                          }`}
                        >
                          <Plus size={11} /> {t("new")}
                        </motion.button>
                      </div>
                    </div>

                    {/* Custom category input */}
                    <AnimatePresence>
                      {showCustomInput && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
                              <input
                                value={customCatInput}
                                onChange={(e) => setCustomCatInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addCustomCategory()}
                                placeholder={t("budget.new.cat.name")}
                                className="w-full pl-9 pr-3 py-2 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:border-burnt-200 dark:focus:border-burnt-400 text-charcoal-700 dark:text-warm-100 placeholder:text-warm-400"
                                autoFocus
                              />
                            </div>
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={addCustomCategory}
                              disabled={!customCatInput.trim()}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-burnt-300 to-burnt-400 text-white text-xs font-medium disabled:opacity-40 shadow-sm"
                            >
                              {t("create")}
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Note */}
                    <div className="relative">
                      <StickyNote size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
                      <input
                        value={form.note}
                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                        placeholder={t("budget.note")}
                        className="w-full pl-9 pr-3 py-2.5 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:border-burnt-200 dark:focus:border-burnt-400 text-charcoal-700 dark:text-warm-100 placeholder:text-warm-400"
                      />
                    </div>

                    {/* Submit */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={create}
                      disabled={!canCreate}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-burnt-300 to-sandy-300 text-white text-sm font-semibold disabled:opacity-40 shadow-md shadow-burnt-200/20"
                    >
                      {t("budget.add.expense")}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Search ── */}
          {monthExpenses.length > 3 && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("budget.search.placeholder")}
                className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-charcoal-800 border border-warm-200/30 dark:border-charcoal-700/50 rounded-xl text-sm outline-none focus:border-burnt-200 dark:focus:border-burnt-400 text-charcoal-700 dark:text-warm-100 placeholder:text-warm-400"
              />
            </div>
          )}

          {/* ── Expense list ── */}
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-warm-100 to-warm-200 dark:from-charcoal-700 dark:to-charcoal-600 flex items-center justify-center mx-auto mb-3">
                <PiggyBank className="text-warm-400" size={24} />
              </div>
              <p className="text-sm font-medium text-charcoal-400 dark:text-warm-400">
                {t("budget.no.expenses")} {formatMonth(selectedMonth)}
              </p>
              <p className="text-xs text-charcoal-300 dark:text-warm-500 mt-1">{t("budget.empty.hint")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExpenses.map((exp, i) => {
                const info = getCategoryInfo(exp.category, summary?.custom_categories ?? []);
                const Icon = info.Icon;
                const delReq = deletionRequests.find(
                  (r) => r.entity_type === "date_expense" && r.entity_id === exp.id
                );
                return (
                  <motion.div
                    key={exp.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/30 dark:border-charcoal-700/50 shadow-sm overflow-hidden"
                  >
                    {/* Category color strip */}
                    <div className="h-1 w-full" style={{ background: `linear-gradient(to right, ${info.color}, ${info.color}80)` }} />

                    <div className="p-3.5 flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: info.color + "18", color: info.color }}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-charcoal-600 dark:text-warm-100 truncate">{exp.title}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-charcoal-300 dark:text-warm-400">
                            {new Date(exp.expense_date + "T12:00:00").toLocaleDateString(locale, {
                              day: "numeric",
                              month: "short",
                            })}
                            {exp.note ? ` — ${exp.note}` : ""}
                          </p>
                          <CreatorBadge userId={exp.added_by} date={exp.created_at} />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-charcoal-700 dark:text-warm-100 shrink-0">
                        ¥{exp.amount.toLocaleString()}
                      </span>
                      <DeleteButton
                        entityType="date_expense"
                        entityId={exp.id}
                        pendingRequest={delReq}
                        currentUserId={user?.id ?? 0}
                        onAction={load}
                        size="sm"
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
