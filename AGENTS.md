# AGENTS.md: Signal Radio Operational Manual

## 1. TL;DR Core Transformation
Signal Radio turns a static folder of MP3s into a 24/7 "live" community broadcast experience through client-side time synchronization.

## 2. Coding Standards
- **Strict TypeScript:** No `any`. Define interfaces for Track and Station metadata.
- **Functional Components:** Use React hooks for audio state management.
- **No Barrel Exports:** Import directly from files to keep bundle sizes lean.
- **Sleek UI:** Use Tailwind for a minimalist, "Signal" aesthetic (dark mode by default, SF Pro typography).

## 3. Directory Map
```text
src/
├── assets/          # Fonts (SF Pro) and Icons
├── features/
│   ├── stream/      # sync_engine, playlist_logic
│   └── ui/          # player_card, controls, live_indicator
├── hooks/           # use_firebase_sync, use_audio_player
├── lib/             # firebase_config
└── App.tsx          # Main Entry