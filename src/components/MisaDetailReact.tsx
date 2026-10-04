import AppIcon from "@/components/Ui/AppIcon";
import { useBodyScrollLock } from "@/utils/useBodyScrollLock";
import React, { useState, useRef, useEffect } from "react";
import type { Misa, MisaSong, Moment, MisaMoment } from "../types/misa";
import type { Song } from "../types/song";
import {
    addSongToMisa,
    removeSongFromMisa,
    updateMisaSong,
    reorderMisaSongs,
    addMomentToMisa,
    removeMomentFromMisa,
    reorderMisaMoments,
    updateMisa,
    deleteMisa,
    cloneMisa,
} from "../services/misas";
import { searchSongs } from "../services/songs";
import { getMyMinistries, type MinistrySummary } from "../services/ministries";
import { NOTES } from "../utils/music";
import {
    showError,
    showSuccessToast,
    showConfirm,
    showLoading,
} from "../utils/alerts";
import MisaOfflineDownloadButtonReact from "./MisaOfflineDownloadButtonReact";
import {
    saveMisaOffline,
    getMisaOffline,
    saveSongOffline,
    getDownloadedSongs,
    addOfflineAction,
    getPendingOfflineActions,
} from "../utils/offlineStorage";
import { syncOfflineQueue } from "../services/offlineSync";
import { isDeviceOnline } from "../utils/networkStatus";

interface Props {
    initialMisa: Misa;
    allMoments: Moment[];
    token?: string;
    editToken?: string;
    currentUser?: any;
}

