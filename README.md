# 🚜 CAT Lens — Vision-First Equipment Inspection

> HackIllinois 2026 · Built with Gemini 1.5 Flash Vision + Claude Sonnet

CAT Lens is an AI-powered inspection app for Caterpillar heavy equipment. Point your camera at a machine and get real-time AR overlays, voice commands, and auto-generated repair orders.

## Real AI Pipeline

| Step | Technology | What happens |
|------|-----------|--------------|
| 📷 Live camera | `getUserMedia()` | Real device camera feed |
| 🧠 Vision analysis | Gemini 1.5 Flash | Identifies components, status, positions |
| 📍 AR overlays | Canvas + React | Markers placed at real Gemini-detected coordinates |
| 🎤 Voice commands | Web Speech API + Claude | Parses "Hey CAT, fuel filter looks worn" → structured checklist entry |
| 📋 Repair orders | Claude Sonnet | Generates professional maintenance report from all detections |

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 and enter your **Gemini API key** (free at [aistudio.google.com](https://aistudio.google.com)).

> **Why Gemini for vision?** Gemini 1.5 Flash accepts raw image frames and returns structured JSON with component positions — perfect for real-time AR overlay placement.

## Features

- **Camera Tab** — Start camera, scan on demand or auto-scan every 8s, see health summary + last scanned frame
- **Detection Tab** — List of all Gemini-detected components with status, confidence, and position
- **Spatial Tab** — Ask any question about what the camera sees ("Are there fluid leaks?") — Gemini answers from the actual frame
- **Voice Tab** — Speak or type commands hands-free → Claude parses into structured checklist entries with follow-up reminders
- **Checklist Tab** — Auto-filled from Vision + Voice, generates Claude repair report

## Deploy to Netlify (2 minutes)

```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

## Tech Stack

- **React + Vite** — Frontend framework
- **Gemini 1.5 Flash** — Vision AI (free tier, no billing required)
- **Claude Sonnet** — Voice parsing + repair report generation  
- **Web Speech API** — Browser-native speech recognition (Chrome/Edge)
- **getUserMedia** — Live camera access (works on localhost + HTTPS)

## Notes

- Camera requires **localhost** or **HTTPS** (browser security requirement)
- Speech recognition works best in **Chrome** or **Edge**
- Gemini API key is kept in memory only — never stored or sent anywhere except Google's API
