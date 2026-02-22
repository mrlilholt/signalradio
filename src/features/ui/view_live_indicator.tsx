interface LiveIndicatorProps {
  isLive: boolean
}

export const ViewLiveIndicator = ({ isLive }: LiveIndicatorProps) => {
  return (
    <div className="flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="relative inline-flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${
              isLive ? 'animate-ping bg-signal-glow/70' : 'bg-zinc-500/50'
            }`}
          />
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              isLive ? 'bg-signal-accent' : 'bg-zinc-500'
            }`}
          />
        </span>
        <span className="text-[10px] font-semibold tracking-[0.22em] text-zinc-100">
          {isLive ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>
    </div>
  )
}
