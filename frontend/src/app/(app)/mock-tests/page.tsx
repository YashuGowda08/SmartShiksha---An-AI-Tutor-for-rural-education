"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useLanguage } from "@/contexts/LanguageContext";
import { mockTestAPI, contentAPI, authAPI } from "@/lib/api";
import { Monitor, Clock, Trophy, ChevronRight, Play, FileText } from "lucide-react";

interface Test {
  id: string;
  title: string;
  description: string;
  test_type: string;
  student_class: string;
  subject_name: string;
  duration_minutes: number;
  total_marks: number;
  question_count?: number;
}

export default function MockTestsPage() {
  const { getToken, isLoaded } = useAuth();
  const { t } = useLanguage();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedClass, setSelectedClass] = useState("10");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
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
          else setBoard("CBSE"); // Default
        }
      } catch (e) {
        setBoard("CBSE");
        console.error("Failed to load profile", e);
      } finally {
        setUserLoaded(true);
      }
    };
    if (isLoaded) fetchUser();
  }, [isLoaded, getToken]);

  // Fetch subjects for the selected class
  useEffect(() => {
    if (!userLoaded) return;
    const fetchSubjects = async () => {
      try {
        const res = await contentAPI.getSubjects(selectedClass, board || undefined);
        setSubjectsList(res.data);
      } catch (err) {
        console.error("Error fetching subjects", err);
      }
    };
    fetchSubjects();
  }, [selectedClass, userLoaded, board]);

  // Fetch tests based on filters
  useEffect(() => {
    const fetchTests = async () => {
      setLoading(true);
      try {
        const params: any = { student_class: selectedClass };
        if (selectedSubject !== "all") {
          params.subject_name = selectedSubject;
        }
        if (filter !== "all") {
          params.test_type = filter;
        }
        
        const res = await mockTestAPI.listTests(params);
        setTests(res.data);
      } catch {
        // Fallback for demo
        setTests([
          { id: "t1", title: "Mathematics Chapter Test", description: "Trigonometry & Quadratic Equations", test_type: "Chapter Test", student_class: "10", subject_name: "Mathematics", duration_minutes: 45, total_marks: 50, question_count: 25 },
          { id: "t2", title: "Science Full Mock", description: "Complete Class 10 Science", test_type: "Mock Test", student_class: "10", subject_name: "Science", duration_minutes: 90, total_marks: 100, question_count: 50 },
          { id: "t3", title: "Physics Unit Test", description: "Mechanics & Motion", test_type: "Chapter Test", student_class: "11", subject_name: "Physics", duration_minutes: 60, total_marks: 70, question_count: 35 },
          { id: "t4", title: "JEE Mock Test 1", description: "Physics + Chemistry + Math", test_type: "JEE", student_class: "12", subject_name: "All", duration_minutes: 180, total_marks: 300, question_count: 75 },
          { id: "t5", title: "NEET Mock Test 1", description: "Physics + Chemistry + Biology", test_type: "NEET", student_class: "12", subject_name: "All", duration_minutes: 180, total_marks: 720, question_count: 180 },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, [selectedClass, selectedSubject, filter]);

  const typeColors: Record<string, string> = {
    "Mock Test": "bg-indigo-100 text-indigo-700",
    "Chapter Test": "bg-emerald-100 text-emerald-700",
    "JEE": "bg-amber-100 text-amber-700",
    "NEET": "bg-rose-100 text-rose-700",
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("mock_tests")}</h1>
        <p className="text-slate-500">Take timed tests with auto evaluation and analytics</p>
      </div>

      {/* Class & Board Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1 overflow-x-auto pb-2 flex gap-2">
          {["8", "9", "10", "11", "12"].map((cls) => (
            <button
              key={cls}
              onClick={() => { setSelectedClass(cls); setSelectedSubject("all"); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                selectedClass === cls
                  ? "gradient-primary text-white"
                  : "bg-white border border-slate-200 hover:border-indigo-300"
              }`}
            >
              Class {cls}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64 shrink-0">
          <select
            value={board}
            onChange={(e) => { setBoard(e.target.value); setSelectedSubject("all"); }}
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none hover:border-indigo-300 transition"
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

      {/* Subject Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedSubject("all")}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
            selectedSubject === "all"
              ? "bg-indigo-600 text-white"
              : "bg-white border border-slate-200 hover:border-indigo-300"
          }`}
        >
          All Subjects
        </button>
        {subjectsList.map((subj) => (
          <button
            key={subj.id}
            onClick={() => setSelectedSubject(subj.name)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
              selectedSubject === subj.name
                ? "bg-indigo-600 text-white"
                : "bg-white border border-slate-200 hover:border-indigo-300"
            }`}
          >
            {subj.name}
          </button>
        ))}
      </div>

      {/* Type Filters */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {["all", "Mock Test", "Chapter Test", "JEE", "NEET"].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
              filter === type
                ? "gradient-primary text-white"
                : "bg-white border border-slate-200 hover:border-indigo-300"
            }`}
          >
            {type === "all" ? "All Types" : type}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {tests.map((test) => (
            <div key={test.id} className="card hover:border-indigo-300">
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${typeColors[test.test_type] || "bg-slate-100"}`}>
                  {test.test_type}
                </span>
                <span className="text-xs text-slate-500">Class {test.student_class}</span>
              </div>
              <h3 className="font-bold text-lg mb-1">{test.title}</h3>
              <p className="text-sm text-slate-500 mb-4">{test.description}</p>
              <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {test.duration_minutes} min
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" /> {test.question_count || 10} questions
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="w-4 h-4" /> {test.total_marks} marks
                </div>
              </div>
              <Link href={`/mock-tests/${test.id}`} className="btn-primary w-full text-sm py-2.5">
                <Play className="w-4 h-4" /> {t("start_test")}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
