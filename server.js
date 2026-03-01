// ─── CAT Lens Local API Server ────────────────────────────────────────────────
// Runs on http://localhost:3001 — calls Groq vision API server-side (no CORS)
// Start with: node server.js

import http from 'http'
import { readFileSync } from 'fs'

// Load .env
try {
  for (const line of readFileSync('.env', 'utf-8').split('\n')) {
    const eq = line.indexOf('=')
    if (eq > 0) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
  }
} catch {}

const GROQ_KEY  = process.env.GROQ_API_KEY || ''
const GROQ_URL  = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL     = 'meta-llama/llama-4-scout-17b-16e-instruct'

const VISION_SYSTEM = 'You are CAT Lens, an AI vision inspection system for heavy equipment. Respond with ONLY a raw JSON object. No markdown. No code fences. No explanation. Just JSON.'
const VISION_PROMPT = `Analyze this image for heavy equipment inspection. Return ONLY this JSON, nothing else:
{"components":[{"id":"1","name":"Component Name","status":"good","confidence":0.9,"x":50,"y":50,"details":"Specific observation"}],"overall_health":80,"summary":"One sentence summary"}

Rules:
- status must be: good, warning, critical, or info
- x, y are 0-100 percent positions on the image where the component appears
- confidence is 0.0 to 1.0
- Find 2-6 components — describe what you actually see in the image
- Be specific about actual damage, wear, or conditions you observe
- If no machinery visible, describe whatever objects are present`

async function callGroq(messages, maxTokens = 1024) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature: 0.2 }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Groq HTTP ${res.status}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

function parseJSON(raw) {
  const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const match = clean.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in response')
  return JSON.parse(match[0])
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function json(res, data, status = 200) {
  cors(res)
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

const server = http.createServer(async (req, res) => {
  cors(res)

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }
  if (req.method === 'GET' && req.url === '/health') { return json(res, { ok: true }) }
  if (req.method !== 'POST')    { res.writeHead(404); res.end(); return }

  let body = ''
  req.on('data', chunk => body += chunk)
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body)

      // ── Analyze frame ────────────────────────────────────────────────────
      if (req.url === '/api/analyze') {
        const { image } = payload
        const raw = await callGroq([
          { role: 'system', content: VISION_SYSTEM },
          { role: 'user', content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
            { type: 'text', text: VISION_PROMPT },
          ]},
        ])
        const parsed = parseJSON(raw)
        if (!parsed.components) parsed.components = []
        console.log(`[CAT Lens] Analyzed frame: ${parsed.components.length} components`)
        return json(res, parsed)
      }

      // ── Spatial Q&A ──────────────────────────────────────────────────────
      if (req.url === '/api/spatial') {
        const { image, question } = payload
        const text = await callGroq([{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
            { type: 'text', text: question },
          ],
        }], 400)
        return json(res, { text })
      }

      // ── Voice parse ──────────────────────────────────────────────────────
      if (req.url === '/api/voice') {
        const { voiceText } = payload
        const raw = await callGroq([{
          role: 'system',
          content: 'You are CAT Lens voice parser for equipment inspection. Return ONLY JSON, no markdown: {"location":"component name","observation":"what they saw","status":"good|warning|critical","action":"what to log","followUp":"any reminder"}',
        }, {
          role: 'user',
          content: `Parse this inspection note: "${voiceText}"`,
        }], 400)
        return json(res, parseJSON(raw))
      }

      // ── Repair report ────────────────────────────────────────────────────
      if (req.url === '/api/report') {
        const { items, machine = 'CAT 320 Excavator' } = payload

        const critical = items.filter(i => i.status === 'critical')
        const warnings = items.filter(i => i.status === 'warning')
        const good     = items.filter(i => i.status === 'good')

        const fmtItem = i => {
          const src = i.method === 'voice-groq'
            ? `Voice note @ ${i.time}`
            : `Vision AI — ${Math.round((i.confidence || 0) * 100)}% confidence`
          const lines = [`- ${i.component} [${src}]: ${i.details}`]
          if (i.rawCommand)  lines.push(`  Field note: "${i.rawCommand}"`)
          if (i.action)      lines.push(`  Tech action: ${i.action}`)
          if (i.followUp)    lines.push(`  Follow-up: ${i.followUp}`)
          return lines.join('\n')
        }

        const context = [
          `MACHINE: ${machine}`,
          `INSPECTION DATE: ${new Date().toLocaleString()}`,
          `TOTALS: ${items.length} findings — ${critical.length} critical, ${warnings.length} warnings, ${good.length} good`,
          '',
          `CRITICAL FINDINGS (${critical.length}):`,
          critical.length ? critical.map(fmtItem).join('\n') : '  None',
          '',
          `WARNINGS (${warnings.length}):`,
          warnings.length ? warnings.map(fmtItem).join('\n') : '  None',
          '',
          `ALL CLEAR (${good.length}):`,
          good.length ? good.map(i => `- ${i.component}: ${i.details}`).join('\n') : '  None',
        ].join('\n')

        const REPORT_SYSTEM = `You are a Caterpillar certified field service engineer generating an official CAT repair order. Write a professional service report with exactly these sections in order:

INSPECTION SUMMARY
CRITICAL — DO NOT OPERATE
SCHEDULED MAINTENANCE
ALL CLEAR
FIELD OBSERVATIONS
RECOMMENDED ACTION PLAN

Rules:
- Plain text only. No markdown, no asterisks, no dashes as bullets — use numbers or letters.
- INSPECTION SUMMARY: one paragraph — machine, date, overall health verdict (SAFE TO OPERATE / HOLD FOR SERVICE / GROUND THIS MACHINE), and key stats.
- CRITICAL — DO NOT OPERATE: list only critical items. Each entry: component name, specific finding, exact action required, urgency (e.g. "before next shift", "immediately").
- SCHEDULED MAINTENANCE: list only warning items. Each entry: component name, finding, recommended service, timeframe (e.g. "within 50 operating hours", "at next 250-hour PM").
- ALL CLEAR: brief numbered list of confirmed-good components.
- FIELD OBSERVATIONS: include any voice-logged notes from the technician verbatim, with their parsed action and follow-up.
- RECOMMENDED ACTION PLAN: numbered priority list — what to do first through last, with estimated timeframes and who should perform each action (operator vs certified technician).
- End the report with a single line: OVERALL VERDICT: [SAFE TO OPERATE / HOLD FOR SERVICE / GROUND THIS MACHINE]`

        const text = await callGroq([
          { role: 'system', content: REPORT_SYSTEM },
          { role: 'user',   content: `Generate inspection report:\n\n${context}` },
        ], 1400)
        return json(res, { text })
      }

      res.writeHead(404); res.end()
    } catch (e) {
      console.error('[CAT Lens] Server error:', e.message)
      json(res, { error: e.message }, 500)
    }
  })
})

const PORT = 3001
server.listen(PORT, () => {
  console.log(`\n🔧 CAT Lens API server running on http://localhost:${PORT}`)
  if (!GROQ_KEY) console.warn('⚠  GROQ_API_KEY not set in .env — get a free key at console.groq.com')
  else console.log('✓  Groq API key loaded')
})
