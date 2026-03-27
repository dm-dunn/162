/**
 * logoCache.js
 *
 * Persistent logo caching using expo-file-system.
 *
 * Strategy:
 *  1. On app start, call preloadLogos() once — fires & forgets in the background.
 *  2. Each logo is downloaded from ESPN's CDN exactly ONE time, then saved to the
 *     device's cache directory as `mlb_logos/<abbr>.png`.
 *  3. An in-memory Map is populated with local file:// URIs so getLogoUri() is
 *     always synchronous and instant on subsequent renders.
 *  4. If a logo isn't cached yet (still downloading) or download failed, the CDN
 *     URL is returned as a fallback so the Image still renders.
 *
 * This eliminates all rate-limit / intermittent failures after the first run.
 */

import * as FileSystem from 'expo-file-system';
import { teamLogos } from '../utils/teamLogos';

const LOGO_DIR = FileSystem.cacheDirectory + 'mlb_logos/';
const BATCH_SIZE = 5; // concurrent downloads per batch — keeps ESPN happy

// In-memory map: abbr → local file:// URI
// Populated at startup; persists for the app session.
const cachedUris = new Map();

let _preloadPromise = null;
let _preloadComplete = false;

/** Returns true once all logos have been loaded into cachedUris */
export function isLogoCacheReady() {
  return _preloadComplete;
}

/**
 * Synchronously returns the best available URI for a team logo.
 * - If disk cache is warm: returns local file:// URI (instant, no network)
 * - If still loading or failed: returns CDN URL as fallback
 * - Never throws, even if teamLogos arrived as undefined due to a cycle
 */
export function getLogoUri(abbr) {
  if (!abbr) return null;
  const fromCache = cachedUris.get(abbr);
  if (fromCache) return fromCache;
  // Guard against teamLogos being undefined/empty during a module-cycle edge case
  const cdnUrl = teamLogos && teamLogos[abbr];
  return cdnUrl || null;
}

/**
 * Ensures the logo directory exists.
 */
async function ensureLogoDir() {
  const info = await FileSystem.getInfoAsync(LOGO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(LOGO_DIR, { intermediates: true });
  }
}

/**
 * Downloads a single logo to disk (if not already cached).
 * Populates cachedUris on success.
 * Silently swallows errors — fallback to CDN handles failures gracefully.
 */
async function cacheOneLogo(abbr) {
  const cdnUrl = teamLogos[abbr];
  if (!cdnUrl) return; // unknown team — skip

  const localPath = `${LOGO_DIR}${abbr.toLowerCase()}.png`;

  try {
    const info = await FileSystem.getInfoAsync(localPath);

    if (info.exists && info.size > 0) {
      // Already on disk — just register in memory
      cachedUris.set(abbr, localPath);
      return;
    }

    // Download from ESPN CDN
    const result = await FileSystem.downloadAsync(cdnUrl, localPath);

    if (result.status === 200) {
      cachedUris.set(abbr, result.uri);
    }
    // Non-200: leave CDN URL as fallback (no entry in cachedUris)
  } catch (_err) {
    // Network error, permission error, etc. — CDN fallback handles it.
  }
}

/**
 * Downloads all 30 team logos in batches.
 * Safe to call multiple times — subsequent calls return the same promise.
 *
 * Usage: call once in AppNavigator or App.js, fire-and-forget:
 *   preloadLogos();
 */
export function preloadLogos() {
  if (_preloadPromise) return _preloadPromise;

  _preloadPromise = (async () => {
    try {
      await ensureLogoDir();

      const abbrs = Object.keys(teamLogos);

      // Process in batches to avoid hitting ESPN with 30 simultaneous requests
      for (let i = 0; i < abbrs.length; i += BATCH_SIZE) {
        const batch = abbrs.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(cacheOneLogo));
      }
    } catch (_err) {
      // Top-level error (e.g. dir creation failed) — app still works via CDN.
    } finally {
      _preloadComplete = true;
    }
  })();

  return _preloadPromise;
}

/**
 * Clears the on-disk logo cache and resets in-memory state.
 * Useful for a "refresh assets" option in settings, or during development.
 */
export async function clearLogoCache() {
  try {
    const info = await FileSystem.getInfoAsync(LOGO_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(LOGO_DIR, { idempotent: true });
    }
    cachedUris.clear();
    _preloadComplete = false;
    _preloadPromise = null;
  } catch (_err) {
    // Ignore cleanup errors
  }
}
