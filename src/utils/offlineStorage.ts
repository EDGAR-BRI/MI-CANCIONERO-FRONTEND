import type { Song } from "../types/song";
import type { Misa, Moment } from "../types/misa";

const DB_NAME = "cancionero_offline_db";
const DB_VERSION = 1;

export const STORES = {
    SONGS: "songs",
    MISAS: "misas",
    MOMENTS: "moments",
    SYNC_QUEUE: "sync_queue",
} as const;

export interface OfflineAction {
    id: string;
    misaId: number;
    actionType:
        | "UPDATE_MISA_INFO"
        | "ADD_SONG"
        | "REMOVE_SONG"
        | "UPDATE_SONG_KEY"
        | "REORDER_SONGS"
        | "ADD_MOMENT"
        | "REMOVE_MOMENT"
        | "REORDER_MOMENTS";
    payload: any;
    createdAt: number;
    attempts: number;
}

export interface OfflineMisa extends Misa {
    downloadedAt: number;
    isOfflineAvailable: boolean;
    isDirty?: boolean;
    lastModifiedOffline?: number;
}

export interface OfflineSong extends Song {
    downloadedAt: number;
    isOfflineAvailable: boolean;
}

let dbInstance: IDBDatabase | null = null;

export const openOfflineDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (typeof window === "undefined" || !("indexedDB" in window)) {
            return reject(new Error("IndexedDB no está disponible en este entorno."));
        }

        if (dbInstance) {
            return resolve(dbInstance);
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Store para canciones descargadas
            if (!db.objectStoreNames.contains(STORES.SONGS)) {
                const songStore = db.createObjectStore(STORES.SONGS, { keyPath: "id" });
                songStore.createIndex("title", "title", { unique: false });
                songStore.createIndex("downloadedAt", "downloadedAt", { unique: false });
            }

            // Store para misas descargadas con cantos anidados completos
            if (!db.objectStoreNames.contains(STORES.MISAS)) {
                const misaStore = db.createObjectStore(STORES.MISAS, { keyPath: "id" });
                misaStore.createIndex("title", "title", { unique: false });
                misaStore.createIndex("dateMisa", "dateMisa", { unique: false });
                misaStore.createIndex("downloadedAt", "downloadedAt", { unique: false });
            }

            // Store para catálogo de momentos litúrgicos
            if (!db.objectStoreNames.contains(STORES.MOMENTS)) {
                db.createObjectStore(STORES.MOMENTS, { keyPath: "id" });
            }

            // Store para cola de acciones offline pendientes de sincronizar
            if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: "id" });
                queueStore.createIndex("misaId", "misaId", { unique: false });
                queueStore.createIndex("createdAt", "createdAt", { unique: false });
            }
        };

        request.onsuccess = (event) => {
            dbInstance = (event.target as IDBOpenDBRequest).result;
            dbInstance.onversionchange = () => {
                dbInstance?.close();
                dbInstance = null;
            };
            resolve(dbInstance);
        };

        request.onerror = (event) => {
            reject((event.target as IDBOpenDBRequest).error);
        };
    });
};

/* ==========================================================================
   Operaciones con Canciones
   ========================================================================== */

export const saveSongOffline = async (song: Song): Promise<OfflineSong> => {
    const db = await openOfflineDB();
    const offlineSong: OfflineSong = {
        ...song,
        id: Number(song.id),
        downloadedAt: Date.now(),
        isOfflineAvailable: true,
    };

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SONGS, "readwrite");
        const store = tx.objectStore(STORES.SONGS);
        const req = store.put(offlineSong);

        req.onsuccess = () => {
            notifyOfflineStorageChange("song", offlineSong.id, "saved");
            resolve(offlineSong);
        };
        req.onerror = () => reject(req.error);
    });
};

export const getSongOffline = async (id: number | string): Promise<OfflineSong | null> => {
    const db = await openOfflineDB();
    const numId = Number(id);

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SONGS, "readonly");
        const store = tx.objectStore(STORES.SONGS);
        const req = store.get(numId);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
};

export const getDownloadedSongs = async (): Promise<OfflineSong[]> => {
    const db = await openOfflineDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SONGS, "readonly");
        const store = tx.objectStore(STORES.SONGS);
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
};

export const deleteSongOffline = async (id: number | string): Promise<void> => {
    const db = await openOfflineDB();
    const numId = Number(id);

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SONGS, "readwrite");
        const store = tx.objectStore(STORES.SONGS);
        const req = store.delete(numId);

        req.onsuccess = () => {
            notifyOfflineStorageChange("song", numId, "deleted");
            resolve();
        };
        req.onerror = () => reject(req.error);
    });
};

export const isSongOffline = async (id: number | string): Promise<boolean> => {
    try {
        const song = await getSongOffline(id);
        return !!song;
    } catch {
        return false;
    }
};

/* ==========================================================================
   Operaciones con Misas
   ========================================================================== */

export const saveMisaOffline = async (misa: Misa): Promise<OfflineMisa> => {
    const db = await openOfflineDB();
    const offlineMisa: OfflineMisa = {
        ...misa,
        id: Number(misa.id),
        downloadedAt: Date.now(),
        isOfflineAvailable: true,
    };

    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORES.MISAS, STORES.SONGS], "readwrite");
        const misaStore = tx.objectStore(STORES.MISAS);
        const songStore = tx.objectStore(STORES.SONGS);

        misaStore.put(offlineMisa);

        // Guardamos también cada canto asignado en el store individual de canciones
        if (Array.isArray(misa.misaSongs)) {
            for (const ms of misa.misaSongs) {
                if (ms.song && ms.song.id) {
                    const songToStore: OfflineSong = {
                        ...ms.song,
                        id: Number(ms.song.id),
                        downloadedAt: Date.now(),
                        isOfflineAvailable: true,
                    };
                    songStore.put(songToStore);
                }
            }
        }

        tx.oncomplete = () => {
            notifyOfflineStorageChange("misa", offlineMisa.id, "saved");
            resolve(offlineMisa);
        };
        tx.onerror = () => reject(tx.error);
    });
};

