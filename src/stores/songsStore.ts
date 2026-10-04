import { atom, map } from 'nanostores';
import type { Song } from '../types/song';

// Mapa normalizado de canciones por ID (sobrevive a navegaciones de ClientRouter)
export const $songsById = map<Record<string | number, Song>>({});

// Caché de resultados de listados y búsquedas
export const $songQueryCache = map<Record<string, { ids: (string | number)[]; timestamp: number }>>({});

const DEFAULT_TTL_MS = 60 * 1000; // 60s

export function storeSong(song: Song) {
    if (!song || !song.id) return;
    $songsById.setKey(song.id, song);
}

export function storeSongs(songs: Song[]) {
    if (!Array.isArray(songs)) return;
    for (const song of songs) {
        if (song?.id) {
            $songsById.setKey(song.id, song);
        }
    }
}

export function getSongFromStore(id: string | number): Song | undefined {
    return $songsById.get()[id];
}

export function storeSongList(queryKey: string, songs: Song[]) {
    storeSongs(songs);
    $songQueryCache.setKey(queryKey, {
        ids: songs.map(s => s.id),
        timestamp: Date.now()
    });
}

export function getSongListFromStore(queryKey: string, ttlMs = DEFAULT_TTL_MS): Song[] | null {
    const entry = $songQueryCache.get()[queryKey];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttlMs) return null;

    const allSongs = $songsById.get();
    const result: Song[] = [];
    for (const id of entry.ids) {
        const song = allSongs[id];
        if (song) result.push(song);
    }
    return result.length === entry.ids.length ? result : null;
}
