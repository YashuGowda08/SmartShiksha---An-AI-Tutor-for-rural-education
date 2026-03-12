"use client";
import { useState, useEffect } from "react";
import { contentAPI } from "@/lib/api";
import { db } from "@/lib/offline-db";
import { 
  CloudDownload, CheckCircle2, AlertCircle, RefreshCw, 
  Trash2, Database, Wifi, Info 
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function OfflineManagementPage() {
  const { t } = useLanguage();
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({ subjects: 0, chapters: 0, topics: 0 });
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const s = await db.subjects.count();
    const c = await db.chapters.count();
    const tCount = await db.topics.count();
    setStats({ subjects: s, chapters: c, topics: tCount });
  };

  const syncAll = async () => {
    if (syncing) return;
    setSyncing(true);
    setProgress(0);
    setStatusMessage("Connecting to server...");

    try {
      // 1. Fetch Subjects
      setStatusMessage("Syncing subjects...");
      const subjectsRes = await contentAPI.getSubjects();
      const subjects = subjectsRes.data;
      await db.subjects.bulkPut(subjects);
      setProgress(20);

      // 2. Fetch Chapters (This might be a lot of requests, so we process by subject)
      setStatusMessage("Syncing chapters...");
      let allChapters = [];
      for (let i = 0; i < subjects.length; i++) {
        const sub = subjects[i];
        const capRes = await contentAPI.getChapters(sub.id);
        allChapters.push(...capRes.data);
        setProgress(20 + ((i + 1) / subjects.length) * 30);
      }
      await db.chapters.bulkPut(allChapters);

      // 3. Fetch Topics
      setStatusMessage("Syncing topics (this may take a while)...");
      let allTopics: any[] = [];
      const batchSize = 5; // Smaller batch size to avoid network congestion
      for (let i = 0; i < allChapters.length; i += batchSize) {
        const batch = allChapters.slice(i, i + batchSize);
        await Promise.all(batch.map(async (chap: any) => {
          try {
            const topRes = await contentAPI.getTopics(chap.id);
            // Fetch topic details in smaller internal batches
            for (const tShort of topRes.data) {
              try {
                const tDetail = await contentAPI.getTopic(tShort.id);
                allTopics.push(tDetail.data);
              } catch (e) {
                console.warn(`Failed to sync topic ${tShort.id}`, e);
              }
            }
          } catch (e) {
            console.warn(`Failed to sync topics for chapter ${chap.id}`, e);
          }
        }));
        
        // Save batch-wise to avoid huge memory usage and show real progress
        if (allTopics.length > 0) {
          await db.topics.bulkPut(allTopics);
          allTopics = []; // Clear for next batch
        }
        
        setProgress(50 + (Math.min(i + batchSize, allChapters.length) / allChapters.length) * 50);
      }

      setStatusMessage("Sync complete!");
      loadStats();
    } catch (err) {
      console.error(err);
      setStatusMessage("Sync failed. Check connection and try again.");
    } finally {
      setSyncing(false);
    }
  };

  const clearOfflineData = async () => {
    if (confirm("Are you sure you want to delete all offline data?")) {
      await db.subjects.clear();
      await db.chapters.clear();
      await db.topics.clear();
      loadStats();
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
          <Database className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Offline Content Management</h1>
          <p className="text-slate-500">Download and manage study materials for use without internet.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <StatCard label="Subjects" count={stats.subjects} icon={<Database className="w-5 h-5 text-indigo-500" />} />
        <StatCard label="Chapters" count={stats.chapters} icon={<Database className="w-5 h-5 text-amber-500" />} />
        <StatCard label="Topics" count={stats.topics} icon={<Database className="w-5 h-5 text-emerald-500" />} />
      </div>

      <div className="card p-8 bg-white border-slate-200 shadow-xl shadow-slate-100 mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin text-indigo-600' : ''}`} />
          Sync All Materials
        </h2>
        <p className="text-slate-500 mb-6 leading-relaxed">
          This will fetch all subjects, chapters, and detailed topics from the server and store them on your device. 
          Make sure you have a stable connection and enough storage space.
        </p>

        {syncing && (
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span className="text-indigo-600">{statusMessage}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          <button 
            onClick={syncAll}
            disabled={syncing}
            className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-100"
          >
            {syncing ? "Syncing..." : "Start Full Sync"}
            <CloudDownload className="w-5 h-5" />
          </button>
          
          <button 
            onClick={clearOfflineData}
            disabled={syncing || (stats.subjects === 0)}
            className="px-8 py-3 rounded-xl border border-rose-200 text-rose-600 font-bold hover:bg-rose-50 transition flex items-center gap-2 disabled:opacity-50"
          >
            Clear Local Data
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4">
        <Info className="w-6 h-6 text-amber-600 shrink-0" />
        <div className="text-sm text-amber-800 leading-relaxed">
          <p className="font-bold mb-1">Offline Mode Limits:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Community posts and AI Tutor require an active connection.</li>
            <li>Mock tests and Exam Generator results cannot be submitted offline.</li>
            <li>Performance syncing will resume automatically once you go back online.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, count, icon }: { label: string, count: number, icon: React.ReactNode }) {
  return (
    <div className="card p-6 border-slate-200 bg-white">
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-2xl font-black text-slate-800">{count}</span>
      </div>
      <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
