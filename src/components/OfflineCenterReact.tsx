import AppIcon from "@/components/Ui/AppIcon";
import { useBodyScrollLock } from "@/utils/useBodyScrollLock";
import React, { useState, useEffect } from "react";
import SongView from "./SongView";
import {
    getDownloadedMisas,
    getDownloadedSongs,
    deleteMisaOffline,
    deleteSongOffline,
    type OfflineMisa,
    type OfflineSong,
} from "../utils/offlineStorage";
import { showSuccessToast, showConfirm } from "../utils/alerts";

export default function OfflineCenterReact() {
    const [misas, setMisas] = useState<OfflineMisa[]>([]);
    const [songs, setSongs] = useState<OfflineSong[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"misas" | "songs">("misas");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSongPreview, setSelectedSongPreview] = useState<OfflineSong | null>(null);
    const [selectedMisaPreview, setSelectedMisaPreview] = useState<OfflineMisa | null>(null);

    useBodyScrollLock(!!selectedSongPreview || !!selectedMisaPreview);

    const loadData = async () => {
        try {
            setLoading(true);
            const [downloadedMisas, downloadedSongs] = await Promise.all([
                getDownloadedMisas(),
                getDownloadedSongs(),
            ]);
            setMisas(downloadedMisas);
            setSongs(downloadedSongs);
        } catch (e) {
            console.error("Error al cargar datos offline:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        const handleOfflineChange = () => {
            loadData();
        };

        window.addEventListener("cancionero-offline-change", handleOfflineChange);
        return () => {
            window.removeEventListener("cancionero-offline-change", handleOfflineChange);
        };
    }, []);

    const isAnyOfflineModalOpen = !!selectedSongPreview || !!selectedMisaPreview;
    useEffect(() => {
        if (!isAnyOfflineModalOpen) return;
        document.body.classList.add("modal-open");
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.classList.remove("modal-open");
            document.body.style.overflow = originalOverflow;
        };
    }, [isAnyOfflineModalOpen]);

    const handleDeleteMisa = async (misa: OfflineMisa, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const confirm = await showConfirm(
            "¿Quitar descarga?",
            `¿Deseas eliminar "${misa.title}" de tu almacenamiento sin conexión?`,
            "Sí, quitar descarga"
        );

        if (confirm.isConfirmed) {
            await deleteMisaOffline(misa.id);
            setMisas((prev) => prev.filter((m) => m.id !== misa.id));
            await showSuccessToast("Misa eliminada de descargas");
        }
    };

    const handleDeleteSong = async (song: OfflineSong, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const confirm = await showConfirm(
            "¿Quitar descarga?",
            `¿Deseas eliminar "${song.title}" de tu almacenamiento sin conexión?`,
            "Sí, quitar descarga"
        );

        if (confirm.isConfirmed) {
            await deleteSongOffline(song.id);
            setSongs((prev) => prev.filter((s) => s.id !== song.id));
            await showSuccessToast("Canción eliminada de descargas");
        }
    };

    const formatMisaDate = (dateStr: string) => {
        if (!dateStr) return "";
        const d = new Date(dateStr.length === 10 ? dateStr + "T00:00:00" : dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("es-ES", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const query = searchQuery.trim().toLowerCase();

    const filteredMisas = misas.filter((m) => {
        if (!query) return true;
        const inTitle = m.title.toLowerCase().includes(query);
        const inMinistry = m.ministry?.name.toLowerCase().includes(query) || false;
        const inSong = (m.misaSongs || []).some((ms) =>
            ms.song?.title.toLowerCase().includes(query)
        );
        return inTitle || inMinistry || inSong;
    });

    const filteredSongs = songs.filter((s) => {
        if (!query) return true;
        const inTitle = s.title.toLowerCase().includes(query);
        const inAuthor =
            typeof s.author === "string"
                ? s.author.toLowerCase().includes(query)
                : s.author?.name.toLowerCase().includes(query) || false;
        return inTitle || inAuthor;
    });

    return (
        <div className="w-full space-y-6">
            {/* Header del centro offline */}
            <div className="bg-bg-secondary border border-white/5 rounded-2xl p-5 sm:p-7 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-accent-main text-xs font-semibold mb-2">
                            <AppIcon name="cloud-arrow-down" className="text-xs" />
                            <span>Almacenamiento Local</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                            Contenido Sin Conexión
                        </h1>
                        <p className="text-xs sm:text-sm text-text-secondary mt-1">
                            Accede a tus misas y canciones descargadas aunque no tengas señal de internet ni Wi-Fi.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                            <div className="text-xs text-text-secondary">Guardados</div>
                            <div className="text-sm font-bold text-white font-mono">
                                {misas.length} {misas.length === 1 ? "misa" : "misas"} • {songs.length} cantos
                            </div>
                        </div>
                    </div>
                </div>

                {/* Buscador interno */}
                <div className="mt-5 relative">
                    <AppIcon name="magnifying-glass" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-sm" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={
                            activeTab === "misas"
                                ? "Buscar en misas descargadas..."
                                : "Buscar en canciones descargadas..."
                        }
                        className="w-full pl-10 pr-4 py-2.5 bg-bg-main border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white p-1"
                        >
                            <AppIcon name="xmark" className="text-xs" />
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mt-4 border-t border-white/5 pt-4">
                    <button
                        type="button"
                        onClick={() => setActiveTab("misas")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
                            activeTab === "misas"
                                ? "bg-accent-main text-white shadow-md"
                                : "bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/5"
                        }`}
                    >
                        <AppIcon name="book-bible" className="text-xs" />
                        <span>Misas ({misas.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("songs")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
                            activeTab === "songs"
                                ? "bg-accent-main text-white shadow-md"
                                : "bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/5"
                        }`}
                    >
                        <AppIcon name="music" className="text-xs" />
                        <span>Canciones ({songs.length})</span>
                    </button>
                </div>
            </div>

            {/* Listado de Misas */}
            {activeTab === "misas" && (
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-12 text-text-secondary">
                            <AppIcon name="circle-notch" spin className="text-2xl text-accent-main mb-3" />
                            <p className="text-sm">Cargando misas sin conexión...</p>
                        </div>
                    ) : filteredMisas.length === 0 ? (
                        <div className="bg-bg-secondary border border-white/5 rounded-xl p-8 text-center text-text-secondary space-y-3">
                            <AppIcon name="cloud-arrow-down" className="text-3xl text-text-secondary/40" />
                            <div>
                                <h3 className="text-base font-bold text-white">
                                    {searchQuery
                                        ? "No se encontraron misas con esa búsqueda"
                                        : "No tienes misas descargadas aún"}
                                </h3>
                                <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                                    {searchQuery
                                        ? "Intenta con otro término o limpia el buscador."
                                        : "Abre cualquier misa cuando tengas internet y pulsa 'Descargar Misa' para tenerla siempre lista en la iglesia."}
                                </p>
                            </div>
                            {!searchQuery && (
                                <a
                                    href="/misas"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-main hover:bg-accent-main/90 text-white font-bold text-xs transition-colors shadow-md mt-2"
                                >
                                    <AppIcon name="book" />
                                    <span>Ir al catálogo de Misas</span>
                                </a>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredMisas.map((misa) => {
                                const songCount = (misa.misaSongs || []).length;
                                return (
                                    <div
                                        key={misa.id}
                                        className="bg-bg-secondary border border-white/5 rounded-xl p-4 sm:p-5 hover:border-accent-main/50 transition-colors flex flex-col justify-between gap-4 group"
                                    >
                                        <div className="space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                                                        <AppIcon name="check" className="text-[10px]" />
                                                        <span>Descargada</span>
                                                    </span>
                                                    {misa.ministry && (
                                                        <span className="text-[11px] px-2 py-0.5 rounded bg-white/5 text-text-secondary border border-white/10 truncate max-w-[150px]">
                                                            {misa.ministry.name}
                                                        </span>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDeleteMisa(misa, e)}
                                                    className="text-text-secondary/60 hover:text-red-400 p-1 transition-colors"
                                                    title="Quitar descarga"
                                                >
                                                    <AppIcon name="trash-can" className="text-xs" />
                                                </button>
                                            </div>

                                            <h3 className="text-lg font-bold text-white group-hover:text-accent-main transition-colors leading-snug">
                                                {misa.title}
                                            </h3>

                                            <div className="flex items-center gap-3 text-xs text-text-secondary">
                                                <span className="flex items-center gap-1.5 capitalize">
                                                    <AppIcon name="calendar" className="text-accent-main" />
                                                    <span>{formatMisaDate(misa.dateMisa)}</span>
                                                </span>
                                                <span className="flex items-center gap-1.5 font-mono">
                                                    <AppIcon name="music" className="text-accent-main" />
                                                    <span>
                                                        {songCount} {songCount === 1 ? "canto" : "cantos"}
                                                    </span>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedMisaPreview(misa)}
                                                className="flex-1 py-2 px-3 rounded-xl bg-accent-main hover:bg-accent-main/90 text-white font-bold text-xs text-center transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <AppIcon name="book-open" className="text-xs" />
                                                <span>Ver Cantos</span>
                                            </button>
                                            <a
                                                href={`/misas/${misa.id}`}
                                                className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                                                title="Gestionar / Editar"
                                            >
                                                <AppIcon name="pen-to-square" className="text-xs" />
                                                <span className="hidden sm:inline">Editar</span>
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Listado de Canciones */}
            {activeTab === "songs" && (
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-12 text-text-secondary">
                            <AppIcon name="circle-notch" spin className="text-2xl text-accent-main mb-3" />
                            <p className="text-sm">Cargando canciones sin conexión...</p>
                        </div>
                    ) : filteredSongs.length === 0 ? (
                        <div className="bg-bg-secondary border border-white/5 rounded-xl p-8 text-center text-text-secondary space-y-3">
                            <AppIcon name="music" className="text-3xl text-text-secondary/40" />
                            <div>
                                <h3 className="text-base font-bold text-white">
                                    {searchQuery
                                        ? "No se encontraron canciones con esa búsqueda"
                                        : "No tienes canciones descargadas aún"}
                                </h3>
                                <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                                    {searchQuery
                                        ? "Intenta con otro término o limpia el buscador."
                                        : "Al abrir cualquier canto o descargar una misa completa, sus acordes se guardarán automáticamente aquí."}
                                </p>
                            </div>
                            {!searchQuery && (
                                <a
                                    href="/songs/search/all"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-main hover:bg-accent-main/90 text-white font-bold text-xs transition-colors shadow-md mt-2"
                                >
                                    <AppIcon name="music" />
                                    <span>Explorar canciones</span>
                                </a>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {filteredSongs.map((song) => {
                                const authorName =
                                    typeof song.author === "string"
                                        ? song.author
                                        : song.author?.name || "Desconocido";
                                return (
                                    <div
                                        key={song.id}
                                        className="bg-bg-secondary border border-white/5 rounded-xl p-4 hover:border-accent-main/50 transition-colors flex flex-col justify-between gap-3 group"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className="font-bold text-white group-hover:text-accent-main transition-colors text-base truncate flex-1">
                                                    {song.title}
                                                </h4>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDeleteSong(song, e)}
                                                    className="text-text-secondary/60 hover:text-red-400 p-1 transition-colors"
                                                    title="Quitar de descargas"
                                                >
                                                    <AppIcon name="trash-can" className="text-xs" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-text-secondary truncate mt-0.5">
                                                {authorName}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                                            <span className="text-xs bg-white/5 px-2 py-0.5 rounded text-accent-main font-mono border border-white/5">
                                                Ton: {song.key}
                                            </span>

                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedSongPreview(song)}
                                                    className="px-3 py-1.5 rounded-lg bg-accent-main hover:bg-accent-main/90 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                                                >
                                                    <AppIcon name="eye" className="text-[10px]" />
                                                    <span>Ver Acordes</span>
                                                </button>
                                                <a
                                                    href={`/songs/${song.id}`}
                                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/5 text-xs transition-colors"
                                                    title="Ir a página de canción"
                                                >
                                                    <AppIcon name="arrow-up-right-from-square" className="text-[11px]" />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Modal: Vista Rápida de Canción Offline */}
            {selectedSongPreview && (
                <div
                    data-modal-open="true"
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn overscroll-contain"
                    onClick={() => setSelectedSongPreview(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="bg-bg-secondary border border-white/10 rounded-2xl w-full max-w-3xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col shadow-2xl overflow-hidden overscroll-contain my-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/5 bg-bg-main/50">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs bg-white/5 px-2 py-0.5 rounded text-accent-main font-mono border border-white/5">
                                        Tono: {selectedSongPreview.key}
                                    </span>
                                    <span className="text-xs text-text-secondary font-mono">
                                        Offline
                                    </span>
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                                    {selectedSongPreview.title}
                                </h2>
                                <p className="text-xs text-text-secondary mt-0.5">
                                    {typeof selectedSongPreview.author === "string"
                                        ? selectedSongPreview.author
                                        : selectedSongPreview.author?.name || "Desconocido"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={`/songs/${selectedSongPreview.id}`}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/10 text-xs transition-colors"
                                    title="Abrir página completa"
                                >
                                    <AppIcon name="up-right-from-square" />
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setSelectedSongPreview(null)}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/10 text-xs transition-colors cursor-pointer"
                                    title="Cerrar"
                                >
                                    <AppIcon name="xmark" className="text-sm" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 overflow-y-auto flex-1 font-mono text-sm leading-relaxed max-h-[65vh]">
                            <SongView
                                initialContent={selectedSongPreview.content}
                                initialKey={selectedSongPreview.key}
                                originalKey={selectedSongPreview.key}
                                songId={selectedSongPreview.id}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Vista Rápida de Misa Offline */}
            {selectedMisaPreview && (
                <div
                    data-modal-open="true"
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn overscroll-contain"
                    onClick={() => setSelectedMisaPreview(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="bg-bg-secondary border border-white/10 rounded-2xl w-full max-w-3xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col shadow-2xl overflow-hidden overscroll-contain my-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/5 bg-bg-main/50">
                            <div>
                                <span className="text-xs text-accent-main font-semibold">
                                    Misa Guardada Localmente
                                </span>
                                <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                                    {selectedMisaPreview.title}
                                </h2>
                                <p className="text-xs text-text-secondary mt-0.5">
                                    {formatMisaDate(selectedMisaPreview.dateMisa)} • {(selectedMisaPreview.misaSongs || []).length} cantos
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={`/misas/view/${selectedMisaPreview.id}`}
                                    className="px-3 py-1.5 rounded-xl bg-accent-main hover:bg-accent-main/90 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-1.5"
                                    title="Abrir en Modo Lectura"
                                >
                                    <AppIcon name="book-open" />
                                    <span>Modo Lectura</span>
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setSelectedMisaPreview(null)}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/10 text-xs transition-colors cursor-pointer"
                                    title="Cerrar"
                                >
                                    <AppIcon name="xmark" className="text-sm" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 max-h-[65vh]">
                            {(() => {
                                const momentsMap = new Map();
                                (selectedMisaPreview.misaMoments || [])
                                    .slice()
                                    .sort((a, b) => a.order - b.order)
                                    .forEach((mm) => {
                                        momentsMap.set(mm.momentId, {
                                            moment: mm.moment,
                                            songs: [],
                                        });
                                    });

                                (selectedMisaPreview.misaSongs || []).forEach((ms) => {
                                    if (momentsMap.has(ms.momentId)) {
                                        momentsMap.get(ms.momentId).songs.push(ms);
                                    } else {
                                        momentsMap.set(ms.momentId, {
                                            moment: { id: ms.momentId, name: "Otros" },
                                            songs: [ms],
                                        });
                                    }
                                });

                                const entries = Array.from(momentsMap.values()).filter(
                                    (item) => item.songs.length > 0
                                );

                                if (entries.length === 0) {
                                    return (
                                        <div className="text-center py-8 text-text-secondary text-sm">
                                            Esta misa no tiene cantos asignados.
                                        </div>
                                    );
                                }

                                return entries.map((entry, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-bg-main border border-white/5 rounded-xl p-3.5 space-y-2.5"
                                    >
                                        <div className="text-xs font-bold text-accent-main uppercase tracking-wider">
                                            {entry.moment?.name || "Momento Litúrgico"}
                                        </div>
                                        <div className="space-y-1.5">
                                            {entry.songs.map((ms: any) => (
                                                <div
                                                    key={ms.id}
                                                    className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-sm font-semibold text-white truncate">
                                                            {ms.song?.title}
                                                        </div>
                                                        <div className="text-[11px] text-text-secondary truncate">
                                                            {typeof ms.song?.author === "string"
                                                                ? ms.song.author
                                                                : ms.song?.author?.name || "Desconocido"}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-xs bg-bg-secondary px-2 py-0.5 rounded text-accent-main font-mono border border-white/5">
                                                            {ms.key || ms.song?.key || "C"}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (ms.song) {
                                                                    setSelectedSongPreview({
                                                                        ...ms.song,
                                                                        key: ms.key || ms.song.key,
                                                                    });
                                                                }
                                                            }}
                                                            className="px-2.5 py-1 rounded bg-accent-main/20 hover:bg-accent-main text-accent-main hover:text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <AppIcon name="guitar" className="text-[10px]" />
                                                            <span>Ver Acordes</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
