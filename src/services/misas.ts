import type { Misa } from "../types/misa";
import { API_URL, type ServiceResponse } from "./songs";

export const getMisas = async (token?: string): Promise<ServiceResponse<Misa[]>> => {
    try {
        const headers: HeadersInit = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch(`${API_URL}/misas`, {
            headers,
            credentials: "include",
            signal: AbortSignal.timeout(10000)
        });
        if (!res.ok) {
            return { success: false, error: "Error al obtener las misas." };
        }
        const data = await res.json();
        return { success: true, data: Array.isArray(data) ? data : [] };
    } catch (e) {
        console.error("Service exception:", e);
        return { success: false, error: e instanceof Error ? e.message : "Error de conexión." };
    }
};

export const createMisa = async (title: string, dateMisa: string, visibility: string = "PUBLIC", token?: string): Promise<ServiceResponse<Misa>> => {
    try {
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/misas`, {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify({ title, dateMisa, visibility }),
            signal: AbortSignal.timeout(10000)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => null);
            console.error("createMisa failed:", res.status, res.statusText, errData);
            return { success: false, error: errData?.error || "Error al crear la misa." };
        }

        const data = await res.json();
        return { success: true, data };
    } catch (e) {
        console.error("Service exception:", e);
        return { success: false, error: e instanceof Error ? e.message : "Error de conexión." };
    }
};

export const updateMisa = async (id: number, title: string, dateMisa: string, visibility: string, token: string | undefined, editToken?: string): Promise<ServiceResponse<Misa>> => {
    try {
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        let url = `${API_URL}/misas/${id}`;
        if (editToken) {
            url += `?edit_token=${editToken}`;
        }

        const res = await fetch(url, {
            method: "PUT",
            headers,
            credentials: "include",
            body: JSON.stringify({ title, dateMisa, visibility }),
            signal: AbortSignal.timeout(10000)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => null);
            return { success: false, error: err?.error || "Error al actualizar la misa." };
        }
        const data = await res.json();
        return { success: true, data };
    } catch (e) {
        console.error("Service exception:", e);
        return { success: false, error: e instanceof Error ? e.message : "Error de conexión." };
    }
};

export const addSongToMisa = async (misaId: number, songId: number, momentId: number | null, key: string, token: string | undefined, editToken?: string): Promise<ServiceResponse<any>> => {
    try {
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        let url = `${API_URL}/misas/${misaId}/songs`;
        if (editToken) {
            url += `?edit_token=${editToken}`;
        }

        const res = await fetch(url, {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify({ songId, momentId, key }),
            signal: AbortSignal.timeout(10000)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => null);
            return { success: false, error: errData?.error || "Error al agregar la canción.", data: errData };
        }

        const data = await res.json();
        return { success: true, data };
    } catch (e) {
        console.error("Service exception:", e);
        return { success: false, error: e instanceof Error ? e.message : "Error de conexión." };
    }
};

export const removeSongFromMisa = async (misaId: number, misaSongId: number, token: string | undefined, editToken?: string): Promise<ServiceResponse<any>> => {
    try {
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        let url = `${API_URL}/misas/${misaId}/songs/${misaSongId}`;
        if (editToken) {
            url += `?edit_token=${editToken}`;
        }

        const res = await fetch(url, {
            method: "DELETE",
            headers,
            credentials: "include",
            signal: AbortSignal.timeout(10000)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => null);
            return { success: false, error: errData?.error || "Error al eliminar la canción." };
        }

        return { success: true };
    } catch (e) {
        console.error("Service exception:", e);
        return { success: false, error: e instanceof Error ? e.message : "Error de conexión." };
    }
};

export const deleteMisa = async (id: number, token: string | undefined): Promise<ServiceResponse<any>> => {
    try {
        const headers: HeadersInit = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/misas/${id}`, {
            method: "DELETE",
            headers,
            credentials: "include",
            signal: AbortSignal.timeout(10000)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => null);
            return { success: false, error: err?.error || "Error al eliminar la misa." };
        }

        return { success: true };
    } catch (e) {
        console.error("Service exception:", e);
        return { success: false, error: e instanceof Error ? e.message : "Error de conexión." };
    }
};

export const updateMisaSong = async (misaId: number, misaSongId: number, key: string, token: string | undefined, editToken?: string): Promise<ServiceResponse<any>> => {
    try {
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        let url = `${API_URL}/misas/${misaId}/songs/${misaSongId}`;
        if (editToken) {
            url += `?edit_token=${editToken}`;
        }

        const res = await fetch(url, {
            method: "PUT",
            headers,
            credentials: "include",
            body: JSON.stringify({ key }),
            signal: AbortSignal.timeout(10000)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => null);
            return { success: false, error: err?.error || "Error al actualizar la canción." };
        }

        const data = await res.json();
        return { success: true, data };
    } catch (e) {
        console.error("Service exception:", e);
        return { success: false, error: e instanceof Error ? e.message : "Error de conexión." };
    }
};

export const cloneMisa = async (originalMisa: Misa, token: string): Promise<ServiceResponse<Misa>> => {
    try {
        const createRes = await createMisa(`${originalMisa.title} (Copia)`, new Date().toISOString(), "PRIVATE", token);

        if (!createRes.success || !createRes.data) {
            return { success: false, error: createRes.error || "Error al crear la copia de la misa." };
        }

        const newMisa = createRes.data;

        for (const song of originalMisa.misaSongs) {
            const key = song.key || song.song.key || "C";
            await addSongToMisa(newMisa.id, song.songId, song.momentId, key, token);
        }

        return { success: true, data: newMisa };
    } catch (e) {
        console.error("Service exception:", e);
        return { success: false, error: e instanceof Error ? e.message : "Error al clonar la misa." };
    }
};
