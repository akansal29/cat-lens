# CAT Lens — Vision-First Equipment Inspection

> HackIllinois 2026 · Built with Groq Llama 4 Vision

CAT Lens is an AI-powered inspection app for Caterpillar heavy equipment. Point your camera at a machine and get real-time AR overlays, voice commands, and auto-generated repair orders.

## Real AI Pipeline

| Step | Technology | What happens |
|------|-----------|--------------|
| Live camera | `getUserMedia()` | Real device camera feed |
| Vision analysis | Groq Llama 4 Vision | Identifies components, status, positions |
| AR overlays | Canvas + React | Markers placed at AI-detected coordinates |
| Voice commands | Web Speech API + Groq | Parses "Hey CAT, fuel filter looks worn" → structured checklist entry |
| Repair orders | Groq Llama 4 | Generates professional maintenance report from all detections |

## Quick Start

```bash
npm install

# Copy env template and add your Groq API key (free at console.groq.com)
cp .env.example .env
# Edit .env and set GROQ_API_KEY=your_key_here

# Terminal 1 — API server
node server.js

# Terminal 2 — Frontend
npm run dev
```

Open http://localhost:5173.

## Features

- **Camera Tab** — Start camera, scan on demand or auto-scan every 8s, see health summary + last scanned frame
- **Detection Tab** — List of all AI-detected components with status, confidence, and position
- **Spatial Tab** — Ask any question about what the camera sees ("Are there fluid leaks?")
- **Voice Tab** — Speak or type commands hands-free → parsed into structured checklist entries with follow-up reminders
- **Checklist Tab** — Auto-filled from Vision + Voice, generates repair report

## Tech Stack

- **React + Vite** — Frontend framework
- **Groq Llama 4 Vision** — Vision AI + voice parsing + repair report generation
- **Web Speech API** — Browser-native speech recognition (Chrome/Edge)
- **getUserMedia** — Live camera access (works on localhost + HTTPS)

## Notes

- Camera requires **localhost** or **HTTPS** (browser security requirement)
- Speech recognition works best in **Chrome** or **Edge**
- The frontend falls back to mock data if `server.js` is not running
