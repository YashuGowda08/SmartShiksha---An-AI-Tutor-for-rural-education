"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@clerk/nextjs";
import { contentAPI, authAPI } from "@/lib/api";
import { BookOpen, ChevronRight, Search } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  classes: string[];
}

export default function SubjectsPage() {
  const { t } = useLanguage();
  const { getToken, isLoaded } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("10");
  const [board, setBoard] = useState("");
  const [userLoaded, setUserLoaded] = useState(false);

  // Fetch user class and board once
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await getToken();
        if (token) {
          const res = await authAPI.getMe(token);
          if (res.data.student_class) setSelectedClass(res.data.student_class);
          if (res.data.board) setBoard(res.data.board);
          else setBoard("CBSE"); // Default if nothing set
        }
      } catch (e) {
        setBoard("CBSE"); // Fallback
        console.error("Failed to load profile", e);
      } finally {
        setUserLoaded(true);
      }
    };
    if (isLoaded) fetchUser();
  }, [isLoaded, getToken]);

  useEffect(() => {
    if (!userLoaded) return; // Wait until we know board and class
    
    const fetchSubjects = async () => {
      setLoading(true);
      try {
        const res = await contentAPI.getSubjects(selectedClass, board || undefined);
        setSubjects(res.data);
      } catch {
        // Demo data
        const demoSubjects: Subject[] = selectedClass <= "10" ? [
          { id: "1", name: "Mathematics", description: "Numbers, algebra, geometry, and more", icon: "📐", color: "#6366f1", classes: ["8","9","10"] },
          { id: "2", name: "Science", description: "Physics, Chemistry, Biology", icon: "🔬", color: "#10b981", classes: ["8","9","10"] },
          { id: "3", name: "Social Science", description: "History, Geography, Civics", icon: "🌍", color: "#f59e0b", classes: ["8","9","10"] },
          { id: "4", name: "English", description: "Grammar, Literature, Writing", icon: "📖", color: "#ef4444", classes: ["8","9","10"] },
          { id: "5", name: "Computer Science", description: "Programming, Algorithms, Data", icon: "💻", color: "#8b5cf6", classes: ["8","9","10"] },
        ] : [
          { id: "6", name: "Physics", description: "Mechanics, Optics, Thermodynamics", icon: "⚡", color: "#3b82f6", classes: ["11","12"] },
          { id: "7", name: "Chemistry", description: "Organic, Inorganic, Physical", icon: "🧪", color: "#22c55e", classes: ["11","12"] },
          { id: "8", name: "Mathematics", description: "Calculus, Algebra, Geometry", icon: "📐", color: "#6366f1", classes: ["11","12"] },
          { id: "9", name: "Biology", description: "Botany, Zoology, Genetics", icon: "🧬", color: "#ec4899", classes: ["11","12"] },
          { id: "10", name: "Computer Science", description: "Python, Data Structures, DBMS", icon: "💻", color: "#8b5cf6", classes: ["11","12"] },
        ];
        setSubjects(demoSubjects);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, [selectedClass, userLoaded, board]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t("subjects")}</h1>
          <p className="text-slate-500">Choose a subject to start learning</p>
        </div>
      </div>

      {/* Filters (Class & Board) */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1 overflow-x-auto pb-2 flex gap-2">
          {["8", "9", "10", "11", "12"].map((cls) => (
            <button
              key={cls}
              onClick={() => { setSelectedClass(cls); setLoading(true); }}
              className={`px-5 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition ${
                selectedClass === cls
                  ? "gradient-primary text-white"
                  : "bg-white border border-slate-200 hover:border-indigo-300"
              }`}
            >
              Class {cls}
            </button>
          ))}
        </div>
        
        {/* Board Selector */}
        <div className="w-full sm:w-64 shrink-0">
          <select
            value={board}
            onChange={(e) => { setBoard(e.target.value); setLoading(true); }}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none hover:border-indigo-300 transition"
          >
            <option value="CBSE">CBSE</option>
            <option value="ICSE">ICSE</option>
            <optgroup label="South Indian Boards">
              <option value="Karnataka Board">Karnataka Board</option>
              <option value="Tamil Nadu Board">Tamil Nadu Board</option>
              <option value="Kerala Board">Kerala Board</option>
              <option value="Andhra Pradesh Board">Andhra Pradesh Board</option>
              <option value="Telangana Board">Telangana Board</option>
            </optgroup>
            <optgroup label="North Indian Boards">
              <option value="UP Board">UP Board</option>
              <option value="Maharashtra Board">Maharashtra Board</option>
              <option value="Bihar Board">Bihar Board</option>
              <option value="Rajasthan Board">Rajasthan Board</option>
            </optgroup>
          </select>
        </div>
      </div>
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {["8", "9", "10", "11", "12"].map((cls) => (
          <button
            key={cls}
            onClick={() => { setSelectedClass(cls); setLoading(true); }}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition ${
              selectedClass === cls
                ? "gradient-primary text-white"
                : "bg-white border border-slate-200 hover:border-indigo-300"
            }`}
          >
            Class {cls}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              href={`/subjects/${subject.id}?class=${selectedClass}`}
              className="card group cursor-pointer hover:border-indigo-300"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: `${subject.color}15` }}
                >
                  {subject.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg mb-1 group-hover:text-indigo-600 transition">
                    {subject.name}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2">{subject.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
