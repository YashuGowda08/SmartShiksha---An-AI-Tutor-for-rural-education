"use client";
import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { authAPI } from "@/lib/api";
import {
  User, Mail, GraduationCap, BookOpen, Shield,
  Calendar, Edit3, Save, X, Sun, Moon, Globe, LogOut, Award
} from "lucide-react";

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { t, language } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [profileData, setProfileData] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    student_class: "",
    board: "",
    language: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!isLoaded || !user) return;
      try {
        const token = await getToken();
        if (token) {
          const res = await authAPI.getMe(token);
          setProfileData(res.data);
          setEditForm({
            student_class: res.data.student_class || "",
            board: res.data.board || "Karnataka PU Board",
            language: res.data.language || "English",
          });
        }
      } catch (e) {
        console.error("Profile load error", e);
      }
    }
    loadProfile();
  }, [isLoaded, user, getToken]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      if (token) {
        await authAPI.updateProfile(editForm, token);
        setProfileData({ ...profileData, ...editForm });
        setEditing(false);
      }
    } catch (e) {
      console.error("Profile update error", e);
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded || !user) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card animate-pulse">
          <div className="h-32 bg-slate-100 rounded-xl mb-4" />
          <div className="h-8 bg-slate-100 rounded-lg w-1/2 mb-2" />
          <div className="h-4 bg-slate-100 rounded-lg w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("profile")}</h1>
        <p className="text-slate-500">Manage your account and preferences</p>
      </div>

      {/* Avatar & Basic Info */}
      <div className="card mb-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-indigo-200">
            {user.firstName?.[0] || user.emailAddresses[0]?.emailAddress[0]?.toUpperCase() || "S"}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{user.fullName || "Student"}</h2>
            <div className="flex items-center gap-2 text-slate-500 mt-1">
              <Mail className="w-4 h-4" />
              <span className="text-sm">{user.emailAddresses[0]?.emailAddress}</span>
            </div>
            {profileData?.role === "admin" && (
              <div className="flex items-center gap-1 mt-2">
                <Shield className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Admin</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Academic Info */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-500" />
            Academic Information
          </h3>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-secondary text-sm !py-2 !px-4">
              <Edit3 className="w-4 h-4" /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm !py-2 !px-4">
                <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditing(false)} className="btn-secondary text-sm !py-2 !px-4">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <span className="text-slate-600">Class</span>
            </div>
            {editing ? (
              <select
                value={editForm.student_class}
                onChange={(e) => setEditForm({ ...editForm, student_class: e.target.value })}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
              >
                {["8", "9", "10", "11", "12"].map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
            ) : (
              <span className="font-semibold">Class {profileData?.student_class || "—"}</span>
            )}
          </div>

          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-emerald-400" />
              <span className="text-slate-600">Board</span>
            </div>
            {editing ? (
              <select
                value={editForm.board}
                onChange={(e) => setEditForm({ ...editForm, board: e.target.value })}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
              >
                {["CBSE", "Karnataka PU Board", "ICSE", "State Board"].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            ) : (
              <span className="font-semibold">{profileData?.board || "—"}</span>
            )}
          </div>

          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-blue-400" />
              <span className="text-slate-600">Preferred Language</span>
            </div>
            {editing ? (
              <select
                value={editForm.language}
                onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
              >
                {["English", "Hindi", "Kannada", "Telugu", "Tamil"].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            ) : (
              <span className="font-semibold">{profileData?.language || "English"}</span>
            )}
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-purple-400" />
              <span className="text-slate-600">Joined</span>
            </div>
            <span className="font-semibold text-sm">
              {profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="card mb-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Sun className="w-5 h-5 text-amber-500" />
          Preferences
        </h3>

        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          <div>
            <p className="font-medium">Theme</p>
            <p className="text-sm text-slate-500">Switch between light and dark mode</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-16 h-8 rounded-full transition-colors duration-300 ${
              theme === "dark" ? "bg-indigo-600" : "bg-slate-200"
            }`}
          >
            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center transition-transform duration-300 ${
              theme === "dark" ? "translate-x-9" : "translate-x-1"
            }`}>
              {theme === "dark" ? <Moon className="w-3.5 h-3.5 text-indigo-600" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
            </div>
          </button>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={() => signOut({ redirectUrl: "/" })}
        className="w-full py-4 rounded-2xl border-2 border-red-200 text-red-600 font-bold hover:bg-red-50 transition flex items-center justify-center gap-2"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>
    </div>
  );
}
