import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const FIRESTORE_STATION_COLLECTION =
  import.meta.env.VITE_FIRESTORE_STATION_COLLECTION ?? 'stations'
export const FIRESTORE_STATION_DOCUMENT =
  import.meta.env.VITE_FIRESTORE_STATION_DOCUMENT ?? 'signal-radio'

const requiredFirebaseConfigValues = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.storageBucket,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId,
]

export const isFirebaseConfigured = requiredFirebaseConfigValues.every(
  (value) => typeof value === 'string' && value.trim().length > 0,
)

let firebaseAppInstance: FirebaseApp | null = null
let firestoreInstance: Firestore | null = null

export const getFirestoreDatabase = (): Firestore | null => {
  if (!isFirebaseConfigured) {
    return null
  }

  if (firestoreInstance !== null) {
    return firestoreInstance
  }

  firebaseAppInstance =
    firebaseAppInstance ??
    (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig))
  firestoreInstance = getFirestore(firebaseAppInstance)

  return firestoreInstance
}