export default function MisaDetailReact({
    initialMisa,
    allMoments: initialAllMoments,
    token,
    editToken,
    currentUser,
}: Props) {
    const [misa, setMisa] = useState<Misa>(initialMisa);
    const [allMoments, setAllMoments] = useState<Moment[]>(initialAllMoments);

    // Offline sync state
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    const refreshPendingActions = async () => {
        try {
            const actions = await getPendingOfflineActions(misa.id);
            setPendingSyncCount(actions.length);
        } catch {}
    };

    useEffect(() => {
        refreshPendingActions();

        const checkOfflineCache = async () => {
            try {
                const localMisa = await getMisaOffline(initialMisa.id);
                if (localMisa && (localMisa.isDirty || !navigator.onLine)) {
                    setMisa(localMisa);
                }
            } catch {}
        };
        checkOfflineCache();

        const handleSyncEvent = () => {
            refreshPendingActions();
            checkOfflineCache();
        };
        const handleOfflineChange = () => {
            refreshPendingActions();
            checkOfflineCache();
        };

        window.addEventListener("cancionero-sync-complete", handleSyncEvent);
        window.addEventListener("cancionero-offline-change", handleOfflineChange);
        return () => {
            window.removeEventListener("cancionero-sync-complete", handleSyncEvent);
            window.removeEventListener("cancionero-offline-change", handleOfflineChange);
        };
    }, [initialMisa.id]);

    const handleManualSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        try {
            const res = await syncOfflineQueue(token);
            if (res.syncedCount > 0) {
                await showSuccessToast("Sincronización completada", `Se aplicaron ${res.syncedCount} cambios en el servidor.`);
            } else if (res.failedCount > 0) {
                showError("Sincronización incompleta", "Algunos cambios no se pudieron sincronizar. Verifica tu conexión.");
            }
        } catch {
            showError("Error", "Error al intentar sincronizar.");
        } finally {
            setIsSyncing(false);
            refreshPendingActions();
        }
    };

    const isOwner = Boolean(
        misa.isOwner ||
            (currentUser?.id && misa.userId && currentUser.id === misa.userId)
    );
    const canEdit = Boolean(misa.canEdit || isOwner);

    // Drag and drop states for songs
    const [draggedSongInfo, setDraggedSongInfo] = useState<{
        momentId: number;
        songId: number;
        index: number;
    } | null>(null);
    const [dragOverSongIndex, setDragOverSongIndex] = useState<{
        momentId: number;
        index: number;
    } | null>(null);

    // Modal states
    const [showAddMomentModal, setShowAddMomentModal] = useState(false);
    const [customMomentName, setCustomMomentName] = useState("");
    const [addingMoment, setAddingMoment] = useState(false);

    // Add Song Modal
    const [showAddSongModal, setShowAddSongModal] = useState(false);
    const [targetMomentId, setTargetMomentId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Song[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);
    const [selectedTone, setSelectedTone] = useState("C");
    const [isAddingSong, setIsAddingSong] = useState(false);

    // Edit Tone Modal
    const [showToneModal, setShowToneModal] = useState(false);
    const [editingSong, setEditingSong] = useState<MisaSong | null>(null);
    const [newToneValue, setNewToneValue] = useState("");

    // Edit Misa Info Modal
    const [showEditMisaModal, setShowEditMisaModal] = useState(false);
    const [editTitle, setEditTitle] = useState(misa.title);
    const initialDateObj = new Date(misa.dateMisa);
    const initialDateStr = !isNaN(initialDateObj.getTime())
        ? initialDateObj.toISOString().slice(0, 10)
        : "";
    const initialTimeStr = !isNaN(initialDateObj.getTime())
        ? initialDateObj.toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
          })
        : "10:00";
    const [editDate, setEditDate] = useState(initialDateStr);
    const [editTime, setEditTime] = useState(initialTimeStr);
    const [editVisibility, setEditVisibility] = useState(misa.visibility);
    const [editMinistryId, setEditMinistryId] = useState<string>(
        misa.ministryId ? String(misa.ministryId) : ""
    );
    const [userMinistries, setUserMinistries] = useState<MinistrySummary[]>([]);
    const [savingMisaInfo, setSavingMisaInfo] = useState(false);
    const [isCloning, setIsCloning] = useState(false);

    // Clone Misa Modal State
    const [showCloneModal, setShowCloneModal] = useState(false);
    const [cloneTitle, setCloneTitle] = useState(`${misa.title} (Copia)`);
    const [cloneMinistryId, setCloneMinistryId] = useState<string>(
        misa.ministryId ? String(misa.ministryId) : ""
    );
    const [cloneVisibility, setCloneVisibility] = useState<"PUBLIC" | "PRIVATE">("PRIVATE");

    const isAnyModalOpen = showAddMomentModal || showAddSongModal || showToneModal || showEditMisaModal || showCloneModal;
    useBodyScrollLock(isAnyModalOpen);

    useEffect(() => {
        if ((showEditMisaModal || showCloneModal) && token && userMinistries.length === 0) {
            getMyMinistries(token).then((res) => {
                if (res.success && res.data?.ministries) {
                    setUserMinistries(res.data.ministries);
                }
            });
        }
    }, [showEditMisaModal, showCloneModal, token]);

    // Search debounce timer ref
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Format date and time
    const formatDateTime = (dateStr: string) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return { datePart: dateStr, timePart: "" };

        const datePart = d.toLocaleDateString("es-ES", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        // Time part: display unless 00:00 UTC
        const hours = d.getHours();
        const minutes = d.getMinutes();
        const hasSpecificTime = hours !== 0 || minutes !== 0;

        const timePart = hasSpecificTime
            ? d.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
              })
            : "";

        return { datePart, timePart };
    };

    const { datePart, timePart } = formatDateTime(misa.dateMisa);

    // Active moments in this misa
    const activeMoments: { id: number; nombre: string; order: number }[] = (
        misa.misaMoments || []
    )
        .map((mm) => ({
            id: mm.momentId,
            nombre: mm.moment.nombre,
            order: mm.order,
        }))
        .sort((a, b) => a.order - b.order);

    // Available system moments that aren't added to this misa yet
    const availableMoments = allMoments.filter(
        (m) => !activeMoments.some((am) => am.id === m.id)
    );

    // Handler: Copy Link helper
    const handleCopy = async (text: string, title: string, desc: string) => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                await showSuccessToast(title, desc);
            } else {
                throw new Error("No clipboard support");
            }
        } catch {
            showError("Error", "No se pudo copiar el enlace al portapapeles.");
        }
    };

    // Handler: Share Misa
    const handleShare = async () => {
        const url = `${window.location.origin}/misas/view/${misa.id}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${misa.title} - Cancionero Digital`,
                    text: `Repertorio para la misa: ${misa.title}`,
                    url,
                });
            } catch (err: any) {
                if (err.name !== "AbortError") {
                    handleCopy(url, "Enlace copiado", "Enlace de la misa copiado al portapapeles.");
                }
            }
        } else {
            handleCopy(url, "Enlace copiado", "Enlace de la misa copiado al portapapeles.");
        }
    };

    // Handler: Clone Misa Modal
    const handleOpenCloneModal = () => {
        if (!token) {
            window.location.href = `/login?redirect=/misas/${misa.id}`;
            return;
        }
        setCloneTitle(`${misa.title} (Copia)`);
        if (userMinistries.length === 1) {
            setCloneMinistryId(String(userMinistries[0].id));
        } else if (misa.ministryId) {
            setCloneMinistryId(String(misa.ministryId));
        } else {
            setCloneMinistryId("");
        }
        setCloneVisibility("PRIVATE");
        setShowCloneModal(true);
    };

    const handleConfirmClone = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        const trimmed = cloneTitle.trim();
        if (!trimmed) {
            showError("Campo requerido", "Por favor ingresa un título para la copia.");
            return;
        }

        setIsCloning(true);
        showLoading("Clonando misa y repertorio...");
        try {
            const ministryIdNum = cloneMinistryId ? parseInt(cloneMinistryId) : null;
            const res = await cloneMisa(misa, token!, trimmed, cloneVisibility, ministryIdNum);
            if (res.success && res.data) {
                setShowCloneModal(false);
                await showSuccessToast("Misa clonada exitosamente");
                window.location.href = `/misas/${res.data.id}`;
            } else {
                showError("Error al clonar", res.error || "No se pudo duplicar la misa.");
            }
        } catch (e: any) {
            showError("Error", e.message || "Error de conexión.");
        } finally {
            setIsCloning(false);
        }
    };

    // Handler: Edit Misa info submit
    const handleSaveMisaInfo = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (!editTitle.trim()) {
            showError("Campo requerido", "Por favor ingresa un título para la misa.");
            return;
        }
        if (!editDate) {
            showError("Campo requerido", "Por favor selecciona una fecha.");
            return;
        }

        const combinedDateTime = `${editDate}T${editTime || "10:00"}:00`;
        const ministryIdNum = editMinistryId ? parseInt(editMinistryId) : null;
        setSavingMisaInfo(true);
        try {
            let res = { success: false, data: undefined as any, error: undefined as any };
            if (isDeviceOnline()) {
                res = await updateMisa(
                    misa.id,
                    editTitle.trim(),
                    combinedDateTime,
                    editVisibility,
                    token,
                    editToken,
                    ministryIdNum
                );
            }

            if (res.success && res.data) {
                const updated = {
                    ...misa,
                    title: editTitle.trim(),
                    dateMisa: combinedDateTime,
                    visibility: editVisibility,
                    ministryId: ministryIdNum,
                    ministry:
                        res.data?.ministry ||
                        (ministryIdNum
                            ? (userMinistries.find((m) => m.id === ministryIdNum) as any)
                            : null),
                };
                setMisa(updated);
                await saveMisaOffline(updated);
                setShowEditMisaModal(false);
                await showSuccessToast("Información actualizada");
            } else {
                const updated = {
                    ...misa,
                    title: editTitle.trim(),
                    dateMisa: combinedDateTime,
                    visibility: editVisibility,
                    ministryId: ministryIdNum,
                    isDirty: true,
                };
                setMisa(updated);
                await saveMisaOffline(updated);
                await addOfflineAction({
                    misaId: misa.id,
                    actionType: "UPDATE_MISA_INFO",
                    payload: {
                        id: misa.id,
                        title: editTitle.trim(),
                        dateMisa: combinedDateTime,
                        visibility: editVisibility,
                        editToken,
                        ministryId: ministryIdNum,
                    },
                });
                setShowEditMisaModal(false);
                await showSuccessToast("Guardado sin conexión", "Se sincronizará cuando vuelvas a tener internet.");
                refreshPendingActions();
            }
        } catch {
            const updated = {
                ...misa,
                title: editTitle.trim(),
                dateMisa: combinedDateTime,
                visibility: editVisibility,
                ministryId: ministryIdNum,
                isDirty: true,
            };
            setMisa(updated);
            await saveMisaOffline(updated);
            await addOfflineAction({
                misaId: misa.id,
                actionType: "UPDATE_MISA_INFO",
                payload: {
                    id: misa.id,
                    title: editTitle.trim(),
                    dateMisa: combinedDateTime,
                    visibility: editVisibility,
                    editToken,
                    ministryId: ministryIdNum,
                },
            });
            setShowEditMisaModal(false);
            await showSuccessToast("Guardado sin conexión", "Se sincronizará cuando vuelvas a tener internet.");
            refreshPendingActions();
        } finally {
            setSavingMisaInfo(false);
        }
    };

    // Handler: Delete Misa
    const handleDeleteMisa = async () => {
        const confirm = await showConfirm(
            "¿Eliminar toda la misa?",
            "Esta acción no se puede deshacer y borrará todo su repertorio.",
            "Sí, eliminar definitivamente"
        );
        if (!confirm.isConfirmed) return;

        showLoading("Eliminando misa...");
        try {
            const res = await deleteMisa(misa.id, token);
            if (res.success) {
                await showSuccessToast("Misa eliminada correctamente");
                window.location.href = "/misas";
            } else {
                showError("Error al eliminar", res.error || "No se pudo eliminar la misa.");
            }
        } catch {
            showError("Error", "Error de conexión.");
        }
    };

    // Handler: Add Moment to Misa
    const handleAddMoment = async (momentId?: number, name?: string) => {
        setAddingMoment(true);
        try {
            let res = { success: false, data: undefined as any };
            if (isDeviceOnline()) {
                res = await addMomentToMisa(
                    misa.id,
                    { momentId, name },
                    token,
                    editToken
                );
            }

            if (res.success && res.data) {
                const newMisaMoment: MisaMoment = res.data;
                const updatedMisa = {
                    ...misa,
                    misaMoments: [...(misa.misaMoments || []), newMisaMoment],
                };
                setMisa(updatedMisa);
                await saveMisaOffline(updatedMisa);

                if (newMisaMoment.moment) {
                    setAllMoments((prev) => {
                        if (!prev.some((m) => m.id === newMisaMoment.moment.id)) {
                            return [...prev, newMisaMoment.moment];
                        }
                        return prev;
                    });
                }

                setShowAddMomentModal(false);
                setCustomMomentName("");
                await showSuccessToast(
                    "Momento agregado",
                    `Se añadió "${newMisaMoment.moment.nombre}" a la misa`
                );
            } else {
                // Fallback offline
                const targetMomentObj = momentId ? allMoments.find((m) => m.id === momentId) : null;
                const newId = momentId || -Date.now();
                const newMisaMoment: MisaMoment = {
                    id: -Date.now(),
                    misaId: misa.id,
                    momentId: newId,
                    order: (misa.misaMoments || []).length + 1,
                    moment: targetMomentObj || { id: newId, nombre: name || "Nuevo Momento" },
                };
                const updatedMisa = {
                    ...misa,
                    misaMoments: [...(misa.misaMoments || []), newMisaMoment],
                    isDirty: true,
                };
                setMisa(updatedMisa);
                await saveMisaOffline(updatedMisa);
                await addOfflineAction({
                    misaId: misa.id,
                    actionType: "ADD_MOMENT",
                    payload: { misaId: misa.id, momentId, name, editToken },
                });
                setShowAddMomentModal(false);
                setCustomMomentName("");
                await showSuccessToast("Momento guardado sin conexión", "Se sincronizará al conectar a internet.");
                refreshPendingActions();
            }
        } catch {
            const targetMomentObj = momentId ? allMoments.find((m) => m.id === momentId) : null;
            const newId = momentId || -Date.now();
            const newMisaMoment: MisaMoment = {
                id: -Date.now(),
                misaId: misa.id,
                momentId: newId,
                order: (misa.misaMoments || []).length + 1,
                moment: targetMomentObj || { id: newId, nombre: name || "Nuevo Momento" },
            };
            const updatedMisa = {
                ...misa,
                misaMoments: [...(misa.misaMoments || []), newMisaMoment],
                isDirty: true,
            };
            setMisa(updatedMisa);
            await saveMisaOffline(updatedMisa);
            await addOfflineAction({
                misaId: misa.id,
                actionType: "ADD_MOMENT",
                payload: { misaId: misa.id, momentId, name, editToken },
            });
            setShowAddMomentModal(false);
            setCustomMomentName("");
            await showSuccessToast("Momento guardado sin conexión", "Se sincronizará al conectar a internet.");
            refreshPendingActions();
        } finally {
            setAddingMoment(false);
        }
    };

    // Handler: Remove Moment from Misa
    const handleRemoveMoment = async (momentId: number, momentName: string) => {
        const momentSongs = misa.misaSongs.filter((ms) => ms.momentId === momentId);
        const warning =
            momentSongs.length > 0
                ? `Este momento contiene ${momentSongs.length} canto(s). También se quitarán de esta misa.`
                : "Se quitará este momento litúrgico de la misa.";

        const confirm = await showConfirm(
            `¿Eliminar momento "${momentName}"?`,
            warning,
            "Sí, eliminar momento"
        );
        if (!confirm.isConfirmed) return;

        try {
            let res = { success: false };
            if (isDeviceOnline()) {
                res = await removeMomentFromMisa(
                    misa.id,
                    momentId,
                    token,
                    editToken
                );
            }

            const updatedMisa = {
                ...misa,
                misaMoments: (misa.misaMoments || []).filter(
                    (mm) => mm.momentId !== momentId
                ),
                misaSongs: misa.misaSongs.filter(
                    (ms) => ms.momentId !== momentId
                ),
                isDirty: !res.success,
            };
            setMisa(updatedMisa);
            await saveMisaOffline(updatedMisa);

            if (res.success) {
                await showSuccessToast("Momento eliminado", `"${momentName}" fue quitado.`);
            } else {
                await addOfflineAction({
                    misaId: misa.id,
                    actionType: "REMOVE_MOMENT",
                    payload: { misaId: misa.id, momentId, editToken },
                });
                await showSuccessToast("Momento quitado (sin conexión)");
                refreshPendingActions();
            }
        } catch {
            const updatedMisa = {
                ...misa,
                misaMoments: (misa.misaMoments || []).filter(
                    (mm) => mm.momentId !== momentId
                ),
                misaSongs: misa.misaSongs.filter(
                    (ms) => ms.momentId !== momentId
                ),
                isDirty: true,
            };
            setMisa(updatedMisa);
            await saveMisaOffline(updatedMisa);
            await addOfflineAction({
                misaId: misa.id,
                actionType: "REMOVE_MOMENT",
                payload: { misaId: misa.id, momentId, editToken },
            });
            await showSuccessToast("Momento quitado (sin conexión)");
            refreshPendingActions();
        }
    };

    // Handler: Search Songs
    const handleSearchChange = (val: string) => {
        setSearchQuery(val);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        if (!val.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        searchTimerRef.current = setTimeout(async () => {
            try {
                if (!navigator.onLine) {
                    const localSongs = await getDownloadedSongs();
                    const filtered = localSongs.filter(s =>
                        s.title.toLowerCase().includes(val.toLowerCase()) ||
                        (s.lyrics && s.lyrics.toLowerCase().includes(val.toLowerCase())) ||
                        (s.category?.name && s.category.name.toLowerCase().includes(val.toLowerCase()))
                    );
                    setSearchResults(filtered);
                    return;
                }

                const res = await searchSongs(val.trim());
                if (res.success && Array.isArray(res.data)) {
                    setSearchResults(res.data);
                } else {
                    const localSongs = await getDownloadedSongs();
                    const filtered = localSongs.filter(s =>
                        s.title.toLowerCase().includes(val.toLowerCase()) ||
                        (s.lyrics && s.lyrics.toLowerCase().includes(val.toLowerCase())) ||
                        (s.category?.name && s.category.name.toLowerCase().includes(val.toLowerCase()))
                    );
                    setSearchResults(filtered);
                }
            } catch {
                const localSongs = await getDownloadedSongs();
                const filtered = localSongs.filter(s =>
                    s.title.toLowerCase().includes(val.toLowerCase()) ||
                    (s.lyrics && s.lyrics.toLowerCase().includes(val.toLowerCase())) ||
                    (s.category?.name && s.category.name.toLowerCase().includes(val.toLowerCase()))
                );
                setSearchResults(filtered);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    };

    // Handler: Open Add Song Modal for specific moment
    const handleOpenAddSongModal = (momentId: number) => {
        setTargetMomentId(momentId);
        setSelectedSong(null);
        setSearchQuery("");
        setSearchResults([]);
        setShowAddSongModal(true);
    };

    // Handler: Submit Add Song to Misa
    const handleAddSongSubmit = async () => {
        if (!selectedSong) {
            showError("Selecciona una canción", "Elige un canto de la lista de búsqueda.");
            return;
        }
        if (!targetMomentId) {
            showError("Momento requerido", "Por favor selecciona a qué momento pertenece.");
            return;
        }

        setIsAddingSong(true);
        try {
            if (!navigator.onLine) {
                throw new Error("offline");
            }

            const res = await addSongToMisa(
                misa.id,
                selectedSong.id,
                targetMomentId,
                selectedTone,
                token,
                editToken
            );

            if (res.success && res.data) {
                const newMisaSong: MisaSong = res.data;
                const updatedMisa = {
                    ...misa,
                    misaSongs: [...misa.misaSongs, newMisaSong],
                };
                setMisa(updatedMisa);
                await saveMisaOffline(updatedMisa);
                await saveSongOffline(selectedSong);

                setShowAddSongModal(false);
                setSelectedSong(null);
                setSearchQuery("");
                setSearchResults([]);
                await showSuccessToast(
                    "Canto agregado",
                    `"${selectedSong.title}" añadido con tono ${selectedTone}`
                );
            } else {
                throw new Error(res.error || "No se pudo añadir la canción.");
            }
        } catch {
            // Offline fallback
            const tempId = Date.now();
            const newMisaSong: MisaSong = {
                id: tempId,
                misaId: misa.id,
                songId: selectedSong.id,
                momentId: targetMomentId,
                order: misa.misaSongs.filter((ms) => ms.momentId === targetMomentId).length,
                key: selectedTone,
                song: selectedSong,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const updatedMisa = {
                ...misa,
                misaSongs: [...misa.misaSongs, newMisaSong],
                isDirty: true,
            };
            setMisa(updatedMisa);
            await saveMisaOffline(updatedMisa);
            await saveSongOffline(selectedSong);

            await addOfflineAction({
                misaId: misa.id,
                actionType: "ADD_SONG",
                payload: {
                    misaId: misa.id,
                    songId: selectedSong.id,
                    momentId: targetMomentId,
                    key: selectedTone,
                    editToken,
                },
            });

            setShowAddSongModal(false);
            setSelectedSong(null);
            setSearchQuery("");
            setSearchResults([]);
            await showSuccessToast(
                "Canto agregado (sin conexión)",
                `"${selectedSong.title}" añadido con tono ${selectedTone}`
            );
            refreshPendingActions();
        } finally {
            setIsAddingSong(false);
        }
    };

    // Handler: Delete Song from Misa
    const handleDeleteSong = async (misaSongId: number, songTitle: string) => {
        const confirm = await showConfirm(
            `¿Quitar "${songTitle}"?`,
            "Se eliminará de este momento litúrgico.",
            "Sí, quitar"
        );
        if (!confirm.isConfirmed) return;

        try {
            if (!navigator.onLine) {
                throw new Error("offline");
            }

            const res = await removeSongFromMisa(
                misa.id,
                misaSongId,
                token,
                editToken
            );
            if (res.success) {
                const updatedMisa = {
                    ...misa,
                    misaSongs: misa.misaSongs.filter((ms) => ms.id !== misaSongId),
                };
                setMisa(updatedMisa);
                await saveMisaOffline(updatedMisa);
                await showSuccessToast("Canto eliminado", `"${songTitle}" fue retirado.`);
            } else {
                throw new Error(res.error || "No se pudo quitar la canción.");
            }
        } catch {
            const updatedMisa = {
                ...misa,
                misaSongs: misa.misaSongs.filter((ms) => ms.id !== misaSongId),
                isDirty: true,
            };
            setMisa(updatedMisa);
            await saveMisaOffline(updatedMisa);
            await addOfflineAction({
                misaId: misa.id,
                actionType: "REMOVE_SONG",
                payload: {
                    misaId: misa.id,
                    misaSongId,
                    editToken,
                },
            });
            await showSuccessToast("Canto retirado (sin conexión)", `"${songTitle}" fue retirado.`);
            refreshPendingActions();
        }
    };

    // Handler: Open Tone Editor Modal
    const handleOpenToneModal = (songItem: MisaSong) => {
        setEditingSong(songItem);
        setNewToneValue(songItem.key || songItem.song.key || "C");
        setShowToneModal(true);
    };

    // Handler: Submit Tone Update
    const handleSaveTone = async (toneToSave: string) => {
        if (!editingSong) return;

        try {
            if (!navigator.onLine) {
                throw new Error("offline");
            }

            const res = await updateMisaSong(
                misa.id,
                editingSong.id,
                toneToSave,
                token,
                editToken
            );

            if (res.success) {
                const updatedMisa = {
                    ...misa,
                    misaSongs: misa.misaSongs.map((ms) =>
                        ms.id === editingSong.id ? { ...ms, key: toneToSave } : ms
                    ),
                };
                setMisa(updatedMisa);
                await saveMisaOffline(updatedMisa);
                setShowToneModal(false);
                setEditingSong(null);
                await showSuccessToast("Tono actualizado", `Tono cambiado a [${toneToSave}]`);
            } else {
                throw new Error(res.error || "No se pudo actualizar el tono.");
            }
        } catch {
            const updatedMisa = {
                ...misa,
                misaSongs: misa.misaSongs.map((ms) =>
                    ms.id === editingSong.id ? { ...ms, key: toneToSave } : ms
                ),
                isDirty: true,
            };
            setMisa(updatedMisa);
            await saveMisaOffline(updatedMisa);
            await addOfflineAction({
                misaId: misa.id,
                actionType: "UPDATE_SONG_KEY",
                payload: {
                    misaId: misa.id,
                    misaSongId: editingSong.id,
                    key: toneToSave,
                    editToken,
                },
            });
            setShowToneModal(false);
            setEditingSong(null);
            await showSuccessToast("Tono actualizado (sin conexión)", `Tono cambiado a [${toneToSave}]`);
            refreshPendingActions();
        }
    };

    // ================= DRAG AND DROP REORDERING =================
    const handleDragStart = (
        e: React.DragEvent,
        momentId: number,
        songId: number,
        index: number
    ) => {
        if (!canEdit) return;
        setDraggedSongInfo({ momentId, songId, index });
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", `${momentId}:${songId}:${index}`);
    };

    const handleDragOver = (
        e: React.DragEvent,
        momentId: number,
        targetIndex: number
    ) => {
        if (!canEdit || !draggedSongInfo) return;
        if (draggedSongInfo.momentId !== momentId) return; // Only allow drag within same moment
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverSongIndex({ momentId, index: targetIndex });
    };

    const handleDrop = async (
        e: React.DragEvent,
        momentId: number,
        targetIndex: number
    ) => {
        e.preventDefault();
        if (!canEdit || !draggedSongInfo) return;
        if (draggedSongInfo.momentId !== momentId) return;

        const sourceIndex = draggedSongInfo.index;
        if (sourceIndex === targetIndex) {
            setDraggedSongInfo(null);
            setDragOverSongIndex(null);
            return;
        }

        // Reorder locally in this moment
        const momentSongs = misa.misaSongs.filter((ms) => ms.momentId === momentId);
        const remainingSongs = misa.misaSongs.filter((ms) => ms.momentId !== momentId);

        const newMomentSongs = [...momentSongs];
        const [movedSong] = newMomentSongs.splice(sourceIndex, 1);
        newMomentSongs.splice(targetIndex, 0, movedSong);

        // Update local state immediately
        const newMisaSongs = [...remainingSongs, ...newMomentSongs];
        const updatedMisa = { ...misa, misaSongs: newMisaSongs };
        setMisa(updatedMisa);
        await saveMisaOffline(updatedMisa);

        setDraggedSongInfo(null);
        setDragOverSongIndex(null);

        // Persist order in backend or offline queue
        const orderedSongIds = newMomentSongs.map((ms) => ms.id);
        try {
            if (!navigator.onLine) throw new Error("offline");
            const res = await reorderMisaSongs(misa.id, orderedSongIds, momentId, token, editToken);
            if (!res.success) throw new Error(res.error);
        } catch {
            await addOfflineAction({
                misaId: misa.id,
                actionType: "REORDER_SONGS",
                payload: {
                    misaId: misa.id,
                    momentId,
                    orderedSongIds,
                    editToken,
                },
            });
            refreshPendingActions();
        }
    };

    const handleDragEnd = () => {
        setDraggedSongInfo(null);
        setDragOverSongIndex(null);
    };

    // Mobile / Button reorder helper (move up or down)
    const handleMoveSong = async (
        momentId: number,
        index: number,
        direction: "up" | "down"
    ) => {
        const momentSongs = misa.misaSongs.filter((ms) => ms.momentId === momentId);
        const targetIndex = direction === "up" ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= momentSongs.length) return;

        const remainingSongs = misa.misaSongs.filter((ms) => ms.momentId !== momentId);
        const newMomentSongs = [...momentSongs];
        const [moved] = newMomentSongs.splice(index, 1);
        newMomentSongs.splice(targetIndex, 0, moved);

        const newMisaSongs = [...remainingSongs, ...newMomentSongs];
        const updatedMisa = {
            ...misa,
            misaSongs: newMisaSongs,
        };
        setMisa(updatedMisa);
        await saveMisaOffline(updatedMisa);

        const orderedSongIds = newMomentSongs.map((ms) => ms.id);
        try {
            if (!navigator.onLine) throw new Error("offline");
            const res = await reorderMisaSongs(misa.id, orderedSongIds, momentId, token, editToken);
            if (!res.success) throw new Error(res.error);
        } catch {
            await addOfflineAction({
                misaId: misa.id,
                actionType: "REORDER_SONGS",
                payload: {
                    misaId: misa.id,
                    momentId,
                    orderedSongIds,
                    editToken,
                },
            });
            refreshPendingActions();
        }
    };

    // Reorder moments helper (move up or down)
    const handleMoveMoment = async (index: number, direction: "up" | "down") => {
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= activeMoments.length) return;

        const newMoments = [...activeMoments];
        const [moved] = newMoments.splice(index, 1);
        newMoments.splice(targetIndex, 0, moved);

        const orderedIds = newMoments.map((m) => m.id);
        const currentMisaMoments = [...(misa.misaMoments || [])];
        const updated = currentMisaMoments.map((mm) => {
            const newOrder = orderedIds.indexOf(mm.momentId);
            return { ...mm, order: newOrder !== -1 ? newOrder : mm.order };
        });
        const updatedMisa = { ...misa, misaMoments: updated };
        setMisa(updatedMisa);
        await saveMisaOffline(updatedMisa);

        try {
            if (!navigator.onLine) throw new Error("offline");
            const res = await reorderMisaMoments(misa.id, orderedIds, token, editToken);
            if (!res.success) throw new Error(res.error);
        } catch {
            await addOfflineAction({
                misaId: misa.id,
                actionType: "REORDER_MOMENTS",
                payload: {
                    misaId: misa.id,
                    orderedMomentIds: orderedIds,
                    editToken,
                },
            });
            refreshPendingActions();
        }
    };

    return (
        <div className="w-full flex flex-col gap-6 pb-24 md:pb-12">
            {/* Header & Breadcrumb */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <a
                        href="/misas"
                        style={{ viewTransitionName: "misa-back-btn" } as React.CSSProperties}
                        className="inline-flex items-center gap-1.5 sm:gap-2 text-xs font-semibold text-text-secondary hover:text-accent-main transition-colors group shrink-0"
                    >
                        <AppIcon name="arrow-left" className="transition-transform group-hover:-translate-x-1" />
                        <span className="sm:hidden">Volver</span>
                        <span className="hidden sm:inline">Volver a Misas</span>
                    </a>

                    <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                        {/* Switch entre Modo Edición y Modo Lectura */}
                        <div
                            style={{ viewTransitionName: "misa-view-switch" } as React.CSSProperties}
                            className="bg-bg-secondary border border-white/10 p-0.5 rounded-xl flex items-center text-xs"
                        >
                            <span
                                style={{ viewTransitionName: "misa-switch-pill" } as React.CSSProperties}
                                className="px-2 sm:px-3 py-1 rounded-lg bg-accent-main text-white font-bold flex items-center gap-1.5 shadow-sm"
                                title="Vista actual: Edición de cantos y momentos"
                            >
                                <AppIcon name="pen-to-square" className="text-[10px] sm:text-xs" />
                                <span>Edición</span>
                            </span>
                            <a
                                href={`/misas/view/${misa.id}`}
                                data-astro-prefetch="hover"
                                className="px-2 sm:px-3 py-1 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 font-medium transition-colors flex items-center gap-1.5"
                                title="Cambiar a Modo Lectura para cantar o descargar"
                            >
                                <AppIcon name="book-open" className="text-[10px] sm:text-xs" />
                                <span>Lectura</span>
                            </a>
                        </div>

                        {/* Visibility indicator */}
                        <span
                            style={{ viewTransitionName: "misa-privacy-badge" } as React.CSSProperties}
                            className={`text-xs px-2 sm:px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 sm:gap-1.5 border ${
                                misa.visibility === "PUBLIC"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-white/5 text-text-secondary border-white/10"
                            }`}
                        >
                            <AppIcon name={misa.visibility === "PUBLIC" ? "globe" : "lock"} className={`text-[10px]`} />
                            <span>{misa.visibility === "PUBLIC" ? "Pública" : "Privada"}</span>
                        </span>
                    </div>
                </div>

                {/* Title & Celebration Meta */}
                <div
                    style={{ viewTransitionName: "misa-header-card" } as React.CSSProperties}
                    className="bg-bg-secondary border border-white/5 rounded-2xl p-4 sm:p-7 shadow-xl"
                >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        <div className="space-y-2">
                            {misa.ministry && (
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-main/10 border border-accent-main/20 text-accent-main text-xs font-semibold">
                                    <AppIcon name="users" className="text-xs" />
                                    <span>{misa.ministry.name}</span>
                                </div>
                            )}
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                                {misa.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-text-secondary">
                                <span className="flex items-center gap-1.5 capitalize">
                                    <AppIcon name="calendar-day" className="text-accent-main" />
                                    <span>{datePart}</span>
                                </span>
                                {timePart && (
                                    <span className="flex items-center gap-1.5 font-medium text-white/90">
                                        <AppIcon name="clock" className="text-accent-main" />
                                        <span>{timePart}</span>
                                    </span>
                                )}
                                {misa.user?.name && (
                                    <span className="flex items-center gap-1.5 text-text-secondary/80">
                                        <AppIcon name="user" className="text-xs" />
                                        <span>{misa.user.name}</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Top Action Toolbar */}
                        <div className="flex items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/5 flex-nowrap shrink-0 overflow-x-auto">
                            {/* Pending Sync Indicator */}
                            {pendingSyncCount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleManualSync}
                                    disabled={isSyncing}
                                    className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap"
                                    title="Hay cambios guardados sin conexión. Pulsa para sincronizar."
                                >
                                    {isSyncing ? (
                                        <AppIcon name="arrows-rotate" spin className="text-xs" />
                                    ) : (
                                        <AppIcon name="cloud-arrow-up" className="text-xs" />
                                    )}
                                    <span>
                                        {pendingSyncCount} {pendingSyncCount === 1 ? "pendiente" : "pendientes"}
                                    </span>
                                </button>
                            )}

                            {/* Edit info button */}
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditTitle(misa.title);
                                        setEditVisibility(misa.visibility);
                                        setShowEditMisaModal(true);
                                    }}
                                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap"
                                    title="Editar título, fecha, hora o visibilidad"
                                >
                                    <AppIcon name="pen-to-square" className="text-xs text-text-secondary" />
                                    <span>Editar Info</span>
                                </button>
                            )}

                            {/* Download Misa for Offline Use */}
                            <MisaOfflineDownloadButtonReact
                                misaId={misa.id}
                                initialMisa={misa}
                                token={token}
                                variant="full"
                            />

                            {/* Share button */}
                            <button
                                type="button"
                                onClick={handleShare}
                                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap"
                                title="Compartir Misa"
                            >
                                <AppIcon name="share-nodes" className="text-xs text-text-secondary" />
                                <span>Compartir</span>
                            </button>

                            {/* Clone button */}
                            {token && (
                                <button
                                    type="button"
                                    onClick={handleOpenCloneModal}
                                    disabled={isCloning}
                                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/10 text-xs font-semibold transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                                    title="Crear una copia de esta misa en tu repertorio"
                                >
                                    <AppIcon name="copy" className="text-xs" />
                                    <span>Clonar</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Liturgical Moments Section */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                            Momentos Musicales
                        </h2>
                        <p className="text-xs text-text-secondary mt-0.5">
                            {canEdit
                                ? "Arrastra para reordenar cantos dentro de un momento, o personaliza los momentos."
                                : "Listado de momentos y cantos asignados."}
                        </p>
                    </div>

                    {/* Button to add Moments */}
                    {canEdit && (
                        <button
                            type="button"
                            onClick={() => setShowAddMomentModal(true)}
                            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-accent-main hover:text-white text-text-main border border-white/10 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                        >
                            <AppIcon name="plus" className="text-accent-main hover:text-white text-xs" />
                            <span>Gestionar Momentos</span>
                        </button>
                    )}
                </div>

                {/* List of Moments */}
                {activeMoments.length === 0 ? (
                    <div className="bg-bg-secondary border border-white/5 rounded-2xl p-8 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-accent-main/10 text-accent-main flex items-center justify-center mx-auto text-xl">
                            <AppIcon name="music" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-semibold text-white">No hay momentos en esta misa</p>
                            <p className="text-xs text-text-secondary max-w-sm mx-auto">
                                Agrega los momentos litúrgicos como Entrada, Ofertorio, Comunión, etc.
                            </p>
                        </div>
                        {canEdit && (
                            <button
                                type="button"
                                onClick={() => setShowAddMomentModal(true)}
                                className="px-5 py-2.5 rounded-xl bg-accent-main hover:bg-accent-main/90 text-white font-bold text-xs transition-colors shadow-md inline-flex items-center gap-2"
                            >
                                <AppIcon name="plus" className="text-xs" />
                                <span>Agregar Momentos</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activeMoments.map((moment, momentIndex) => {
                            const momentSongs = misa.misaSongs.filter(
                                (ms) => ms.momentId === moment.id
                            );

                            return (
                                <div
                                    key={moment.id}
                                    className="bg-bg-secondary border border-white/5 rounded-xl p-3.5 sm:p-5 transition-colors hover:border-white/10"
                                >
                                    {/* Moment Header */}
                                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/5">
                                        <div className="flex items-center gap-2.5">
                                            {canEdit && activeMoments.length > 1 && (
                                                <div className="flex items-center gap-0.5">
                                                    <button
                                                        type="button"
                                                        disabled={momentIndex === 0}
                                                        onClick={() => handleMoveMoment(momentIndex, "up")}
                                                        className="p-1 text-text-secondary hover:text-white disabled:opacity-20 text-[11px] cursor-pointer"
                                                        title="Subir momento"
                                                    >
                                                        <AppIcon name="chevron-up" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={momentIndex === activeMoments.length - 1}
                                                        onClick={() => handleMoveMoment(momentIndex, "down")}
                                                        className="p-1 text-text-secondary hover:text-white disabled:opacity-20 text-[11px] cursor-pointer"
                                                        title="Bajar momento"
                                                    >
                                                        <AppIcon name="chevron-down" />
                                                    </button>
                                                </div>
                                            )}
                                            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                                                {moment.nombre}
                                            </h3>
                                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-text-secondary border border-white/5">
                                                {momentSongs.length}{" "}
                                                {momentSongs.length === 1 ? "canto" : "cantos"}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {canEdit && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleOpenAddSongModal(moment.id)
                                                        }
                                                        className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-accent-main/15 text-accent-main hover:bg-accent-main hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
                                                        title={`Agregar canto a ${moment.nombre}`}
                                                    >
                                                        <AppIcon name="plus" className="text-xs" />
                                                        <span className="hidden sm:inline">
                                                            Agregar Canto
                                                        </span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleRemoveMoment(
                                                                moment.id,
                                                                moment.nombre
                                                            )
                                                        }
                                                        className="p-1.5 sm:p-2 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs cursor-pointer"
                                                        title={`Quitar momento "${moment.nombre}"`}
                                                    >
                                                        <AppIcon name="trash-can" className="text-xs" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Songs List inside Moment */}
                                    <div className="pt-3">
                                        {momentSongs.length === 0 ? (
                                            <div className="py-4 text-center border border-dashed border-white/5 rounded-xl bg-bg-main/30">
                                                <p className="text-xs text-text-secondary">
                                                    Sin canciones en este momento litúrgico
                                                </p>
                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleOpenAddSongModal(moment.id)
                                                        }
                                                        className="mt-2 text-xs font-semibold text-accent-main hover:underline inline-flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <AppIcon name="plus" className="text-[10px]" />
                                                        <span>Añadir canto</span>
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {momentSongs.map((ms, index) => {
                                                    const isDraggingThis =
                                                        draggedSongInfo?.momentId === moment.id &&
                                                        draggedSongInfo?.songId === ms.id;
                                                    const isDragOverTarget =
                                                        dragOverSongIndex?.momentId === moment.id &&
                                                        dragOverSongIndex?.index === index;

                                                    const toneToDisplay =
                                                        ms.key || ms.song.key || "C";

                                                    return (
                                                        <div
                                                            key={ms.id}
                                                            draggable={canEdit}
                                                            onDragStart={(e) =>
                                                                handleDragStart(
                                                                    e,
                                                                    moment.id,
                                                                    ms.id,
                                                                    index
                                                                )
                                                            }
                                                            onDragOver={(e) =>
                                                                handleDragOver(e, moment.id, index)
                                                            }
                                                            onDrop={(e) =>
                                                                handleDrop(e, moment.id, index)
                                                            }
                                                            onDragEnd={handleDragEnd}
                                                            className={`flex items-center justify-between gap-3 p-3 rounded-xl border bg-bg-main transition-all ${
                                                                isDraggingThis
                                                                    ? "opacity-40 border-accent-main/80 scale-98"
                                                                    : isDragOverTarget
                                                                    ? "border-accent-main bg-accent-main/5 shadow-md"
                                                                    : "border-white/5 hover:border-white/20"
                                                            }`}
                                                        >
                                                            {/* Drag handle & Song info */}
                                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                {canEdit && (
                                                                    <div
                                                                        className="cursor-grab active:cursor-grabbing text-text-secondary hover:text-white p-1 select-none flex items-center justify-center shrink-0"
                                                                        title="Arrastra para cambiar de posición"
                                                                    >
                                                                        <AppIcon name="grip-vertical" className="text-xs" />
                                                                    </div>
                                                                )}

                                                                {/* Index Badge */}
                                                                <span className="w-5 h-5 rounded-md bg-white/5 text-text-secondary text-[10px] font-mono flex items-center justify-center shrink-0 font-bold">
                                                                    {index + 1}
                                                                </span>

                                                                {/* Song Title Link */}
                                                                <a
                                                                    href={`/songs/${
                                                                        ms.song.id
                                                                    }?tone=${encodeURIComponent(
                                                                        toneToDisplay
                                                                    )}`}
                                                                    className="text-sm font-semibold text-text-main hover:text-accent-main transition-colors truncate"
                                                                    title="Ver letra y acordes"
                                                                >
                                                                    {ms.song.title}
                                                                </a>
                                                            </div>

                                                            {/* Right actions: Tone, mobile reorder, delete */}
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                {/* Tone Badge */}
                                                                {canEdit ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleOpenToneModal(ms)
                                                                        }
                                                                        className="px-2 py-1 rounded bg-accent-main/20 hover:bg-accent-main hover:text-white text-accent-main font-mono text-xs font-bold transition-colors cursor-pointer border border-accent-main/30 flex items-center gap-1"
                                                                        title="Cambiar tono de este canto"
                                                                    >
                                                                        <span>{toneToDisplay}</span>
                                                                        <AppIcon name="sliders" className="text-[9px]" />
                                                                    </button>
                                                                ) : (
                                                                    <span className="px-2 py-1 rounded bg-white/5 text-accent-main font-mono text-xs font-bold border border-white/5">
                                                                        {toneToDisplay}
                                                                    </span>
                                                                )}

                                                                {/* Mobile friendly Up/Down reorder arrows */}
                                                                {canEdit && momentSongs.length > 1 && (
                                                                    <div className="flex items-center sm:hidden gap-0.5">
                                                                        <button
                                                                            type="button"
                                                                            disabled={index === 0}
                                                                            onClick={() =>
                                                                                handleMoveSong(
                                                                                    moment.id,
                                                                                    index,
                                                                                    "up"
                                                                                )
                                                                            }
                                                                            className="p-1 text-text-secondary hover:text-white disabled:opacity-20 text-[11px]"
                                                                            title="Subir"
                                                                        >
                                                                            <AppIcon name="chevron-up" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            disabled={
                                                                                index ===
                                                                                momentSongs.length - 1
                                                                            }
                                                                            onClick={() =>
                                                                                handleMoveSong(
                                                                                    moment.id,
                                                                                    index,
                                                                                    "down"
                                                                                )
                                                                            }
                                                                            className="p-1 text-text-secondary hover:text-white disabled:opacity-20 text-[11px]"
                                                                            title="Bajar"
                                                                        >
                                                                            <AppIcon name="chevron-down" />
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {/* Edit song chord link */}
                                                                {canEdit && (
                                                                    <a
                                                                        href={`/edit-song/${ms.song.id}`}
                                                                        className="p-1.5 text-text-secondary hover:text-white transition-colors"
                                                                        title="Editar letra original"
                                                                    >
                                                                        <AppIcon name="pen" className="text-xs" />
                                                                    </a>
                                                                )}

                                                                {/* Delete song button */}
                                                                {canEdit && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleDeleteSong(
                                                                                ms.id,
                                                                                ms.song.title
                                                                            )
                                                                        }
                                                                        className="p-1.5 text-text-secondary hover:text-red-400 transition-colors cursor-pointer"
                                                                        title="Quitar de la misa"
                                                                    >
                                                                        <AppIcon name="xmark" className="text-xs" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ================= MODAL: ADD / MANAGE MOMENTS ================= */}
            {showAddMomentModal && (
                <div
                    data-modal-open="true"
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overscroll-contain"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowAddMomentModal(false);
                    }}
                >
                    <div className="bg-bg-secondary border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-6 shadow-2xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] overflow-y-auto scrollbar-thin my-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                            <div>
                                <h3 className="text-lg font-bold text-white tracking-tight">
                                    Gestionar Momentos Litúrgicos
                                </h3>
                                <p className="text-xs text-text-secondary">
                                    Agrega momentos estándar o crea personalizados
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddMomentModal(false)}
                                className="p-1.5 sm:p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
                                title="Cerrar (Esc)"
                                aria-label="Cerrar modal"
                            >
                                <AppIcon name="xmark" className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Section 1: Available standard moments */}
                        {availableMoments.length > 0 && (
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                                    Momentos Predeterminados Disponibles
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {availableMoments.map((mom) => (
                                        <button
                                            key={mom.id}
                                            type="button"
                                            disabled={addingMoment}
                                            onClick={() => handleAddMoment(mom.id)}
                                            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-accent-main hover:text-white text-text-main text-xs font-semibold transition-all border border-white/10 flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
                                        >
                                            <AppIcon name="plus" className="text-[10px] text-accent-main group-hover:text-white" />
                                            <span>{mom.nombre}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Section 2: Create new custom moment */}
                        <div className="space-y-3 pt-3 border-t border-white/5">
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                                Agregar Momento Personalizado
                            </label>
                            <p className="text-xs text-text-secondary">
                                Ej: Meditación, Canto de Paz, Salmo Responsorial, Aspersión, Comunión 2...
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={customMomentName}
                                    onChange={(e) => setCustomMomentName(e.target.value)}
                                    placeholder="Nombre del nuevo momento..."
                                    className="flex-1 bg-bg-main border border-white/10 focus:border-accent-main rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && customMomentName.trim()) {
                                            e.preventDefault();
                                            handleAddMoment(undefined, customMomentName.trim());
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    disabled={!customMomentName.trim() || addingMoment}
                                    onClick={() => handleAddMoment(undefined, customMomentName.trim())}
                                    className="px-4 py-2.5 bg-accent-main hover:bg-accent-main/90 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    {addingMoment ? "Creando..." : "Crear y Añadir"}
                                </button>
                            </div>
                        </div>

                        {/* Currently active moments summary */}
                        <div className="space-y-2 pt-3 border-t border-white/5">
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                Momentos en esta misa ({activeMoments.length})
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {activeMoments.map((mom) => (
                                    <span
                                        key={mom.id}
                                        className="text-xs px-2.5 py-1 rounded-lg bg-bg-main text-text-secondary border border-white/5 inline-flex items-center gap-1.5"
                                    >
                                        <span>{mom.nombre}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMoment(mom.id, mom.nombre)}
                                            className="text-text-secondary hover:text-red-400 transition-colors"
                                            title="Eliminar este momento"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= MODAL: ADD SONG ================= */}
            {showAddSongModal && (
                <div
                    data-modal-open="true"
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overscroll-contain"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowAddSongModal(false);
                    }}
                >
                    <div className="bg-bg-secondary border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-5 shadow-2xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] overflow-y-auto scrollbar-thin my-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                            <div>
                                <h3 className="text-lg font-bold text-white tracking-tight">
                                    Agregar Canto
                                </h3>
                                <p className="text-xs text-text-secondary">
                                    Busca una canción y selecciona el tono para la misa
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddSongModal(false)}
                                className="p-1.5 sm:p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
                                title="Cerrar (Esc)"
                                aria-label="Cerrar modal"
                            >
                                <AppIcon name="xmark" className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Moment selector */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                                Momento Litúrgico <span className="text-accent-main">*</span>
                            </label>
                            <select
                                value={targetMomentId || ""}
                                onChange={(e) => setTargetMomentId(Number(e.target.value))}
                                className="w-full bg-bg-main border border-white/10 focus:border-accent-main rounded-xl px-4 py-2.5 text-white text-sm outline-none cursor-pointer"
                            >
                                {activeMoments.map((mom) => (
                                    <option key={mom.id} value={mom.id}>
                                        {mom.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Search input */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                                Buscar Canción <span className="text-accent-main">*</span>
                            </label>
                            <div className="relative">
                                <AppIcon name="magnifying-glass" className="absolute left-3.5 top-3 text-zinc-500 text-sm" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    placeholder="Escribe el título o letra de la canción..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-bg-main border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none"
                                />
                                {isSearching && (
                                    <div className="absolute right-3 top-3">
                                        <AppIcon name="spinner" spin className="animate-spin text-accent-main text-sm" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Search Results list */}
                        {searchResults.length > 0 && !selectedSong && (
                            <div className="space-y-1 max-h-48 overflow-y-auto border border-white/5 rounded-xl p-2 bg-bg-main/50">
                                {searchResults.map((song) => (
                                    <button
                                        key={song.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedSong(song);
                                            setSelectedTone(song.key || "C");
                                            setSearchResults([]);
                                        }}
                                        className="w-full text-left p-2.5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between group"
                                    >
                                        <div className="truncate">
                                            <p className="text-sm font-semibold text-white group-hover:text-accent-main transition-colors truncate">
                                                {song.title}
                                            </p>
                                            {song.author?.name && (
                                                <p className="text-[11px] text-text-secondary">
                                                    {song.author.name}
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-xs font-mono text-accent-main px-2 py-0.5 rounded bg-accent-main/10 shrink-0">
                                            {song.key || "C"}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Selected Song Preview & Tone Selector */}
                        {selectedSong && (
                            <div className="bg-bg-main border border-accent-main/30 rounded-xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-text-secondary">Canción seleccionada:</p>
                                        <p className="text-base font-bold text-white">
                                            {selectedSong.title}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSong(null)}
                                        className="text-xs text-text-secondary hover:text-white underline"
                                    >
                                        Cambiar
                                    </button>
                                </div>

                                {/* Tone selection */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                                        Tono para esta misa: <span className="text-accent-main font-mono text-sm">[{selectedTone}]</span>
                                    </label>
                                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                                        {NOTES.map((note) => (
                                            <button
                                                key={note}
                                                type="button"
                                                onClick={() => setSelectedTone(note)}
                                                className={`py-1 text-xs font-mono font-bold rounded-lg transition-colors border ${
                                                    selectedTone === note
                                                        ? "bg-accent-main text-white border-accent-main shadow-md"
                                                        : "bg-white/5 text-text-secondary border-white/5 hover:text-white hover:bg-white/10"
                                                }`}
                                            >
                                                {note}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-1">
                                        {NOTES.map((note) => {
                                            const minor = `${note}m`;
                                            return (
                                                <button
                                                    key={minor}
                                                    type="button"
                                                    onClick={() => setSelectedTone(minor)}
                                                    className={`py-1 text-[11px] font-mono font-bold rounded-lg transition-colors border ${
                                                        selectedTone === minor
                                                            ? "bg-accent-main text-white border-accent-main shadow-md"
                                                            : "bg-white/5 text-text-secondary border-white/5 hover:text-white hover:bg-white/10"
                                                    }`}
                                                >
                                                    {minor}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                            <button
                                type="button"
                                onClick={() => setShowAddSongModal(false)}
                                className="px-4 py-2.5 rounded-xl border border-white/10 text-text-secondary hover:text-white text-xs font-semibold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={!selectedSong || isAddingSong}
                                onClick={handleAddSongSubmit}
                                className="px-5 py-2.5 bg-accent-main hover:bg-accent-main/90 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                {isAddingSong ? "Agregando..." : "Agregar a la Misa"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= MODAL: EDIT TONE ================= */}
            {showToneModal && editingSong && (
                <div
                    data-modal-open="true"
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overscroll-contain"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowToneModal(false);
                    }}
                >
                    <div className="bg-bg-secondary border border-white/10 rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-5 shadow-2xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] overflow-y-auto scrollbar-thin my-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                            <div>
                                <h3 className="text-lg font-bold text-white tracking-tight">
                                    Cambiar Tono
                                </h3>
                                <p className="text-xs text-text-secondary truncate max-w-xs">
                                    {editingSong.song.title}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowToneModal(false)}
                                className="p-1.5 sm:p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
                                title="Cerrar (Esc)"
                                aria-label="Cerrar modal"
                            >
                                <AppIcon name="xmark" className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                                Tono actual: <span className="text-accent-main font-mono text-sm">[{newToneValue}]</span>
                            </label>
                            <p className="text-xs text-text-secondary">
                                Tonos mayores:
                            </p>
                            <div className="grid grid-cols-6 gap-1.5">
                                {NOTES.map((note) => (
                                    <button
                                        key={note}
                                        type="button"
                                        onClick={() => setNewToneValue(note)}
                                        className={`py-2 text-xs font-mono font-bold rounded-lg transition-colors border ${
                                            newToneValue === note
                                                ? "bg-accent-main text-white border-accent-main"
                                                : "bg-white/5 text-text-secondary border-white/5 hover:text-white hover:bg-white/10"
                                        }`}
                                    >
                                        {note}
                                    </button>
                                ))}
                            </div>

                            <p className="text-xs text-text-secondary pt-1">
                                Tonos menores:
                            </p>
                            <div className="grid grid-cols-6 gap-1.5">
                                {NOTES.map((note) => {
                                    const minor = `${note}m`;
                                    return (
                                        <button
                                            key={minor}
                                            type="button"
                                            onClick={() => setNewToneValue(minor)}
                                            className={`py-2 text-xs font-mono font-bold rounded-lg transition-colors border ${
                                                newToneValue === minor
                                                    ? "bg-accent-main text-white border-accent-main"
                                                    : "bg-white/5 text-text-secondary border-white/5 hover:text-white hover:bg-white/10"
                                            }`}
                                        >
                                            {minor}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Custom manual tone input */}
                            <div className="pt-2">
                                <input
                                    type="text"
                                    value={newToneValue}
                                    onChange={(e) => setNewToneValue(e.target.value)}
                                    placeholder="O escribe tono personalizado (ej. Mim, Fa#7...)"
                                    className="w-full bg-bg-main border border-white/10 focus:border-accent-main rounded-xl px-4 py-2 text-white text-xs font-mono outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                            <button
                                type="button"
                                onClick={() => setShowToneModal(false)}
                                className="px-4 py-2 rounded-xl border border-white/10 text-text-secondary hover:text-white text-xs font-semibold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSaveTone(newToneValue)}
                                className="px-5 py-2 bg-accent-main hover:bg-accent-main/90 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                                Guardar Tono
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= MODAL: EDIT MISA INFO ================= */}
            {showEditMisaModal && (
                <div
                    data-modal-open="true"
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overscroll-contain"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowEditMisaModal(false);
                    }}
                >
                    <div className="bg-bg-secondary border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-5 shadow-2xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] overflow-y-auto scrollbar-thin my-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                            <h3 className="text-lg font-bold text-white tracking-tight">
                                Editar Información de la Misa
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowEditMisaModal(false)}
                                className="p-1.5 sm:p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
                                title="Cerrar (Esc)"
                                aria-label="Cerrar modal"
                            >
                                <AppIcon name="xmark" className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveMisaInfo} className="space-y-4">
                            {/* Title */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                                    Título / Celebración <span className="text-accent-main">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full bg-bg-main border border-white/10 focus:border-accent-main rounded-xl px-4 py-2.5 text-white text-sm outline-none"
                                />
                            </div>

                            {/* Date & Time Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                                        Fecha <span className="text-accent-main">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                        className="w-full bg-bg-main border border-white/10 focus:border-accent-main rounded-xl px-4 py-2.5 text-white text-sm outline-none dark:[&::-webkit-calendar-picker-indicator]:invert cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                                        Hora <span className="text-accent-main">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        value={editTime}
                                        onChange={(e) => setEditTime(e.target.value)}
                                        className="w-full bg-bg-main border border-white/10 focus:border-accent-main rounded-xl px-4 py-2.5 text-white text-sm outline-none dark:[&::-webkit-calendar-picker-indicator]:invert cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Propietario de la Misa (Ministerio o Personal) */}
                            {(userMinistries.length > 0 || misa.ministry) && (
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                        Propietario de la misa
                                    </label>
                                    <div className="relative">
                                        <AppIcon name="users" className="absolute left-3.5 top-3 text-text-secondary text-sm" />
                                        <select
                                            value={editMinistryId}
                                            onChange={(e) => setEditMinistryId(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-bg-main border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors cursor-pointer"
                                        >
                                            <option value="">👤 Personal (Solo para mí)</option>
                                            {misa.ministry && !userMinistries.some((m) => m.id === misa.ministry!.id) && (
                                                <option value={misa.ministry.id}>
                                                    👥 {misa.ministry.name} (Actual)
                                                </option>
                                            )}
                                            {userMinistries.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    👥 {m.name} {m.myRole === "ADMIN" ? "(Admin)" : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Visibility */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                    Privacidad de la misa
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setEditVisibility("PRIVATE")}
                                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                                            editVisibility === "PRIVATE"
                                                ? "border-accent-main bg-accent-main/10 text-white ring-1 ring-accent-main/30"
                                                : "border-white/10 bg-bg-main text-text-secondary hover:text-white"
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-bold text-xs">
                                            <AppIcon name="lock" className="text-accent-main" />
                                            <span>Privada</span>
                                        </div>
                                        <span className="text-[10px] text-text-secondary leading-tight">
                                            {editMinistryId
                                                ? `Solo para miembros de ${
                                                      userMinistries.find((m) => String(m.id) === editMinistryId)?.name ||
                                                      misa.ministry?.name ||
                                                      "tu grupo"
                                                  }`
                                                : "Solo tú podrás verla"}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditVisibility("PUBLIC")}
                                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                                            editVisibility === "PUBLIC"
                                                ? "border-accent-main bg-accent-main/10 text-white ring-1 ring-accent-main/30"
                                                : "border-white/10 bg-bg-main text-text-secondary hover:text-white"
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-bold text-xs">
                                            <AppIcon name="globe" className="text-emerald-400" />
                                            <span>Pública</span>
                                        </div>
                                        <span className="text-[10px] text-text-secondary leading-tight">
                                            {editMinistryId
                                                ? `Visible a todos (con sello de ${
                                                      userMinistries.find((m) => String(m.id) === editMinistryId)?.name ||
                                                      misa.ministry?.name ||
                                                      "tu grupo"
                                                  })`
                                                : "Visible para toda la comunidad"}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Modal Footer Buttons */}
                            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/10">
                                {isOwner ? (
                                    <button
                                        type="button"
                                        onClick={handleDeleteMisa}
                                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
                                    >
                                        <AppIcon name="trash-can" className="text-xs" />
                                        <span>Eliminar Misa</span>
                                    </button>
                                ) : (
                                    <div className="hidden sm:block" />
                                )}

                                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditMisaModal(false)}
                                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-text-secondary hover:text-white text-xs font-semibold transition-colors text-center cursor-pointer whitespace-nowrap active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingMisaInfo}
                                        className="flex-1 sm:flex-none px-5 py-2.5 bg-accent-main hover:bg-accent-main/90 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                                    >
                                        <AppIcon name="check" className="text-xs" />
                                        <span>{savingMisaInfo ? "Guardando..." : "Guardar Cambios"}</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= MODAL: CLONAR MISA ================= */}
            {showCloneModal && (
                <div
                    data-modal-open="true"
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overscroll-contain"
                    onClick={() => !isCloning && setShowCloneModal(false)}
                >
                    <div
                        className="bg-bg-secondary border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] overflow-hidden my-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header Modal */}
                        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 shrink-0 bg-bg-secondary">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-accent-main/10 border border-accent-main/20 text-accent-main flex items-center justify-center shrink-0">
                                    <AppIcon name="copy" className="text-base" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white tracking-tight">
                                        Clonar Misa
                                    </h3>
                                    <p className="text-xs text-text-secondary">
                                        Crea una copia editable con todas las canciones y momentos
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => !isCloning && setShowCloneModal(false)}
                                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                title="Cerrar"
                            >
                                <AppIcon name="xmark" className="text-sm" />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmClone} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            {/* Cuerpo scrolleable */}
                            <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-4 scrollbar-thin">
                                {/* Título de la copia */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                        Título de la nueva copia <span className="text-accent-main">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        value={cloneTitle}
                                        onChange={(e) => setCloneTitle(e.target.value)}
                                        className="w-full pl-4 pr-4 py-2.5 bg-bg-main border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors"
                                    />
                                </div>

                                {/* Propietario de la nueva copia */}
                                {userMinistries.length > 0 && (
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                            Propietario de la copia
                                        </label>
                                        <div className="relative">
                                            <AppIcon name="users" className="absolute left-3.5 top-3 text-text-secondary text-sm" />
                                            <select
                                                value={cloneMinistryId}
                                                onChange={(e) => setCloneMinistryId(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-bg-main border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors cursor-pointer"
                                            >
                                                <option value="">👤 Personal (Solo para mí)</option>
                                                {userMinistries.map((m) => (
                                                    <option key={m.id} value={m.id}>
                                                        👥 {m.name} (Propietario: Grupo) {m.myRole === "ADMIN" ? "· Admin" : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {cloneMinistryId && (
                                            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-0.5">
                                                <AppIcon name="circle-info" className="text-accent-main text-[10px]" />
                                                <span>Los integrantes de tu grupo podrán colaborar y editar la copia.</span>
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Visibilidad de la copia */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                        Privacidad de la copia
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setCloneVisibility("PRIVATE")}
                                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                                                cloneVisibility === "PRIVATE"
                                                    ? "border-accent-main bg-accent-main/10 text-white ring-1 ring-accent-main/30"
                                                    : "border-white/10 bg-bg-main text-text-secondary hover:text-white"
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5 font-bold text-xs">
                                                <AppIcon name="lock" className="text-accent-main" />
                                                <span>Privada</span>
                                            </div>
                                            <span className="text-[10px] text-text-secondary leading-tight">
                                                {cloneMinistryId
                                                    ? `Solo para miembros de ${userMinistries.find(m => String(m.id) === cloneMinistryId)?.name || "tu grupo"}`
                                                    : "Solo tú podrás verla"}
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCloneVisibility("PUBLIC")}
                                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                                                cloneVisibility === "PUBLIC"
                                                    ? "border-accent-main bg-accent-main/10 text-white ring-1 ring-accent-main/30"
                                                    : "border-white/10 bg-bg-main text-text-secondary hover:text-white"
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5 font-bold text-xs">
                                                <AppIcon name="globe" className="text-emerald-400" />
                                                <span>Pública</span>
                                            </div>
                                            <span className="text-[10px] text-text-secondary leading-tight">
                                                {cloneMinistryId
                                                    ? "Visible a todos en cartelera"
                                                    : "Visible para toda la comunidad"}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="px-5 sm:px-6 py-3.5 border-t border-white/10 flex items-center justify-end gap-3 shrink-0 bg-bg-secondary/95 backdrop-blur-xs">
                                <button
                                    type="button"
                                    onClick={() => setShowCloneModal(false)}
                                    disabled={isCloning}
                                    className="px-4 py-2.5 rounded-xl border border-white/10 text-text-secondary hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCloning}
                                    className="px-5 py-2.5 bg-accent-main hover:bg-accent-main/90 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                    {isCloning ? (
                                        <>
                                            <AppIcon name="spinner" spin className="animate-spin text-xs" />
                                            <span>Clonando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <AppIcon name="copy" className="text-xs" />
                                            <span>Clonar Misa</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
