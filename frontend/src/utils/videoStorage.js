/**
 * KCCA ParkWatch Media Storage Utility
 * Uses browser IndexedDB to persist large video footage files locally
 * per parking facility, paired with localStorage for instant playback state synchronization.
 */

const DB_NAME = 'KCCA_ParkWatch_Media'
const DB_VERSION = 1
const STORE_NAME = 'facility_videos'

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser environment.'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'areaId' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Save a video file/blob for a specific parking facility.
 * @param {string|number} areaId
 * @param {Blob|File} blob
 * @param {Object} [meta]
 */
export async function saveFacilityVideo(areaId, blob, meta = {}) {
  try {
    const db = await openDB()
    const id = String(areaId)
    const record = {
      areaId: id,
      blob,
      fileName: meta.fileName || (blob instanceof File ? blob.name : 'footage.mp4'),
      fileSize: meta.fileSize || blob.size || 0,
      fileType: meta.fileType || blob.type || 'video/mp4',
      currentTime: meta.currentTime ?? 0,
      isPlaying: meta.isPlaying ?? false,
      savedAt: new Date().toISOString(),
    }

    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put(record)
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })

    // Also sync playback state to localStorage for instantaneous synchronous access
    savePlaybackState(id, {
      currentTime: record.currentTime,
      isPlaying: record.isPlaying,
      fileName: record.fileName,
      savedAt: record.savedAt,
    })

    return record
  } catch (err) {
    console.error('Failed to save facility video to IndexedDB:', err)
    return null
  }
}

/**
 * Retrieve the saved video record for a parking facility.
 * @param {string|number} areaId
 * @returns {Promise<Object|null>}
 */
export async function getFacilityVideo(areaId) {
  try {
    const db = await openDB()
    const id = String(areaId)

    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })

    if (!record) return null

    // Merge with latest localStorage playback state if newer
    const localState = getPlaybackState(id)
    if (localState) {
      if (localState.currentTime !== undefined) record.currentTime = localState.currentTime
      if (localState.isPlaying !== undefined) record.isPlaying = localState.isPlaying
    }

    return record
  } catch (err) {
    console.error('Failed to get facility video from IndexedDB:', err)
    return null
  }
}

/**
 * Update playback position and playing state for a facility.
 * @param {string|number} areaId
 * @param {{ currentTime?: number, isPlaying?: boolean }} state
 */
export async function updateFacilityPlayback(areaId, state) {
  const id = String(areaId)
  savePlaybackState(id, state)

  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(id)

    req.onsuccess = () => {
      const record = req.result
      if (record) {
        if (state.currentTime !== undefined) record.currentTime = state.currentTime
        if (state.isPlaying !== undefined) record.isPlaying = state.isPlaying
        record.lastUpdated = Date.now()
        store.put(record)
      }
    }
  } catch (err) {
    // Non-blocking: localStorage already saved the state synchronously
    console.debug('Async IndexedDB playback update throttled/skipped:', err)
  }
}

/**
 * Remove a facility's video from IndexedDB and localStorage.
 * @param {string|number} areaId
 */
export async function deleteFacilityVideo(areaId) {
  const id = String(areaId)
  clearPlaybackState(id)

  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(id)
  } catch (err) {
    console.error('Failed to delete facility video from IndexedDB:', err)
  }
}

// ------------------------------------------------ Fast LocalStorage Sync ----
const PLAYBACK_PREFIX = 'parkwatch_playback_'

export function savePlaybackState(areaId, state) {
  try {
    const id = String(areaId)
    const existing = getPlaybackState(id) || {}
    const merged = { ...existing, ...state, updated: Date.now() }
    localStorage.setItem(PLAYBACK_PREFIX + id, JSON.stringify(merged))
  } catch (e) {
    // ignore quota/private mode errors
  }
}

export function getPlaybackState(areaId) {
  try {
    const raw = localStorage.getItem(PLAYBACK_PREFIX + String(areaId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearPlaybackState(areaId) {
  try {
    localStorage.removeItem(PLAYBACK_PREFIX + String(areaId))
  } catch {
    // ignore
  }
}
