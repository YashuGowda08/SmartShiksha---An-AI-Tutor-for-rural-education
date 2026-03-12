"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useClerk, UserButton } from "@clerk/nextjs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { authAPI } from "@/lib/api";
import {
  LayoutDashboard, BookOpen, Brain, FileText, Monitor,
  Award, BookMarked, Settings, GraduationCap, Globe,
  Menu, X, ChevronDown, Sun, Moon, LogOut, UserCircle, MessageSquare, Database
} from "lucide-react";
import OfflineStatus from "@/components/OfflineStatus";
import { Language } from "@/lib/i18n";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/subjects", icon: BookOpen, key: "subjects" },
  { href: "/ai-tutor", icon: Brain, key: "ai_tutor" },
  { href: "/mock-tests", icon: Monitor, key: "mock_tests" },
  { href: "/exam-generator", icon: FileText, key: "exam_generator" },
  { href: "/jee-neet", icon: Award, key: "jee_neet" },
  { href: "/textbooks", icon: BookMarked, key: "textbooks" },
  { href: "/admin", icon: Settings, key: "admin" },
  { href: "/community", icon: MessageSquare, key: "community" },
  { href: "/offline", icon: Database, key: "offline" },
];

const languageOptions: Language[] = ["English", "Hindi", "Kannada", "Telugu", "Tamil"];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { getToken, isLoaded, userId } = useAuth();
  const { signOut } = useClerk();

  useEffect(() => {
    async function initUser() {
      if (isLoaded && userId) {
        try {
          const token = await getToken();
          if (token) {
            await authAPI.register(token);
            const user = await authAPI.getMe(token);
            if (!user.data.onboarding_complete && pathname !== "/onboarding") {
              // onboarding redirect could go here
            }
          }
        } catch (e) {
          console.error("User init error", e);
        }
      }
    }
    initUser();
  }, [isLoaded, userId, getToken, pathname]);

  return (
    <div className="min-h-screen bg-[rgb(var(--bg-main))]">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 w-full z-50 glass border-b border-slate-200/50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-slate-100">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-indigo-600" />
          <span className="font-bold gradient-text">Smart Shiksha</span>
        </div>
        <UserButton />
      </div>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 bg-[rgb(var(--bg-card))] border-r border-[rgb(var(--border))] z-40 transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className="p-6 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">Smart Shiksha</span>
          </div>

          {/* Nav links */}
          <nav className="space-y-1 flex-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
              >
                <item.icon className="w-5 h-5" />
                <span>{t(item.key)}</span>
              </Link>
            ))}
          </nav>

          {/* Bottom section */}
          <div className="border-t border-[rgb(var(--border))] pt-3 space-y-1">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="sidebar-link w-full"
            >
              {theme === "dark" ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </button>

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="sidebar-link w-full"
              >
                <Globe className="w-5 h-5 text-indigo-500" />
                <span>{language}</span>
                <ChevronDown className="w-4 h-4 ml-auto" />
              </button>
              {langOpen && (
                <div className="absolute bottom-full left-0 w-full mb-1 bg-[rgb(var(--bg-card))] border border-[rgb(var(--border))] rounded-xl shadow-lg overflow-hidden z-50">
                  {languageOptions.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => { setLanguage(lang); setLangOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${
                        language === lang ? "text-indigo-600 font-semibold bg-indigo-50 dark:bg-indigo-900/30" : ""
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Profile Link */}
            <Link
              href="/profile"
              onClick={() => setSidebarOpen(false)}
              className={`sidebar-link ${pathname === "/profile" ? "active" : ""}`}
            >
              <UserCircle className="w-5 h-5" />
              <span>{t("profile")}</span>
            </Link>

            {/* Logout */}
            <button
              onClick={() => signOut({ redirectUrl: "/" })}
              className="sidebar-link w-full text-red-500 hover:!text-red-600 hover:!bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
        <OfflineStatus />
      </main>
    </div>
  );
}
