/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string
  readonly VITE_FIRESTORE_STATION_COLLECTION?: string
  readonly VITE_FIRESTORE_STATION_DOCUMENT?: string
  readonly VITE_DEMO_BROADCAST_START_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
