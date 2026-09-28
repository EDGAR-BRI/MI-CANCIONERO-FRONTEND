import { API_URL, type ServiceResponse } from "./songs";

/**
 * Tipos para la respuesta de generación de acordes
 */
export interface ChordProResponse {
    success: boolean;
    type: "full" | "autocomplete";
    chordPro: string;
    metadata: {
        title: string;
        key: string;
        [key: string]: any;
    };
    chords: {
        list: string[];
        count: number;
        validation: {
            valid: boolean;
            invalidChords: string[];
        };
    };
}

/**
 * Parámetros para buscar canción por fragmento de letra
 */
export interface SearchSongParams {
    lyricFragment: string;
    author?: string;
    artist?: string;
    title?: string;
}

/**
 * Parámetros para autocompletar acordes
 */
export interface AutocompleteParams {
    title: string;
    tone: string;
    lyrics: string;
}

/**
 * Busca una canción original con letra y acordes usando un fragmento de letra como pista
 * @param params - Parámetros de búsqueda (fragmento de letra, artista opcional, título opcional)
 * @param token - Token de autenticación opcional
 * @returns Respuesta con la canción original encontrada en formato ChordPro
 */
export const searchSongByLyrics = async (
    params: SearchSongParams,
    token?: string,
    baseUrl?: string
): Promise<ServiceResponse<ChordProResponse>> => {
    try {
        // Validación de parámetros
        if (!params.lyricFragment || params.lyricFragment.trim().length === 0) {
            return {
                success: false,
                error: "Se requiere un fragmento de letra para buscar la canción",
            };
        }

        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const apiUrl = baseUrl || API_URL;
        const response = await fetch(`${apiUrl}/search/song`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                lyricFragment: params.lyricFragment,
                author: params.author || params.artist || "",
                artist: params.author || params.artist || "",
                title: params.title || "",
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.message || "Error al buscar la canción",
            };
        }

        const data: ChordProResponse = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error("Error en searchSongByLyrics:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error de conexión con el servidor",
        };
    }
};

/**
 * Autocompleta acordes para una letra existente usando IA
 * @param params - Parámetros (título, tono, letra)
 * @param token - Token de autenticación opcional
 * @returns Respuesta con la letra con acordes en formato ChordPro
 */
export const autocompleteChordsWithAI = async (
    params: AutocompleteParams,
    token?: string,
    baseUrl?: string
): Promise<ServiceResponse<ChordProResponse>> => {
    try {
        // Validación de parámetros
        if (!params.title || !params.tone || !params.lyrics) {
            return {
                success: false,
                error: "Título, tono y letra son requeridos",
            };
        }

        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const apiUrl = baseUrl || API_URL;
        const response = await fetch(`${apiUrl}/generate/autocomplete`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                title: params.title,
                tone: params.tone,
                lyrics: params.lyrics,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.message || errorData.error || "Error al generar acordes",
            };
        }

        const data: ChordProResponse = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error("Error en autocompleteChordsWithAI:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error de conexión con el servidor",
        };
    }
};
