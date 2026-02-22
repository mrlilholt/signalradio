# Technical Specification: Signal Radio (MVP)
**Status:** MVP Local Scaffold Implemented (2026-02-22)
**Stack:** React (Vite), Tailwind CSS, Firebase (Firestore/Hosting)

## 1. Executive Summary
Signal Radio is a 24/7 continuous audio stream for a public community. It provides a "lean-back" experience where users listen to a curated loop of unique music synced across all global listeners.

## 2. Scope & Goals
- **Core Action:** User opens the app and joins the "Live" stream already in progress.
- **In-Scope:** Cross-client sync (pseudo-live), mobile-responsive "Sleek" UI, SF Pro typography, Play/Pause/Volume controls.
- **Out-of-Scope:** Song skipping, user accounts, Firebase Functions, track requests, or chat.

## 3. Architecture & System Design
- **Sync Logic:** The "Source of Truth" is a `broadcast_start_time` (Unix timestamp) stored in Firestore. 
- **Offset Calculation:** `Current_Time - Broadcast_Start_Time % Total_Playlist_Duration`.
- **Storage:** Google Drive MP3s via direct-download formatted URLs.
- **Frontend:** Single-page React application using the Web Audio API or standard Audio element for streaming.

## 4. Machine-Optimized Naming Conventions
- **Folders:** - `src/features/stream` (Playback logic and sync math)
  - `src/features/ui` (Sleek components, Player UI)
  - `src/hooks` (Firebase and Audio observers)
- **Files:** `action_subject_type.ts`
  - `get_stream_sync.ts`
  - `use_audio_controller.ts`
  - `view_player_main.tsx`

## 5. Implementation Plan
- **Phase 1 (Completed - 2026-02-22):** Initialized Vite + React + TypeScript project. Installed Firebase SDK and Tailwind CSS. Added SF Pro / Inter font stack via Tailwind theme and global CSS.
- **Phase 2 (Completed - 2026-02-22):** Implemented client-side sync engine (`get_stream_sync.ts`) to compute current track + second offset from Firestore `broadcast_start_time` and total playlist duration.
- **Phase 3 (Completed - 2026-02-22):** Built minimalist "Live" UI with Play/Pause and Volume only (no seek/skip), plus a sync status panel and live indicator.
- **Phase 4 (Pending):** Configure production Firebase project/Firestore document and deploy to Firebase Hosting.

## 6. Decision Log
- **Decision:** Use Client-Side Sync instead of Firebase Functions.
- **Reason:** User requested "No Firebase Functions" to keep complexity and costs low.
- **Impact:** All users stay in sync within ~1-2 seconds of each other.
- **Decision (2026-02-22):** Treat `broadcast_start_time` as flexible input (Firestore Timestamp, Unix seconds, or milliseconds).
- **Reason:** Firestore data may be entered manually or by different tooling; parsing multiple formats reduces setup friction.
- **Impact:** Frontend sync hook normalizes all accepted values to milliseconds before offset math.
- **Decision (2026-02-22):** Store playlist durations in client metadata (`durationSeconds`) to compute sync deterministically.
- **Reason:** The sync engine needs known segment lengths to map elapsed time to track index and offset without server support.
- **Impact:** Playlist entries must include accurate durations; incorrect durations will cause drift at track boundaries.
- **Decision (2026-02-22):** Add optional `.env` demo fallback (`VITE_DEMO_BROADCAST_START_MS`) when Firebase config is absent.
- **Reason:** Enables local UI/sync testing before Firebase credentials are available.
- **Impact:** Production behavior still prioritizes Firestore; UI labels the fallback as a demo sync source.

@AI_AGENT: This document is iterative. You are required to update the Implementation Plan and Decision Log as you execute tasks.
