"use client";
import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { Award, BookOpen, Trophy, ArrowRight, Atom, FlaskConical, Calculator, Leaf, Monitor, Clock } from "lucide-react";

// Real JEE syllabus chapters (matching PUC syllabus)
const jeeSubjects = [
  {
    name: "Physics", icon: Atom, color: "from-blue-500 to-cyan-500",
    chapters: [
      "Laws of Motion", "Work, Energy and Power", "Gravitation",
      "Thermodynamics", "Oscillations and Waves",
      "Electric Charges and Fields", "Current Electricity",
      "Electromagnetic Induction", "Ray Optics and Optical Instruments",
      "Wave Optics", "Dual Nature of Radiation and Matter",
      "Atoms and Nuclei", "Semiconductor Electronics",
    ],
  },
  {
    name: "Chemistry", icon: FlaskConical, color: "from-green-500 to-emerald-500",
    chapters: [
      "Some Basic Concepts of Chemistry", "Atomic Structure",
      "Chemical Bonding and Molecular Structure", "States of Matter",
      "Thermodynamics", "Equilibrium", "Electrochemistry",
      "Chemical Kinetics", "The p-Block Elements",
      "Coordination Compounds", "Organic Chemistry – Basic Principles",
      "Hydrocarbons", "Haloalkanes and Haloarenes",
      "Aldehydes, Ketones and Carboxylic Acids",
    ],
  },
  {
    name: "Mathematics", icon: Calculator, color: "from-indigo-500 to-purple-500",
    chapters: [
      "Sets, Relations and Functions", "Complex Numbers",
      "Trigonometric Functions", "Permutations and Combinations",
      "Binomial Theorem", "Sequences and Series",
      "Straight Lines and Conic Sections", "Limits and Derivatives",
      "Continuity and Differentiability", "Applications of Derivatives",
      "Integrals", "Differential Equations",
      "Vectors", "Three Dimensional Geometry",
      "Linear Programming", "Probability",
    ],
  },
];

// Real NEET syllabus chapters
const neetSubjects = [
  {
    name: "Physics", icon: Atom, color: "from-blue-500 to-cyan-500",
    chapters: [
      "Units and Measurements", "Laws of Motion",
      "Work, Energy and Power", "Gravitation",
      "Thermodynamics", "Oscillations and Waves",
      "Electrostatic Potential and Capacitance", "Current Electricity",
      "Moving Charges and Magnetism", "Electromagnetic Induction",
      "Ray Optics", "Dual Nature of Radiation and Matter",
      "Atoms and Nuclei",
    ],
  },
  {
    name: "Chemistry", icon: FlaskConical, color: "from-green-500 to-emerald-500",
    chapters: [
      "Some Basic Concepts of Chemistry", "Structure of Atom",
      "Chemical Bonding", "States of Matter", "Thermodynamics",
      "Equilibrium", "Electrochemistry", "Chemical Kinetics",
      "The s-Block and p-Block Elements", "Coordination Compounds",
      "Organic Chemistry – Basic Principles", "Hydrocarbons",
      "Biomolecules", "Polymers", "Chemistry in Everyday Life",
    ],
  },
  {
    name: "Biology", icon: Leaf, color: "from-pink-500 to-rose-500",
    chapters: [
      "The Living World", "Biological Classification",
      "Plant Kingdom", "Animal Kingdom",
      "Cell: The Unit of Life", "Biomolecules",
      "Cell Cycle and Cell Division",
      "Morphology of Flowering Plants", "Anatomy of Flowering Plants",
      "Photosynthesis in Higher Plants",
      "Human Reproduction", "Reproductive Health",
      "Principles of Inheritance and Variation",
      "Molecular Basis of Inheritance", "Evolution",
      "Human Health and Disease", "Ecosystem",
      "Biodiversity and Conservation",
    ],
  },
];

