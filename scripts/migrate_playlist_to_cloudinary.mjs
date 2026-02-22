import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'

const DEFAULT_FOLDER = 'signal-radio'
const DEFAULT_PLAYLIST_FILE = 'src/features/stream/data_playlist_tracks.ts'
const DEFAULT_MANIFEST_FILE = 'scripts/cloudinary_upload_manifest.json'
const DEFAULT_MAX_RETRIES = 4

const PLAYLIST_START_MARKER = 'export const PLAYLIST_TRACKS: TrackMetadata[] = [\n'
const PLAYLIST_END_MARKER = '\n]\n'

const TRACK_ENTRY_PATTERN =
  /\{\n\s*id: '([^']+)',\n\s*title: ("(?:[^"\\]|\\.)*"),\n\s*srcUrl: '([^']+)',\n\s*durationSeconds: (\d+),\n\s*\}/g

const DRIVE_HOST_PATTERNS = ['drive.google.com', 'drive.usercontent.google.com']

const parseArgs = (argv) => {
  const flags = {
    dryRun: false,
    limit: null,
    startIndex: 0,
    onlyIds: null,
    folder: null,
    playlistFile: null,
    manifestFile: null,
    maxRetries: null,
    overwrite: true,
    skipUploaded: null,
  }

  for (const arg of argv) {
    if (arg === '--dry-run') {
      flags.dryRun = true
      continue
    }

    if (arg.startsWith('--limit=')) {
      flags.limit = Number.parseInt(arg.slice('--limit='.length), 10)
      continue
    }

    if (arg.startsWith('--start-index=')) {
      flags.startIndex = Number.parseInt(arg.slice('--start-index='.length), 10)
      continue
    }

    if (arg.startsWith('--only=')) {
      const raw = arg.slice('--only='.length)
      flags.onlyIds = new Set(
        raw
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      )
      continue
    }

    if (arg.startsWith('--folder=')) {
      flags.folder = arg.slice('--folder='.length)
      continue
    }

    if (arg.startsWith('--playlist=')) {
      flags.playlistFile = arg.slice('--playlist='.length)
      continue
    }

    if (arg.startsWith('--manifest=')) {
      flags.manifestFile = arg.slice('--manifest='.length)
      continue
    }

    if (arg.startsWith('--max-retries=')) {
      flags.maxRetries = Number.parseInt(arg.slice('--max-retries='.length), 10)
      continue
    }

    if (arg === '--no-overwrite') {
      flags.overwrite = false
      continue
    }

    if (arg.startsWith('--skip-uploaded=')) {
      flags.skipUploaded = arg.slice('--skip-uploaded='.length).toLowerCase() === 'true'
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return flags
}

const parseDotEnvFile = (raw) => {
  const parsed = {}

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')

    if (separatorIndex < 0) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    parsed[key] = value
  }

  return parsed
}

const loadEnvFiles = async (candidatePaths) => {
  const merged = {}

  for (const candidatePath of candidatePaths) {
    if (!existsSync(candidatePath)) {
      continue
    }

    const raw = await readFile(candidatePath, 'utf8')
    Object.assign(merged, parseDotEnvFile(raw))
  }

  return merged
}

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  const normalized = String(value).trim().toLowerCase()

  if (['1', 'true', 'yes', 'y'].includes(normalized)) {
    return true
  }

  if (['0', 'false', 'no', 'n'].includes(normalized)) {
    return false
  }

  return fallback
}

const parseInteger = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const buildConfig = async (flags) => {
  const cwd = process.cwd()
  const envFileValues = await loadEnvFiles([
    path.join(cwd, '.env.cloudinary.local'),
    path.join(cwd, '.env.local'),
  ])

  const env = {
    ...envFileValues,
    ...process.env,
  }

  const config = {
    cloudName: env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: env.CLOUDINARY_API_KEY ?? '',
    apiSecret: env.CLOUDINARY_API_SECRET ?? '',
    folder: flags.folder ?? env.CLOUDINARY_FOLDER ?? DEFAULT_FOLDER,
    playlistFile: path.resolve(cwd, flags.playlistFile ?? env.PLAYLIST_FILE ?? DEFAULT_PLAYLIST_FILE),
    manifestFile: path.resolve(cwd, flags.manifestFile ?? env.MANIFEST_FILE ?? DEFAULT_MANIFEST_FILE),
    maxRetries: Math.max(1, flags.maxRetries ?? parseInteger(env.MAX_RETRIES, DEFAULT_MAX_RETRIES)),
    dryRun: flags.dryRun,
    overwrite: flags.overwrite,
    skipUploaded:
      flags.skipUploaded ?? parseBoolean(env.SKIP_UPLOADED, true),
    limit: flags.limit,
    startIndex: Math.max(0, flags.startIndex),
    onlyIds: flags.onlyIds,
  }

  if (!config.dryRun) {
    for (const [label, value] of [
      ['CLOUDINARY_CLOUD_NAME', config.cloudName],
      ['CLOUDINARY_API_KEY', config.apiKey],
      ['CLOUDINARY_API_SECRET', config.apiSecret],
    ]) {
      if (value.trim().length === 0) {
        throw new Error(`Missing ${label}. Set it in .env.cloudinary.local or your shell environment.`)
      }
    }
  }

  return config
}

const parsePlaylistTracks = (source) => {
  const matches = [...source.matchAll(TRACK_ENTRY_PATTERN)]

  return matches.map((match) => {
    const [fullMatch, id, titleJson, srcUrl, durationSecondsRaw] = match
    return {
      raw: fullMatch,
      id,
      title: JSON.parse(titleJson),
      srcUrl,
      durationSeconds: Number.parseInt(durationSecondsRaw, 10),
    }
  })
}

const rebuildPlaylistSource = (originalSource, tracks) => {
  const startIndex = originalSource.indexOf(PLAYLIST_START_MARKER)
  const endIndex = originalSource.lastIndexOf(PLAYLIST_END_MARKER)

  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error('Could not locate PLAYLIST_TRACKS array in the playlist file.')
  }

  const before = originalSource.slice(0, startIndex + PLAYLIST_START_MARKER.length)
  const after = originalSource.slice(endIndex)

  const entries = tracks
    .map((track) => {
      return [
        '  {',
        `    id: '${track.id}',`,
        `    title: ${JSON.stringify(track.title)},`,
        `    srcUrl: '${track.srcUrl}',`,
        `    durationSeconds: ${track.durationSeconds},`,
        '  },',
      ].join('\n')
    })
    .join('\n')

  return `${before}${entries}${after}`
}

