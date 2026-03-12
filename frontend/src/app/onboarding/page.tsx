"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { GraduationCap, BookOpen, Globe, ChevronRight, Check } from "lucide-react";
import { authAPI } from "@/lib/api";

const classes = [
  { value: "8", label: "Class 8", emoji: "📚" },
  { value: "9", label: "Class 9", emoji: "📖" },
  { value: "10", label: "Class 10", emoji: "📝" },
  { value: "11", label: "Class 11", emoji: "🎓" },
  { value: "12", label: "Class 12", emoji: "🏆" },
];

const boards = [
  { value: "CBSE", label: "CBSE", desc: "Central Board of Secondary Education" },
  { value: "State Board", label: "State Board", desc: "State Government Board" },
];

const languages = [
  { value: "English", label: "English", native: "English" },
  { value: "Hindi", label: "Hindi", native: "हिन्दी" },
  { value: "Kannada", label: "Kannada", native: "ಕನ್ನಡ" },
  { value: "Telugu", label: "Telugu", native: "తెలుగు" },
  { value: "Tamil", label: "Tamil", native: "தமிழ்" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedBoard, setSelectedBoard] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { getToken, isLoaded: authLoaded, userId } = useAuth();

  // Check if user is already onboarded
  useEffect(() => {
    async function checkOnboarding() {
      if (authLoaded && userId) {
        try {
          const token = await getToken();
          const user = await authAPI.getMe(token!);
          if (user.data.onboarding_complete) {
            router.push("/dashboard");
          }
        } catch (error) {
          console.error("Error checking onboarding status:", error);
        }
      }
    }
    checkOnboarding();
  }, [authLoaded, userId, getToken, router]);

  const handleComplete = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      // Register user first
      try {
        await authAPI.register(token);
      } catch {
        // User might already be registered
      }

      // Complete onboarding
      await authAPI.onboarding(
        {
          student_class: selectedClass,
          board: selectedBoard,
          language: selectedLanguage,
        },
        token
      );

      router.push("/dashboard");
    } catch (error) {
      console.error("Onboarding error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i <= step ? "w-16 gradient-primary" : "w-8 bg-slate-200"
              }`}
            />
          ))}
        </div>

        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl gradient-primary flex items-center justify-center mb-4">
              {step === 0 && <GraduationCap className="w-8 h-8 text-white" />}
              {step === 1 && <BookOpen className="w-8 h-8 text-white" />}
              {step === 2 && <Globe className="w-8 h-8 text-white" />}
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {step === 0 && "Select Your Class"}
              {step === 1 && "Select Your Board"}
              {step === 2 && "Choose Your Language"}
            </h1>
            <p className="text-slate-500">
              {step === 0 && "Which class are you studying in?"}
              {step === 1 && "Which education board do you follow?"}
              {step === 2 && "Which language do you prefer to learn in?"}
            </p>
          </div>

          {/* Step 0: Class Selection */}
          {step === 0 && (
            <div className="grid grid-cols-1 gap-3">
              {classes.map((cls) => (
                <button
                  key={cls.value}
                  onClick={() => setSelectedClass(cls.value)}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    selectedClass === cls.value
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 hover:border-indigo-200"
                  }`}
                >
                  <span className="text-2xl">{cls.emoji}</span>
                  <span className="font-semibold text-lg">{cls.label}</span>
                  {selectedClass === cls.value && (
                    <Check className="w-5 h-5 text-indigo-600 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step 1: Board Selection */}
          {step === 1 && (
            <div className="grid grid-cols-1 gap-4">
              {boards.map((board) => (
                <button
                  key={board.value}
                  onClick={() => setSelectedBoard(board.value)}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    selectedBoard === board.value
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 hover:border-indigo-200"
                  }`}
                >
                  <div className="font-bold text-xl mb-1">{board.label}</div>
                  <div className="text-slate-500 text-sm">{board.desc}</div>
                  {selectedBoard === board.value && (
                    <Check className="w-5 h-5 text-indigo-600 mt-2" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Language Selection */}
          {step === 2 && (
            <div className="grid grid-cols-1 gap-3">
              {languages.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => setSelectedLanguage(lang.value)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    selectedLanguage === lang.value
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 hover:border-indigo-200"
                  }`}
                >
                  <div>
                    <span className="font-semibold text-lg">{lang.label}</span>
                    <span className="text-slate-400 ml-2">{lang.native}</span>
                  </div>
                  {selectedLanguage === lang.value && (
                    <Check className="w-5 h-5 text-indigo-600" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              className={`btn-secondary ${step === 0 ? "invisible" : ""}`}
            >
              Back
            </button>
            <button
              onClick={() => {
                if (step < 2) setStep(step + 1);
                else handleComplete();
              }}
              className="btn-primary"
              disabled={
                (step === 0 && !selectedClass) ||
                (step === 1 && !selectedBoard) ||
                loading
              }
            >
              {loading ? "Setting up..." : step === 2 ? "Start Learning" : "Continue"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
