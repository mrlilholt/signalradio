import { useEffect, useState } from 'react'

interface AudioVisualizerProps {
  samples: number[]
  isActive: boolean
  className?: string
}

const buildWavePath = (
  samples: number[],
  baseline: number,
  amplitude: number,
  phaseOffset: number,
): string => {
  const width = 100
  const lastIndex = Math.max(samples.length - 1, 1)

  const points = samples.map((sample, index) => {
    const x = (index / lastIndex) * width
    const phaseWave = Math.sin((index / lastIndex) * Math.PI * 4 + phaseOffset) * 3
    const y = baseline - sample * amplitude + phaseWave
    return { x, y }
  })

  if (points.length === 0) {
    return `M 0 ${baseline} L ${width} ${baseline}`
  }

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const controlX = ((previous.x + current.x) / 2).toFixed(2)

    path += ` Q ${controlX} ${previous.y.toFixed(2)} ${current.x.toFixed(2)} ${current.y.toFixed(2)}`
  }

  return path
}

export const ViewAudioVisualizer = ({
  samples,
  isActive,
  className = '',
}: AudioVisualizerProps) => {
  const [phaseTime, setPhaseTime] = useState(0)

  useEffect(() => {
    if (!isActive) {
      return undefined
    }

    let animationFrameId = 0
    let isCancelled = false

    const animate = (timestamp: number): void => {
      if (isCancelled) {
        return
      }

      // Drives a gentle left/right shimmer even when the audio spectrum is steady.
      setPhaseTime(timestamp * 0.0022)
      animationFrameId = window.requestAnimationFrame(animate)
    }

    animationFrameId = window.requestAnimationFrame(animate)

    return () => {
      isCancelled = true
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [isActive])

  const baseSamples = samples.length > 0 ? samples : Array.from({ length: 48 }, () => 0)
  const animatedPhase = isActive ? phaseTime : 0
  const pathPrimary = buildWavePath(baseSamples, 44, isActive ? 26 : 8, animatedPhase)
  const pathSecondary = buildWavePath(baseSamples, 48, isActive ? 20 : 6, animatedPhase * 1.25 + 1.65)
  const pathTertiary = buildWavePath(baseSamples, 52, isActive ? 14 : 4, animatedPhase * 0.8 + 3.1)

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(236,72,153,0.18),transparent_48%),radial-gradient(circle_at_80%_15%,rgba(96,165,250,0.12),transparent_42%)]" />

      <svg
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
        className="relative h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="signal-wave-primary" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#ec4899" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="signal-wave-secondary" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.12" />
            <stop offset="50%" stopColor="#f472b6" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        <path
          d={pathTertiary}
          fill="none"
          stroke="url(#signal-wave-secondary)"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
        <path
          d={pathSecondary}
          fill="none"
          stroke="url(#signal-wave-secondary)"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d={pathPrimary}
          fill="none"
          stroke="url(#signal-wave-primary)"
          strokeWidth="1.6"
          strokeLinecap="round"
          className={isActive ? 'drop-shadow-[0_0_10px_rgba(236,72,153,0.45)]' : ''}
        />
      </svg>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-[#22154a]/90" />
    </div>
  )
}
