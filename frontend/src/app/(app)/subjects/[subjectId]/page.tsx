"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { contentAPI } from "@/lib/api";
import { BookOpen, ChevronRight, ArrowLeft } from "lucide-react";

interface Chapter {
  id: string;
  name: string;
  description: string;
  order_index: number;
}

export default function SubjectDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const subjectId = params.subjectId as string;
  const studentClass = searchParams.get("class") || "10";
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const res = await contentAPI.getChapters(subjectId, studentClass);
        setChapters(res.data);
      } catch {
        // Demo data
        setChapters([
          { id: "c1", name: "Real Numbers", description: "Euclid's Division, Irrational Numbers", order_index: 0 },
          { id: "c2", name: "Polynomials", description: "Zeros, Division Algorithm", order_index: 1 },
          { id: "c3", name: "Pair of Linear Equations", description: "Graphical, Substitution, Elimination", order_index: 2 },
          { id: "c4", name: "Quadratic Equations", description: "Factorisation, Quadratic Formula", order_index: 3 },
          { id: "c5", name: "Trigonometry", description: "Ratios, Identities, Heights & Distances", order_index: 4 },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchChapters();
  }, [subjectId, studentClass]);

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/subjects" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-6 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Subjects
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Chapters</h1>
        <p className="text-slate-500">Class {studentClass} • Select a chapter to view topics</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {chapters.map((chapter, i) => (
            <Link
              key={chapter.id}
              href={`/subjects/${subjectId}/chapters/${chapter.id}`}
              className="card flex items-center gap-4 group hover:border-indigo-300"
            >
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white font-bold shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg group-hover:text-indigo-600 transition">{chapter.name}</h3>
                <p className="text-sm text-slate-500">{chapter.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
