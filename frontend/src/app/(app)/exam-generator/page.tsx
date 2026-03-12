"use client";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useLanguage } from "@/contexts/LanguageContext";
import { examAPI, contentAPI, authAPI } from "@/lib/api";
import { FileText, Download, Loader2, BookOpen, Sparkles } from "lucide-react";

export default function ExamGeneratorPage() {
  const { getToken, isLoaded } = useAuth();
  const { t } = useLanguage();

  // Use ref to track if URL query params have been applied (avoids race condition with state)
  const queryParamsRef = useRef<{
    subject?: string;
    chapter?: string;
    cls?: string;
    testType?: string;
  } | null>(null);

  // Parse query params ONCE synchronously before any effects run
  if (queryParamsRef.current === null && typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get("subject");
    const chapter = params.get("chapter");
    const cls = params.get("class");
    const testType = params.get("test_type");
    if (subject || chapter || cls || testType) {
      queryParamsRef.current = { subject: subject || undefined, chapter: chapter || undefined, cls: cls || undefined, testType: testType || undefined };
    } else {
      queryParamsRef.current = {};
    }
  }

  const qp = queryParamsRef.current || {};

  const [formData, setFormData] = useState({
    student_class: qp.cls || "10",
    subject_name: qp.subject || "Mathematics",
    chapter_name: qp.chapter || "",
    topic_name: "",
    difficulty: "Medium",
    question_types: ["MCQ", "Short Answer", "Numerical"],
    num_questions: 20,
    test_type: qp.testType || "Chapter Test",
  });

  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [chaptersList, setChaptersList] = useState<any[]>([]);
  const [topicsList, setTopicsList] = useState<any[]>([]);
  const [fetchingConfig, setFetchingConfig] = useState(false);
  const [board, setBoard] = useState("");
  const [userLoaded, setUserLoaded] = useState(false);

  // Fetch user class and board once
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await getToken();
        if (token) {
          const res = await authAPI.getMe(token);
          if (res.data.student_class && !qp.cls) setFormData(prev => ({ ...prev, student_class: res.data.student_class }));
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
  }, [isLoaded, getToken, qp.cls]);

  // Track if this is the first subjects fetch (to avoid overriding query param subject)
  const isFirstSubjectFetch = useRef(true);

  // Fetch subjects when class or board changes
  useEffect(() => {
    if (!userLoaded) return;
    const fetchSubjects = async () => {
      setFetchingConfig(true);
      try {
        const res = await contentAPI.getSubjects(formData.student_class, board || undefined);
        setSubjectsList(res.data);

        // On first load with query params, don't override the subject
        if (isFirstSubjectFetch.current && qp.subject) {
          isFirstSubjectFetch.current = false;
          // Check if the query param subject exists in the fetched list
          const matchingSubject = res.data.find((s: any) => s.name === qp.subject);
          if (matchingSubject) {
            // Subject found in this class/board — keep it
            setFormData(prev => ({ ...prev, subject_name: qp.subject! }));
          } else if (res.data.length > 0) {
            setFormData(prev => ({ ...prev, subject_name: res.data[0].name }));
          }
        } else {
          isFirstSubjectFetch.current = false;
          if (res.data.length > 0) {
            setFormData(prev => ({ ...prev, subject_name: res.data[0].name, chapter_name: "", topic_name: "" }));
          } else {
            setFormData(prev => ({ ...prev, subject_name: "", chapter_name: "", topic_name: "" }));
            setChaptersList([]);
            setTopicsList([]);
          }
        }
      } catch (err) {
        console.error("Error fetching subjects", err);
      } finally {
        setFetchingConfig(false);
      }
    };
    fetchSubjects();
  }, [formData.student_class, userLoaded, board]);

  // Fetch chapters when subject changes
  useEffect(() => {
    if (!formData.subject_name || !userLoaded) return;
    const fetchChapters = async () => {
      const selectedSubject = subjectsList.find(s => s.name === formData.subject_name);
      if (!selectedSubject) return;

      try {
        const res = await contentAPI.getChapters(selectedSubject.id, formData.student_class, board || undefined);
        setChaptersList(res.data);

        // If we have a query param chapter, try to match it
        if (qp.chapter) {
          const exactMatch = res.data.find((c: any) => c.name === qp.chapter);
          const fuzzyMatch = res.data.find((c: any) => c.name.toLowerCase().includes(qp.chapter!.toLowerCase()));
          if (exactMatch) {
            setFormData(prev => ({ ...prev, chapter_name: exactMatch.name, topic_name: "" }));
          } else if (fuzzyMatch) {
            setFormData(prev => ({ ...prev, chapter_name: fuzzyMatch.name, topic_name: "" }));
          } else {
            // No match found — keep the raw chapter name for AI context
            setFormData(prev => ({ ...prev, topic_name: "" }));
          }
          // Clear the query param so subsequent subject changes don't re-apply it
          qp.chapter = undefined;
        } else {
          setFormData(prev => ({ ...prev, chapter_name: "", topic_name: "" }));
        }
        setTopicsList([]);
      } catch (err) {
        console.error("Error fetching chapters", err);
      }
    };
    fetchChapters();
  }, [formData.subject_name, subjectsList, formData.student_class]);

  // Fetch topics when chapter changes
  useEffect(() => {
    if (!formData.chapter_name) return;
    const fetchTopics = async () => {
      const selectedChapter = chaptersList.find(c => c.name === formData.chapter_name);
      if (!selectedChapter) return;

      try {
        const res = await contentAPI.getTopics(selectedChapter.id);
        setTopicsList(res.data);
        setFormData(prev => ({ ...prev, topic_name: "" }));
      } catch (err) {
        console.error("Error fetching topics", err);
      }
    };
    fetchTopics();
  }, [formData.chapter_name, chaptersList]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        alert("Please sign in to generate papers.");
        setLoading(false);
        return;
      }

      const res = await examAPI.generatePaper({
        ...formData,
        language: t("language_name") || "English"
      }, token);

      // Download PDF
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `SmartShiksha_${formData.test_type}_${formData.subject_name}_Paper.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setGenerated(true);
    } catch (error: any) {
      console.error("Paper generation error:", error);
      // If response is blob (from responseType: blob), try to extract error message
      if (error?.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          alert(`Error: ${json.detail || "Generation failed. Please try again."}`);
        } catch {
          alert("Error generating paper. Please try again later.");
        }
      } else {
        alert(`Error: ${error?.response?.data?.detail || "Error generating paper. Please try again later."}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestionType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      question_types: prev.question_types.includes(type)
        ? prev.question_types.filter((t) => t !== type)
        : [...prev.question_types, type],
    }));
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{t("exam_generator")}</h1>
          <p className="text-slate-500">Generate custom exam papers with AI</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              Syllabus Selection
            </h3>

            <div className="space-y-6">
              {/* Class & Board */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-3 text-slate-700">Select Class</label>
                  <div className="flex gap-2 flex-wrap">
                    {["8", "9", "10", "11", "12"].map((cls) => (
                      <button
                        key={cls}
                        onClick={() => setFormData({ ...formData, student_class: cls })}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition ${
                          formData.student_class === cls
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                            : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                        }`}
                      >
                        Class {cls}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-3 text-slate-700">Select Board</label>
                  <select
                    value={board}
                    onChange={(e) => setBoard(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition"
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

              {/* Subject */}
              <div>
                <label className="block text-sm font-semibold mb-3 text-slate-700">Subject</label>
                {fetchingConfig ? (
                  <div className="h-10 bg-slate-100 animate-pulse rounded-xl" />
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {subjectsList.map((subj) => (
                      <button
                        key={subj.id}
                        onClick={() => setFormData({ ...formData, subject_name: subj.name })}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition ${
                          formData.subject_name === subj.name
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                            : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                        }`}
                      >
                        {subj.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Chapter & Topic */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">Chapter</label>
                  <select
                    value={formData.chapter_name}
                    onChange={(e) => setFormData({ ...formData, chapter_name: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-indigo-400 bg-white"
                  >
                    <option value="">All Chapters (General)</option>
                    {chaptersList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700">Topic</label>
                  <select
                    value={formData.topic_name}
                    onChange={(e) => setFormData({ ...formData, topic_name: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-indigo-400 bg-white"
                    disabled={!formData.chapter_name}
                  >
                    <option value="">All Topics</option>
                    {topicsList.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Show the JEE/NEET chapter context if set from query params */}
              {formData.chapter_name && !chaptersList.find(c => c.name === formData.chapter_name) && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                  <p className="text-sm text-indigo-700">
                    📚 <strong>Chapter context:</strong> {formData.chapter_name} — AI will generate questions on this topic even without database selection.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              Paper Configuration
            </h3>

            <div className="space-y-6">
              {/* Difficulty */}
              <div>
                <label className="block text-sm font-semibold mb-3 text-slate-700">Difficulty Level</label>
                <div className="flex gap-3">
                  {[
                    { value: "Easy", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                    { value: "Medium", color: "bg-amber-50 text-amber-700 border-amber-200" },
                    { value: "Hard", color: "bg-red-50 text-red-700 border-red-200" },
                  ].map((diff) => (
                    <button
                      key={diff.value}
                      onClick={() => setFormData({ ...formData, difficulty: diff.value })}
                      className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold border-2 transition ${
                        formData.difficulty === diff.value ? diff.color : "border-slate-50 bg-slate-50 text-slate-400 opacity-60"
                      }`}
                    >
                      {t(diff.value.toLowerCase())}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exam Pattern */}
              <div>
                <label className="block text-sm font-semibold mb-3 text-slate-700">Exam Pattern</label>
                <div className="flex gap-2 flex-wrap">
                  {["Chapter Test", "Mock Test", "JEE", "NEET"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFormData({ ...formData, test_type: type })}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                        formData.test_type === type
                          ? type === "JEE" ? "border-amber-500 bg-amber-50 text-amber-700"
                            : type === "NEET" ? "border-pink-500 bg-pink-50 text-pink-700"
                            : "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Types */}
              <div>
                <label className="block text-sm font-semibold mb-3 text-slate-700">Question Types</label>
                <div className="flex gap-2 flex-wrap">
                  {["MCQ", "Short Answer", "Numerical"].map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleQuestionType(type)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition ${
                        formData.question_types.includes(type)
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Questions */}
              <div>
                <div className="flex justify-between mb-3">
                  <label className="text-sm font-semibold text-slate-700">Number of Questions</label>
                  <span className="text-indigo-600 font-bold">{formData.num_questions}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={formData.num_questions}
                  onChange={(e) => setFormData({ ...formData, num_questions: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card sticky top-24">
            <h3 className="font-bold mb-4">Summary</h3>
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">Class</span>
                <span className="font-medium">{formData.student_class}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">Subject</span>
                <span className="font-medium">{formData.subject_name || "Not selected"}</span>
              </div>
              {formData.chapter_name && (
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500">Chapter</span>
                  <span className="font-medium text-xs">{formData.chapter_name}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">Pattern</span>
                <span className={`font-medium ${formData.test_type === "JEE" ? "text-amber-600" : formData.test_type === "NEET" ? "text-pink-600" : "text-purple-600"}`}>{formData.test_type}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">Difficulty</span>
                <span className="font-medium text-indigo-600">{formData.difficulty}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">Questions</span>
                <span className="font-medium">{formData.num_questions}</span>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !formData.subject_name}
              className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition ${
                loading || !formData.subject_name
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 hover:scale-[1.02]"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {generated ? "Regenerate Paper" : t("generate_paper")}
                </>
              )}
            </button>

            <p className="text-[10px] text-slate-400 text-center mt-4">
              AI uses advanced Llama-3 model to craft high-quality questions based on {formData.test_type === "JEE" ? "JEE Main/Advanced" : formData.test_type === "NEET" ? "NEET UG" : "CBSE & State Board"} patterns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
