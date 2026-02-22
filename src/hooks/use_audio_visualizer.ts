import type { RefObject } from 'react'
import { useEffect, useState } from 'react'

interface UseAudioVisualizerResult {
  samples: number[]
  isReactive: boolean
}

interface VisualizerGraph {
  context: AudioContext
  analyser: AnalyserNode
  dataBuffer: Uint8Array<ArrayBuffer>
}

const SAMPLE_COUNT = 48
const FFT_SIZE = 256
const MIN_SAMPLE_FLOOR = 0.03

const createEmptySamples = (): number[] => Array.from({ length: SAMPLE_COUNT }, () => 0)

const graphByAudioElement = new WeakMap<HTMLAudioElement, VisualizerGraph>()

const downsampleFrequencyData = (data: Uint8Array<ArrayBufferLike>, sampleCount: number): number[] => {
  const nextSamples: number[] = []
  const binsPerSample = Math.max(1, Math.floor(data.length / sampleCount))

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const start = sampleIndex * binsPerSample
    const end = sampleIndex === sampleCount - 1 ? data.length : Math.min(data.length, start + binsPerSample)

    let total = 0
    let count = 0

    for (let binIndex = start; binIndex < end; binIndex += 1) {
      total += data[binIndex]
      count += 1
    }

    const average = count === 0 ? 0 : total / count
    const normalized = Math.min(1, Math.max(0, average / 255))

    // Slight low-end weighting makes the waveform feel more musical for MP3 radio content.
    const weighting = 1 + (1 - sampleIndex / sampleCount) * 0.35
    nextSamples.push(Math.min(1, normalized * weighting))
  }

  return nextSamples
}

const smoothSamples = (previous: number[], next: number[]): number[] => {
  return next.map((sample, index) => {
    const last = previous[index] ?? 0
    return last * 0.72 + sample * 0.28
  })
}

const getOrCreateVisualizerGraph = (audioElement: HTMLAudioElement): VisualizerGraph | null => {
  const cached = graphByAudioElement.get(audioElement)

  if (cached !== undefined) {
    return cached
  }

  if (typeof window.AudioContext === 'undefined') {
    return null
  }

  try {
    const audioContext = new window.AudioContext()
    const sourceNode = audioContext.createMediaElementSource(audioElement)
    const analyserNode = audioContext.createAnalyser()

    analyserNode.fftSize = FFT_SIZE
    analyserNode.smoothingTimeConstant = 0.82

    sourceNode.connect(analyserNode)
    analyserNode.connect(audioContext.destination)

    const graph: VisualizerGraph = {
      context: audioContext,
      analyser: analyserNode,
      dataBuffer: new Uint8Array(analyserNode.frequencyBinCount) as Uint8Array<ArrayBuffer>,
    }

    graphByAudioElement.set(audioElement, graph)
    return graph
  } catch {
    return null
  }
}

export const useAudioVisualizer = (
  audioRef: RefObject<HTMLAudioElement | null>,
  isActive: boolean,
): UseAudioVisualizerResult => {
  const [samples, setSamples] = useState<number[]>(createEmptySamples)
  const [isReactive, setIsReactive] = useState(false)

  useEffect(() => {
    const audioElement = audioRef.current

    if (audioElement === null) {
      return undefined
    }

    const graph = getOrCreateVisualizerGraph(audioElement)

    if (graph === null) {
      setIsReactive(false)
      setSamples(createEmptySamples())
      return undefined
    }

    setIsReactive(true)

    let animationFrameId = 0
    let isCancelled = false
    let previousSamples = createEmptySamples()
    let lastRenderTimestamp = 0

    const renderFrame = (timestamp: number): void => {
      if (isCancelled) {
        return
      }

      animationFrameId = window.requestAnimationFrame(renderFrame)

      if (!isActive) {
        if (previousSamples.some((value) => value > MIN_SAMPLE_FLOOR)) {
          previousSamples = previousSamples.map((value) => value * 0.88)
          setSamples(previousSamples)
        }
        return
      }

      if (timestamp - lastRenderTimestamp < 33) {
        return
      }

      lastRenderTimestamp = timestamp

      if (graph.context.state === 'suspended') {
        void graph.context.resume().catch(() => {})
      }

      graph.analyser.getByteFrequencyData(graph.dataBuffer)
      const nextSamples = downsampleFrequencyData(graph.dataBuffer, SAMPLE_COUNT)
      previousSamples = smoothSamples(previousSamples, nextSamples)
      setSamples(previousSamples)
    }

    animationFrameId = window.requestAnimationFrame(renderFrame)

    return () => {
      isCancelled = true
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [audioRef, isActive])

  return {
    samples,
    isReactive,
  }
}
