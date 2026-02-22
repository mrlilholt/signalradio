import type { RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'

interface AudioSyncTarget {
  trackId: string
  srcUrl: string
  offsetSeconds: number
}

interface UseAudioPlayerResult {
  audioRef: RefObject<HTMLAudioElement | null>
  isPlaybackRequested: boolean
  isBuffering: boolean
  volume: number
  playbackError: string | null
  togglePlayback: () => Promise<void>
  setVolume: (nextVolume: number) => void
  handleAudioPlaying: () => void
  handleAudioPause: () => void
  handleAudioWaiting: () => void
  handleAudioCanPlay: () => void
  handleAudioError: () => void
}

const MAX_RESYNC_DRIFT_SECONDS = 1.25

const clampVolume = (value: number): number => Math.min(1, Math.max(0, value))

const clampOffsetToDuration = (audio: HTMLAudioElement, offsetSeconds: number): number => {
  const duration = Number.isFinite(audio.duration) ? audio.duration : null

  if (duration === null || duration <= 0) {
    return Math.max(0, offsetSeconds)
  }

  return Math.min(Math.max(0, offsetSeconds), Math.max(duration - 0.25, 0))
}

export const useAudioPlayer = (syncTarget: AudioSyncTarget | null): UseAudioPlayerResult => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const activeTrackIdRef = useRef<string | null>(null)
  const playbackRequestedRef = useRef(false)

  const [isPlaybackRequested, setIsPlaybackRequested] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [volume, setVolumeState] = useState(0.8)
  const [playbackError, setPlaybackError] = useState<string | null>(null)

  useEffect(() => {
    const audio = audioRef.current

    if (audio === null) {
      return
    }

    audio.volume = volume
  }, [volume])

  useEffect(() => {
    const audio = audioRef.current

    if (audio === null || syncTarget === null) {
      return undefined
    }

    const applyOffset = (): void => {
      audio.currentTime = clampOffsetToDuration(audio, syncTarget.offsetSeconds)
    }

    const maybeResumePlayback = async (): Promise<void> => {
      if (!playbackRequestedRef.current) {
        return
      }

      try {
        setPlaybackError(null)
        setIsBuffering(true)
        await audio.play()
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Playback could not start. Browser autoplay may require a user click.'
        playbackRequestedRef.current = false
        setIsPlaybackRequested(false)
        setIsBuffering(false)
        setPlaybackError(message)
      }
    }

    const hasTrackChanged = activeTrackIdRef.current !== syncTarget.trackId

    if (hasTrackChanged) {
      activeTrackIdRef.current = syncTarget.trackId
      audio.src = syncTarget.srcUrl

      const handleLoadedMetadata = (): void => {
        applyOffset()
        void maybeResumePlayback()
      }

      audio.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })
      audio.load()

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      }
    }

    if (audio.readyState >= 1) {
      const currentDriftSeconds = Math.abs(audio.currentTime - syncTarget.offsetSeconds)

      if (currentDriftSeconds > MAX_RESYNC_DRIFT_SECONDS) {
        applyOffset()
      }
    }

    return undefined
  }, [syncTarget])

  const togglePlayback = async (): Promise<void> => {
    const audio = audioRef.current

    if (playbackRequestedRef.current) {
      playbackRequestedRef.current = false
      setIsPlaybackRequested(false)

      if (audio !== null) {
        audio.pause()
      }

      return
    }

    playbackRequestedRef.current = true
    setIsPlaybackRequested(true)
    setPlaybackError(null)

    if (audio === null || syncTarget === null) {
      return
    }

    try {
      setIsBuffering(true)
      await audio.play()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Playback could not start. Browser autoplay may require a user click.'
      playbackRequestedRef.current = false
      setIsPlaybackRequested(false)
      setIsBuffering(false)
      setPlaybackError(message)
    }
  }

  const setVolume = (nextVolume: number): void => {
    setVolumeState(clampVolume(nextVolume))
  }

  const handleAudioPlaying = (): void => {
    setIsBuffering(false)
  }

  const handleAudioPause = (): void => {
    setIsBuffering(false)
  }

  const handleAudioWaiting = (): void => {
    if (playbackRequestedRef.current) {
      setIsBuffering(true)
    }
  }

  const handleAudioCanPlay = (): void => {
    setIsBuffering(false)
  }

  const handleAudioError = (): void => {
    setIsBuffering(false)
    setPlaybackError('Audio failed to load. Check MP3 URLs and CORS settings.')
  }

  return {
    audioRef,
    isPlaybackRequested,
    isBuffering,
    volume,
    playbackError,
    togglePlayback,
    setVolume,
    handleAudioPlaying,
    handleAudioPause,
    handleAudioWaiting,
    handleAudioCanPlay,
    handleAudioError,
  }
}
