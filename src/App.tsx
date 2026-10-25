import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import { AlertTriangle, CheckCircle, Activity, Camera } from 'lucide-react';

// 1. Your exact Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBUioXnK-TAbXXGB0QcB04doJ6Xmq8O6WQ",
  authDomain: "blackbox-f0970.firebaseapp.com",
  databaseURL: "https://blackbox-f0970-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "blackbox-f0970",
  storageBucket: "blackbox-f0970.firebasestorage.app",
  messagingSenderId: "200897104931",
  appId: "1:200897104931:web:392218e7b19f6cb672f596"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export default function App() {
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    // Listen to your specific database node
    const dataRef = ref(database, 'earthquake_events');
    let timeoutId: ReturnType<typeof setTimeout>;

    const unsubscribe = onValue(dataRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Convert Firebase's unique IDs into a standard array
        const dataArray = Object.values(data);
        // Sort to show newest first based on timestamp
        dataArray.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setTelemetry(dataArray);

        // Set to Live mode
        setIsLive(true);
        
        // Reset the 60-second Standby timer
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setIsLive(false);
        }, 60000);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // Get the most recent reading for the map and camera
  const latestReading = telemetry[0] || null;
  const mapCenter = latestReading && latestReading.latitude !== "None" 
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${Number(latestReading.longitude)-0.01}%2C${Number(latestReading.latitude)-0.01}%2C${Number(latestReading.longitude)+0.01}%2C${Number(latestReading.latitude)+0.01}&layer=mapnik&marker=${latestReading.latitude}%2C${latestReading.longitude}`
    : "https://www.openstreetmap.org/export/embed.html?bbox=80.1712%2C13.0219%2C80.1912%2C13.0419&layer=mapnik&marker=13.0319%2C80.1812";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white tracking-tight">Quake Black Box</h1>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 ${isLive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></div>
            {isLive ? 'Live: Receiving Data' : 'Standby (No recent data)'}
          </div>
        </div>
        {latestReading && (
          <div className={`mt-4 md:mt-0 px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${Number(latestReading.peak_g) >= 1.0 ? 'bg-red-500/20 text-red-500 border border-red-500/50' : Number(latestReading.peak_g) >= 0.5 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50' : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50'}`}>
            {Number(latestReading.peak_g) >= 1.0 ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
            STATUS: {Number(latestReading.peak_g) >= 1.0 ? 'CRITICAL ALERT' : Number(latestReading.peak_g) >= 0.5 ? 'WARNING' : 'NORMAL'}
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-3 border-b border-slate-800 bg-slate-900/50 text-xs font-semibold tracking-wider text-slate-400 flex items-center gap-2">
            <Activity size={14} /> LIVE GPS TRACKING
            {latestReading && latestReading.latitude === "None" && (
              <span className="text-amber-500 ml-auto">- NO FIX: SHOWING DEFAULT COORDS</span>
            )}
          </div>
          <div className="relative w-full h-[50vh] min-h-[400px] bg-slate-800">
            <iframe 
              width="100%" 
              height="100%" 
              frameBorder="0" 
              scrolling="no" 
              src={mapCenter}
              className="absolute inset-0 w-full h-full grayscale opacity-80"
              style={{ filter: "invert(90%) hue-rotate(180deg)" }}
            ></iframe>
          </div>
        </div>

        {/* Telemetry Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
           <div className="p-3 border-b border-slate-800 bg-slate-900/50 text-xs font-semibold tracking-wider text-slate-400">
            TELEMETRY LOG
          </div>
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-900/80 sticky top-0">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Peak G</th>
                  <th className="px-4 py-3">Lat/Lon</th>
                  <th className="px-4 py-3">Camera ID</th>
                </tr>
              </thead>
              <tbody>
                {telemetry.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-mono text-slate-300">{String(row.timestamp)}</td>
                    <td className={`px-4 py-3 font-mono font-bold ${Number(row.peak_g) >= 1.0 ? 'text-red-400' : Number(row.peak_g) >= 0.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {Number(row.peak_g).toFixed(4)} G
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{String(row.latitude)} / {String(row.longitude)}</td>
                    <td className="px-4 py-3 text-slate-500">{row.video_tag ? String(row.video_tag) : "—"}</td>
                  </tr>
                ))}
                {telemetry.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Waiting for data...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Camera Snapshot */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-3 border-b border-slate-800 bg-slate-900/50 text-xs font-semibold tracking-wider text-slate-400 flex items-center gap-2">
            <Camera size={14} /> SURVEILLANCE FEED
          </div>
          <div className="flex-1 p-4 flex flex-col items-center justify-center min-h-[250px] bg-slate-950/50">
            {latestReading && latestReading.video_tag ? (
              <div className="text-center">
                <Camera size={48} className="mx-auto text-slate-700 mb-4" />
                <p className="font-mono text-sm text-slate-400">{String(latestReading.video_tag)}</p>
                <p className="text-xs text-slate-600 mt-2">Firebase Storage binding pending</p>
              </div>
            ) : (
              <div className="text-center text-slate-600">
                <Camera size={48} className="mx-auto mb-4 opacity-50" />
                <p>No snapshot available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}