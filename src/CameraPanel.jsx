import { useState, useEffect } from "react";
import { Y, BORDER, STATUS, PATHS, Ic, statusIconPath } from "./ui.jsx";

export default function CameraPanel({
  videoRef, components, cameraOn, cameraError,
  scanning, activeTab, onComponentClick, lastScanTime,
  capturedMedia, isRecording, onResume,
}) {
  const [scanY, setScanY] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setScanY(p => (p + 1) % 100), 32);
    return () => clearInterval(t);
  }, []);

  const showOverlays = ["camera", "detection", "spatial"].includes(activeTab);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#000", overflow: "hidden" }}>

      {/* Live video — always in DOM so camera keeps running; hidden when captured */}
      <video
        ref={videoRef}
        autoPlay playsInline muted
        style={{
          width: "100%", height: "100%", objectFit: "cover",
          opacity: cameraOn && !capturedMedia ? 0.88 : 0,
          position: "absolute", inset: 0,
        }}
      />

      {/* Captured photo */}
      {capturedMedia?.type === "photo" && (
        <img
          src={capturedMedia.src}
          alt="Captured frame"
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.88 }}
        />
      )}

      {/* Captured video — loops */}
      {capturedMedia?.type === "video" && (
        <video
          src={capturedMedia.src}
          autoPlay loop muted playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.88 }}
        />
      )}

      {/* Camera-off placeholder */}
      {!cameraOn && !capturedMedia && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
        }}>
          <Ic path={PATHS.cam} size={48} color="#2a2a2a" />
          <div style={{ color: "#444", fontSize: 13, textAlign: "center", maxWidth: 220 }}>
            {cameraError || "Start camera in the Camera tab →"}
          </div>
        </div>
      )}

      {/* Scan line (live mode only) */}
      {cameraOn && !capturedMedia && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `linear-gradient(180deg, transparent ${scanY}%, rgba(255,205,0,0.06) ${scanY + 1.5}%, transparent ${scanY + 3}%)`,
        }} />
      )}

      {/* Scanning border pulse */}
      {scanning && (
        <div style={{
          position: "absolute", inset: 2, border: `2px solid ${Y}`,
          pointerEvents: "none", animation: "cat-scanpulse 0.8s ease-in-out infinite",
        }} />
      )}

      {/* Corner brackets */}
      {[
        { top: 14, left: 14,    borderTop:    `2px solid ${Y}`, borderLeft:   `2px solid ${Y}` },
        { top: 14, right: 14,   borderTop:    `2px solid ${Y}`, borderRight:  `2px solid ${Y}` },
        { bottom: 14, left: 14, borderBottom: `2px solid ${Y}`, borderLeft:   `2px solid ${Y}` },
        { bottom: 14, right: 14,borderBottom: `2px solid ${Y}`, borderRight:  `2px solid ${Y}` },
      ].map((s, i) => (
        <div key={i} style={{ position: "absolute", width: 28, height: 28, pointerEvents: "none", ...s }} />
      ))}

      {/* Status badge */}
      <div style={{
        position: "absolute", top: 12, left: 12,
        display: "flex", alignItems: "center", gap: 6,
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)",
        padding: "5px 10px", borderRadius: 7, border: `1px solid ${Y}28`,
      }}>
        <Ic path={PATHS.cam} size={12} color={Y} />
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: isRecording ? "#ff3b30" : cameraOn ? "#34c759" : "#444",
          animation: isRecording ? "cat-blink 0.8s infinite" : cameraOn ? "cat-blink 2s infinite" : "none",
        }} />
        <span style={{ fontSize: 11, color: "#fff" }}>
          {isRecording ? "Recording" : capturedMedia ? (capturedMedia.type === "video" ? "Replaying" : "Photo") : cameraOn ? "Live" : "Off"}
        </span>
      </div>

      {/* Last scan time */}
      {lastScanTime && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)",
          padding: "5px 10px", borderRadius: 7, border: `1px solid ${Y}28`,
          fontSize: 11, color: "#aaa",
        }}>
          Last scan {lastScanTime}
        </div>
      )}

      {/* Resume live camera button */}
      {capturedMedia && !scanning && (
        <button onClick={onResume} style={{
          position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.75)", border: `1px solid ${Y}`,
          color: Y, padding: "8px 20px", borderRadius: 8, cursor: "pointer",
          fontSize: 12, fontWeight: 700, backdropFilter: "blur(8px)",
          zIndex: 20, display: "flex", alignItems: "center", gap: 7,
          whiteSpace: "nowrap",
        }}>
          <Ic path={PATHS.cam} size={13} color={Y} />
          Resume Live Camera
        </button>
      )}

      {/* AR component overlays */}
      {showOverlays && components.map((c, i) => {
        const sc = STATUS[c.status] || STATUS.info;
        return (
          <div key={c.id} onClick={() => onComponentClick(c)} style={{
            position: "absolute",
            left: `${c.x}%`, top: `${c.y}%`,
            transform: "translate(-50%, -50%)",
            cursor: "pointer", zIndex: 10,
            animation: `cat-popin 0.45s cubic-bezier(0.175,0.885,0.32,1.275) ${i * 0.09}s both`,
          }}>
            <div style={{
              position: "absolute", inset: -7, borderRadius: "50%",
              border: `1.5px solid ${sc.color}`,
              animation: "cat-pulse 2.4s ease-in-out infinite",
              pointerEvents: "none",
            }} />
            <div style={{
              width: 42, height: 42, borderRadius: "50%",
              background: `${sc.color}22`, border: `2px solid ${sc.color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(8px)", transition: "transform 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.2)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <span style={{ fontSize: 15, lineHeight: 1 }}>{sc.emoji}</span>
            </div>
            <div style={{
              position: "absolute", top: "calc(100% + 5px)",
              left: "50%", transform: "translateX(-50%)",
              background: `${sc.color}28`, border: `1px solid ${sc.color}55`,
              borderRadius: 5, padding: "3px 7px",
              fontSize: 10, color: "#fff", whiteSpace: "nowrap",
              backdropFilter: "blur(8px)", pointerEvents: "none",
            }}>
              <div style={{ fontWeight: 600 }}>{c.name}</div>
              <div style={{ opacity: 0.65 }}>{Math.round(c.confidence * 100)}% conf</div>
            </div>
          </div>
        );
      })}

      {/* Grid overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.07,
        display: "grid", gridTemplateColumns: "repeat(3,1fr)", gridTemplateRows: "repeat(3,1fr)",
      }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} style={{ border: `1px solid ${Y}` }} />
        ))}
      </div>
    </div>
  );
}
