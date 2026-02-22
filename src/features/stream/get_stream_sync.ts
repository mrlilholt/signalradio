import type { StreamSyncSnapshot, TrackMetadata } from './types_stream_models'

interface GetStreamSyncInput {
  broadcastStartMs: number
  nowMs?: number
  playlistTracks: TrackMetadata[]
}

const normalizePlaylistElapsed = (
  rawElapsedSeconds: number,
  totalPlaylistDurationSeconds: number,
): number => {
  if (totalPlaylistDurationSeconds <= 0) {
    return 0
  }

  if (rawElapsedSeconds < 0) {
    return 0
  }

  return rawElapsedSeconds % totalPlaylistDurationSeconds
}

export const getStreamSync = ({
  broadcastStartMs,
  nowMs = Date.now(),
  playlistTracks,
}: GetStreamSyncInput): StreamSyncSnapshot => {
  if (playlistTracks.length === 0) {
    throw new Error('playlistTracks must contain at least one track')
  }

  const totalPlaylistDurationSeconds = playlistTracks.reduce((total, track) => {
    if (track.durationSeconds <= 0) {
      throw new Error(`Track "${track.id}" must have a positive durationSeconds value`)
    }

    return total + track.durationSeconds
  }, 0)

  const rawElapsedSeconds = Math.floor((nowMs - broadcastStartMs) / 1000)
  const playlistElapsedSeconds = normalizePlaylistElapsed(
    rawElapsedSeconds,
    totalPlaylistDurationSeconds,
  )

  let cursorSeconds = 0

  for (let index = 0; index < playlistTracks.length; index += 1) {
    const track = playlistTracks[index]
    const trackEndSeconds = cursorSeconds + track.durationSeconds

    if (playlistElapsedSeconds < trackEndSeconds) {
      return {
        activeTrack: track,
        trackIndex: index,
        trackOffsetSeconds: playlistElapsedSeconds - cursorSeconds,
        playlistElapsedSeconds,
        totalPlaylistDurationSeconds,
        broadcastStartMs,
        listenerNowMs: nowMs,
      }
    }

    cursorSeconds = trackEndSeconds
  }

  const finalTrack = playlistTracks[playlistTracks.length - 1]

  return {
    activeTrack: finalTrack,
    trackIndex: playlistTracks.length - 1,
    trackOffsetSeconds: Math.max(finalTrack.durationSeconds - 1, 0),
    playlistElapsedSeconds,
    totalPlaylistDurationSeconds,
    broadcastStartMs,
    listenerNowMs: nowMs,
  }
}