export const getMisaOffline = async (id: number | string): Promise<OfflineMisa | null> => {
    const db = await openOfflineDB();
    const numId = Number(id);

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.MISAS, "readonly");
        const store = tx.objectStore(STORES.MISAS);
        const req = store.get(numId);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
};

export const getDownloadedMisas = async (): Promise<OfflineMisa[]> => {
    const db = await openOfflineDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.MISAS, "readonly");
        const store = tx.objectStore(STORES.MISAS);
        const req = store.getAll();

        req.onsuccess = () => {
            const misas = (req.result || []) as OfflineMisa[];
            misas.sort((a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0));
            resolve(misas);
        };
        req.onerror = () => reject(req.error);
    });
};

export const deleteMisaOffline = async (id: number | string): Promise<void> => {
    const db = await openOfflineDB();
    const numId = Number(id);

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.MISAS, "readwrite");
        const store = tx.objectStore(STORES.MISAS);
        const req = store.delete(numId);

        req.onsuccess = () => {
            notifyOfflineStorageChange("misa", numId, "deleted");
            resolve();
        };
        req.onerror = () => reject(req.error);
    });
};

export const isMisaOffline = async (id: number | string): Promise<boolean> => {
    try {
        const misa = await getMisaOffline(id);
        return !!misa;
    } catch {
        return false;
    }
};

/* ==========================================================================
   Operaciones con Momentos Litúrgicos
   ========================================================================== */

export const saveMomentsOffline = async (moments: Moment[]): Promise<void> => {
    if (!Array.isArray(moments) || moments.length === 0) return;
    const db = await openOfflineDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.MOMENTS, "readwrite");
        const store = tx.objectStore(STORES.MOMENTS);

        for (const moment of moments) {
            store.put(moment);
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const getMomentsOffline = async (): Promise<Moment[]> => {
    const db = await openOfflineDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.MOMENTS, "readonly");
        const store = tx.objectStore(STORES.MOMENTS);
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
};

/* ==========================================================================
   Cola de Sincronización Offline (Fase 2)
   ========================================================================== */

export const addOfflineAction = async (action: Omit<OfflineAction, "id" | "createdAt" | "attempts">): Promise<OfflineAction> => {
    const db = await openOfflineDB();
    const fullAction: OfflineAction = {
        ...action,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        createdAt: Date.now(),
        attempts: 0,
    };

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SYNC_QUEUE, "readwrite");
        const store = tx.objectStore(STORES.SYNC_QUEUE);
        const req = store.put(fullAction);

        req.onsuccess = () => {
            notifyOfflineStorageChange("sync_queue", fullAction.misaId, "enqueued");
            resolve(fullAction);
        };
        req.onerror = () => reject(req.error);
    });
};

export const getPendingOfflineActions = async (misaId?: number): Promise<OfflineAction[]> => {
    const db = await openOfflineDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SYNC_QUEUE, "readonly");
        const store = tx.objectStore(STORES.SYNC_QUEUE);
        const req = store.getAll();

        req.onsuccess = () => {
            let actions = (req.result || []) as OfflineAction[];
            if (typeof misaId === "number") {
                actions = actions.filter((a) => a.misaId === misaId);
            }
            actions.sort((a, b) => a.createdAt - b.createdAt);
            resolve(actions);
        };
        req.onerror = () => reject(req.error);
    });
};

export const removeOfflineAction = async (actionId: string): Promise<void> => {
    const db = await openOfflineDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SYNC_QUEUE, "readwrite");
        const store = tx.objectStore(STORES.SYNC_QUEUE);
        const req = store.delete(actionId);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
};

export const incrementActionAttempts = async (action: OfflineAction): Promise<void> => {
    const db = await openOfflineDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SYNC_QUEUE, "readwrite");
        const store = tx.objectStore(STORES.SYNC_QUEUE);
        const updated = { ...action, attempts: action.attempts + 1 };
        const req = store.put(updated);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
};

/* ==========================================================================
   Precacheo de Rutas HTML en CacheStorage
   ========================================================================== */

export const cacheUrlsForOffline = async (urls: string[]): Promise<void> => {
    if (typeof window === "undefined" || !("caches" in window)) return;
    try {
        const cache = await window.caches.open("cancionero-pages-runtime");
        for (const url of urls) {
            try {
                const response = await fetch(url, {
                    headers: { "Astro-Is-Client-Router": "true" },
                });
                if (response.ok) {
                    await cache.put(url, response.clone());
                }
            } catch (err) {
                console.warn(`[OfflineStorage] No se pudo precachear la ruta ${url}:`, err);
            }
        }
    } catch (e) {
        console.warn("[OfflineStorage] Error al acceder a CacheStorage:", e);
    }
};

/* ==========================================================================
   Notificación de Cambios en Storage Local
   ========================================================================== */

const notifyOfflineStorageChange = (type: "song" | "misa" | "sync_queue", id: number, action: string) => {
    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent("cancionero-offline-change", {
                detail: { type, id, action },
            })
        );
    }
};