const signCloudinaryParams = (params, apiSecret) => {
  const canonical = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && String(value).length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  return createHash('sha1')
    .update(`${canonical}${apiSecret}`)
    .digest('hex')
}

const isRetryableStatus = (status) => status === 408 || status === 409 || status === 429 || status >= 500

const fetchWithRetry = async (url, options, context, maxRetries) => {
  let lastError = null

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, options)

      if (response.ok) {
        return response
      }

      const errorSnippet = await response.text().catch(() => '')
      const reason = `${context} failed with HTTP ${response.status} ${response.statusText}${
        errorSnippet ? ` | ${errorSnippet.slice(0, 200)}` : ''
      }`

      if (attempt >= maxRetries || !isRetryableStatus(response.status)) {
        throw new Error(reason)
      }

      lastError = new Error(reason)
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error))

      if (attempt >= maxRetries) {
        throw normalizedError
      }

      lastError = normalizedError
    }

    const backoffMs = 750 * 2 ** (attempt - 1)
    console.warn(`[retry ${attempt}/${maxRetries}] ${context}: ${lastError?.message ?? 'retrying'} (${backoffMs}ms)`)
    await delay(backoffMs)
  }

  throw lastError ?? new Error(`${context} failed`)
}

const downloadTrackSource = async (track, maxRetries) => {
  const response = await fetchWithRetry(
    track.srcUrl,
    {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Accept: 'audio/*,*/*;q=0.8',
      },
    },
    `download ${track.id}`,
    maxRetries,
  )

  const contentType = response.headers.get('content-type') ?? 'application/octet-stream'
  const arrayBuffer = await response.arrayBuffer()
  const fileName = `${track.title.replace(/[^\w.-]+/g, '_') || track.id}.mp3`

  return {
    contentType,
    arrayBuffer,
    fileName,
    byteLength: arrayBuffer.byteLength,
  }
}

const uploadTrackToCloudinary = async (track, filePayload, config) => {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const uploadParams = {
    folder: config.folder,
    public_id: track.id,
    overwrite: config.overwrite ? 'true' : 'false',
    timestamp,
    use_filename: 'false',
    unique_filename: 'false',
  }

  const signature = signCloudinaryParams(uploadParams, config.apiSecret)
  const endpoint = `https://api.cloudinary.com/v1_1/${config.cloudName}/video/upload`

  const form = new FormData()
  form.set('file', new Blob([filePayload.arrayBuffer], { type: filePayload.contentType }), filePayload.fileName)
  form.set('api_key', config.apiKey)
  form.set('timestamp', uploadParams.timestamp)
  form.set('folder', uploadParams.folder)
  form.set('public_id', uploadParams.public_id)
  form.set('overwrite', uploadParams.overwrite)
  form.set('use_filename', uploadParams.use_filename)
  form.set('unique_filename', uploadParams.unique_filename)
  form.set('signature', signature)

  const response = await fetchWithRetry(
    endpoint,
    {
      method: 'POST',
      body: form,
    },
    `upload ${track.id}`,
    config.maxRetries,
  )

  const json = await response.json()

  if (typeof json.secure_url !== 'string' || json.secure_url.length === 0) {
    throw new Error(`Cloudinary upload for ${track.id} did not return secure_url`)
  }

  return json
}

