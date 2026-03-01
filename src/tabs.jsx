import { useState, useRef } from "react";
import { Y, BORDER, CARD, STATUS, PATHS, Ic, Card, Pill, Btn, Toggle, statusIconPath } from "./ui.jsx";
import { askSpatial, parseVoice, generateRepairReport } from "./api.js";

// ─── CAMERA TAB ───────────────────────────────────────────────────────────────
export function CameraTab({ cameraOn, scanning, autoScan, onStartCamera, onScan, onAutoScan,
  components, lastFrame, capturedMedia, isRecording, onStartVideo, onStopVideo, onResume }) {
  const good = components.filter(c => c.status === "good").length;
  const health = components.length > 0 ? Math.round((good / components.length) * 100) : null;
  const healthColor = health === null ? Y : health > 70 ? "#34c759" : health > 40 ? "#ff9500" : "#ff3b30";
  const isFrozen = !!capturedMedia;

  return (
    <div style={{ padding: 14, overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Controls */}
      <Card glow={Y}>
        <div style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: 0.8, marginBottom: 10 }}>CAMERA CONTROL</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn onClick={onStartCamera} disabled={cameraOn} variant={cameraOn ? "ghost" : "primary"} style={{ width: "100%" }}>
            <Ic path={PATHS.cam} size={15} color={cameraOn ? "#555" : "#000"} />
            {cameraOn ? "✓ Camera Active" : "Start Camera"}
          </Btn>

          {/* Scan mode buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Btn onClick={onScan} disabled={!cameraOn || scanning || isRecording} variant="ghost">
              <Ic path={PATHS.scan} size={14} color={!cameraOn || scanning || isRecording ? "#555" : "#888"} />
              📷 Photo Scan
            </Btn>
            {!isRecording ? (
              <Btn onClick={onStartVideo} disabled={!cameraOn || scanning || isFrozen} variant="ghost">
                <span style={{ fontSize: 13 }}>🎥</span> Video Scan
              </Btn>
            ) : (
              <Btn onClick={onStopVideo} variant="danger">
                <div style={{ width: 8, height: 8, background: "#ff3b30", borderRadius: 2 }} />
                Stop REC
              </Btn>
            )}
          </div>

          {/* Resume / status */}
          {isFrozen && !scanning && (
            <Btn onClick={onResume} variant="ghost" style={{ width: "100%", borderColor: "rgba(255,205,0,0.4)" }}>
              <Ic path={PATHS.cam} size={14} color={Y} />
              <span style={{ color: Y }}>Resume Live Camera</span>
            </Btn>
          )}
          {scanning && (
            <div style={{ textAlign: "center", fontSize: 12, color: Y, animation: "cat-blink 0.7s infinite", padding: "4px 0" }}>
              AI analyzing frame...
            </div>
          )}
        </div>
        <div style={{ marginTop: 12 }}>
          <Toggle value={autoScan} onChange={onAutoScan} label="Auto-scan every 8s (photo)" />
        </div>
      </Card>

      {/* How it works */}
      <Card>
        <div style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: 0.8, marginBottom: 10 }}>HOW IT WORKS</div>
        {[
          ["📷", "Photo Scan",    "Freeze frame → AI analyzes → AR overlays pinned to image"],
          ["🎥", "Video Scan",    "Record clip → Stop → AI analyzes → clip loops with overlays"],
          ["📍", "AR Overlay",    "x/y coordinates from AI → real positions on capture"],
          ["🎤", "Voice Mode",    "Web Speech API → AI parses → checklist entry"],
          ["📋", "Scan Log",      "Every scan stored → reopen anytime in Log tab"],
        ].map(([em, title, desc]) => (
          <div key={title} style={{ display: "flex", gap: 10, marginBottom: 9, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16 }}>{em}</span>
            <div>
              <div style={{ color: "#ddd", fontSize: 12, fontWeight: 600 }}>{title}</div>
              <div style={{ color: "#555", fontSize: 11 }}>{desc}</div>
            </div>
          </div>
        ))}
      </Card>

      {/* Health */}
      {health !== null && (
        <Card glow={healthColor}>
          <div style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>MACHINE HEALTH</div>
          <div style={{ fontSize: 40, fontWeight: 900, color: healthColor, fontFamily: "monospace", lineHeight: 1 }}>{health}%</div>
          <div style={{ height: 5, background: "#222", borderRadius: 3, marginTop: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${health}%`, background: healthColor, transition: "width 0.7s ease", borderRadius: 3, boxShadow: `0 0 8px ${healthColor}60` }} />
          </div>
          <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
            {["good", "warning", "critical"].map(s => (
              <Pill key={s} color={STATUS[s].color}>{components.filter(c => c.status === s).length} {STATUS[s].label}</Pill>
            ))}
          </div>
        </Card>
      )}

      {/* Last scanned frame preview */}
      {lastFrame && (
        <Card>
          <div style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: 0.8, marginBottom: 6 }}>LAST ANALYZED FRAME</div>
          <img
            src={`data:image/jpeg;base64,${lastFrame}`}
            alt="Last scanned frame"
            style={{ width: "100%", borderRadius: 7, opacity: 0.85 }}
          />
        </Card>
      )}
    </div>
  );
}

// ─── DETECTION TAB ────────────────────────────────────────────────────────────
export function DetectionTab({ components, onSelect, scanning, onScan, cameraOn }) {
  const health = components.length > 0 ? Math.round((components.filter(c => c.status === "good").length / components.length) * 100) : 0;

  return (
    <div style={{ padding: 14, overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Overview Card with Stripes */}
      <div className="cat-stripes" style={{ borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 48, height: 48, background: "#000", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Ic path={PATHS.list} size={22} color={Y} />
        </div>
        <div>
          <div style={{ color: "#000", fontWeight: 900, fontSize: 18, lineHeight: 1.2 }}>Overview</div>
          <div style={{ color: "#000", fontSize: 13, fontWeight: 600, opacity: 0.75 }}>System Health</div>
        </div>
      </div>

      <Card glow={Y}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 36, height: 36, background: Y, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Ic path={PATHS.eye} size={18} color="#000" />
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Live Component Detection</div>
            <div style={{ color: "#666", fontSize: 11 }}>Groq Llama 4 Vision • Real positions</div>
          </div>
        </div>
        <Btn onClick={onScan} disabled={!cameraOn || scanning} style={{ width: "100%" }}>
          <Ic path={PATHS.scan} size={14} color={!cameraOn || scanning ? "#888" : "#000"} />
          {scanning ? "Analyzing..." : "Scan Now"}
        </Btn>
      </Card>

      {/* Stats */}
      {components.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {["good", "warning", "critical"].map(s => (
            <Card key={s} style={{ textAlign: "center", padding: 10 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: STATUS[s].color, fontFamily: "monospace" }}>
                {components.filter(c => c.status === s).length}
              </div>
              <div style={{ fontSize: 10, color: "#555" }}>{STATUS[s].label}</div>
            </Card>
          ))}
        </div>
      )}

      {components.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "#444", fontSize: 13 }}>
          {cameraOn ? "Point camera at equipment → Scan" : "Start camera in Camera tab first"}
        </div>
      ) : (
        <>
          <div style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: 0.8 }}>DETECTED COMPONENTS ({components.length})</div>
          {components.map((c, i) => {
            const sc = STATUS[c.status] || STATUS.info;
            return (
              <div key={c.id} onClick={() => onSelect(c)} style={{
                background: CARD, borderRadius: 10, padding: 12,
                border: `1px solid ${BORDER}`, cursor: "pointer",
                animation: `cat-fadein 0.25s ease ${i * 0.04}s both`,
                transition: "border-color 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${Y}50`}
                onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
              >
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 7, background: `${sc.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Ic path={statusIconPath(c.status)} size={15} color={sc.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                      <Pill color={sc.color}>{Math.round(c.confidence * 100)}%</Pill>
                    </div>
                    <div style={{ color: "#666", fontSize: 11, marginTop: 3, lineHeight: 1.5 }}>{c.details}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <Pill color={Y}>Groq Vision</Pill>
                      <Pill color={sc.color}>{sc.label}</Pill>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── SPATIAL TAB ──────────────────────────────────────────────────────────────
export function SpatialTab({ lastFrame, components }) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const ask = async (q) => {
    if (!q.trim()) return;
    if (!lastFrame) { setResponse("No frame available — scan something first."); return; }
    setLoading(true);
    setResponse("");
    try {
      const result = await askSpatial(lastFrame, q);
      setResponse(result);
      setHistory(h => [{ q, a: result, t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }, ...h].slice(0, 5));
    } catch (e) {
      setResponse(`Error: ${e.message}`);
    }
    setLoading(false);
    setQuery("");
  };

  const examples = [
    "Are there any visible fluid leaks?",
    "Which components need immediate attention?",
    "Compare wear on left vs right track",
    "What's the condition of the undercarriage?",
    "Any hairline cracks or fractures visible?",
  ];

  return (
    <div style={{ padding: 14, overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      <Card glow="#0a84ff">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, background: "#0a84ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Ic path={PATHS.map} size={18} color="#fff" />
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Spatial Vision AI</div>
            <div style={{ color: "#666", fontSize: 11 }}>Groq answers from your actual camera frame</div>
          </div>
        </div>
        {!lastFrame && (
          <div style={{ fontSize: 12, color: "#ff9500", background: "rgba(255,149,0,0.08)", borderRadius: 6, padding: "6px 10px", border: "1px solid rgba(255,149,0,0.2)" }}>
            ⚠ Scan a frame first to enable spatial queries
          </div>
        )}
      </Card>

      {/* Heatmap */}
      {components.length > 0 && (
        <Card>
          <div style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>COMPONENT HEATMAP (REAL POSITIONS)</div>
          <div style={{ position: "relative", height: 100, background: "#0d0d0d", borderRadius: 8, overflow: "hidden" }}>
            {components.map(c => {
              const sc = STATUS[c.status] || STATUS.info;
              return (
                <div key={c.id} style={{
                  position: "absolute", left: `${c.x}%`, top: `${c.y}%`,
                  width: 44, height: 44, transform: "translate(-50%,-50%)", borderRadius: "50%",
                  background: `radial-gradient(circle, ${sc.color}55 0%, transparent 70%)`,
                }} />
              );
            })}
            <div style={{ position: "absolute", bottom: 4, right: 8, fontSize: 9, color: "#333" }}>AI positions</div>
          </div>
        </Card>
      )}

      {/* Ask input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && ask(query)}
          placeholder="Ask about what the AI sees..."
          style={{ flex: 1, background: "#111", border: `1px solid rgba(10,132,255,0.25)`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13, outline: "none" }}
        />
        <Btn onClick={() => ask(query)} disabled={loading || !query.trim()} variant="blue">
          <Ic path={PATHS.send} size={14} color="#0a84ff" />
        </Btn>
      </div>

      {/* Suggestions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {examples.map((ex, i) => (
          <button key={i} onClick={() => { setQuery(ex); ask(ex); }} style={{
            background: "#111", border: "1px solid rgba(10,132,255,0.2)", borderRadius: 6,
            padding: "4px 9px", color: "#666", fontSize: 11, cursor: "pointer",
          }}>{ex}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", color: "#888", fontSize: 13, padding: 10, animation: "cat-blink 0.9s infinite" }}>Groq analyzing frame...</div>}

      {response && (
        <Card glow="#0a84ff" style={{ fontSize: 13, color: "#ddd", lineHeight: 1.7 }}>
          <div style={{ fontSize: 10, color: "#0a84ff", fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>GROQ SPATIAL ANALYSIS</div>
          {response}
        </Card>
      )}

      {history.length > 1 && history.slice(1).map((h, i) => (
        <Card key={i} style={{ opacity: 0.6 }}>
          <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>Q: {h.q} · {h.t}</div>
          <div style={{ fontSize: 12, color: "#888" }}>{h.a}</div>
        </Card>
      ))}
    </div>
  );
}

// ─── VOICE TAB ────────────────────────────────────────────────────────────────
export function VoiceTab({ voiceLog, setVoiceLog }) {
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const recogRef = useRef(null);
  const autoTimerRef = useRef(null);
  const inputRef = useRef("");

  const updateInput = (val) => { setInput(val); inputRef.current = val; };

  const cancelAutoSubmit = () => {
    if (autoTimerRef.current) { clearInterval(autoTimerRef.current); autoTimerRef.current = null; }
    setCountdown(null);
  };

  const processText = async (text) => {
    if (!text.trim()) return;
    cancelAutoSubmit();
    setLoading(true);
    try {
      const parsed = await parseVoice(text);
      if (parsed) {
        setLastResult(parsed);
        setVoiceLog(prev => [{
          id: Date.now().toString(),
          ...parsed,
          rawCommand: text,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }, ...prev]);
        updateInput("");
      }
    } catch (e) {
      setLastResult({ location: "Error", observation: e.message, status: "critical", action: "Check API key", followUp: "" });
    }
    setLoading(false);
  };

  const scheduleAutoSubmit = (text) => {
    cancelAutoSubmit();
    if (!text.trim()) return;
    let secs = 5;
    setCountdown(secs);
    autoTimerRef.current = setInterval(() => {
      secs -= 1;
      setCountdown(secs);
      if (secs <= 0) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
        setCountdown(null);
        processText(inputRef.current);
      }
    }, 1000);
  };

  const startSpeech = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { updateInput("Browser speech not supported — type instead."); return; }
    cancelAutoSubmit();
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.onresult = e => { const t = e.results[0][0].transcript; updateInput(t); };
    r.onend = () => { setListening(false); scheduleAutoSubmit(inputRef.current); };
    r.onerror = () => setListening(false);
    r.start();
    recogRef.current = r;
    setListening(true);
  };

  const process = () => { cancelAutoSubmit(); processText(input); };

  return (
    <div style={{ padding: 14, overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      <Card glow="#34c759">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, background: "#34c759", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Ic path={PATHS.mic} size={18} color="#fff" />
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Voice Mode — Dirty Hands Protocol</div>
            <div style={{ color: "#666", fontSize: 11 }}>Speak → 5s silence → auto-sends hands-free</div>
          </div>
        </div>
      </Card>

      {/* Mic button */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <button onClick={startSpeech} disabled={listening} style={{
          width: 64, height: 64, borderRadius: "50%",
          background: listening ? "#34c759" : "rgba(52,199,89,0.12)",
          border: "2px solid #34c759", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", transition: "all 0.2s",
        }}>
          {listening && <div style={{ position: "absolute", inset: -7, borderRadius: "50%", border: "2px solid #34c759", animation: "cat-pulse 1s ease-in-out infinite" }} />}
          <Ic path={PATHS.mic} size={26} color={listening ? "#000" : "#34c759"} />
        </button>
        <div style={{ fontSize: 12, color: "#555" }}>{listening ? "Listening..." : "Tap mic or type below"}</div>
      </div>

      {/* Waveform */}
      <div style={{ background: "#0d0d0d", borderRadius: 8, padding: "6px 10px", display: "flex", alignItems: "center", gap: 1.5, height: 44 }}>
        {Array.from({ length: 32 }).map((_, i) => (
          <div key={i} style={{
            flex: 1, background: "#34c759", borderRadius: 2, minHeight: 3,
            animation: listening ? `cat-wave 0.6s ease-in-out ${i * 0.03}s infinite alternate` : "none",
            height: listening ? "70%" : "15%", transition: "height 0.3s",
          }} />
        ))}
      </div>

      {/* Auto-submit countdown */}
      {countdown !== null && (
        <div style={{
          background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.28)",
          borderRadius: 8, padding: "8px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 12, color: "#34c759" }}>
            Auto-sending in <strong style={{ fontSize: 15, fontFamily: "monospace" }}>{countdown}s</strong>…
          </span>
          <button onClick={cancelAutoSubmit} style={{
            background: "none", border: "1px solid rgba(52,199,89,0.35)",
            borderRadius: 5, color: "#34c759", fontSize: 11, padding: "3px 9px", cursor: "pointer",
          }}>Cancel</button>
        </div>
      )}

      {/* Text input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => { updateInput(e.target.value); if (countdown !== null) cancelAutoSubmit(); }}
          onKeyDown={e => e.key === "Enter" && process()}
          placeholder='e.g. "Hey CAT, secondary fuel filter seal looks worn, no leaks yet"'
          style={{ flex: 1, background: "#111", border: "1px solid rgba(52,199,89,0.2)", borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13, outline: "none" }}
        />
        <Btn onClick={process} disabled={loading || !input.trim()} variant="green">
          <Ic path={PATHS.send} size={14} color="#34c759" />
        </Btn>
      </div>

      {loading && <div style={{ textAlign: "center", color: "#888", fontSize: 12 }}>Groq parsing command...</div>}

      {/* Last parse result */}
      {lastResult && (
        <Card glow="#34c759">
          <div style={{ fontSize: 10, color: "#34c759", fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>✓ GROQ PARSED</div>
          {[["Location", lastResult.location], ["Observation", lastResult.observation], ["Status", lastResult.status], ["Action", lastResult.action], ["Follow-up", lastResult.followUp]].map(([k, v]) => v && (
            <div key={k} style={{ marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: Y, fontWeight: 600 }}>{k}: </span>
              <span style={{ color: "#ccc" }}>{v}</span>
            </div>
          ))}
        </Card>
      )}

      {/* Voice log */}
      {voiceLog.length > 0 && (
        <>
          <div style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: 0.8 }}>COMMAND LOG ({voiceLog.length})</div>
          {voiceLog.map((cmd, i) => {
            const sc = STATUS[cmd.status] || STATUS.info;
            return (
              <Card key={cmd.id} style={{ animation: `cat-fadein 0.2s ease ${i * 0.04}s both` }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <span style={{ color: sc.color, fontSize: 16 }}>{sc.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{cmd.location}</div>
                    <div style={{ color: "#666", fontSize: 11, fontStyle: "italic", marginTop: 2 }}>"{cmd.rawCommand}"</div>
                    <div style={{ color: "#ccc", fontSize: 11, marginTop: 3 }}>→ {cmd.action}</div>
                    {cmd.followUp && <div style={{ fontSize: 10, color: "#34c759", marginTop: 5, background: "rgba(52,199,89,0.08)", borderRadius: 4, padding: "3px 7px" }}>{cmd.followUp}</div>}
                  </div>
                  <div style={{ fontSize: 10, color: "#444", whiteSpace: "nowrap" }}>{cmd.time}</div>
                </div>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── CHECKLIST TAB ────────────────────────────────────────────────────────────
export function ChecklistTab({ components, voiceLog }) {
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyReport = () => {
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadReport = () => {
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cat-repair-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const items = [
    ...components.map(c => ({
      component: c.name, status: c.status, method: "groq-vision",
      time: "Live", details: c.details,
    })),
    ...voiceLog.map(v => ({
      component: v.location, status: v.status, method: "voice-groq",
      time: v.time, details: v.observation,
    })),
  ];

  const issues = items.filter(i => i.status === "critical" || i.status === "warning").length;

  const makeReport = async () => {
    setLoading(true);
    setReport("");
    try {
      const text = await generateRepairReport(items);
      setReport(text);
    } catch (e) {
      setReport(`Error: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 14, overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      <Card glow={Y}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 36, height: 36, background: Y, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Ic path={PATHS.list} size={18} color="#000" />
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Inspection Checklist</div>
            <div style={{ color: "#666", fontSize: 11 }}>Auto-filled by Groq Vision + Groq Voice</div>
          </div>
        </div>
        <div style={{ height: 5, background: "#222", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: items.length > 0 ? "100%" : "0%", background: Y, transition: "width 0.6s", borderRadius: 3, boxShadow: `0 0 8px ${Y}50` }} />
        </div>
        <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>{items.length} items logged</div>
      </Card>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {["good", "warning", "critical"].map(s => (
          <Card key={s} style={{ textAlign: "center", padding: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: STATUS[s].color, fontFamily: "monospace" }}>
              {items.filter(i => i.status === s).length}
            </div>
            <div style={{ fontSize: 10, color: "#555" }}>{STATUS[s].label}</div>
          </Card>
        ))}
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "28px 16px", color: "#444", fontSize: 13 }}>
          Scan equipment or use voice commands to populate checklist
        </div>
      ) : (
        <>
          <div style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: 0.8 }}>ALL ITEMS</div>
          {items.map((item, i) => {
            const sc = STATUS[item.status] || STATUS.info;
            const isVoice = item.method === "voice-groq";
            return (
              <Card key={i} style={{ animation: `cat-fadein 0.2s ease ${i * 0.03}s both` }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 6, background: `${sc.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Ic path={statusIconPath(item.status)} size={13} color={sc.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{item.component}</span>
                      <span style={{ fontSize: 10, color: "#444" }}>{item.time}</span>
                    </div>
                    <div style={{ color: "#666", fontSize: 11, marginTop: 2 }}>{item.details}</div>
                    <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
                      <Pill color={isVoice ? "#34c759" : Y}>{isVoice ? "🎤 Groq Voice" : "📷 Groq Vision"}</Pill>
                      <Pill color={sc.color}>{sc.label}</Pill>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </>
      )}

      <Btn onClick={makeReport} disabled={loading || items.length === 0} style={{ width: "100%", marginTop: 4 }}>
        <Ic path={PATHS.wrench} size={15} color={loading || items.length === 0 ? "#888" : "#000"} />
        {loading ? "Generating Report..." : `Generate Repair Orders (${issues} issues)`}
      </Btn>

      {report && (
        <Card glow={Y}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: Y, fontWeight: 700, letterSpacing: 0.5 }}>📋 REPAIR REPORT</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={copyReport} style={{
                background: "none", border: `1px solid ${Y}40`, borderRadius: 5,
                color: copied ? "#34c759" : Y, fontSize: 11, padding: "3px 9px", cursor: "pointer",
              }}>{copied ? "Copied!" : "Copy"}</button>
              <button onClick={downloadReport} style={{
                background: "none", border: `1px solid ${Y}40`, borderRadius: 5,
                color: Y, fontSize: 11, padding: "3px 9px", cursor: "pointer",
              }}>Download</button>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#ddd", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{report}</div>
        </Card>
      )}

      <div style={{ textAlign: "center", fontSize: 10, color: "#3a3a3a" }}>Synced with Cat Inspect & SIS 2.0</div>
    </div>
  );
}

// ─── LOG TAB ──────────────────────────────────────────────────────────────────
export function LogTab({ scanLog, onRestore }) {
  const [expanded, setExpanded] = useState(null);

  const exportCSV = () => {
    const rows = [["Scan Time", "Type", "Health %", "Summary", "Component", "Status", "Confidence %", "Details"]];
    for (const entry of scanLog) {
      const ts = entry.timestamp.toLocaleString();
      if (entry.components.length === 0) {
        rows.push([ts, entry.type, entry.health, entry.summary, "", "", "", ""]);
      } else {
        for (const c of entry.components) {
          rows.push([ts, entry.type, entry.health, entry.summary,
            c.name, c.status, Math.round(c.confidence * 100), c.details.replace(/"/g, "'")]);
        }
      }
    }
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cat-scan-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 14, overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      <Card glow={Y}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, background: Y, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Ic path={PATHS.activity} size={18} color="#000" />
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Scan History</div>
              <div style={{ color: "#666", fontSize: 11 }}>{scanLog.length} capture{scanLog.length !== 1 ? "s" : ""} stored · click any to restore</div>
            </div>
          </div>
          {scanLog.length > 0 && (
            <button onClick={exportCSV} style={{
              background: "none", border: `1px solid ${Y}40`, borderRadius: 5,
              color: Y, fontSize: 11, padding: "4px 10px", cursor: "pointer", fontWeight: 600,
            }}>Export CSV</button>
          )}
        </div>
      </Card>

      {scanLog.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 16px", color: "#444", fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📷</div>
          No scans yet — use Photo Scan or Video Scan to populate this log
        </div>
      ) : scanLog.map((entry, i) => {
        const isOpen = expanded === entry.id;
        const healthColor = entry.health > 70 ? "#34c759" : entry.health > 40 ? "#ff9500" : "#ff3b30";
        const critCount = entry.components.filter(c => c.status === "critical").length;
        const warnCount = entry.components.filter(c => c.status === "warning").length;

        return (
          <Card key={entry.id} style={{ animation: `cat-fadein 0.2s ease ${i * 0.03}s both` }}>
            {/* Row */}
            <div style={{ display: "flex", gap: 10 }}>
              {/* Thumbnail */}
              <div style={{ width: 64, height: 48, borderRadius: 6, overflow: "hidden", flexShrink: 0, position: "relative", background: "#111" }}>
                <img
                  src={`data:image/jpeg;base64,${entry.thumbnail}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  alt="scan"
                />
                <div style={{
                  position: "absolute", bottom: 2, left: 2, fontSize: 11,
                  background: "rgba(0,0,0,0.6)", borderRadius: 3, padding: "1px 4px",
                }}>
                  {entry.type === "video" ? "🎥" : "📷"}
                </div>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: healthColor, fontWeight: 900, fontSize: 18, fontFamily: "monospace" }}>{entry.health}%</span>
                  <span style={{ fontSize: 10, color: "#444" }}>
                    {entry.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div style={{ color: "#777", fontSize: 11, marginTop: 2, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entry.summary}
                </div>
                <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
                  <Pill color={Y}>{entry.components.length} components</Pill>
                  {critCount > 0 && <Pill color="#ff3b30">{critCount} critical</Pill>}
                  {warnCount > 0 && <Pill color="#ff9500">{warnCount} warning</Pill>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
              <Btn variant="ghost" onClick={() => setExpanded(isOpen ? null : entry.id)} style={{ fontSize: 11 }}>
                {isOpen ? "Collapse" : "View Details"}
              </Btn>
              <Btn variant="primary" onClick={() => onRestore(entry)} style={{ fontSize: 11 }}>
                Restore Scan
              </Btn>
            </div>

            {/* Expanded details */}
            {isOpen && (
              <div style={{ marginTop: 12, borderTop: `1px solid rgba(255,205,0,0.1)`, paddingTop: 12 }}>
                <img
                  src={`data:image/jpeg;base64,${entry.thumbnail}`}
                  style={{ width: "100%", borderRadius: 7, marginBottom: 10, opacity: 0.88 }}
                  alt="scan detail"
                />
                <div style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>
                  DETECTED COMPONENTS ({entry.components.length})
                </div>
                {entry.components.map((c, j) => {
                  const sc = STATUS[c.status] || STATUS.info;
                  return (
                    <div key={j} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                      <div style={{ width: 26, height: 26, borderRadius: 5, background: `${sc.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Ic path={statusIconPath(c.status)} size={12} color={sc.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "#ddd", fontSize: 12, fontWeight: 600 }}>{c.name}</div>
                        <div style={{ color: "#666", fontSize: 11, marginTop: 1, lineHeight: 1.4 }}>{c.details}</div>
                      </div>
                      <Pill color={sc.color}>{Math.round(c.confidence * 100)}%</Pill>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
