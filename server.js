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
        const { items } = payload
        const summary = items.map(i => `${i.component}: ${i.status} (${i.method}) — ${i.details}`).join('\n')
        const text = await callGroq([{
          role: 'system',
          content: 'You are a CAT equipment maintenance report generator. Write a repair order with three sections: IMMEDIATE ACTIONS, SCHEDULED MAINTENANCE, ALL CLEAR. Plain text only, numbered lists, no markdown.',
        }, {
          role: 'user',
          content: `Generate repair report for CAT 320 Excavator:\n\n${summary}`,
        }], 700)
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
