"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { textbookAPI } from "@/lib/api";
import { BookMarked, Download, FileText, Search } from "lucide-react";

interface Textbook {
  id: string;
  title: string;
  class: string;
  board: string;
  file_url: string;
  file_size_mb: number;
  created_at: string;
}

export default function TextbooksPage() {
  const { t } = useLanguage();
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("all");

  useEffect(() => {
    const fetchTextbooks = async () => {
      try {
        const params = selectedClass !== "all" ? { student_class: selectedClass } : undefined;
        const res = await textbookAPI.listTextbooks(params);
        setTextbooks(res.data);
      } catch {
        setTextbooks([
          { id: "tb1", title: "NCERT Mathematics Class 10", class: "10", board: "CBSE", file_url: "#", file_size_mb: 12.5, created_at: "2026-01-15" },
          { id: "tb2", title: "NCERT Science Class 10", class: "10", board: "CBSE", file_url: "#", file_size_mb: 15.2, created_at: "2026-01-15" },
          { id: "tb3", title: "NCERT Physics Class 11", class: "11", board: "CBSE", file_url: "#", file_size_mb: 18.7, created_at: "2026-01-10" },
          { id: "tb4", title: "NCERT Chemistry Class 11", class: "11", board: "CBSE", file_url: "#", file_size_mb: 14.3, created_at: "2026-01-10" },
          { id: "tb5", title: "NCERT Biology Class 12", class: "12", board: "CBSE", file_url: "#", file_size_mb: 20.1, created_at: "2026-01-05" },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchTextbooks();
  }, [selectedClass]);

  const filtered = selectedClass === "all" ? textbooks : textbooks.filter((tb) => tb.class === selectedClass);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <BookMarked className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{t("textbooks")}</h1>
          <p className="text-slate-500">Read textbooks and get AI explanations</p>
        </div>
      </div>

      {/* Class filter */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {["all", "8", "9", "10", "11", "12"].map((cls) => (
          <button
            key={cls}
            onClick={() => { setSelectedClass(cls); setLoading(true); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
              selectedClass === cls
                ? "gradient-primary text-white"
                : "bg-white border border-slate-200 hover:border-indigo-300"
            }`}
          >
            {cls === "all" ? "All Classes" : `Class ${cls}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((tb) => {
            const fileUrl = tb.file_url.startsWith("http") 
              ? tb.file_url 
              : `${process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:8000"}${tb.file_url}`;

            return (
              <div key={tb.id} className="card hover:border-amber-300">
                <div className="w-full h-36 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center mb-4">
                  <FileText className="w-16 h-16 text-amber-400" />
                </div>
                <h3 className="font-bold text-lg mb-1 line-clamp-2">{tb.title}</h3>
                <div className="flex items-center gap-3 text-sm text-slate-500 mb-4">
                  <span>Class {tb.class}</span>
                  <span>•</span>
                  <span>{tb.board}</span>
                  <span>•</span>
                  <span>{tb.file_size_mb} MB</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => window.open(fileUrl, "_blank")}
                    className="btn-primary flex-1 text-sm py-2.5"
                  >
                    <BookMarked className="w-4 h-4" /> Read
                  </button>
                  <a 
                    href={fileUrl} 
                    className="btn-secondary text-sm py-2.5" 
                    download 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Explain Feature Promo */}
      <div className="mt-12 card border-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white p-8 rounded-3xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <Search className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1">AI Textbook Assistant</h3>
            <p className="text-amber-100">
              Highlight any paragraph while reading and our AI will explain it in simple language!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
