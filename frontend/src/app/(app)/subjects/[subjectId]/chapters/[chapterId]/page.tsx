"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { contentAPI } from "@/lib/api";
import { ArrowLeft, ChevronRight, BookOpen } from "lucide-react";

interface Topic {
  id: string;
  name: string;
  explanation: string;
  examples: string;
  order_index: number;
}

export default function ChapterTopicsPage() {
  const params = useParams();
  const chapterId = params.chapterId as string;
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await contentAPI.getTopics(chapterId);
        setTopics(res.data);
      } catch {
        setTopics([
          { id: "t1", name: "Trigonometric Ratios", explanation: "sin, cos, tan of angles", examples: "sin 30° = 1/2", order_index: 0 },
          { id: "t2", name: "Trigonometric Ratios of Specific Angles", explanation: "Standard values for 0°, 30°, 45°, 60°, 90°", examples: "cos 45° = 1/√2", order_index: 1 },
          { id: "t3", name: "Trigonometric Identities", explanation: "sin²θ + cos²θ = 1", examples: "Prove: (1+tan²θ)cos²θ = 1", order_index: 2 },
          { id: "t4", name: "Heights and Distances", explanation: "Applications of trigonometry", examples: "Finding height of tower", order_index: 3 },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, [chapterId]);

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/subjects" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-6 transition">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Topics</h1>
        <p className="text-slate-500">Select a topic to learn</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {topics.map((topic, i) => (
            <Link
              key={topic.id}
              href={`/topics/${topic.id}`}
              className="card flex items-center gap-4 group hover:border-indigo-300"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold group-hover:text-indigo-600 transition">{topic.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-1">{topic.explanation}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
