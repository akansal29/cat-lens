// ─── Design tokens ────────────────────────────────────────────────────────────
export const Y      = "#FFCD00";   // CAT yellow
export const BG     = "#0a0a0a";
export const CARD   = "#161616";
export const BORDER = "rgba(255,205,0,0.14)";

export const STATUS = {
  good:     { color: "#34c759", label: "Good",     emoji: "✓" },
  warning:  { color: "#ff9500", label: "Monitor",  emoji: "⚠" },
  critical: { color: "#ff3b30", label: "Critical", emoji: "✕" },
  info:     { color: "#0a84ff", label: "Info",     emoji: "i" },
};

// ─── Icon paths ───────────────────────────────────────────────────────────────
export const PATHS = {
  cam:      ["M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z","M12 13m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0"],
  mic:      ["M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z","M19 10v2a7 7 0 0 1-14 0v-2","M12 19v4","M8 23h8"],
  check:    "M20 6L9 17l-5-5",
  warn:     ["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v4","M12 17h.01"],
  x:        ["M18 6 6 18","M6 6l12 12"],
  info:     ["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z","M12 16v-4","M12 8h.01"],
  map:      ["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z","M12 13m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0"],
  send:     ["M22 2L11 13","M22 2L15 22 11 13 2 9l20-7z"],
  list:     ["M8 6h13","M8 12h13","M8 18h13","M3 6h.01","M3 12h.01","M3 18h.01"],
  wrench:   "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  scan:     ["M3 7V5a2 2 0 0 1 2-2h2","M17 3h2a2 2 0 0 1 2 2v2","M21 17v2a2 2 0 0 1-2 2h-2","M7 21H5a2 2 0 0 1-2-2v-2"],
  eye:      ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0"],
  key:      "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  upload:   ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M17 8l-5-5-5 5","M12 3v12"],
  download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M7 10l5 5 5-5","M12 15V3"],
};

export const statusIconPath = (s) =>
  ({ good: PATHS.check, warning: PATHS.warn, critical: PATHS.x, info: PATHS.info }[s] || PATHS.info);

// ─── Tiny atoms ───────────────────────────────────────────────────────────────
export function Ic({ path, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {(Array.isArray(path) ? path : [path]).map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

export function Card({ children, glow, style = {}, className = "" }) {
  return (
    <div className={className} style={{
      background: CARD, borderRadius: 12, padding: 14,
      border: `1px solid ${glow ? glow + "35" : BORDER}`,
      boxShadow: glow ? `0 0 20px ${glow}10` : "none",
      ...style,
    }}>{children}</div>
  );
}

export function Pill({ children, color }) {
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 4,
      background: `${color}18`, color, border: `1px solid ${color}28`,
      whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

export function Btn({ children, onClick, disabled, variant = "primary", style = {} }) {
  const base = {
    border: "none", borderRadius: 8, padding: "9px 14px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600, fontSize: 13,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
    transition: "all 0.15s", opacity: disabled ? 0.45 : 1, ...style,
  };
  const variants = {
    primary: { background: Y,                              color: "#000" },
    ghost:   { background: "#1e1e1e",                      color: "#ccc",    border: `1px solid ${BORDER}` },
    danger:  { background: "rgba(255,59,48,0.12)",         color: "#ff3b30", border: "1px solid rgba(255,59,48,0.28)" },
    green:   { background: "rgba(52,199,89,0.12)",         color: "#34c759", border: "1px solid rgba(52,199,89,0.28)" },
    blue:    { background: "rgba(10,132,255,0.12)",        color: "#0a84ff", border: "1px solid rgba(10,132,255,0.28)" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
}

export function Toggle({ value, onChange, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      {label && <span style={{ fontSize: 12, color: "#777" }}>{label}</span>}
      <div onClick={() => onChange(!value)} style={{
        width: 40, height: 22, borderRadius: 11,
        background: value ? "#34c759" : "#2a2a2a",
        cursor: "pointer", position: "relative", transition: "background 0.2s",
        border: `1px solid ${value ? "#34c759" : "#3a3a3a"}`,
      }}>
        <div style={{
          position: "absolute", top: 3, left: value ? 20 : 3,
          width: 14, height: 14, borderRadius: "50%",
          background: "#fff", transition: "left 0.2s",
        }} />
      </div>
    </div>
  );
}
