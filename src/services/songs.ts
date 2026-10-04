import type { Song } from "../types/song";
import type { Author } from "../types/author";

export const getApiUrl = (): string => {
    const defaultUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:3000/api";
    if (typeof window !== "undefined") {
        const currentHostname = window.location.hostname;
        if (currentHostname && currentHostname !== "localhost" && currentHostname !== "127.0.0.1") {
            if (defaultUrl.includes("localhost")) {
                return defaultUrl.replace("localhost", currentHostname);
            }
            if (defaultUrl.includes("127.0.0.1")) {
                return defaultUrl.replace("127.0.0.1", currentHostname);
            }
        }
    }
    return defaultUrl;
};

export const API_URL = getApiUrl();

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const songDetailCache = new Map<string | number, CacheEntry<Song>>();
const songSearchCache = new Map<string, CacheEntry<Song[]>>();
const CACHE_TTL_MS = 60 * 1000; // 60 segundos de caché cliente

export interface ServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface SongFormData {
    title: string;
    authorId?: number;
    authorName?: string;
    key: string;
    url_song: string;
    content: string;
    categoryIds: number[];
    categoryId?: number;
    active: boolean;
}

const extractSongData = (formData: FormData): SongFormData => {
    const rawCategoryIds = formData.getAll("categoryIds");
    let categoryIds: number[] = [];
    if (rawCategoryIds.length > 0) {
        categoryIds = rawCategoryIds
            .map(v => parseInt(v.toString()))
            .filter(n => !isNaN(n));
    } else {
        const singleCat = formData.get("categoryId")?.toString();
        if (singleCat) {
            const parsed = parseInt(singleCat);
            if (!isNaN(parsed)) categoryIds = [parsed];
        }
    }

    const rawAuthorId = formData.get("authorId")?.toString();
    const parsedAuthorId = rawAuthorId ? parseInt(rawAuthorId) : undefined;
    const authorName = formData.get("authorName")?.toString()?.trim() || undefined;

    return {
        title: formData.get("title")?.toString() || "",
        authorId: parsedAuthorId && !isNaN(parsedAuthorId) ? parsedAuthorId : undefined,
        authorName,
        key: formData.get("key")?.toString() || "C",
        url_song: formData.get("url_song")?.toString() || "",
        content: formData.get("content")?.toString() || "",
        categoryIds,
        categoryId: categoryIds[0] || 1,
        active: formData.get("active") === "on"
    };
};

export const createSong = async (formData: FormData, token?: string): Promise<ServiceResponse> => {
    const data = extractSongData(formData);

    if (!data.title.trim()) {
        return { success: false, error: "El título de la canción es obligatorio." };
    }

    try {
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) {
            headers["Cookie"] = `token=${token}`;
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/songs`, {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const errData = await res.json();
            return { success: false, error: "Error al guardar la canción.", data: errData };
        }

        const savedSong = await res.json();
        songSearchCache.clear();
        return { success: true, data: savedSong };
    } catch (e) {
        console.error("Service exception:", e);
        return { success: false, error: "Error de conexión con el servidor." };
    }
};

export interface DirectSongInput {
    title: string;
    authorName?: string;
    authorId?: number;
    key?: string;
    url_song?: string;
    content: string;
    categoryIds?: number[];
    categoryId?: number;
    active?: boolean;
}

export const createSongDirect = async (songData: DirectSongInput, token?: string): Promise<ServiceResponse<Song>> => {
    if (!songData.title.trim()) {
        return { success: false, error: "El título de la canción es obligatorio." };
    }

    try {
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) {
            headers["Cookie"] = `token=${token}`;
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/songs`, {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify({
                ...songData,
                key: songData.key || "C",
                active: songData.active !== undefined ? songData.active : true,
            }),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return { success: false, error: errData.error || "Error al guardar la canción.", data: errData };
        }

        const savedSong = await res.json();
        songSearchCache.clear();
        return { success: true, data: savedSong };
    } catch (e: any) {
        console.error("createSongDirect exception:", e);
        return { success: false, error: e?.message || "Error de conexión con el servidor." };
    }
};