const isCloudinaryTrackUrl = (url, cloudName) => {
  return url.includes(`res.cloudinary.com/${cloudName}/`)
}

const isDriveTrackUrl = (url) => DRIVE_HOST_PATTERNS.some((host) => url.includes(host))

const writeManifest = async (manifestFile, manifest) => {
  await mkdir(path.dirname(manifestFile), { recursive: true })
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

const main = async () => {
  const flags = parseArgs(process.argv.slice(2))
  const config = await buildConfig(flags)

  let currentPlaylistSource = await readFile(config.playlistFile, 'utf8')
  const tracks = parsePlaylistTracks(currentPlaylistSource)

  if (tracks.length === 0) {
    throw new Error(`No tracks found in ${config.playlistFile}`)
  }

  const selectedTracks = tracks
    .slice(config.startIndex)
    .filter((track) => (config.onlyIds ? config.onlyIds.has(track.id) : true))
    .filter((track) => {
      if (!config.skipUploaded) {
        return true
      }

      if (config.cloudName.trim().length > 0 && isCloudinaryTrackUrl(track.srcUrl, config.cloudName)) {
        return false
      }

      return true
    })

  const limitedTracks =
    typeof config.limit === 'number' && Number.isFinite(config.limit)
      ? selectedTracks.slice(0, Math.max(0, config.limit))
      : selectedTracks

  if (limitedTracks.length === 0) {
    console.log('No tracks selected for migration. Nothing to do.')
    return
  }

  console.log(`Playlist file: ${config.playlistFile}`)
  console.log(`Tracks found: ${tracks.length}`)
  console.log(`Tracks selected: ${limitedTracks.length}`)
  console.log(`Cloudinary folder: ${config.folder}`)
  console.log(`Mode: ${config.dryRun ? 'dry-run' : 'upload'}`)

  const manifest = {
    generatedAt: new Date().toISOString(),
    cloudName: config.cloudName || '(dry-run)',
    folder: config.folder,
    playlistFile: config.playlistFile,
    migrated: [],
    failed: [],
  }

  let successCount = 0
  let skippedCount = 0

  for (let index = 0; index < limitedTracks.length; index += 1) {
    const track = limitedTracks[index]
    const progress = `${String(index + 1).padStart(2, '0')}/${limitedTracks.length}`

    if (!isDriveTrackUrl(track.srcUrl) && !config.dryRun) {
      console.log(`${progress} skip ${track.id} (${track.title}) -> non-Drive URL already present`)
      skippedCount += 1
      continue
    }

    if (config.dryRun) {
      console.log(`${progress} dry-run ${track.id} (${track.title}) -> ${track.srcUrl}`)
      continue
    }

    try {
      console.log(`${progress} download ${track.id} (${track.title})`)
      const filePayload = await downloadTrackSource(track, config.maxRetries)

      console.log(
        `${progress} upload ${track.id} (${track.title}) | ${Math.round(filePayload.byteLength / 1024)} KiB`,
      )
      const uploadResult = await uploadTrackToCloudinary(track, filePayload, config)

      const trackIndex = tracks.findIndex((candidate) => candidate.id === track.id)

      if (trackIndex < 0) {
        throw new Error(`Track ${track.id} disappeared during migration`)
      }

      tracks[trackIndex] = {
        ...tracks[trackIndex],
        srcUrl: uploadResult.secure_url,
      }

      manifest.migrated.push({
        id: track.id,
        title: track.title,
        originalSrcUrl: track.srcUrl,
        cloudinarySecureUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id ?? `${config.folder}/${track.id}`,
        version: uploadResult.version ?? null,
        bytes: uploadResult.bytes ?? filePayload.byteLength,
      })

      currentPlaylistSource = rebuildPlaylistSource(currentPlaylistSource, tracks)
      await writeFile(config.playlistFile, currentPlaylistSource, 'utf8')
      await writeManifest(config.manifestFile, manifest)

      successCount += 1
      console.log(`${progress} done ${track.id} -> ${uploadResult.secure_url}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      manifest.failed.push({
        id: track.id,
        title: track.title,
        srcUrl: track.srcUrl,
        error: message,
      })
      await writeManifest(config.manifestFile, manifest)
      console.error(`${progress} failed ${track.id} (${track.title}): ${message}`)
    }
  }

  console.log(
    `Migration complete. uploaded=${successCount} skipped=${skippedCount} failed=${manifest.failed.length} manifest=${config.manifestFile}`,
  )

  if (manifest.failed.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error)
  console.error(message)
  process.exitCode = 1
})
