import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { PLAYLIST_TRACKS } from '../features/stream/data_playlist_tracks'
import { getStreamSync } from '../features/stream/get_stream_sync'
import type { StreamSyncSnapshot } from '../features/stream/types_stream_models'
import {
  FIRESTORE_STATION_COLLECTION,
  FIRESTORE_STATION_DOCUMENT,
  getFirestoreDatabase,
  isFirebaseConfigured,
} from '../lib/firebase_config'

type SyncSource = 'firestore' | 'demo' | 'unconfigured'

interface FirebaseSyncState {
  isLoading: boolean
  errorMessage: string | null
  broadcastStartMs: number | null
  syncSnapshot: StreamSyncSnapshot | null
  source: SyncSource
  lastFetchAtMs: number | null
}

interface FirestoreTimestampLike {
  toMillis: () => number
}

const isFirestoreTimestampLike = (value: unknown): value is FirestoreTimestampLike => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  if (!('toMillis' in value)) {
    return false
  }

  const candidate = value as { toMillis?: unknown }
  return typeof candidate.toMillis === 'function'
}

const normalizeTimestampToMs = (value: number): number => {
  if (value > 1_000_000_000_000) {
    return Math.trunc(value)
  }

  return Math.trunc(value * 1000)
}

const parseBroadcastStartMs = (value: unknown): number | null => {
  if (isFirestoreTimestampLike(value)) {
    return normalizeTimestampToMs(value.toMillis())
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return normalizeTimestampToMs(value)
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return normalizeTimestampToMs(parsed)
    }
  }

  return null
}

export const useFirebaseSync = (): FirebaseSyncState => {
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [broadcastStartMs, setBroadcastStartMs] = useState<number | null>(null)
  const [source, setSource] = useState<SyncSource>('unconfigured')
  const [lastFetchAtMs, setLastFetchAtMs] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    let isCancelled = false

    const loadBroadcastStart = async (): Promise<void> => {
      setIsLoading(true)
      setErrorMessage(null)

      const firestore = getFirestoreDatabase()
      const demoBroadcastStartRaw = import.meta.env.VITE_DEMO_BROADCAST_START_MS

      if (firestore === null) {
        if (demoBroadcastStartRaw) {
          const parsedDemoMs = parseBroadcastStartMs(demoBroadcastStartRaw)

          if (parsedDemoMs !== null) {
            if (!isCancelled) {
              setBroadcastStartMs(parsedDemoMs)
              setSource('demo')
              setLastFetchAtMs(Date.now())
              setIsLoading(false)
            }
            return
          }
        }

        if (!isCancelled) {
          setBroadcastStartMs(null)
          setSource('unconfigured')
          setIsLoading(false)
          setErrorMessage(
            isFirebaseConfigured
              ? 'Firestore is not available in this environment.'
              : 'Firebase config is missing. Add .env values to fetch broadcast_start_time from Firestore.',
          )
        }

        return
      }

      try {
        const stationRef = doc(firestore, FIRESTORE_STATION_COLLECTION, FIRESTORE_STATION_DOCUMENT)
        const stationSnapshot = await getDoc(stationRef)

        if (!stationSnapshot.exists()) {
          throw new Error(
            `Firestore document ${FIRESTORE_STATION_COLLECTION}/${FIRESTORE_STATION_DOCUMENT} was not found.`,
          )
        }

        const data = stationSnapshot.data() as Record<string, unknown>
        const parsedBroadcastStartMs = parseBroadcastStartMs(data.broadcast_start_time)

        if (parsedBroadcastStartMs === null) {
          throw new Error(
            'broadcast_start_time is missing or invalid. Use a Firestore Timestamp, seconds, or milliseconds.',
          )
        }

        if (!isCancelled) {
          setBroadcastStartMs(parsedBroadcastStartMs)
          setSource('firestore')
          setLastFetchAtMs(Date.now())
          setIsLoading(false)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch broadcast start time.'

        if (!isCancelled) {
          setBroadcastStartMs(null)
          setSource('unconfigured')
          setErrorMessage(message)
          setIsLoading(false)
        }
      }
    }

    void loadBroadcastStart()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (broadcastStartMs === null) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    setNowMs(Date.now())

    return () => {
      window.clearInterval(intervalId)
    }
  }, [broadcastStartMs])

  const syncSnapshot = useMemo(() => {
    if (broadcastStartMs === null) {
      return null
    }

    return getStreamSync({
      broadcastStartMs,
      nowMs,
      playlistTracks: PLAYLIST_TRACKS,
    })
  }, [broadcastStartMs, nowMs])

  return {
    isLoading,
    errorMessage,
    broadcastStartMs,
    syncSnapshot,
    source,
    lastFetchAtMs,
  }
}
