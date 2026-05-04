import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "../../context/I18nContext";
import {
  Clock, CalendarHeart, MapPin, Heart, PenLine,
  Home, Settings, LogOut, Gamepad2, MoreHorizontal,
  Sun, Moon,
} from "lucide-react";
import Avatar from "./Avatar";

const NAV_ITEMS = [
  { path: "/", labelKey: "nav.home", icon: Home },
  { path: "/book", labelKey: "nav.book", icon: Clock },
  { path: "/monthly", labelKey: "nav.monthly", icon: CalendarHeart },
  { path: "/outings", labelKey: "nav.outings", icon: MapPin },
  { path: "/wishlist", labelKey: "nav.wishlist", icon: Heart },
  { path: "/diary", labelKey: "nav.diary", icon: PenLine },
  { path: "/minigames", labelKey: "nav.games", icon: Gamepad2 },
  { path: "/more", labelKey: "nav.more", icon: MoreHorizontal },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const location = useLocation();
  const navItems = NAV_ITEMS.map((item) => ({ ...item, label: t(item.labelKey) }));

  return (
    <>
      {/* Desktop navbar */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 glass border-b border-warm-200/60 z-50 px-8 py-3 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-burnt-300 to-sandy-300 flex items-center justify-center">
            <Heart size={16} className="text-white fill-white" />
          </div>
          <span className="text-lg font-display font-semibold text-burnt-500">Amory</span>
        </Link>

        <div className="flex items-center gap-0.5 bg-warm-100/60 dark:bg-charcoal-700/60 rounded-xl p-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  active ? "text-burnt-300" : "text-charcoal-400 hover:text-sandy-300"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="desktop-nav-indicator"
                    className="absolute inset-0 bg-white dark:bg-charcoal-600 rounded-lg shadow-soft"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-warm-400 hover:text-burnt-300 hover:bg-warm-100 dark:hover:bg-charcoal-700 transition-colors"
            title={isDark ? t("settings.light.mode") : t("settings.dark.mode")}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link to="/settings" className="flex items-center gap-2">
            <Avatar src={user?.avatar_url} name={user?.name || ""} size="sm" />
            <span className="text-sm text-charcoal-400 font-medium">{user?.name}</span>
          </Link>
          <Link
            to="/settings"
            className="p-2 rounded-lg text-warm-400 hover:text-sandy-300 hover:bg-warm-100 dark:hover:bg-charcoal-700 transition-colors"
          >
            <Settings size={18} />
          </Link>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-warm-400 hover:text-burnt-300 hover:bg-burnt-50 transition-colors"
            title={t("auth.logout")}
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-warm-200/60 z-50">
        <div className="flex justify-around py-1 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center gap-0 px-1.5 py-1 rounded-lg transition-colors duration-200 min-w-0 ${
                  active ? "text-burnt-400" : "text-warm-400"
                }`}
              >
                <div className="relative p-1 rounded-md">
                  {active && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className="absolute inset-0 bg-burnt-50 dark:bg-burnt-800/30 rounded-md"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.5} className="relative z-10" />
                </div>
                <span className="text-[9px] font-medium leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
