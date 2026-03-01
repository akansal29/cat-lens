import { useState, useEffect, useRef, useCallback } from "react";
import { Y, BORDER, CARD, PATHS, STATUS, Ic, Card, Btn, Pill, statusIconPath } from "./ui.jsx";
import { analyzeFrame, captureFrame } from "./api.js";
import CameraPanel from "./CameraPanel.jsx";
import { CameraTab, DetectionTab, SpatialTab, VoiceTab, ChecklistTab, LogTab } from "./tabs.jsx";

// ─── COMPONENT DETAIL MODAL ───────────────────────────────────────────────────
function ComponentModal({ comp, onClose, onAction }) {
  if (!comp) return null;
  const sc = STATUS[comp.status] || STATUS.info;

  const actionLabel = comp.status === "critical" ? "Create Work Order"
    : comp.status === "warning" ? "Schedule Service"
    : "Mark Inspected";

  const actionVariant = comp.status === "critical" ? "danger"
    : comp.status === "warning" ? "primary"
    : "green";

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 150, backdropFilter: "blur(6px)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#181818", border: `2px solid ${sc.color}`,
        borderRadius: 14, padding: 22, maxWidth: 340, width: "calc(100% - 32px)",
        boxShadow: `0 0 50px ${sc.color}20`, animation: "cat-fadein 0.2s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{comp.name}</div>
            <div style={{ color: "#555", fontSize: 11, marginTop: 2 }}>Detected by CAT Lens AI</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <Ic path={PATHS.x} size={16} color="#555" />
          </button>
        </div>
        <div style={{ display: "flex", gap: 7, marginBottom: 12, flexWrap: "wrap" }}>
          <Pill color={sc.color}>{comp.status.toUpperCase()}</Pill>
          <Pill color={Y}>{Math.round(comp.confidence * 100)}% confidence</Pill>
          <Pill color="#555">pos {Math.round(comp.x)}%, {Math.round(comp.y)}%</Pill>
        </div>
        <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.6, marginBottom: 16 }}>{comp.details}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Btn variant={actionVariant} onClick={() => { onAction(comp); onClose(); }}>{actionLabel}</Btn>
          <Btn variant="ghost" onClick={onClose}>Dismiss</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── BULLDOZER ICON ───────────────────────────────────────────────────────────
function Bulldozer({ direction }) {
  // Flip the direction logic - when moving right, face left (pushing from behind)
  const flipDirection = direction === 'left' ? 1 : -1;

  return (
    <svg width="24" height="20" viewBox="0 0 24 20" style={{ transform: `scaleX(${flipDirection})` }}>
      {/* Tracks with outline */}
      <rect x="2" y="13" width="20" height="5" rx="1.5" fill="#000" stroke="#999" strokeWidth="0.5" />
      {/* Main body with outline */}
      <rect x="4" y="7" width="14" height="8" rx="1" fill="#FFCD00" stroke="#aaa" strokeWidth="0.8" />
      {/* Cabin with outline */}
      <rect x="8" y="3" width="8" height="6" rx="1" fill="#FFCD00" stroke="#aaa" strokeWidth="0.8" />
      {/* Window */}
      <rect x="10" y="4.5" width="4" height="3" rx="0.5" fill="#000" opacity="0.3" />
      {/* Bucket/Blade with outline */}
      <path d="M 1 13 L 4 10 L 4 13 Z" fill="#333" stroke="#777" strokeWidth="0.5" />
      {/* Details - wheels */}
      <circle cx="6" cy="15.5" r="1.5" fill="#333" stroke="#666" strokeWidth="0.3" />
      <circle cx="18" cy="15.5" r="1.5" fill="#333" stroke="#666" strokeWidth="0.3" />
    </svg>
  );
}

// ─── TAB BAR ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: "camera",    label: "Camera",    icon: PATHS.cam },
  { id: "detection", label: "Detection", icon: PATHS.eye },
  { id: "spatial",   label: "Spatial",   icon: PATHS.map },
  { id: "voice",     label: "Voice",     icon: PATHS.mic },
  { id: "checklist", label: "Checklist", icon: PATHS.list },
  { id: "log",       label: "Log",       icon: PATHS.activity },
];

