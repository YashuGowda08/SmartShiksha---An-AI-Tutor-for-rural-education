"use client";
import Link from "next/link";
import {
  GraduationCap, BookOpen, Brain, FileText, Monitor, Globe,
  ChevronRight, Sparkles, Users, Award, ArrowRight
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const features = [
  { icon: Brain, title: "AI Tutor", desc: "Get instant explanations from our AI teacher in your language", color: "from-indigo-500 to-purple-500" },
  { icon: FileText, title: "Exam Generator", desc: "Generate custom practice papers with downloadable PDFs", color: "from-pink-500 to-rose-500" },
  { icon: Monitor, title: "Mock Tests", desc: "Take timed tests with auto-evaluation and analytics", color: "from-emerald-500 to-teal-500" },
  { icon: BookOpen, title: "Textbooks", desc: "Read textbooks online and ask AI about any paragraph", color: "from-amber-500 to-orange-500" },
  { icon: Globe, title: "Multilingual", desc: "Learn in English, Hindi, Kannada, Telugu, or Tamil", color: "from-blue-500 to-cyan-500" },
  { icon: Award, title: "JEE & NEET", desc: "Special competitive exam preparation for Class 11-12", color: "from-violet-500 to-fuchsia-500" },
];

const stats = [
  { value: "5+", label: "Languages" },
  { value: "Class 8-12", label: "Students" },
  { value: "AI", label: "Powered" },
  { value: "Free", label: "Access" },
];

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, isLoaded, router]);

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">Smart Shiksha</span>
          </div>
          <div className="flex items-center gap-4">
            {!isSignedIn ? (
              <>
                <Link href="/sign-in" className="btn-secondary text-sm py-2 px-5">
                  Log In
                </Link>
                <Link href="/sign-up" className="btn-primary text-sm py-2 px-5">
                  Sign Up Free <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            ) : (
              <>
                <Link href="/dashboard" className="btn-secondary text-sm py-2 px-5">
                  Go to Dashboard
                </Link>
                <UserButton />
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-2 mb-8 animate-slide-up">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-700">AI-Powered Education for Rural India</span>
          </div>
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Learn Smarter with{" "}
            <span className="gradient-text">Smart Shiksha</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            Free, AI-powered education platform for Class 8–12 students. Get personalized tutoring, 
            practice tests, and exam papers — all in your own language.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            {!isSignedIn ? (
              <Link href="/sign-up" className="btn-primary text-lg py-4 px-8">
                Start Learning Free <ChevronRight className="w-5 h-5" />
              </Link>
            ) : (
              <Link href="/dashboard" className="btn-primary text-lg py-4 px-8">
                Continue Learning <ChevronRight className="w-5 h-5" />
              </Link>
            )}
            <Link href="#features" className="btn-secondary text-lg py-4 px-8">
              Explore Features
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.4s" }}>
            {stats.map((stat) => (
              <div key={stat.label} className="text-center p-4">
                <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Decorative gradient blobs */}
      <div className="relative">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-indigo-200 rounded-full opacity-20 blur-3xl animate-pulse-slow" />
        <div className="absolute -top-20 right-1/4 w-72 h-72 bg-purple-200 rounded-full opacity-20 blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
      </div>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need to <span className="gradient-text">Excel</span></h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">
              Designed specifically for students in rural India, optimized for slow internet.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="card group cursor-pointer">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section className="py-20 px-4 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-7xl mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Subjects Covered</h2>
          <p className="text-indigo-100 mb-12 text-lg">Complete syllabus coverage for CBSE and State Board</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {["📐 Mathematics", "🔬 Science", "🌍 Social Science", "📖 English", "💻 Computer Science",
              "⚡ Physics", "🧪 Chemistry", "🧬 Biology"].map((subj) => (
              <div key={subj} className="bg-white/10 backdrop-blur rounded-xl p-4 hover:bg-white/20 transition">
                <span className="text-lg font-semibold">{subj}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="card border-0 gradient-primary text-white p-12 rounded-3xl">
            <Users className="w-16 h-16 mx-auto mb-6 opacity-80" />
            <h2 className="text-4xl font-bold mb-4">Ready to Start Learning?</h2>
            <p className="text-lg text-indigo-100 mb-8 max-w-xl mx-auto">
              Join thousands of students across rural India who are learning smarter with AI.
            </p>
            <Link href="/sign-up" className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold py-4 px-8 rounded-xl text-lg hover:bg-indigo-50 transition">
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-slate-500 text-sm">
          <div className="flex items-center gap-2 mb-4 sm:mb-0">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-slate-700">Smart Shiksha</span>
          </div>
          <p>© 2026 Smart Shiksha. AI-Powered Education for Every Student.</p>
        </div>
      </footer>
    </div>
  );
}
