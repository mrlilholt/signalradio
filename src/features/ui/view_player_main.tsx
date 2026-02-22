import { useAudioPlayer } from '../../hooks/use_audio_player'
import { useAudioVisualizer } from '../../hooks/use_audio_visualizer'
import { useFirebaseSync } from '../../hooks/use_firebase_sync'
import { STATION_METADATA } from '../stream/data_playlist_tracks'
import { ViewAudioVisualizer } from './view_audio_visualizer'
import { ViewLiveIndicator } from './view_live_indicator'
import { ViewPlayerControls } from './view_player_controls'

const formatClock = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export const ViewPlayerMain = () => {
  const { errorMessage, syncSnapshot } = useFirebaseSync()

  const syncTarget =
    syncSnapshot === null
      ? null
      : {
          trackId: syncSnapshot.activeTrack.id,
          srcUrl: syncSnapshot.activeTrack.srcUrl,
          offsetSeconds: syncSnapshot.trackOffsetSeconds,
        }

  const audioPlayer = useAudioPlayer(syncTarget)
  const isPlaybackVisuallyActive = audioPlayer.isPlaybackRequested && !audioPlayer.isBuffering
  const audioVisualizer = useAudioVisualizer(audioPlayer.audioRef, isPlaybackVisuallyActive)

  const trackOffsetSeconds = syncSnapshot?.trackOffsetSeconds ?? 0
  const trackDurationSeconds = syncSnapshot?.activeTrack.durationSeconds ?? 0
  const trackProgressRatio =
    trackDurationSeconds > 0 ? Math.min(1, Math.max(0, trackOffsetSeconds / trackDurationSeconds)) : 0
  const trackOffsetLabel = syncSnapshot ? formatClock(trackOffsetSeconds) : '--:--'
  const trackDurationLabel = syncSnapshot ? formatClock(trackDurationSeconds) : '--:--'
  const currentTrackTitle = syncSnapshot?.activeTrack.title ?? 'Awaiting Sync'

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-6 sm:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(236,72,153,0.16),transparent_40%),radial-gradient(circle_at_80%_15%,rgba(59,130,246,0.14),transparent_42%),linear-gradient(180deg,#0b0720_0%,#160e34_45%,#0a0618_100%)]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-fuchsia-500/10 to-transparent" />
      </div>

      <section className="relative w-full max-w-[420px] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(39,26,83,0.95)_0%,rgba(26,18,59,0.97)_48%,rgba(20,13,46,0.98)_100%)] shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <header className="flex items-center justify-between gap-4 px-5 pt-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-full border border-white/15 bg-white/5 p-1.5 shadow-[0_0_14px_rgba(168,85,247,0.25)]">
              <img
                src="/signal.png"
                alt="Signal Radio logo"
                className="h-full w-full rounded-full object-cover"
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/85">
              {STATION_METADATA.stationName}
              </p>
              <p className="mt-1 text-xs text-white/45">Community Broadcast</p>
            </div>
          </div>

          <ViewLiveIndicator isLive={syncSnapshot !== null} />
        </header>

        <div className="relative mt-4 h-28 border-y border-white/10 bg-black/10">
          <ViewAudioVisualizer
            samples={audioVisualizer.samples}
            isActive={isPlaybackVisuallyActive && audioVisualizer.isReactive}
            className="h-full w-full"
          />
        </div>

        <div className="px-5 pb-6 pt-4 sm:px-6 sm:pb-7">
          <div className="relative mx-auto mt-2 flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
            <div className="absolute inset-2 rounded-full bg-[radial-gradient(circle,rgba(217,70,239,0.1),rgba(0,0,0,0))] blur-xl" />
            <div className="absolute inset-3 rounded-full border border-fuchsia-400/35 shadow-[0_0_35px_rgba(168,85,247,0.35)]" />

            <div className="absolute right-[-4px] top-1/2 z-20 hidden h-3 w-24 -translate-y-[10px] rounded-full bg-gradient-to-r from-slate-200/70 via-slate-100/95 to-cyan-300/80 shadow-[0_0_12px_rgba(103,232,249,0.35)] sm:block" />
            <div className="absolute right-[-10px] top-1/2 z-20 hidden h-6 w-6 -translate-y-[16px] rounded-full border border-cyan-200/70 bg-cyan-300/30 shadow-[0_0_20px_rgba(103,232,249,0.55)] sm:block" />

            <div
              className={`relative flex h-56 w-56 items-center justify-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_45%,#2f2f36_0%,#0d0d12_52%,#06070a_100%)] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.45)] sm:h-64 sm:w-64 ${
                isPlaybackVisuallyActive ? 'animate-spin [animation-duration:9s]' : ''
              }`}
            >
              <div className="absolute inset-4 rounded-full border border-white/5" />
              <div className="absolute inset-8 rounded-full border border-white/5" />
              <div className="absolute inset-12 rounded-full border border-white/5" />
              <div className="absolute inset-16 rounded-full border border-white/5" />

              <div className="relative z-10 h-24 w-24 overflow-hidden rounded-full border border-fuchsia-300/30 bg-[radial-gradient(circle_at_35%_30%,#f472b6_0%,#db2777_42%,#5b21b6_100%)] shadow-[0_0_20px_rgba(236,72,153,0.35)] sm:h-28 sm:w-28">
                <img
                  src="/signal.png"
                  alt="Signal Radio record label"
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/10" />
                <div className="pointer-events-none absolute inset-x-4 bottom-2 rounded-full bg-black/35 px-2 py-0.5 text-center text-[9px] font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm">
                  Live
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="truncate text-[1.05rem] font-medium tracking-tight text-cyan-200 sm:text-xl">
              {currentTrackTitle}
            </p>
            <p className="mt-1 text-sm text-white/40">{STATION_METADATA.stationName}</p>
          </div>

          <div className="mt-5">
            <ViewPlayerControls
              disabled={syncTarget === null}
              isPlaybackRequested={audioPlayer.isPlaybackRequested}
              isBuffering={audioPlayer.isBuffering}
              volume={audioPlayer.volume}
              trackOffsetLabel={trackOffsetLabel}
              trackDurationLabel={trackDurationLabel}
              trackProgressRatio={trackProgressRatio}
              onTogglePlayback={audioPlayer.togglePlayback}
              onVolumeChange={audioPlayer.setVolume}
            />
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-amber-200">
              {errorMessage}
            </div>
          ) : null}

          {audioPlayer.playbackError ? (
            <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
              {audioPlayer.playbackError}
            </p>
          ) : null}
        </div>

        <audio
          ref={audioPlayer.audioRef}
          crossOrigin="anonymous"
          preload="auto"
          onPlaying={audioPlayer.handleAudioPlaying}
          onPause={audioPlayer.handleAudioPause}
          onWaiting={audioPlayer.handleAudioWaiting}
          onCanPlay={audioPlayer.handleAudioCanPlay}
          onError={audioPlayer.handleAudioError}
          className="sr-only"
        />
      </section>
    </main>
  )
}
