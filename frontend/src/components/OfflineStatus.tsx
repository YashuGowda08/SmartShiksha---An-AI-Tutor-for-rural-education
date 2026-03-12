import { useState, useEffect } from "react";
import { Wifi, WifiOff, CloudDownload, CheckCircle2, RotateCw } from "lucide-react";

export default function OfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all duration-300 ${
      isOnline 
      ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
      : "bg-rose-50 text-rose-600 border border-rose-200"
    }`}>
      {isOnline ? (
        <>
          <Wifi className="w-3.5 h-3.5" />
          <span>ONLINE</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          <span>OFFLINE MODE</span>
        </>
      )}
    </div>
  );
}
