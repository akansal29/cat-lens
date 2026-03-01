// ─── CAT Lens Vision API ───────────────────────────────────────────────────────
// Calls our API server (local or deployed) → Groq vision AI

// Use production URL if available, otherwise localhost
const SERVER = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function post(endpoint, body) {
  const res = await fetch(`${SERVER}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || `Server error ${res.status}`)
  }
  return res.json()
}

// ─── Mock fallback (if server is down) ────────────────────────────────────────
const MOCK_POOL = [
  { name: "Hydraulic Cylinder",  status: "good",     conf: [0.91, 0.97], details: "No visible leaks, seals intact, full extension range normal." },
  { name: "Boom Arm",            status: "good",     conf: [0.88, 0.95], details: "Structural integrity intact, no cracks or deformation visible." },
  { name: "Track Tensioner",     status: "warning",  conf: [0.82, 0.90], details: "Slight slack on right side, recommend tension adjustment soon." },
  { name: "Bucket Teeth",        status: "warning",  conf: [0.87, 0.94], details: "Wear on teeth #3 and #5, replacement within 50 operating hours." },
  { name: "Undercarriage",       status: "critical", conf: [0.78, 0.88], details: "Significant wear on left side rollers, immediate inspection required." },
  { name: "Fuel Filter",         status: "warning",  conf: [0.80, 0.89], details: "Filter showing early clogging signs, service within 20 hours." },
  { name: "Swing Motor",         status: "good",     conf: [0.90, 0.96], details: "Rotation smooth, no abnormal noise or vibration detected." },
  { name: "Return Filter",       status: "critical", conf: [0.76, 0.85], details: "Bypass indicator triggered, replace immediately before next operation." },
  { name: "Final Drive",         status: "warning",  conf: [0.79, 0.88], details: "Oil level slightly low, check for leaks and top off." },
]

const rand = (min, max) => Math.random() * (max - min) + min

function mockAnalysis() {
  const count = Math.floor(rand(3, 6))
  const picked = [...MOCK_POOL].sort(() => Math.random() - 0.5).slice(0, count)
  const components = picked.map((c, i) => ({
    id: String(i + 1), name: c.name, status: c.status,
    confidence: parseFloat(rand(c.conf[0], c.conf[1]).toFixed(2)),
    x: parseFloat(rand(10, 88).toFixed(1)),
    y: parseFloat(rand(10, 85).toFixed(1)),
    details: c.details,
  }))
  const goodCount = components.filter(c => c.status === "good").length
  return {
    components,
    overall_health: Math.round((goodCount / components.length) * 100),
    summary: `${goodCount}/${components.length} components operating normally.`,
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────
export async function analyzeFrame(base64Image) {
  if (!base64Image) throw new Error("No image frame captured")
  try {
    console.log("[CAT Lens] Calling local server → Groq Vision...")
    const result = await post('/api/analyze', { image: base64Image })
    console.log("[CAT Lens] Detected", result.components?.length, "components")
    return result
  } catch (e) {
    console.warn("[CAT Lens] Server unavailable, using mock:", e.message)
    return mockAnalysis()
  }
}

export async function askSpatial(base64Image, question) {
  try {
    const { text } = await post('/api/spatial', { image: base64Image, question })
    return text || "No response."
  } catch {
    return "Server unavailable — start server.js with: node server.js"
  }
}

export async function parseVoice(voiceText) {
  try {
    return await post('/api/voice', { voiceText })
  } catch {
    // Simple local fallback
    const t = voiceText.toLowerCase()
    let status = t.includes("critical") || t.includes("broken") || t.includes("leak") ? "critical"
      : t.includes("worn") || t.includes("loose") || t.includes("check") ? "warning" : "good"
    return { location: "Equipment", observation: voiceText, status,
      action: status === "critical" ? "Create work order" : "Log observation", followUp: "" }
  }
}

export async function generateRepairReport(items) {
  try {
    const { text } = await post('/api/report', { items })
    return text
  } catch {
    return `CAT 320 Excavator Repair Report\n\nItems logged: ${items.length}\nCritical: ${items.filter(i=>i.status==="critical").length}\nWarning: ${items.filter(i=>i.status==="warning").length}\n\nStart server.js for AI-generated reports.`
  }
}

export function captureFrame(videoEl, quality = 0.6) {
  const canvas = document.createElement("canvas")
  canvas.width  = videoEl.videoWidth  || 1280
  canvas.height = videoEl.videoHeight || 720
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D context unavailable")
  ctx.drawImage(videoEl, 0, 0)
  return canvas.toDataURL("image/jpeg", quality).split(",")[1]
}
