"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useLanguage } from "@/contexts/LanguageContext";
import { contentAPI, progressAPI } from "@/lib/api";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, Lightbulb, HelpCircle, Brain,
  CheckCircle, ChevronRight
} from "lucide-react";

interface TopicData {
  id: string;
  name: string;
  explanation: string;
  examples: string;
}

export default function TopicDetailPage() {
  const params = useParams();
  const { getToken } = useAuth();
  const { t, language } = useLanguage();
  const [topic, setTopic] = useState<TopicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState<"explanation" | "examples" | "practice">("explanation");

  useEffect(() => {
    const fetchTopic = async () => {
      try {
        const res = await contentAPI.getTopic(params.topicId as string, language);
        setTopic(res.data);
      } catch {
        setTopic({
          id: params.topicId as string,
          name: "Trigonometric Ratios",
          explanation: `## Trigonometric Ratios

Trigonometric ratios are the ratios of the sides of a right-angled triangle with respect to one of its acute angles.

### The Three Basic Ratios

For a right triangle with angle θ:

- **sin θ** = Opposite side / Hypotenuse
- **cos θ** = Adjacent side / Hypotenuse  
- **tan θ** = Opposite side / Adjacent side

### Reciprocal Ratios

- **cosec θ** = 1/sin θ = Hypotenuse / Opposite
- **sec θ** = 1/cos θ = Hypotenuse / Adjacent
- **cot θ** = 1/tan θ = Adjacent / Opposite

### Important Relationship

tan θ = sin θ / cos θ

### 💡 Memory Trick

**"Some People Have Curly Brown Hair Through Proper Brushing"**
- **S**in = **P**erpendicular / **H**ypotenuse
- **C**os = **B**ase / **H**ypotenuse
- **T**an = **P**erpendicular / **B**ase`,
          examples: `### Example 1
In a right triangle, if the opposite side is 3 and hypotenuse is 5, find sin θ.

**Solution:** sin θ = 3/5 = 0.6

### Example 2
If cos θ = 4/5, find sin θ and tan θ.

**Solution:**
- sin²θ + cos²θ = 1
- sin²θ = 1 - (4/5)² = 1 - 16/25 = 9/25
- sin θ = 3/5
- tan θ = sin θ/cos θ = (3/5)/(4/5) = 3/4

### Example 3
A ladder 10m long reaches a window 8m above the ground. Find the distance of the foot from the wall.

**Solution:**
- Using Pythagoras: distance² + 8² = 10²
- distance² = 100 - 64 = 36
- distance = 6m`,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchTopic();
  }, [params.topicId]);

  const handleMarkComplete = async () => {
    try {
      const token = await getToken();
      if (token) {
        await progressAPI.updateProgress(
          { topic_id: params.topicId as string, completed: true, time_spent_seconds: 300 },
          token
        );
      }
      setCompleted(true);
    } catch {
      setCompleted(true);
    }
  };

  if (loading || !topic) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/subjects" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-6 transition">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">{topic.name}</h1>
          <p className="text-slate-500">Class 10 • Mathematics • Trigonometry</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/ai-tutor?topic=${topic.id}&name=${topic.name}`} className="btn-primary text-sm">
            <Brain className="w-4 h-4" /> {t("ask_tutor")}
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6">
        {[
          { key: "explanation" as const, icon: BookOpen, label: t("explanation") },
          { key: "examples" as const, icon: Lightbulb, label: t("examples") },
          { key: "practice" as const, icon: HelpCircle, label: t("practice") },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="card">
        {activeTab === "explanation" && (
          <div className="prose prose-slate max-w-none">
            {topic.explanation.split("\n").map((line, i) => {
              if (line.startsWith("###")) return <h3 key={i} className="text-lg font-bold mt-6 mb-2 text-indigo-700">{line.replace(/###\s?/, "")}</h3>;
              if (line.startsWith("##")) return <h2 key={i} className="text-xl font-bold mt-6 mb-3 gradient-text">{line.replace(/##\s?/, "")}</h2>;
              if (line.startsWith("- **")) {
                const parts = line.replace("- ", "").split("**");
                return (
                  <div key={i} className="flex items-start gap-2 my-2 ml-4">
                    <ChevronRight className="w-4 h-4 text-indigo-500 mt-1 shrink-0" />
                    <span><strong>{parts[1]}</strong>{parts[2]}</span>
                  </div>
                );
              }
              if (line.trim() === "") return <br key={i} />;
              return <p key={i} className="my-2 leading-relaxed">{line}</p>;
            })}
          </div>
        )}
        {activeTab === "examples" && (
          <div className="prose prose-slate max-w-none">
            {topic.examples.split("\n").map((line, i) => {
              if (line.startsWith("###")) return <h3 key={i} className="text-lg font-bold mt-6 mb-2 text-emerald-700">{line.replace(/###\s?/, "")}</h3>;
              if (line.startsWith("**Solution")) return <p key={i} className="font-semibold text-indigo-700 mt-3">{line.replace(/\*\*/g, "")}</p>;
              if (line.startsWith("- ")) return <li key={i} className="ml-6 my-1">{line.replace("- ", "")}</li>;
              if (line.trim() === "") return <br key={i} />;
              return <p key={i} className="my-1">{line}</p>;
            })}
          </div>
        )}
        {activeTab === "practice" && (
          <div className="text-center py-12">
            <HelpCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Practice Questions</h3>
            <p className="text-slate-500 mb-6">Generate practice questions for this topic</p>
            <div className="flex gap-3 justify-center">
              <Link href={`/exam-generator?topic=${topic.name}`} className="btn-primary">
                Generate Questions
              </Link>
              <Link href={`/ai-tutor?topic=${topic.id}`} className="btn-secondary">
                Ask AI Tutor
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Mark Complete */}
      {!completed ? (
        <button onClick={handleMarkComplete} className="btn-primary w-full mt-6 py-4 text-lg">
          <CheckCircle className="w-5 h-5" /> Mark as Completed
        </button>
      ) : (
        <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-emerald-700 font-medium">
          <CheckCircle className="w-5 h-5 inline mr-2" /> Topic completed! Keep going 🎉
        </div>
      )}
    </div>
  );
}
