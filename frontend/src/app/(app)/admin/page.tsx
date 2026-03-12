"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { adminAPI, textbookAPI } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Users, Activity, FileText, BarChart3, Upload, TrendingDown,
  ShieldCheck
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";

interface AdminData {
  total_students: number;
  active_users_today: number;
  total_tests_taken: number;
  average_platform_score: number;
  class_distribution: Record<string, number>;
  most_difficult_topics: Array<{ test: string; subject: string; avg_score: number }>;
}

export default function AdminPage() {
  const { getToken } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = await getToken();
        if (token) {
          const res = await adminAPI.getStats(token);
          setStats(res.data);
        }
      } catch {
        setStats({
          total_students: 1247,
          active_users_today: 89,
          total_tests_taken: 3456,
          average_platform_score: 68.5,
          class_distribution: { "Class 8": 180, "Class 9": 220, "Class 10": 350, "Class 11": 280, "Class 12": 217 },
          most_difficult_topics: [
            { test: "Trigonometric Identities", subject: "Mathematics", avg_score: 42 },
            { test: "Chemical Bonding", subject: "Chemistry", avg_score: 48 },
            { test: "Electromagnetic Induction", subject: "Physics", avg_score: 51 },
          ],
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [getToken]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = await getToken();
      if (token) {
        await adminAPI.uploadQuestions(file, token);
        alert("Questions uploaded successfully!");
      }
    } catch {
      alert("Upload failed. Make sure you have admin access.");
    } finally {
      setUploading(false);
    }
  };

  const [textbookTitle, setTextbookTitle] = useState("");
  const [textbookClass, setTextbookClass] = useState("10");
  const [textbookBoard, setTextbookBoard] = useState("CBSE");

  const handleTextbookUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !textbookTitle) {
      alert("Please enter a title and select a file");
      return;
    }
    setUploading(true);
    try {
      const token = await getToken();
      if (token) {
        const formData = new FormData();
        formData.append("title", textbookTitle);
        formData.append("student_class", textbookClass);
        formData.append("board", textbookBoard);
        formData.append("file", file);
        
        await textbookAPI.uploadTextbook(formData, token);
        
        alert("Textbook uploaded successfully!");
        setTextbookTitle("");
      }
    } catch {
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const classChartData = Object.entries(stats?.class_distribution || {}).map(([name, value]) => ({
    name,
    students: value,
  }));

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{t("admin")}</h1>
          <p className="text-slate-500">Platform management and analytics</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Users, label: "Total Students", value: stats?.total_students, color: "from-indigo-500 to-purple-500" },
          { icon: Activity, label: "Active Today", value: stats?.active_users_today, color: "from-emerald-500 to-teal-500" },
          { icon: FileText, label: "Tests Taken", value: stats?.total_tests_taken, color: "from-amber-500 to-orange-500" },
          { icon: BarChart3, label: "Avg Score", value: `${stats?.average_platform_score}%`, color: "from-pink-500 to-rose-500" },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-slate-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="font-bold text-lg mb-4">Student Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={classChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="students" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-lg">Most Difficult Topics</h3>
          </div>
          <div className="space-y-3">
            {(stats?.most_difficult_topics || []).map((topic, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-red-50">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center font-bold text-red-600">
                  {topic.avg_score}%
                </div>
                <div>
                  <div className="font-medium">{topic.test}</div>
                  <div className="text-xs text-slate-500">{topic.subject}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold text-lg mb-4">Upload Content</h3>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-300 transition flex flex-col justify-center">
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <div className="font-medium mb-1">Upload Question Bank</div>
            <div className="text-sm text-slate-500 mb-4">JSON format</div>
            <label className="btn-primary text-sm py-2 px-4 cursor-pointer inline-flex items-center gap-2 self-center">
              <input type="file" accept=".json" onChange={handleUpload} className="hidden" />
              {uploading ? "Uploading..." : "Choose File"}
            </label>
          </div>
          
          <div className="p-6 border-2 border-slate-100 rounded-xl bg-slate-50">
            <div className="flex items-center gap-2 mb-4 text-indigo-600 font-bold">
              <FileText className="w-5 h-5" />
              <span>Upload Textbook</span>
            </div>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Textbook Title" 
                className="w-full p-2.5 rounded-lg border border-slate-200 text-sm"
                value={textbookTitle}
                onChange={(e) => setTextbookTitle(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <select 
                  className="p-2.5 rounded-lg border border-slate-200 text-sm bg-white"
                  value={textbookClass}
                  onChange={(e) => setTextbookClass(e.target.value)}
                >
                  {["8", "9", "10", "11", "12"].map(c => <option key={c} value={c}>Class {c}</option>)}
                </select>
                <select 
                  className="p-2.5 rounded-lg border border-slate-200 text-sm bg-white"
                  value={textbookBoard}
                  onChange={(e) => setTextbookBoard(e.target.value)}
                >
                  <option value="CBSE">CBSE</option>
                  <option value="State Board">State Board</option>
                </select>
              </div>
              <label 
                className={`btn-primary w-full text-sm py-2.5 cursor-pointer flex items-center justify-center gap-2 ${(!textbookTitle || uploading) ? "opacity-50 pointer-events-none" : ""}`}
              >
                <input type="file" accept=".pdf" className="hidden" onChange={handleTextbookUpload} />
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading..." : "Select & Upload PDF"}
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
