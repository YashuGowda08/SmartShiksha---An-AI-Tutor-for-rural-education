"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useLanguage } from "@/contexts/LanguageContext";
import { progressAPI } from "@/lib/api";
import {
  BookOpen, Trophy, Clock, Target, Brain, ChevronRight,
  TrendingUp, BarChart3
} from "lucide-react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b"];

interface DashboardData {
  topics_completed: number;
  total_topics: number;
  tests_taken: number;
  average_score: number;
  total_study_time_hours: number;
  subject_progress: Record<string, { completed: number; total: number; percentage: number }>;
  recent_scores: Array<{ test_id: string; score: number; percentage: number; date: string }>;
  recommended_topics: Array<{ topic_id: string; name: string; score: number }>;
}

export default function DashboardPage() {
  const { getToken } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken();
        if (token) {
          const res = await progressAPI.getDashboard(token);
          setData(res.data);
        }
      } catch (err) {
        console.error(err);
        // Use demo data if API not available
        setData({
          topics_completed: 24,
          total_topics: 120,
          tests_taken: 8,
          average_score: 72.5,
          total_study_time_hours: 45.2,
          subject_progress: {
            "Mathematics": { completed: 8, total: 30, percentage: 26.7 },
            "Science": { completed: 6, total: 25, percentage: 24 },
            "English": { completed: 5, total: 20, percentage: 25 },
            "Social Science": { completed: 3, total: 25, percentage: 12 },
            "Computer Science": { completed: 2, total: 20, percentage: 10 },
          },
          recent_scores: [
            { test_id: "1", score: 78, percentage: 78, date: "2026-03-10" },
            { test_id: "2", score: 65, percentage: 65, date: "2026-03-08" },
            { test_id: "3", score: 82, percentage: 82, date: "2026-03-05" },
            { test_id: "4", score: 70, percentage: 70, date: "2026-03-03" },
            { test_id: "5", score: 75, percentage: 75, date: "2026-03-01" },
          ],
          recommended_topics: [
            { topic_id: "1", name: "Trigonometric Ratios", score: 45 },
            { topic_id: "2", name: "Chemical Reactions", score: 50 },
            { topic_id: "3", name: "Linear Equations", score: 55 },
          ],
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [getToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">{t("loading")}</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { icon: BookOpen, label: t("topics_completed"), value: `${data?.topics_completed}/${data?.total_topics}`, color: "from-indigo-500 to-purple-500" },
    { icon: Trophy, label: t("tests_taken"), value: data?.tests_taken, color: "from-emerald-500 to-teal-500" },
    { icon: Target, label: t("average_score"), value: `${data?.average_score}%`, color: "from-pink-500 to-rose-500" },
    { icon: Clock, label: t("study_hours"), value: `${data?.total_study_time_hours}h`, color: "from-amber-500 to-orange-500" },
  ];

  const subjectChartData = Object.entries(data?.subject_progress || {}).map(([name, val]) => ({
    name: name.length > 10 ? name.substring(0, 10) + "..." : name,
    completed: val.percentage,
  }));

  const pieData = Object.entries(data?.subject_progress || {}).map(([name, val]) => ({
    name,
    value: val.completed,
  }));

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("dashboard")} 👋</h1>
        <p className="text-slate-500">Track your learning progress and keep going!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Subject Progress Bar Chart */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold">{t("progress")} by Subject</h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={subjectChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="completed" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Pie Chart */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold">{t("performance")}</h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2">
            {pieData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recommended Topics */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{t("recommended")}</h2>
            <Brain className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="space-y-3">
            {(data?.recommended_topics || []).map((topic, i) => (
              <Link
                key={topic.topic_id}
                href={`/topics/${topic.topic_id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 transition group"
              >
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-sm font-bold">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{topic.name}</div>
                  <div className="text-xs text-slate-500">Score: {topic.score}%</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Scores */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Recent Test Scores</h2>
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
          <div className="space-y-3">
            {(data?.recent_scores || []).map((score, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                  score.percentage >= 80 ? "bg-emerald-500" : score.percentage >= 60 ? "bg-amber-500" : "bg-red-500"
                }`}>
                  {score.percentage}%
                </div>
                <div className="flex-1">
                  <div className="font-medium">Test #{i + 1}</div>
                  <div className="text-xs text-slate-500">{score.date}</div>
                </div>
                <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      score.percentage >= 80 ? "bg-emerald-500" : score.percentage >= 60 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${score.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
        {[
          { href: "/subjects", icon: "📚", label: t("subjects") },
          { href: "/ai-tutor", icon: "🤖", label: t("ai_tutor") },
          { href: "/mock-tests", icon: "📝", label: t("mock_tests") },
          { href: "/exam-generator", icon: "📄", label: t("exam_generator") },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="card text-center hover:border-indigo-300 group"
          >
            <span className="text-3xl block mb-2">{action.icon}</span>
            <span className="font-medium text-sm group-hover:text-indigo-600 transition">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
