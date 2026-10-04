import {
    getPendingOfflineActions,
    removeOfflineAction,
    incrementActionAttempts,
    type OfflineAction,
    getMisaOffline,
    saveMisaOffline,
} from "../utils/offlineStorage";
import {
    updateMisa,
    addSongToMisa,
    removeSongFromMisa,
    updateMisaSong,
    reorderMisaSongs,
    addMomentToMisa,
    removeMomentFromMisa,
    reorderMisaMoments,
} from "./misas";

let isSyncing = false;

export interface SyncResult {
    syncedCount: number;
    failedCount: number;
    total: number;
    errors: string[];
}

export const syncOfflineQueue = async (token?: string): Promise<SyncResult> => {
    if (isSyncing) {
        return { syncedCount: 0, failedCount: 0, total: 0, errors: ["Sincronización ya en curso"] };
    }

    isSyncing = true;
    const actions = await getPendingOfflineActions();
    const result: SyncResult = {
        syncedCount: 0,
        failedCount: 0,
        total: actions.length,
        errors: [],
    };

    if (actions.length === 0) {
        isSyncing = false;
        return result;
    }

    for (const action of actions) {
        try {
            let res: { success: boolean; error?: string } = { success: false };

            switch (action.actionType) {
                case "UPDATE_MISA_INFO": {
                    const { id, title, dateMisa, visibility, editToken, ministryId } = action.payload;
                    res = await updateMisa(id, title, dateMisa, visibility, token, editToken, ministryId);
                    break;
                }
                case "ADD_SONG": {
                    const { misaId, songId, momentId, key, editToken } = action.payload;
                    res = await addSongToMisa(misaId, songId, momentId, key, token, editToken);
                    break;
                }
                case "REMOVE_SONG": {
                    const { misaId, misaSongId, editToken } = action.payload;
                    res = await removeSongFromMisa(misaId, misaSongId, token, editToken);
                    break;
                }
                case "UPDATE_SONG_KEY": {
                    const { misaId, misaSongId, key, editToken } = action.payload;
                    res = await updateMisaSong(misaId, misaSongId, key, token, editToken);
                    break;
                }
                case "REORDER_SONGS": {
                    const { misaId, orderedSongIds, editToken } = action.payload;
                    res = await reorderMisaSongs(misaId, orderedSongIds, token, editToken);
                    break;
                }
                case "ADD_MOMENT": {
                    const { misaId, momentId, name, editToken } = action.payload;
                    res = await addMomentToMisa(misaId, { momentId, name }, token, editToken);
                    break;
                }
                case "REMOVE_MOMENT": {
                    const { misaId, momentId, editToken } = action.payload;
                    res = await removeMomentFromMisa(misaId, momentId, token, editToken);
                    break;
                }
                case "REORDER_MOMENTS": {
                    const { misaId, orderedMomentIds, editToken } = action.payload;
                    res = await reorderMisaMoments(misaId, orderedMomentIds, token, editToken);
                    break;
                }
            }

            if (res.success) {
                await removeOfflineAction(action.id);
                result.syncedCount++;

                // Quitar bandera dirty si ya no quedan acciones para esta misa
                const remainingForMisa = await getPendingOfflineActions(action.misaId);
                if (remainingForMisa.length === 0) {
                    const localMisa = await getMisaOffline(action.misaId);
                    if (localMisa) {
                        localMisa.isDirty = false;
                        await saveMisaOffline(localMisa);
                    }
                }
            } else {
                result.failedCount++;
                if (res.error) result.errors.push(res.error);
                await incrementActionAttempts(action);
            }
        } catch (err: any) {
            result.failedCount++;
            result.errors.push(err?.message || "Error al procesar acción offline");
            await incrementActionAttempts(action);
        }
    }

    isSyncing = false;

    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent("cancionero-sync-complete", {
                detail: result,
            })
        );
    }

    return result;
};
