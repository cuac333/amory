import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SpotifyProvider } from "./context/SpotifyContext";
import { ThemeProvider } from "./context/ThemeContext";
import { I18nProvider, useTranslation } from "./context/I18nContext";
import Layout from "./components/shared/Layout";
import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";
import ResetPasswordForm from "./components/auth/ResetPasswordForm";
import HomePage from "./pages/HomePage";
import BookPage from "./pages/BookPage";
import MonthlyPage from "./pages/MonthlyPage";
import OutingsPage from "./pages/OutingsPage";
import WishlistPage from "./pages/WishlistPage";
import DiaryPage from "./pages/DiaryPage";
import QuizPage from "./pages/QuizPage";
import MinigamesPage from "./pages/MinigamesPage";
import MorePage from "./pages/MorePage";
import SettingsPage from "./pages/SettingsPage";
import OnboardingPage from "./pages/OnboardingPage";
import ChatPage from "./pages/ChatPage";
import MemoryMapPage from "./pages/MemoryMapPage";
import TicketsPage from "./pages/TicketsPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-warm-50 dark:bg-charcoal-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-burnt-200 border-t-burnt-300 rounded-full animate-spin" />
          <span className="text-sm text-charcoal-400">{t("loading")}</span>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  // If no couple, redirect to onboarding (unless already there)
  if (!user.couple_id && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route path="/reset-password" element={<ResetPasswordForm />} />
      <Route path="/onboarding" element={<PrivateRoute><OnboardingPage /></PrivateRoute>} />
      <Route path="/" element={<PrivateRoute><Layout><HomePage /></Layout></PrivateRoute>} />
      <Route path="/book" element={<PrivateRoute><Layout><BookPage /></Layout></PrivateRoute>} />
      <Route path="/monthly" element={<PrivateRoute><Layout><MonthlyPage /></Layout></PrivateRoute>} />
      <Route path="/outings" element={<PrivateRoute><Layout><OutingsPage /></Layout></PrivateRoute>} />
      <Route path="/wishlist" element={<PrivateRoute><Layout><WishlistPage /></Layout></PrivateRoute>} />
      <Route path="/diary" element={<PrivateRoute><Layout><DiaryPage /></Layout></PrivateRoute>} />
      <Route path="/quiz" element={<PrivateRoute><Layout><QuizPage /></Layout></PrivateRoute>} />
      <Route path="/minigames" element={<PrivateRoute><Layout><MinigamesPage /></Layout></PrivateRoute>} />
      <Route path="/chat" element={<PrivateRoute><Layout><ChatPage /></Layout></PrivateRoute>} />
      <Route path="/map" element={<PrivateRoute><Layout><MemoryMapPage /></Layout></PrivateRoute>} />
      <Route path="/tickets" element={<PrivateRoute><Layout><TicketsPage /></Layout></PrivateRoute>} />
      <Route path="/more" element={<PrivateRoute><Layout><MorePage /></Layout></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Layout><SettingsPage /></Layout></PrivateRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <BrowserRouter>
          <AuthProvider>
            <SpotifyProvider>
              <AppRoutes />
            </SpotifyProvider>
          </AuthProvider>
        </BrowserRouter>
      </I18nProvider>
    </ThemeProvider>
  );
}
