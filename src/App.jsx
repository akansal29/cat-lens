import { useState, useEffect, useRef, useCallback } from "react";
import { Y, BORDER, PATHS, STATUS, Ic, Card, Btn, Pill, statusIconPath } from "./ui.jsx";
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
  return (
    <div style={{ display: "flex", background: "#0f0f0f", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: 1, padding: "8px 2px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          background: active === t.id ? `${Y}10` : "transparent",
          borderBottom: `2px solid ${active === t.id ? Y : "transparent"}`,
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

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {

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
  const [scanLog, setScanLog]           = useState([]);
  const [isRecording, setIsRecording]   = useState(false);

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

  // ── Auto-scan timer ───────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(autoScanRef.current);
    if (autoScan && cameraOn) {
      autoScanRef.current = setInterval(scanFrame, 8000);
    }
    return () => clearInterval(autoScanRef.current);
  }, [autoScan, cameraOn, scanFrame]);

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

  const critCount = components.filter(c => c.status === "critical").length;
  const good      = components.filter(c => c.status === "good").length;
  const warn      = components.filter(c => c.status === "warning").length;

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

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{
        background: "#0f0f0f", borderBottom: `1px solid ${BORDER}`,
        padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
        zIndex: 20, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: Y, padding: "3px 8px", borderRadius: 4, fontWeight: 900, fontSize: 14, color: "#000", letterSpacing: 1 }}>CAT</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>CAT Lens</div>
            <div style={{ color: "#444", fontSize: 10 }}>AI Vision · HackIllinois 2026</div>
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
          <Pill color={Y}>Groq Vision ✓</Pill>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <TabBar active={activeTab} onChange={setActiveTab} critCount={critCount} logCount={scanLog.length} />

      {/* ── Main split ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Camera — 55% */}
        <div style={{ width: "55%", flexShrink: 0, borderRight: `1px solid ${BORDER}` }}>
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
        </div>

        {/* Panel — 45% */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div key={activeTab} style={{ height: "100%", animation: "cat-slide 0.2s ease" }}>
            {tabContent[activeTab]}
          </div>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div style={{
        background: "#0f0f0f", borderTop: `1px solid ${BORDER}`,
        padding: "5px 14px", display: "flex", justifyContent: "space-between",
        alignItems: "center", flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#444" }}>
          <span>CAT 320 Excavator</span>
          <span>Components: <span style={{ color: Y }}>{components.length}</span></span>
          {components.length > 0 && (
            <span>
              <span style={{ color: "#34c759" }}>{good}G</span>{" · "}
              <span style={{ color: "#ff9500" }}>{warn}W</span>{" · "}
              <span style={{ color: "#ff3b30" }}>{critCount}C</span>
            </span>
          )}
          {scanLog.length > 0 && <span style={{ color: Y }}>{scanLog.length} scans logged</span>}
        </div>
        <div style={{ fontSize: 10, color: "#333" }}>Groq · Llama 4 Vision · CAT Inspect</div>
      </div>

      <ComponentModal comp={selected} onClose={() => setSelected(null)} onAction={handleComponentAction} />
    </div>
  );
}
