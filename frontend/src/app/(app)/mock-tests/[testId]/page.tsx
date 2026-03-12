"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { mockTestAPI } from "@/lib/api";
import { Clock, AlertTriangle, Check, X, ChevronLeft, ChevronRight, Flag } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
  marks: number;
}

export default function TakeTestPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [testDuration, setTestDuration] = useState(60);
  const [warnings, setWarnings] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch test data
  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await mockTestAPI.getTest(params.testId as string);
        setQuestions(res.data.questions || []);
        const duration = res.data.duration_minutes || 60;
        setTestDuration(duration);
        setTimeLeft(duration * 60);
      } catch {
        setQuestions([
          { id: "q1", question_text: "What is the value of sin 30°?", question_type: "MCQ", options: ["1/2", "1/√2", "√3/2", "1"], marks: 1 },
          { id: "q2", question_text: "If tan θ = 3/4, find sin θ.", question_type: "MCQ", options: ["3/5", "4/5", "3/4", "4/3"], marks: 1 },
          { id: "q3", question_text: "Prove that sin²θ + cos²θ = 1", question_type: "Short Answer", options: [], marks: 3 },
          { id: "q4", question_text: "A ladder 10m long reaches a window 8m high. Find the distance of the foot from the wall.", question_type: "Numerical", options: [], marks: 4 },
          { id: "q5", question_text: "What is cos 60°?", question_type: "MCQ", options: ["1/2", "√3/2", "0", "1"], marks: 1 },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [params.testId]);

  // Timer
  useEffect(() => {
    if (submitted || timeLeft <= 0 || loading) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [submitted, timeLeft]);

  // Proctoring: tab switch detection
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !submitted) {
        setWarnings((prev) => {
          const newWarnings = prev + 1;
          if (newWarnings >= 3) {
            handleSubmit(true);
          } else {
            setShowWarning(true);
          }
          return newWarnings;
        });
      }
    };

    // Disable copy-paste
    const handleCopy = (e: Event) => { e.preventDefault(); };

    // Fullscreen detection
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !submitted) {
        setWarnings((prev) => {
          const newWarnings = prev + 1;
          if (newWarnings >= 3) {
            handleSubmit(true);
          } else {
            setShowWarning(true);
          }
          return newWarnings;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handleCopy);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handleCopy);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [submitted]);

  const handleSubmit = async (autoSubmitted = false) => {
    if (submitted) return;
    setSubmitted(true);

    try {
      const token = await getToken();
      if (!token) return;

      const answerList = Object.entries(answers).map(([qid, ans]) => ({
        question_id: qid,
        student_answer: ans,
      }));

      const res = await mockTestAPI.submitTest(
        {
          test_id: params.testId,
          answers: answerList,
          time_taken_seconds: 3600 - timeLeft,
          proctoring_warnings: warnings,
          auto_submitted: autoSubmitted,
        },
        token
      );
      setResult(res.data);
    } catch (err: any) {
      console.error(err);
      alert("Submission failed: " + (err.response?.data?.detail || err.message));
      setSubmitted(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Results screen
  if (submitted && result) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-6 ${
          (result.percentage || 0) >= 60 ? "bg-emerald-100" : "bg-red-100"
        }`}>
          {(result.percentage || 0) >= 60 ? (
            <Check className="w-12 h-12 text-emerald-600" />
          ) : (
            <X className="w-12 h-12 text-red-600" />
          )}
        </div>
        <h1 className="text-3xl font-bold mb-2">Test Completed!</h1>
        <p className="text-slate-500 mb-8">
          {result.auto_submitted ? "Auto-submitted due to proctoring violations" : "Great effort! Here are your results"}
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
          <div className="stat-card">
            <div className="text-3xl font-bold gradient-text">{result.score || 0}</div>
            <div className="text-sm text-slate-500">Score</div>
          </div>
          <div className="stat-card">
            <div className="text-3xl font-bold gradient-text">{Math.round(result.percentage || 0)}%</div>
            <div className="text-sm text-slate-500">Percentage</div>
          </div>
          <div className="stat-card">
            <div className="text-3xl font-bold">{formatTime(result.time_taken_seconds || 0)}</div>
            <div className="text-sm text-slate-500">Time Taken</div>
          </div>
          <div className="stat-card">
            <div className="text-3xl font-bold">{warnings}</div>
            <div className="text-sm text-slate-500">Warnings</div>
          </div>
        </div>

        <button onClick={() => router.push("/mock-tests")} className="btn-primary">
          Back to Tests
        </button>
      </div>
    );
  }

  const question = questions[currentQ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Warning overlay */}
      {showWarning && (
        <div className="proctoring-warning">
          <div className="bg-white p-8 rounded-2xl max-w-md text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Warning!</h2>
            <p className="text-slate-600 mb-4">
              Tab switching or leaving fullscreen detected. Warning {warnings}/3.
              {warnings >= 2 && " Next violation will auto-submit your test!"}
            </p>
            <button onClick={() => setShowWarning(false)} className="btn-primary">
              Return to Test
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 p-4 bg-white rounded-2xl border border-slate-200">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold gradient-text">Question {questions.length > 0 ? currentQ + 1 : 0}</span>
            <span className="text-sm text-slate-400">/ {questions.length} total</span>
          </div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mt-1">
            Duration: {testDuration} min
          </p>
          <div className="w-40 h-2 bg-slate-100 rounded-full mt-2">
            <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${questions.length > 0 ? ((currentQ + 1) / questions.length) * 100 : 0}%` }} />
          </div>
        </div>
        <div className={`flex items-center gap-2 font-mono text-lg font-bold ${timeLeft < 300 ? "text-red-600 animate-pulse" : ""}`}>
          <Clock className="w-5 h-5" />
          {formatTime(timeLeft)}
        </div>
        <button onClick={() => handleSubmit(false)} className="btn-primary text-sm py-2">
          <Flag className="w-4 h-4" /> Submit
        </button>
      </div>

      {/* Question */}
      {question && (
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              question.question_type === "MCQ" ? "bg-indigo-100 text-indigo-700" :
              question.question_type === "Numerical" ? "bg-amber-100 text-amber-700" :
              "bg-emerald-100 text-emerald-700"
            }`}>{question.question_type}</span>
            <span className="text-xs text-slate-500">{question.marks} marks</span>
          </div>
          <p className="text-lg font-medium mb-6">{question.question_text}</p>

          {question.question_type === "MCQ" && question.options?.length > 0 ? (
            <div className="space-y-3">
              {question.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setAnswers({ ...answers, [question.id]: opt })}
                  className={`w-full text-left p-4 rounded-xl border-2 transition ${
                    answers[question.id] === opt
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 hover:border-indigo-200"
                  }`}
                >
                  <span className="font-medium mr-2">({String.fromCharCode(65 + i)})</span>
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              value={answers[question.id] || ""}
              onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
              placeholder="Type your answer here..."
              rows={4}
              className="w-full p-4 border border-slate-200 rounded-xl resize-none focus:outline-none focus:border-indigo-400"
            />
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
          disabled={currentQ === 0}
          className="btn-secondary disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        {/* Question dots */}
        <div className="flex gap-1.5 flex-wrap justify-center max-w-xs">
          {questions.map((q, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                i === currentQ
                  ? "gradient-primary text-white"
                  : answers[q.id]
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCurrentQ(Math.min(questions.length - 1, currentQ + 1))}
          disabled={currentQ === questions.length - 1}
          className="btn-secondary disabled:opacity-50"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