export default function JeeNeetPage() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"JEE" | "NEET">("JEE");
  const subjects = mode === "JEE" ? jeeSubjects : neetSubjects;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("jee_neet")} Preparation</h1>
        <p className="text-slate-500">Competitive exam preparation for Class 11–12 (Karnataka PU Board / CBSE)</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setMode("JEE")}
          className={`flex-1 p-6 rounded-2xl border-2 text-center transition ${
            mode === "JEE" ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-200"
          }`}
        >
          <div className="text-3xl mb-2">🎯</div>
          <div className="text-xl font-bold">JEE</div>
          <div className="text-sm text-slate-500 mt-1">Physics • Chemistry • Maths</div>
        </button>
        <button
          onClick={() => setMode("NEET")}
          className={`flex-1 p-6 rounded-2xl border-2 text-center transition ${
            mode === "NEET" ? "border-pink-500 bg-pink-50" : "border-slate-200 hover:border-pink-200"
          }`}
        >
          <div className="text-3xl mb-2">🩺</div>
          <div className="text-xl font-bold">NEET</div>
          <div className="text-sm text-slate-500 mt-1">Physics • Chemistry • Biology</div>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Link href={`/mock-tests?test_type=${mode}`} className="card text-center hover:border-indigo-300 group">
          <Trophy className="w-10 h-10 mx-auto text-amber-500 mb-3" />
          <div className="font-bold">Full Mock Test</div>
          <div className="text-sm text-slate-500 mt-1">{mode === "JEE" ? "3-hour JEE pattern" : "3h 20min NEET pattern"}</div>
        </Link>
        <Link href={`/exam-generator?class=12&test_type=${mode}`} className="card text-center hover:border-indigo-300 group">
          <BookOpen className="w-10 h-10 mx-auto text-indigo-500 mb-3" />
          <div className="font-bold">Chapter Test</div>
          <div className="text-sm text-slate-500 mt-1">Practice by chapter</div>
        </Link>
        <Link href="/ai-tutor" className="card text-center hover:border-indigo-300 group">
          <Award className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
          <div className="font-bold">AI Doubt Solver</div>
          <div className="text-sm text-slate-500 mt-1">Ask any doubt</div>
        </Link>
      </div>

      {/* Subjects with chapters */}
      <div className="space-y-6">
        {subjects.map((subject) => (
          <div key={subject.name} className="card">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${subject.color} flex items-center justify-center`}>
                <subject.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{subject.name}</h3>
                <p className="text-sm text-slate-500">{mode} {subject.name} — {subject.chapters.length} chapters</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {subject.chapters.map((chapter) => (
                <Link
                  key={chapter}
                  href={`/exam-generator?subject=${encodeURIComponent(subject.name)}&chapter=${encodeURIComponent(chapter)}&class=12&test_type=${mode}`}
                  className={`flex items-center justify-between p-3 rounded-xl transition group ${
                    mode === "JEE"
                      ? "bg-indigo-50/50 hover:bg-indigo-100"
                      : "bg-pink-50/50 hover:bg-pink-100"
                  }`}
                >
                  <span className="font-medium text-sm">{chapter}</span>
                  <ArrowRight className={`w-4 h-4 transition ${
                    mode === "JEE"
                      ? "text-indigo-300 group-hover:text-indigo-600"
                      : "text-pink-300 group-hover:text-pink-600"
                  }`} />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Professional Practice Exams */}
      <div className="mt-12 mb-8">
        <h2 className="text-2xl font-bold mb-4">Professional Full-Length Mock Exams</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className={`card overflow-hidden border-2 transition hover:shadow-xl ${
            mode === "JEE" ? "border-indigo-100" : "border-slate-100"
          }`}>
            <div className={`h-2 ${mode === "JEE" ? "bg-indigo-500" : "bg-slate-400"}`} />
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-indigo-600" />
                </div>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full">JEE MAIN</span>
              </div>
              <h3 className="text-xl font-bold mb-2">JEE Main Full Mock Test</h3>
              <p className="text-sm text-slate-500 mb-6">
                Complete 90-question exam covering Physics, Chemistry, and Mathematics (30 each). Includes MCQs and Numericals with +4/-1 marking.
              </p>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 mb-6">
                <span className="flex items-center gap-1"><Monitor className="w-4 h-4" /> 90 Questions</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> 180 Mins</span>
                <span className="flex items-center gap-1"><Award className="w-4 h-4" /> 300 Marks</span>
              </div>
              <Link 
                href="/mock-tests/69b2c943a3db42e8c011bcda" 
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Start JEE Exam <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className={`card overflow-hidden border-2 transition hover:shadow-xl ${
            mode === "NEET" ? "border-pink-100" : "border-slate-100"
          }`}>
            <div className={`h-2 ${mode === "NEET" ? "bg-pink-500" : "bg-slate-400"}`} />
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center">
                  <FlaskConical className="w-6 h-6 text-pink-600" />
                </div>
                <span className="px-3 py-1 bg-pink-50 text-pink-700 text-xs font-bold rounded-full">NEET UG</span>
              </div>
              <h3 className="text-xl font-bold mb-2">NEET UG Full Mock Test</h3>
              <p className="text-sm text-slate-500 mb-6">
                Comprehensive 200-question exam covering Biology, Physics, and Chemistry. Strictly follows the latest NTA pattern.
              </p>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 mb-6">
                <span className="flex items-center gap-1"><Monitor className="w-4 h-4" /> 200 Questions</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> 200 Mins</span>
                <span className="flex items-center gap-1"><Award className="w-4 h-4" /> 720 Marks</span>
              </div>
              <Link 
                href="/mock-tests/69b2c944a3db42e8c011bd35" 
                className="btn-primary w-full bg-pink-600 hover:bg-pink-700 flex items-center justify-center gap-2"
              >
                Start NEET Exam <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
