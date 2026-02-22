export interface TrackMetadata {
  id: string
  title: string
  srcUrl: string
  durationSeconds: number
}

export interface StationMetadata {
  stationId: string
  stationName: string
}

export interface StreamSyncSnapshot {
  activeTrack: TrackMetadata
  trackIndex: number
  trackOffsetSeconds: number
  playlistElapsedSeconds: number
  totalPlaylistDurationSeconds: number
  broadcastStartMs: number
  listenerNowMs: number
}