export const updateSong = async (id: number, formData: FormData, token?: string): Promise<ServiceResponse> => {
    const data = extractSongData(formData);

    if (!data.title.trim()) {
        return { success: false, error: "El título de la canción es obligatorio." };
    }

    try {
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) {
            headers["Cookie"] = `token=${token}`;
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/songs/${id}`, {
            method: "PUT",
            headers,
            credentials: "include",
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const errData = await res.json();
            return { success: false, error: "Error al actualizar la canción.", data: errData };
        }

        const updatedSong = await res.json();
        songDetailCache.delete(id);
        songSearchCache.clear();
        return { success: true, data: updatedSong };
    } catch (e) {
        console.error("Service exception:", e);
        return { success: false, error: "Error de conexión con el servidor." };
    }
};

export const searchSongs = async (query: string, categoryId: string = ""): Promise<ServiceResponse<Song[]>> => {
    const cacheKey = `${query.trim().toLowerCase()}_${categoryId}`;
    const cached = songSearchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        return { success: true, data: cached.data };
    }

    try {
        const res = await fetch(`${API_URL}/songs?q=${encodeURIComponent(query)}&categoryId=${categoryId}`);
        if (!res.ok) {
            return { success: false, error: "Error al buscar canciones." };
        }
        const data = await res.json();
        songSearchCache.set(cacheKey, { data, timestamp: Date.now() });
        return { success: true, data };
    } catch (e) {
        console.error("Service exception:", e);
        return { success: false, error: "Error de conexión." };
    }
};

export const getSongById = async (id: string | number, forceFresh = false): Promise<ServiceResponse<Song>> => {
    const cached = songDetailCache.get(id);
    if (!forceFresh && cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        return { success: true, data: cached.data };
    }

    try {
        const res = await fetch(`${API_URL}/songs/${id}`);
        if (!res.ok) {
            return { success: false, error: "Error al obtener la canción." };
        }
        const data = await res.json();
        songDetailCache.set(id, { data, timestamp: Date.now() });
        return { success: true, data };
    } catch (e) {
        console.error("Service exception:", e);
        return { success: false, error: "Error de conexión." };
    }
};

export const deleteSongById = async (id: number | string, token: string | undefined): Promise<ServiceResponse> => {
    try {
        const headers: HeadersInit = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/songs/${id}`, {
            method: "DELETE",
            headers,
            credentials: "include",
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return { success: false, error: errData.error || "Error al eliminar la canción." };
        }

        songDetailCache.delete(id);
        songSearchCache.clear();
        return { success: true };
    } catch (e) {
        console.error("Service exception:", e);
        return { success: false, error: "Error de conexión con el servidor." };
    }
};

export const getAuthors = async (token?: string): Promise<ServiceResponse<Author[]>> => {
    try {
        const headers: HeadersInit = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API_URL}/authors`, { headers, credentials: "include" });
        if (!res.ok) return { success: false, error: "Error al obtener autores." };
        const data = await res.json();
        return { success: true, data };
    } catch (e) {
        console.error("Service exception:", e);
        return { success: false, error: "Error de conexión." };
    }
};

export const createAuthor = async (name: string, token?: string): Promise<ServiceResponse<Author>> => {
    try {
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API_URL}/authors`, {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify({ name }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: err.error || "Error al crear autor." };
        }
        const data = await res.json();
        return { success: true, data };
    } catch (e) {
        console.error("Service exception:", e);
        return { success: false, error: "Error de conexión." };
    }
};

export interface DownloadSongPdfOptions {
    withChords?: boolean;
    tone?: string;
    title?: string;
}

export const downloadSongPdf = async (
    songId: number | string,
    options: DownloadSongPdfOptions = {}
): Promise<{ success: boolean; isRateLimited?: boolean; retryAfter?: number; error?: string }> => {
    try {
        const { withChords = true, tone, title } = options;
        const params = new URLSearchParams();
        params.set('withChords', withChords ? 'true' : 'false');
        if (tone) params.set('tone', tone);

        const res = await fetch(`${API_URL}/songs/${songId}/pdf?${params.toString()}`, {
            credentials: 'include'
        });

        if (res.status === 429) {
            const retryHeader = res.headers.get('Retry-After');
            const retryAfter = retryHeader ? parseInt(retryHeader, 10) : 300;
            const data = await res.json().catch(() => ({}));
            return {
                success: false,
                isRateLimited: true,
                retryAfter,
                error: data.error || 'Has superado el límite de descargas de PDF. Por favor espera unos minutos.'
            };
        }

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return {
                success: false,
                error: errData.error || 'Error al descargar el PDF de la canción.'
            };
        }

        const blob = await res.blob();
        const contentDisposition = res.headers.get('Content-Disposition');
        let filename = '';

        if (contentDisposition) {
            const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
            if (utf8Match && utf8Match[1]) {
                try {
                    filename = decodeURIComponent(utf8Match[1].trim().replace(/^["']|["']$/g, ''));
                } catch (_) {}
            }
            if (!filename) {
                const match = contentDisposition.match(/filename="?([^";]+)"?/i);
                if (match && match[1]) {
                    filename = match[1].trim();
                }
            }
        }

        if (!filename) {
            const cleanTitle = (title || 'Cancion')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9_\-]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
            const suffix = withChords ? '' : '_letra';
            filename = `${cleanTitle || `cancion-${songId}`}${suffix}.pdf`;
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        return { success: true };
    } catch (e: any) {
        console.error('downloadSongPdf error:', e);
        return { success: false, error: e?.message || 'Error de conexión al descargar el PDF.' };
    }
};

