interface PlayerControlsProps {
  disabled: boolean
  isPlaybackRequested: boolean
  isBuffering: boolean
  volume: number
  trackOffsetLabel: string
  trackDurationLabel: string
  trackProgressRatio: number
  onTogglePlayback: () => Promise<void>
  onVolumeChange: (volume: number) => void
}

export const ViewPlayerControls = ({
  disabled,
  isPlaybackRequested,
  isBuffering,
  volume,
  trackOffsetLabel,
  trackDurationLabel,
  trackProgressRatio,
  onTogglePlayback,
  onVolumeChange,
}: PlayerControlsProps) => {
  const buttonLabel = disabled ? '…' : isPlaybackRequested ? 'Pause' : 'Play'
  const progressPercent = `${Math.min(100, Math.max(0, trackProgressRatio * 100)).toFixed(2)}%`

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label="Current track progress (display only)"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(trackProgressRatio * 100)}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-violet-400 shadow-[0_0_18px_rgba(217,70,239,0.45)]"
            style={{ width: progressPercent }}
          />
        </div>
        <div className="flex items-center justify-between text-xs font-medium text-white/60">
          <span className="font-mono">{trackOffsetLabel}</span>
          <span className="font-mono">{trackDurationLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] items-center gap-4">
        <button
          type="button"
          onClick={() => {
            void onTogglePlayback()
          }}
          disabled={disabled}
          className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-white/35 bg-white/10 text-sm font-semibold tracking-wide text-white shadow-[0_0_30px_rgba(139,92,246,0.35)] backdrop-blur transition hover:border-fuchsia-300/70 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={isPlaybackRequested ? 'Pause live stream' : 'Play live stream'}
        >
          {buttonLabel}
        </button>

        <label className="grid gap-2" htmlFor="volume">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-white/50">
            <span>Volume</span>
            <span>{Math.round(volume * 100)}%</span>
          </div>
          <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
            <input
              id="volume"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => {
                onVolumeChange(Number(event.target.value))
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
              aria-label="Volume"
            />
          </div>
        </label>
      </div>

      <div className="text-center text-[11px] uppercase tracking-[0.22em] text-white/40">
        {isBuffering ? 'Buffering' : 'Live Broadcast'}
      </div>
    </div>
  )
}