function TabBar({ active, onChange, critCount, logCount }) {
  const activeIndex = TABS.findIndex(t => t.id === active);
  const prevIndexRef = useRef(activeIndex);
  const [bulldozerSide, setBulldozerSide] = useState('right'); // 'right' or 'left'

  const slidePosition = (activeIndex / TABS.length) * 100;
  const slideWidth = 100 / TABS.length;

  // Determine direction and update bulldozer side
  useEffect(() => {
    const prevIdx = prevIndexRef.current;

    if (activeIndex > prevIdx) {
      // Moving right - bulldozer pushes from the right
      setBulldozerSide('right');
    } else if (activeIndex < prevIdx) {
      // Moving left - bulldozer pushes from the left
      setBulldozerSide('left');
    }
    // Update ref for next comparison
    prevIndexRef.current = activeIndex;
  }, [activeIndex]);

  const isRight = bulldozerSide === 'right';

  return (
    <div style={{ display: "flex", background: "#0f0f0f", borderBottom: `1px solid ${BORDER}`, flexShrink: 0, position: "relative" }}>
      {/* Yellow sliding indicator */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: `${slidePosition}%`,
        width: `${slideWidth}%`,
        height: "3px",
        background: Y,
        transition: "left 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 1,
      }} />

      {/* CAT bulldozer - switches sides based on direction */}
      <div style={{
        position: "absolute",
        bottom: "4px",
        left: isRight
          ? `calc(${slidePosition}% + ${slideWidth}% - 4px)`  // Right side of bar
          : `calc(${slidePosition}% + 4px)`,                   // Left side of bar
        transform: isRight ? "translateX(-100%)" : "translateX(0%)",
        transition: "left 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 2,
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
      }}>
        <Bulldozer direction={isRight ? 'right' : 'left'} />
      </div>

      {TABS.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: 1, padding: "8px 2px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          background: active === t.id ? `${Y}10` : "transparent",
          color: active === t.id ? Y : "#444",
          cursor: "pointer", border: "none", fontSize: 10, transition: "all 0.15s",
          position: "relative",
        }}>
          <Ic path={t.icon} size={15} color={active === t.id ? Y : "#444"} />
          {t.label}
          {t.id === "detection" && critCount > 0 && (
            <div style={{ position: "absolute", top: 5, right: "18%", width: 6, height: 6, borderRadius: "50%", background: "#ff3b30" }} />
          )}
          {t.id === "log" && logCount > 0 && (
            <div style={{ position: "absolute", top: 5, right: "18%", width: 6, height: 6, borderRadius: "50%", background: Y }} />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function LandingPage({ onEnter }) {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        background: "#0f0f0f", borderBottom: `1px solid ${BORDER}`,
        padding: "12px 20px", display: "flex", alignItems: "center", gap: 12,
        zIndex: 20, flexShrink: 0,
      }}>
        <div className="cat-stripes" style={{ padding: "10px 12px", borderRadius: 8, fontWeight: 900, fontSize: 16, color: "#000", letterSpacing: 1.2 }}>CAT</div>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>CAT Lens</div>
          <div style={{ color: "#444", fontSize: 11 }}>Vision-First Walkaround Inspection System</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "60px 20px 40px", position: "relative", overflow: "auto" }}>

        {/* Hero section with button */}
        <div style={{ textAlign: "center", animation: "cat-fadein 0.6s ease" }}>
          <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", marginBottom: 12, letterSpacing: 1 }}>
            Welcome to <span style={{ color: Y }}>CAT Lens</span>
          </div>
          <div style={{ fontSize: 18, color: "#888", marginBottom: 40, maxWidth: 600, margin: "0 auto 40px" }}>
            AI-powered equipment inspection for the next generation of heavy machinery maintenance
          </div>

          {/* Enter App Button */}
          <button onClick={onEnter} style={{
            background: Y,
            color: "#000",
            border: "none",
            borderRadius: 12,
            padding: "18px 48px",
            fontSize: 18,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: `0 0 40px ${Y}40`,
            transition: "all 0.3s",
            letterSpacing: 1,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = `0 0 60px ${Y}60`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = `0 0 40px ${Y}40`;
          }}>
            Launch CAT Lens 🚜
          </button>
        </div>

        {/* Description and How to Use */}
        <div style={{ maxWidth: 1000, width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, animation: "cat-fadein 0.8s ease 0.2s both" }}>

          {/* About */}
          <Card glow={Y}>
            <div style={{ fontSize: 12, color: Y, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>WHAT IS CAT LENS?</div>
            <div style={{ color: "#ddd", fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>
              CAT Lens revolutionizes equipment walkaround inspections with AI-powered computer vision. Point your camera at heavy machinery and get instant, intelligent analysis of component health, wear patterns, and maintenance needs.
            </div>
            <div style={{ color: "#888", fontSize: 13, lineHeight: 1.6 }}>
              Built for field technicians who need hands-free operation, real-time diagnostics, and seamless integration with CAT service systems. Powered by Groq Vision AI and designed for the toughest jobsites.
            </div>
          </Card>

          {/* How to Use */}
          <Card glow="#0a84ff">
            <div style={{ fontSize: 12, color: "#0a84ff", fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>HOW TO USE</div>
            {[
              { icon: "📷", title: "Start Camera", desc: "Grant camera access and point at equipment" },
              { icon: "🔍", title: "Scan Components", desc: "Photo or video mode — AI analyzes in seconds" },
              { icon: "🎤", title: "Voice Notes", desc: "Hands-free logging with voice commands" },
              { icon: "📋", title: "Generate Reports", desc: "Export repair orders and inspection logs" },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <div>
                  <div style={{ color: "#ddd", fontSize: 13, fontWeight: 600 }}>{title}</div>
                  <div style={{ color: "#666", fontSize: 12 }}>{desc}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Hazard stripe footer */}
      <div className="cat-hazard-stripes" style={{ height: 12, flexShrink: 0 }} />
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [showLanding, setShowLanding] = useState(true);

  const [activeTab, setActiveTab]       = useState("camera");
  const [components, setComponents]     = useState([]);
  const [selected, setSelected]         = useState(null);
  const [cameraOn, setCameraOn]         = useState(false);
  const [cameraError, setCameraError]   = useState("");
  const [scanning, setScanning]         = useState(false);
  const [scanError, setScanError]       = useState("");
  const [autoScan, setAutoScan]         = useState(false);
  const [lastFrame, setLastFrame]       = useState(null);
  const [lastScanTime, setLastScanTime] = useState(null);
  const [voiceLog, setVoiceLog]         = useState([]);
  const [toast, setToast]               = useState("");
  const [capturedMedia, setCapturedMedia] = useState(null); // { type: 'photo'|'video', src }
  const [scanLog, setScanLog]           = useState(() => {
    try {
      const saved = localStorage.getItem("cat-lens-scanlog");
      if (!saved) return [];
      return JSON.parse(saved).map(e => ({ ...e, timestamp: new Date(e.timestamp) }));
    } catch { return []; }
  });
  const [isRecording, setIsRecording]   = useState(false);
  const [serverOk, setServerOk]         = useState(null); // null=checking, true=ok, false=down
  const [fieldMode, setFieldMode]       = useState(false);

  const videoRef        = useRef(null);
  const streamRef       = useRef(null);
  const autoScanRef     = useRef(null);
  const scanningRef     = useRef(false);
  const mediaRecorderRef = useRef(null);

  // ── Start camera ─────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setCameraOn(true);
      setCameraError("");
    } catch (e) {
      setCameraError(`Camera error: ${e.message}`);
    }
  }, []);

  // ── Photo scan — freeze + analyze ────────────────────────────────────────
  const scanFrame = useCallback(async () => {
    if (!videoRef.current || !cameraOn || scanningRef.current) return;
    const video = videoRef.current;
    if (!video.videoWidth || video.readyState < 2) {
      setScanError("Camera not ready yet — wait a second and try again");
      return;
    }
    scanningRef.current = true;
    setScanning(true);
    setScanError("");
    try {
      const frame = captureFrame(video);
      setLastFrame(frame);
      setCapturedMedia({ type: "photo", src: `data:image/jpeg;base64,${frame}` });
      const result = await analyzeFrame(frame);
      const ts = new Date();
      if (result.components?.length > 0) {
        setComponents(result.components);
        setScanLog(prev => [{
          id: ts.getTime().toString(),
          type: "photo",
          thumbnail: frame,
          timestamp: ts,
          components: result.components,
          health: result.overall_health || 0,
          summary: result.summary || "",
        }, ...prev].slice(0, 30));
      } else {
        setScanError("No components detected — try pointing at equipment");
      }
      setLastScanTime(ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (e) {
      console.error("[CAT Lens] Scan failed:", e);
      setScanError(e.message);
    }
    scanningRef.current = false;
    setScanning(false);
  }, [cameraOn]);

  // ── Video scan — record clip, loop, analyze ───────────────────────────────
  const startVideoScan = useCallback(() => {
    if (!streamRef.current || !cameraOn || isRecording || scanningRef.current) return;
    setScanError("");
    const chunks = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "video/mp4";
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: mimeType });
      const videoUrl = URL.createObjectURL(blob);
      const frame = captureFrame(videoRef.current);
      setCapturedMedia({ type: "video", src: videoUrl });
      setLastFrame(frame);
      scanningRef.current = true;
      setScanning(true);
      try {
        const result = await analyzeFrame(frame);
        const ts = new Date();
        if (result.components?.length > 0) {
          setComponents(result.components);
          setScanLog(prev => [{
            id: ts.getTime().toString(),
            type: "video",
            thumbnail: frame,
            timestamp: ts,
            components: result.components,
            health: result.overall_health || 0,
            summary: result.summary || "",
          }, ...prev].slice(0, 30));
        }
        setLastScanTime(ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      } catch (e) {
        setScanError(e.message);
      }
      scanningRef.current = false;
      setScanning(false);
      setIsRecording(false);
    };

    recorder.start();
    setIsRecording(true);
  }, [cameraOn, isRecording]);

  const stopVideoScan = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const resumeCamera = useCallback(() => {
    setCapturedMedia(null);
  }, []);

  const restoreLogEntry = useCallback((entry) => {
    setComponents(entry.components);
    setLastFrame(entry.thumbnail);
    setCapturedMedia({ type: "photo", src: `data:image/jpeg;base64,${entry.thumbnail}` });
    setLastScanTime(entry.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    setActiveTab("camera");
  }, []);

  // ── Auto-scan timer — pauses while camera is frozen on a capture ─────────
  useEffect(() => {
    clearInterval(autoScanRef.current);
    if (autoScan && cameraOn && !capturedMedia) {
      autoScanRef.current = setInterval(scanFrame, 8000);
    }
    return () => clearInterval(autoScanRef.current);
  }, [autoScan, cameraOn, capturedMedia, scanFrame]);

  // ── Persist scan log ─────────────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem("cat-lens-scanlog", JSON.stringify(scanLog)); } catch {}
  }, [scanLog]);

  // ── Server health check ───────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 2000);
        const res = await fetch("http://localhost:3001/health", { signal: ctrl.signal });
        clearTimeout(t);
        setServerOk(res.ok);
      } catch { setServerOk(false); }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      clearInterval(autoScanRef.current);
    };
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleComponentAction = (comp) => {
    if (comp.status === "critical") {
      setVoiceLog(prev => [{
        id: Date.now().toString(),
        location: comp.name, observation: comp.details, status: "critical",
        action: "Work order created", followUp: "Do not operate until resolved",
        rawCommand: `[Work Order] ${comp.name}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }, ...prev]);
      showToast(`✓ Work order created for ${comp.name}`);
      setActiveTab("checklist");
    } else if (comp.status === "warning") {
      setVoiceLog(prev => [{
        id: Date.now().toString(),
        location: comp.name, observation: comp.details, status: "warning",
        action: "Scheduled for next service", followUp: "Re-inspect at next 250-hour service",
        rawCommand: `[Scheduled] ${comp.name}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }, ...prev]);
      showToast(`✓ ${comp.name} scheduled for service`);
      setActiveTab("checklist");
    } else {
      setComponents(prev => prev.map(c => c.id === comp.id ? { ...c, status: "good" } : c));
      showToast(`✓ ${comp.name} marked as inspected`);
    }
  };

  const critCount   = components.filter(c => c.status === "critical").length;
  const good        = components.filter(c => c.status === "good").length;
  const warn        = components.filter(c => c.status === "warning").length;
  const health      = components.length > 0 ? Math.round((good / components.length) * 100) : null;
  const healthColor = health === null ? Y : health > 70 ? "#34c759" : health > 40 ? "#ff9500" : "#ff3b30";

  const tabContent = {
    camera:    <CameraTab cameraOn={cameraOn} scanning={scanning} autoScan={autoScan}
                 onStartCamera={startCamera} onScan={scanFrame} onAutoScan={setAutoScan}
                 components={components} lastFrame={lastFrame}
                 capturedMedia={capturedMedia} isRecording={isRecording}
                 onStartVideo={startVideoScan} onStopVideo={stopVideoScan} onResume={resumeCamera} />,
    detection: <DetectionTab components={components} onSelect={setSelected} scanning={scanning} onScan={scanFrame} cameraOn={cameraOn} />,
    spatial:   <SpatialTab lastFrame={lastFrame} components={components} />,
    voice:     <VoiceTab voiceLog={voiceLog} setVoiceLog={setVoiceLog} />,
    checklist: <ChecklistTab components={components} voiceLog={voiceLog} />,
    log:       <LogTab scanLog={scanLog} onRestore={restoreLogEntry} />,
  };

  // Show landing page first
  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{
        background: "#0f0f0f", borderBottom: `1px solid ${BORDER}`,
        padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
        zIndex: 20, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="cat-stripes" style={{ padding: "8px 10px", borderRadius: 6, fontWeight: 900, fontSize: 14, color: "#000", letterSpacing: 1 }}>CAT</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>CAT Lens</div>
            <div style={{ color: "#444", fontSize: 10 }}>Vision-First Walkaround • HackIllinois 2026</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          {isRecording && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff3b30", animation: "cat-blink 0.8s infinite" }} />
              <span style={{ color: "#ff3b30" }}>REC</span>
            </div>
          )}
          {cameraOn && !isRecording && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34c759", animation: "cat-blink 2s infinite" }} />
              <span style={{ color: "#34c759" }}>{capturedMedia ? "Frozen" : "Live"}</span>
            </div>
          )}
          {scanning && <span style={{ fontSize: 11, color: Y, animation: "cat-blink 0.7s infinite" }}>Analyzing...</span>}
          {scanError && <span style={{ fontSize: 12, color: "#ff3b30", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={scanError}>⚠ {scanError}</span>}
          {toast && <span style={{ fontSize: 12, color: "#34c759", animation: "cat-fadein 0.2s ease" }}>{toast}</span>}
          {critCount > 0 && <Pill color="#ff3b30">⚠ {critCount} Critical</Pill>}
          <button onClick={() => setFieldMode(f => !f)} style={{
            background: fieldMode ? Y : "transparent",
            color: fieldMode ? "#000" : "#666",
            border: `1px solid ${fieldMode ? Y : "#333"}`,
            borderRadius: 6, fontSize: 11, padding: "4px 10px",
            cursor: "pointer", fontWeight: 600,
          }}>{fieldMode ? "✕ Exit Field Mode" : "⬜ Field Mode"}</button>
          <Pill color={serverOk === false ? "#ff3b30" : serverOk ? "#34c759" : "#888"}>
            {serverOk === false ? "⚠ Server Down" : serverOk ? "Groq Vision ✓" : "Connecting..."}
          </Pill>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <TabBar active={activeTab} onChange={setActiveTab} critCount={critCount} logCount={scanLog.length} />

      {/* ── Main split ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Camera — expands to 100% in field mode */}
        <div style={{
          width: fieldMode ? "100%" : "55%", flexShrink: 0,
          borderRight: fieldMode ? "none" : `1px solid ${BORDER}`,
          transition: "width 0.3s ease", position: "relative",
        }}>
          <CameraPanel
            videoRef={videoRef}
            components={components}
            cameraOn={cameraOn}
            cameraError={cameraError}
            scanning={scanning}
            activeTab={activeTab}
            onComponentClick={setSelected}
            lastScanTime={lastScanTime}
            capturedMedia={capturedMedia}
            isRecording={isRecording}
            onResume={resumeCamera}
          />

          {/* Field mode HUD */}
          {fieldMode && (
            <div style={{
              position: "absolute", bottom: 24, left: 0, right: 0,
              display: "flex", justifyContent: "center", alignItems: "center", gap: 12,
              zIndex: 50,
            }}>
              {health !== null && (
                <div style={{
                  background: "rgba(0,0,0,0.82)", borderRadius: 20,
                  padding: "8px 18px", color: healthColor,
                  fontWeight: 900, fontSize: 20, fontFamily: "monospace",
                  border: `1px solid ${healthColor}50`,
                }}>{health}%</div>
              )}
              <button onClick={scanFrame} disabled={!cameraOn || scanning} style={{
                background: scanning ? "rgba(255,205,0,0.15)" : Y,
                color: scanning ? Y : "#000",
                border: scanning ? `2px solid ${Y}` : "none",
                borderRadius: 40, padding: "13px 32px",
                fontSize: 15, fontWeight: 800,
                cursor: scanning ? "not-allowed" : "pointer",
                boxShadow: `0 0 28px ${Y}50`,
                opacity: !cameraOn ? 0.4 : 1,
              }}>{scanning ? "Analyzing..." : "📷 Scan"}</button>
              {critCount > 0 && (
                <div style={{
                  background: "rgba(255,59,48,0.15)", border: "1px solid rgba(255,59,48,0.45)",
                  borderRadius: 20, padding: "8px 16px",
                  color: "#ff3b30", fontSize: 13, fontWeight: 700,
                }}>⚠ {critCount} Critical</div>
              )}
            </div>
          )}
        </div>

        {/* Panel — hidden in field mode */}
        {!fieldMode && <div style={{ flex: 1, overflow: "hidden" }}>
          <div key={activeTab} style={{ height: "100%", animation: "cat-slide 0.2s ease" }}>
            {tabContent[activeTab]}
          </div>
        </div>}
      </div>

      {/* ── Status bar ── */}
      <div style={{
        background: "#0f0f0f", borderTop: `1px solid ${BORDER}`,
        padding: "6px 14px", display: "flex", justifyContent: "space-between",
        alignItems: "center", flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: 14, fontSize: 11, alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: critCount > 0 ? "#ff3b30" : "#34c759" }} />
            <span style={{ color: critCount > 0 ? "#ff3b30" : "#34c759", fontWeight: 600 }}>
              {critCount > 0 ? "Critical issue detected" : "All Systems Operational"}
            </span>
          </span>
          <span style={{ color: "#666" }}>Model: <span style={{ color: "#ddd" }}>Excavator 320</span></span>
          <span style={{ color: "#666" }}>Components: <span style={{ color: "#ddd" }}>{components.length}/8</span></span>
          {components.length > 0 && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Ic path={PATHS.wrench} size={12} color={Y} />
              <Ic path={PATHS.wrench} size={12} color={Y} />
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#555" }}>Powered by Gemini 1.5 Pro Vision • CAT Inspect Integration</span>
          <div className="cat-stripes" style={{ padding: "2px 7px", borderRadius: 3, fontWeight: 900, fontSize: 10, color: "#000", letterSpacing: 0.5 }}>CAT</div>
        </div>
      </div>

      {/* ── Hazard stripe trim ── */}
      <div className="cat-hazard-stripes" style={{ height: 8, flexShrink: 0 }} />

      <ComponentModal comp={selected} onClose={() => setSelected(null)} onAction={handleComponentAction} />
    </div>
  );
}
