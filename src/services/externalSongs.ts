/**
 * externalSongs.ts
 * Servicio para búsqueda e importación de canciones externas (LaCuerda y Recursos Católicos)
 */

import { API_URL } from "./songs";

export interface ExternalSongSearchResult {
    source: 'recursos_catolicos' | 'lacuerda';
    sourceName: string;
    id?: string;
    artistSlug?: string;
    songSlug?: string;
    title: string;
    artist: string;
    displayTitle?: string;
}

export interface ExternalSongImportParams {
    source: 'recursos_catolicos' | 'lacuerda';
    id?: string;
    artistSlug?: string;
    songSlug?: string;
    title?: string;
    artist?: string;
    enrichWithAi?: boolean;
}

export interface ExternalSongData {
    title: string;
    artist: string;
    key: string;
    youtubeUrl: string;
    categories: string[];
    chordPro: string;
    chords?: string[];
    source: string;
}

export interface ServiceResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export async function searchExternalSongs(query: string, baseUrl?: string): Promise<ServiceResponse<ExternalSongSearchResult[]>> {
    try {
        const trimmed = query.trim();
        if (!trimmed) {
            return { success: true, data: [] };
        }

        const url = `${baseUrl || API_URL}/search/external?q=${encodeURIComponent(trimmed)}`;
        const res = await fetch(url, { credentials: 'include' });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return {
                success: false,
                error: errData.error || `Error ${res.status} al buscar canciones externas`
            };
        }

        const data: ExternalSongSearchResult[] = await res.json();
        // Priorizar canciones provenientes de LaCuerda
        const sorted = Array.isArray(data)
            ? [...data].sort((a, b) => {
                if (a.source === 'lacuerda' && b.source !== 'lacuerda') return -1;
                if (a.source !== 'lacuerda' && b.source === 'lacuerda') return 1;
                return 0;
            })
            : data;
        return { success: true, data: sorted };
    } catch (err: any) {
        return {
            success: false,
            error: err.message || 'Error de conexión al buscar canciones externas'
        };
    }
}

export async function importExternalSong(
    params: ExternalSongImportParams,
    baseUrl?: string,
    token?: string
): Promise<ServiceResponse<ExternalSongData>> {
    try {
        const url = `${baseUrl || API_URL}/search/external/import`;
        const headers: HeadersInit = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(url, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(params)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            if (res.status === 401) {
                return {
                    success: false,
                    error: 'Debes iniciar sesión para previsualizar o importar canciones de internet.'
                };
            }
            return {
                success: false,
                error: errData.error || `Error ${res.status} al importar la canción`
            };
        }

        const data: ExternalSongData = await res.json();
        return { success: true, data };
    } catch (err: any) {
        return {
            success: false,
            error: err.message || 'Error de conexión al importar la canción'
        };
    }
}
