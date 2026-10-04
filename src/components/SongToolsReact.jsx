import AppIcon from "@/components/Ui/AppIcon";
import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { downloadSongPdf } from '../services/songs';
import { transposeKey } from '../utils/music';
import { showLoading, showSuccessToast, showError } from '../utils/alerts';
import {
    getChordsPreference,
    setChordsPreference,
    getToolsMinimizedPreference,
    setToolsMinimizedPreference
} from '../utils/preferences';
import {
    saveSongOffline,
    deleteSongOffline,
    isSongOffline,
    cacheUrlsForOffline,
    getSongOffline
} from '../utils/offlineStorage';
import { getSongById } from '../services/songs';

const FONT_SIZES = [14, 16, 18, 20, 24, 28];
const SCROLL_SPEEDS = [
    { level: 1, label: '0.25x', pps: 8 },
    { level: 2, label: '0.5x', pps: 16 },
    { level: 3, label: '1.0x', pps: 32 },
    { level: 4, label: '1.5x', pps: 50 },
    { level: 5, label: '2.0x', pps: 72 },
    { level: 6, label: '2.5x', pps: 96 },
];

export const SongToolsReact = ({
    id,
    title = '',
    initialKey = 'C',
    onTranspose = () => {},
    onToggleChords = () => {},
    onPrint = () => {},
    canEdit = false,
    song = null
}) => {
    // Tones and Transposition state
    const [currentKey, setCurrentKey] = useState(initialKey || 'C');
    const [semitonesFromOriginal, setSemitonesFromOriginal] = useState(0);

    // Chords visibility: uses user preferences, default FALSE (sin acordes)
    const [showChords, setShowChords] = useState(() => getChordsPreference(false));

    // Font size
    const [fontSize, setFontSize] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('cancionero_font_size');
            if (saved) {
                const parsed = parseInt(saved, 10);
                if (!isNaN(parsed) && parsed >= 12 && parsed <= 32) return parsed;
            }
        }
        return 18;
    });

    // Auto-scroll
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const [showScrollWidget, setShowScrollWidget] = useState(false);
    const [scrollSpeed, setScrollSpeed] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('cancionero_scroll_speed_v2');
            if (saved) {
                const parsed = parseInt(saved, 10);
                if (SCROLL_SPEEDS.some(s => s.level === parsed)) return parsed;
            }
        }
        return 2; // Nivel 2 (0.5x) por defecto
    });
    const animFrameRef = useRef(null);
    const lastScrollTimeRef = useRef(null);
    const scrollAccumulatorRef = useRef(0);
    const isAutoScrollingRef = useRef(isAutoScrolling);
    isAutoScrollingRef.current = isAutoScrolling;
    const scrollSpeedRef = useRef(scrollSpeed);
    scrollSpeedRef.current = scrollSpeed;

    const handleSetScrollSpeed = (updateFnOrVal) => {
        setScrollSpeed(prev => {
            const next = typeof updateFnOrVal === 'function' ? updateFnOrVal(prev) : updateFnOrVal;
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem('cancionero_scroll_speed_v2', String(next));
                } catch (e) {
                    // ignore
                }
            }
            return next;
        });
    };

    const handleToggleAutoScroll = () => {
        setIsAutoScrolling(prev => {
            const next = !prev;
            if (next) {
                setShowScrollWidget(true);
                if (typeof window !== 'undefined') {
                    const scrollHeight = Math.max(
                        document.documentElement.scrollHeight,
                        document.body.scrollHeight
                    );
                    const maxScroll = scrollHeight - window.innerHeight;
                    const currentScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
                    // Si el usuario ya está al final, reiniciar al inicio para poder scrollear
                    if (maxScroll > 50 && currentScroll >= maxScroll - 20) {
                        window.scrollTo({ top: 0, behavior: 'instant' });
                    }
                }
            }
            return next;
        });
    };

    const handleCloseAutoScroll = () => {
        setIsAutoScrolling(false);
        setShowScrollWidget(false);
    };

    // Modo Atril / Stand Mode
    const [isFocusMode, setIsFocusMode] = useState(false);
    const wakeLockRef = useRef(null);

    // Sidebar & Menus state
    const [isExpanded, setIsExpanded] = useState(true);
    // Minimized state: when true, collapses toolbar into a floating circular bubble at bottom-right
    const [isMinimized, setIsMinimized] = useState(() => getToolsMinimizedPreference(false));
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
    const [showDownloadOptions, setShowDownloadOptions] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const downloadContainerRef = useRef(null);

    // Offline storage state
    const [isSavedOffline, setIsSavedOffline] = useState(false);
    const [isSavingOffline, setIsSavingOffline] = useState(false);

    useEffect(() => {
        let mounted = true;
        if (id) {
            isSongOffline(id).then((saved) => {
                if (mounted) setIsSavedOffline(saved);
            }).catch(() => {});
        }

        const handleOfflineChange = (e) => {
            if (e?.detail?.type === 'song' && String(e?.detail?.id) === String(id)) {
                setIsSavedOffline(e.detail.action === 'saved');
            }
        };

        window.addEventListener('cancionero-offline-change', handleOfflineChange);
        return () => {
            mounted = false;
            window.removeEventListener('cancionero-offline-change', handleOfflineChange);
        };
    }, [id]);

    const handleToggleOfflineSave = async () => {
        if (!id) return;
        setIsSavingOffline(true);
        try {
            if (isSavedOffline) {
                await deleteSongOffline(id);
                setIsSavedOffline(false);
                await showSuccessToast('Canto quitado de descargas');
            } else {
                let songDataToSave = song;
                if (!songDataToSave || !songDataToSave.content) {
                    const fetched = await getSongById(id);
                    if (fetched.success && fetched.data) {
                        songDataToSave = fetched.data;
                    }
                }

                if (!songDataToSave) {
                    await showError('No se pudo guardar', 'No se pudieron obtener los datos completos del canto.');
                    return;
                }

                await saveSongOffline(songDataToSave);
                await cacheUrlsForOffline([`/songs/${id}`]);
                setIsSavedOffline(true);
                await showSuccessToast('Guardado sin conexión', 'Ahora podrás ver este canto sin internet.');
            }
        } catch (err) {
            console.error('Error al cambiar estado offline del canto:', err);
            await showError('Error', 'Ocurrió un problema al gestionar la descarga.');
        } finally {
            setIsSavingOffline(false);
        }
    };

    // Sync initialKey
    useEffect(() => {
        if (initialKey) {
            setCurrentKey(initialKey);
            setSemitonesFromOriginal(0);
        }
    }, [initialKey]);

    // Handle minimize toggle
    const handleSetMinimized = (minimized) => {
        setIsMinimized(minimized);
        setToolsMinimizedPreference(minimized);
        if (minimized) {
            setIsMobileDrawerOpen(false);
            setShowDownloadOptions(false);
        }
    };

    // Handle transposition step (+1 or -1 semitones)
    const handleTransposeStep = (semitones) => {
        const newKey = transposeKey(currentKey || initialKey || 'C', semitones);
        const newDiff = semitonesFromOriginal + semitones;
        setCurrentKey(newKey);
        setSemitonesFromOriginal(newDiff);

        if (onTranspose) {
            onTranspose(semitones);
        } else if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('song-transpose', {
                detail: {
                    semitones,
                    newKey,
                    originalKey: initialKey,
                    semitonesFromOriginal: newDiff
                }
            }));
        }
    };

    // Reset transposition back to original
    const handleResetTranspose = () => {
        setCurrentKey(initialKey);
        setSemitonesFromOriginal(0);

        if (onTranspose) {
            onTranspose(-semitonesFromOriginal);
        } else if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('song-transpose', {
                detail: {
                    reset: true,
                    newKey: initialKey,
                    originalKey: initialKey,
                    semitonesFromOriginal: 0
                }
            }));
        }
    };

    // Listen to external song-transpose events (e.g., from HeaderLyricReact reset click)
    useEffect(() => {
        const handleTransposeEvent = (e) => {
            if (!e || !e.detail) return;
            if (e.detail.reset) {
                setCurrentKey(initialKey);
                setSemitonesFromOriginal(0);
                return;
            }
            if (e.detail.newKey) {
                setCurrentKey(e.detail.newKey);
                if (typeof e.detail.semitonesFromOriginal === 'number') {
                    setSemitonesFromOriginal(e.detail.semitonesFromOriginal);
                }
            }
        };

        window.addEventListener('song-transpose', handleTransposeEvent);
        return () => window.removeEventListener('song-transpose', handleTransposeEvent);
    }, [initialKey]);

    // Toggle chords and update global preference
    const handleToggleChords = () => {
        const nextVal = !showChords;
        setShowChords(nextVal);
        setChordsPreference(nextVal);

        if (onToggleChords) {
            onToggleChords();
        } else if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('song-toggle-chords', {
                detail: { show: nextVal }
            }));
        }
    };

    // Listen for chords preference changes from any other component
    useEffect(() => {
        const handlePreferenceChanged = (e) => {
            if (e && e.detail && typeof e.detail.show === 'boolean') {
                setShowChords(e.detail.show);
            }
        };

        window.addEventListener('song-chords-preference-changed', handlePreferenceChanged);
        return () => window.removeEventListener('song-chords-preference-changed', handlePreferenceChanged);
    }, []);

    // Change font size
    const handleFontSizeChange = (direction) => {
        const currentIndex = FONT_SIZES.indexOf(fontSize);
        let nextIndex = currentIndex === -1 ? 2 : currentIndex + direction;
        if (nextIndex < 0) nextIndex = 0;
        if (nextIndex >= FONT_SIZES.length) nextIndex = FONT_SIZES.length - 1;

        const newSize = FONT_SIZES[nextIndex];
        setFontSize(newSize);
        if (typeof window !== 'undefined') {
            localStorage.setItem('cancionero_font_size', String(newSize));
            window.dispatchEvent(new CustomEvent('song-font-size', {
                detail: { size: newSize }
            }));
        }
    };

    // Auto-scroll loop
    useEffect(() => {
        if (!isAutoScrolling) {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
                animFrameRef.current = null;
            }
            return;
        }

        // Desactivar temporalmente el scroll-behavior: smooth del html mientras dura el auto-scroll
        // Esto evita que la animación smooth de CSS cancele e invalide los pasos cuadro a cuadro de rAF
        const htmlElement = document.documentElement;
        const prevScrollBehavior = htmlElement.style.scrollBehavior;
        htmlElement.style.scrollBehavior = 'auto';

        scrollAccumulatorRef.current = 0;
        lastScrollTimeRef.current = performance.now();

        const scrollStep = (time) => {
            if (!isAutoScrollingRef.current) return;

            // Delta de tiempo en segundos, acotado a máx 0.1s para evitar saltos bruscos al cambiar de pestaña
            const rawDelta = (time - (lastScrollTimeRef.current || time)) / 1000;
            const delta = Math.min(Math.max(rawDelta, 0), 0.1);
            lastScrollTimeRef.current = time;

            const currentSpeedObj = SCROLL_SPEEDS.find(s => s.level === scrollSpeedRef.current) || SCROLL_SPEEDS[1];
            const pxToScroll = currentSpeedObj.pps * delta;

            // Acumular subpíxeles para velocidades lentas (ej: 0.5x = 15 pps = ~0.25px por frame)
            scrollAccumulatorRef.current += pxToScroll;

            if (scrollAccumulatorRef.current >= 1) {
                const pixels = Math.floor(scrollAccumulatorRef.current);
                scrollAccumulatorRef.current -= pixels;

                try {
                    window.scrollBy({ top: pixels, left: 0, behavior: 'instant' });
                } catch {
                    window.scrollBy(0, pixels);
                }
            }

            // Comprobar si se llegó al final de la página
            const scrollHeight = Math.max(
                document.documentElement.scrollHeight,
                document.body.scrollHeight
            );
            const maxScroll = scrollHeight - window.innerHeight;
            const currentScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;

            if (maxScroll > 20 && currentScroll >= (maxScroll - 15)) {
                setIsAutoScrolling(false);
                showSuccessToast('Fin de la canción');
                return;
            }

            animFrameRef.current = requestAnimationFrame(scrollStep);
        };

        animFrameRef.current = requestAnimationFrame(scrollStep);

        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
                animFrameRef.current = null;
            }
            htmlElement.style.scrollBehavior = prevScrollBehavior;
        };
    }, [isAutoScrolling]);

    // Modo Atril (Focus Mode)
    const toggleFocusMode = async () => {
        const nextState = !isFocusMode;
        setIsFocusMode(nextState);

        if (nextState) {
            document.body.classList.add('song-focus-mode');
            try {
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                }
            } catch (e) {
                console.warn('Fullscreen request failed:', e);
            }

            try {
                if ('wakeLock' in navigator) {
                    wakeLockRef.current = await navigator.wakeLock.request('screen');
                }
            } catch (e) {
                console.warn('Wake Lock request failed:', e);
            }
        } else {
            document.body.classList.remove('song-focus-mode');
            try {
                if (document.fullscreenElement && document.exitFullscreen) {
                    await document.exitFullscreen();
                }
            } catch (e) {
                console.warn('Exit fullscreen failed:', e);
            }

            if (wakeLockRef.current) {
                try {
                    await wakeLockRef.current.release();
                } catch (e) {
                    // ignore
                }
                wakeLockRef.current = null;
            }
        }
    };

    // Fullscreen exit sync
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && isFocusMode) {
                setIsFocusMode(false);
                document.body.classList.remove('song-focus-mode');
                if (wakeLockRef.current) {
                    wakeLockRef.current.release().catch(() => {});
                    wakeLockRef.current = null;
                }
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.body.classList.remove('song-focus-mode');
            if (wakeLockRef.current) {
                wakeLockRef.current.release().catch(() => {});
            }
        };
    }, [isFocusMode]);

    // Close download dropdown on outside click or ESC
    useEffect(() => {
        if (!showDownloadOptions) return;

        const handlePointerDown = (e) => {
            if (downloadContainerRef.current && !downloadContainerRef.current.contains(e.target)) {
                setShowDownloadOptions(false);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setShowDownloadOptions(false);
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showDownloadOptions]);

    // PDF Download
    const handleDownload = async (withChords) => {
        setShowDownloadOptions(false);
        setIsMobileDrawerOpen(false);
        setIsDownloading(true);
        showLoading('Generando PDF...');

        try {
            const res = await downloadSongPdf(id, {
                withChords,
                tone: currentKey,
                title
            });

            Swal.close();

            if (res.isRateLimited) {
                const minutes = Math.ceil((res.retryAfter || 300) / 60);
                await showError(
                    'Límite de descargas alcanzado',
                    res.error || `Has alcanzado el límite de 3 descargas de PDF en 5 minutos. Por favor espera ${minutes} minuto${minutes > 1 ? 's' : ''} antes de intentar nuevamente.`
                );
                return;
            }

            if (!res.success) {
                await showError('Error al descargar', res.error || 'No se pudo generar el PDF de la canción.');
                return;
            }

            await showSuccessToast('PDF descargado con éxito');
        } catch (err) {
            Swal.close();
            console.error('Error downloading song:', err);
            await showError('Error', 'Ocurrió un problema inesperado al descargar el PDF.');
        } finally {
            setIsDownloading(false);
        }
    };

    // Share song
    const handleShare = async () => {
        setIsMobileDrawerOpen(false);
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: document.title,
                    url: window.location.href
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error sharing:', err);
                }
            }
        } else {
            try {
                await navigator.clipboard.writeText(window.location.href);
                await showSuccessToast('Enlace copiado al portapapeles');
            } catch (err) {
                console.error('Failed to copy:', err);
                await showError('Error', 'No se pudo copiar el enlace.');
            }
        }
    };

    return (
        <>
            {/* =========================================================================
                1. DESKTOP SIDEBAR (Visible on md and larger screens)
               ========================================================================= */}
            <aside
                id="song-tools-aside"
                className={`hidden md:flex flex-col sticky top-16 h-[calc(100vh-4rem)] bg-bg-main no-print transition-all duration-300 ease-fluid z-30 select-none overflow-hidden ${
                    isMinimized
                        ? 'w-0 opacity-0 -translate-x-4 p-0 border-r-0 pointer-events-none'
                        : isExpanded
                            ? 'w-64 px-3 py-4 opacity-100 translate-x-0 border-r border-white/5'
                            : 'w-16 px-2 py-4 opacity-100 translate-x-0 border-r border-white/5 items-center'
                }`}
            >
                <div className={`flex flex-col h-full w-full transition-all duration-200 ${
                    isMinimized ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
                }`}>
                    {/* Header de la barra con botón de colapso y botón de minimizar */}
                    <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/5 w-full">
                        {isExpanded ? (
                            <>
                                <span className="text-[11px] font-mono font-semibold text-text-secondary tracking-wider uppercase pl-1">
                                    Herramientas
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => handleSetMinimized(true)}
                                        className="w-7 h-7 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
                                        title="Minimizar a botón flotante"
                                    >
                                        <AppIcon name="down-left-and-up-right-to-center" className="text-xs" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsExpanded(false)}
                                        className="w-7 h-7 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
                                        title="Contraer barra lateral"
                                    >
                                        <AppIcon name="chevron-left" className="text-xs" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="w-full flex flex-col items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setIsExpanded(true)}
                                    className="w-8 h-8 rounded-lg text-text-secondary hover:text-accent-main hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
                                    title="Expandir barra lateral"
                                >
                                    <AppIcon name="chevron-right" className="text-xs" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSetMinimized(true)}
                                    className="w-8 h-8 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
                                    title="Minimizar a botón flotante"
                                >
                                    <AppIcon name="down-left-and-up-right-to-center" className="text-[10px]" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col gap-4 overflow-y-auto overflow-x-hidden pr-0.5">
                        {/* -------------------------------------------------------------
                            GRUPO 1: TONO Y ACORDES
                           ------------------------------------------------------------- */}
                        <div className="flex flex-col gap-1.5 w-full">
                            {isExpanded && (
                                <span className="text-[10px] font-mono text-text-secondary/70 uppercase tracking-wider px-1">
                                    {showChords ? 'Tono y Acordes' : 'Acordes'}
                                </span>
                            )}

                            {showChords && (
                                isExpanded ? (
                                    <div className="bg-bg-secondary border border-white/5 rounded-xl p-2.5 flex flex-col gap-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleTransposeStep(-1)}
                                                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                                                title="Bajar medio tono"
                                            >
                                                <AppIcon name="minus" className="text-xs" />
                                            </button>

                                            <div className="flex flex-col items-center justify-center flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-base font-bold text-accent-main font-mono">
                                                        {currentKey}
                                                    </span>
                                                    {semitonesFromOriginal !== 0 && (
                                                        <span className="text-[10px] font-mono px-1 rounded bg-accent-main/15 text-accent-main font-bold">
                                                            {semitonesFromOriginal > 0 ? `+${semitonesFromOriginal}` : semitonesFromOriginal}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-text-secondary font-mono">
                                                    Tono {semitonesFromOriginal === 0 ? 'original' : 'transportado'}
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleTransposeStep(1)}
                                                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                                                title="Subir medio tono"
                                            >
                                                <AppIcon name="plus" className="text-xs" />
                                            </button>
                                        </div>

                                        {semitonesFromOriginal !== 0 && (
                                            <button
                                                type="button"
                                                onClick={handleResetTranspose}
                                                className="w-full py-1 text-[11px] font-mono text-text-secondary hover:text-accent-main flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                                title="Restablecer al tono original"
                                            >
                                                <AppIcon name="rotate-left" className="text-[10px]" />
                                                <span>Restablecer ({initialKey})</span>
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="relative group">
                                            <button
                                                type="button"
                                                onClick={() => handleTransposeStep(1)}
                                                className="w-10 h-8 rounded-lg hover:bg-white/5 text-text-secondary hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                            >
                                                <AppIcon name="plus" className="text-xs" />
                                            </button>
                                            <div className="absolute left-full ml-3 px-2 py-1 bg-bg-secondary border border-white/10 rounded-lg text-xs font-medium text-white shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                                                Subir tono (+1)
                                            </div>
                                        </div>

                                        <div className="relative group flex flex-col items-center py-1">
                                            <span className="text-sm font-bold font-mono text-accent-main">
                                                {currentKey}
                                            </span>
                                            {semitonesFromOriginal !== 0 && (
                                                <span className="text-[9px] font-mono text-text-secondary">
                                                    {semitonesFromOriginal > 0 ? `+${semitonesFromOriginal}` : semitonesFromOriginal}
                                                </span>
                                            )}
                                            <div className="absolute left-full ml-3 px-2 py-1 bg-bg-secondary border border-white/10 rounded-lg text-xs font-medium text-white shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                                                Tono actual: {currentKey} (Orig: {initialKey})
                                            </div>
                                        </div>

                                        <div className="relative group">
                                            <button
                                                type="button"
                                                onClick={() => handleTransposeStep(-1)}
                                                className="w-10 h-8 rounded-lg hover:bg-white/5 text-text-secondary hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                            >
                                                <AppIcon name="minus" className="text-xs" />
                                            </button>
                                            <div className="absolute left-full ml-3 px-2 py-1 bg-bg-secondary border border-white/10 rounded-lg text-xs font-medium text-white shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                                                Bajar tono (-1)
                                            </div>
                                        </div>

                                        {semitonesFromOriginal !== 0 && (
                                            <div className="relative group">
                                                <button
                                                    type="button"
                                                    onClick={handleResetTranspose}
                                                    className="w-10 h-7 rounded-lg text-accent-main hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
                                                >
                                                    <AppIcon name="rotate-left" className="text-[11px]" />
                                                </button>
                                                <div className="absolute left-full ml-3 px-2 py-1 bg-bg-secondary border border-white/10 rounded-lg text-xs font-medium text-white shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                                                    Restablecer tono original ({initialKey})
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            )}

                            {/* Toggle Acordes */}
                            {isExpanded ? (
                                <button
                                    type="button"
                                    onClick={handleToggleChords}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                                        showChords
                                            ? 'bg-accent-main/10 border-accent-main/30 text-white'
                                            : 'bg-bg-secondary border-white/5 text-text-secondary hover:text-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <AppIcon name="music" className={`text-xs ${showChords ? 'text-accent-main' : 'text-text-secondary'}`} />
                                        <span className="text-xs font-semibold">Acordes</span>
                                    </div>
                                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                        showChords ? 'bg-accent-main text-white' : 'bg-white/5 text-text-secondary'
                                    }`}>
                                        {showChords ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            ) : (
                                <div className="relative group">
                                    <button
                                        type="button"
                                        onClick={handleToggleChords}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                                            showChords
                                                ? 'bg-accent-main/15 text-accent-main'
                                                : 'hover:bg-white/5 text-text-secondary'
                                        }`}
                                    >
                                        <AppIcon name="music" className="text-sm" />
                                    </button>
                                    <div className="absolute left-full ml-3 px-2 py-1 bg-bg-secondary border border-white/10 rounded-lg text-xs font-medium text-white shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                                        {showChords ? 'Ocultar acordes' : 'Mostrar acordes'}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-white/5 w-full my-1"></div>

                        {/* -------------------------------------------------------------
                            GRUPO 2: LECTURA Y VISTA
                           ------------------------------------------------------------- */}
                        <div className="flex flex-col gap-1.5 w-full">
                            {isExpanded && (
                                <span className="text-[10px] font-mono text-text-secondary/70 uppercase tracking-wider px-1">
                                    Lectura y Vista
                                </span>
                            )}

                            {/* Tamaño de texto */}
                            {isExpanded ? (
                                <div className="bg-bg-secondary border border-white/5 rounded-xl p-2 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => handleFontSizeChange(-1)}
                                        disabled={fontSize <= FONT_SIZES[0]}
                                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Reducir tamaño de letra"
                                    >
                                        <span className="text-xs font-bold font-mono">A-</span>
                                    </button>

                                    <div className="text-center font-mono text-xs text-text-secondary">
                                        <span className="text-white font-semibold">{fontSize}px</span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleFontSizeChange(1)}
                                        disabled={fontSize >= FONT_SIZES[FONT_SIZES.length - 1]}
                                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Aumentar tamaño de letra"
                                    >
                                        <span className="text-xs font-bold font-mono">A+</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-1">
                                    <div className="relative group">
                                        <button
                                            type="button"
                                            onClick={() => handleFontSizeChange(1)}
                                            disabled={fontSize >= FONT_SIZES[FONT_SIZES.length - 1]}
                                            className="w-10 h-8 rounded-lg hover:bg-white/5 text-text-secondary hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30"
                                        >
                                            <span className="text-xs font-bold font-mono">A+</span>
                                        </button>
                                        <div className="absolute left-full ml-3 px-2 py-1 bg-bg-secondary border border-white/10 rounded-lg text-xs font-medium text-white shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                                            Aumentar letra ({fontSize}px)
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <button
                                            type="button"
                                            onClick={() => handleFontSizeChange(-1)}
                                            disabled={fontSize <= FONT_SIZES[0]}
                                            className="w-10 h-8 rounded-lg hover:bg-white/5 text-text-secondary hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30"
                                        >
                                            <span className="text-xs font-bold font-mono">A-</span>
                                        </button>
                                        <div className="absolute left-full ml-3 px-2 py-1 bg-bg-secondary border border-white/10 rounded-lg text-xs font-medium text-white shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                                            Reducir letra ({fontSize}px)
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Auto-scroll */}
                            {isExpanded ? (
                                <div className="bg-bg-secondary border border-white/5 rounded-xl p-2.5 flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={handleToggleAutoScroll}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                                            isAutoScrolling
                                                ? 'bg-accent-main text-white shadow-sm'
                                                : 'bg-white/5 hover:bg-white/10 text-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <AppIcon name={isAutoScrolling ? 'pause' : 'angles-down'} className="text-xs" />
                                            <span>{isAutoScrolling ? 'Pausar Scroll' : 'Auto-scroll'}</span>
                                        </div>
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/25 text-white/90">
                                            {SCROLL_SPEEDS.find(s => s.level === scrollSpeed)?.label}
                                        </span>
                                    </button>

                                    <div className="flex items-center justify-between gap-1 pt-0.5">
                                        <span className="text-[10px] font-mono text-text-secondary">Vel:</span>
                                        <div className="flex items-center gap-1 bg-bg-main/60 p-0.5 rounded-lg border border-white/5">
                                            {SCROLL_SPEEDS.map(s => (
                                                <button
                                                    key={s.level}
                                                    type="button"
                                                    onClick={() => handleSetScrollSpeed(s.level)}
                                                    title={`Nivel ${s.level} (${s.label})`}
                                                    className={`w-6 h-6 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                                                        scrollSpeed === s.level
                                                            ? 'bg-accent-main text-white font-bold shadow-sm'
                                                            : 'text-text-secondary hover:text-white hover:bg-white/10'
                                                    }`}
                                                >
                                                    {s.level}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative group">
                                    <button
                                        type="button"
                                        onClick={handleToggleAutoScroll}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                                            isAutoScrolling
                                                ? 'bg-accent-main text-white'
                                                : 'hover:bg-white/5 text-text-secondary hover:text-white'
                                        }`}
                                    >
                                        <AppIcon name={isAutoScrolling ? 'pause' : 'angles-down'} className="text-sm" />
                                    </button>
                                    <div className="absolute left-full ml-3 px-2 py-1 bg-bg-secondary border border-white/10 rounded-lg text-xs font-medium text-white shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                                        {isAutoScrolling ? 'Pausar auto-scroll' : 'Iniciar auto-scroll'}
                                    </div>
                                </div>
                            )}

                            {/* Modo Atril / Stand Mode */}
                            {isExpanded ? (
                                <button
                                    type="button"
                                    onClick={toggleFocusMode}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-bg-secondary hover:bg-white/10 border border-white/5 text-xs font-semibold text-text-main transition-colors cursor-pointer"
                                >
                                    <AppIcon name="expand" className="text-xs text-accent-main" />
                                    <span>Modo Atril / En Vivo</span>
                                </button>
                            ) : (
                                <div className="relative group">
                                    <button
                                        type="button"
                                        onClick={toggleFocusMode}
                                        className="w-10 h-10 rounded-xl hover:bg-white/5 text-text-secondary hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                        <AppIcon name="expand" className="text-sm" />
                                    </button>
                                    <div className="absolute left-full ml-3 px-2 py-1 bg-bg-secondary border border-white/10 rounded-lg text-xs font-medium text-white shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                                        Modo Atril (Pantalla completa)
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-white/5 w-full my-1"></div>

                        {/* -------------------------------------------------------------
                            GRUPO 3: ACCIONES (Descargar, Compartir, Editar)
                           ------------------------------------------------------------- */}
                        <div className="flex flex-col gap-1.5 w-full">
                            {isExpanded && (
                                <span className="text-[10px] font-mono text-text-secondary/70 uppercase tracking-wider px-1">
                                    Acciones
                                </span>
                            )}

                            {/* Descargar PDF (con popover) */}
                            <div ref={downloadContainerRef} className="relative w-full">
                                {isExpanded ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowDownloadOptions(prev => !prev)}
                                        disabled={isDownloading}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-colors cursor-pointer disabled:opacity-50 ${
                                            showDownloadOptions
                                                ? 'bg-white/10 border-accent-main text-accent-main'
                                                : 'bg-bg-secondary border-white/5 text-text-secondary hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            {isDownloading ? (
                                                <AppIcon name="circle-notch" spin className="text-xs text-accent-main" />
                                            ) : (
                                                <AppIcon name="download" className="text-xs" />
                                            )}
                                            <span className="text-xs font-semibold">Descargar</span>
                                        </div>
                                        <AppIcon name="chevron-right" className={`text-[10px] transition-transform ${showDownloadOptions ? 'rotate-90' : ''}`} />
                                    </button>
                                ) : (
                                    <div className="relative group">
                                        <button
                                            type="button"
                                            onClick={() => setShowDownloadOptions(prev => !prev)}
                                            disabled={isDownloading}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 ${
                                                showDownloadOptions ? 'bg-white/10 text-accent-main' : 'hover:bg-white/5 text-text-secondary hover:text-white'
                                            }`}
                                        >
                                            {isDownloading ? (
                                                <AppIcon name="circle-notch" spin className="text-sm text-accent-main" />
                                            ) : (
                                                <AppIcon name="download" className="text-sm" />
                                            )}
                                        </button>
                                        <div className="absolute left-full ml-3 px-2 py-1 bg-bg-secondary border border-white/10 rounded-lg text-xs font-medium text-white shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                                            Descargar PDF / Imprimir
                                        </div>
                                    </div>
                                )}

                                {/* Popover de descarga */}
                                {showDownloadOptions && (
                                    <div className="absolute left-full ml-3 top-0 bg-bg-secondary border border-white/10 rounded-xl shadow-2xl p-2 z-50 min-w-[210px] space-y-1">
                                        <div className="px-2.5 py-1.5 border-b border-white/5 mb-1">
                                            <p className="text-[10px] font-mono font-semibold text-text-secondary uppercase tracking-wider">
                                                Opciones de Descarga
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleDownload(true)}
                                            className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-text-main hover:bg-accent-main hover:text-white transition-colors cursor-pointer text-left group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <AppIcon name="file-pdf" className="text-accent-main group-hover:text-white text-xs" />
                                                <span>Con Acordes</span>
                                            </div>
                                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white">
                                                {currentKey}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleDownload(false)}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-text-main hover:bg-white/10 transition-colors cursor-pointer text-left"
                                        >
                                            <AppIcon name="file-lines" className="text-text-secondary text-xs" />
                                            <span>Solo Letra</span>
                                        </button>

                                        <div className="border-t border-white/5 my-1"></div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowDownloadOptions(false);
                                                if (onPrint) onPrint();
                                                else window.print();
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-left"
                                        >
                                            <AppIcon name="print" className="text-xs" />
                                            <span>Imprimir</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Guardar sin conexión */}
                            {isExpanded ? (
                                <button
                                    type="button"
                                    onClick={handleToggleOfflineSave}
                                    disabled={isSavingOffline}
                                    className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50 ${
                                        isSavedOffline
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                            : 'bg-bg-secondary border-white/5 text-text-secondary hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        {isSavingOffline ? (
                                            <AppIcon name="circle-notch" spin className="text-xs text-accent-main" />
                                        ) : isSavedOffline ? (
                                            <AppIcon name="cloud-arrow-down" className="text-xs text-emerald-400" />
                                        ) : (
                                            <AppIcon name="cloud-arrow-down" className="text-xs" />
                                        )}
                                        <span className="text-xs font-semibold">
                                            {isSavedOffline ? 'Descargado' : 'Guardar offline'}
                                        </span>
                                    </div>
                                    {isSavedOffline && (
                                        <AppIcon name="check" className="text-[10px] text-emerald-400" />
                                    )}
                                </button>
                            ) : (
                                <div className="relative group">
                                    <button
                                        type="button"
                                        onClick={handleToggleOfflineSave}
                                        disabled={isSavingOffline}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 ${
                                            isSavedOffline
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                : 'hover:bg-white/5 text-text-secondary hover:text-white'
                                        }`}
                                    >
                                        {isSavingOffline ? (
                                            <AppIcon name="circle-notch" spin className="text-sm text-accent-main" />
                                        ) : (
                                            <AppIcon name="cloud-arrow-down" className="text-sm" />
                                        )}
                                    </button>
                                    <div className="absolute left-full ml-3 px-2 py-1 bg-bg-secondary border border-white/10 rounded-lg text-xs font-medium text-white shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                                        {isSavedOffline ? 'Disponible sin conexión (Clic para quitar)' : 'Guardar para usar sin internet'}
                                    </div>
                                </div>
                            )}

                            {/* Compartir */}
                            {isExpanded ? (
                                <button
                                    type="button"
                                    onClick={handleShare}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-bg-secondary hover:bg-white/10 border border-white/5 text-xs font-semibold text-text-secondary hover:text-white transition-colors cursor-pointer"
                                >
                                    <AppIcon name="share-nodes" className="text-xs" />
                                    <span>Compartir</span>
                                </button>
                            ) : (
                                <div className="relative group">
                                    <button
                                        type="button"
                                        onClick={handleShare}
                                        className="w-10 h-10 rounded-xl hover:bg-white/5 text-text-secondary hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                        <AppIcon name="share-nodes" className="text-sm" />
                                    </button>
                                    <div className="absolute left-full ml-3 px-2 py-1 bg-bg-secondary border border-white/10 rounded-lg text-xs font-medium text-white shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                                        Compartir canción
                                    </div>
                                </div>
                            )}

                            {/* Editar (si canEdit) */}
                            {canEdit && (
                                isExpanded ? (
                                    <a
                                        href={`/songs/edit/${id}`}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-bg-secondary hover:bg-white/10 border border-white/5 text-xs font-semibold text-accent-main transition-colors cursor-pointer"
                                    >
                                        <AppIcon name="pencil" className="text-xs" />
                                        <span>Editar Canción</span>
                                    </a>
                                ) : (
                                    <div className="relative group">
                                        <a
                                            href={`/songs/edit/${id}`}
                                            className="w-10 h-10 rounded-xl hover:bg-white/5 text-accent-main flex items-center justify-center transition-colors"
                                        >
                                            <AppIcon name="pencil" className="text-sm" />
                                        </a>
                                        <div className="absolute left-full ml-3 px-2 py-1 bg-bg-secondary border border-white/10 rounded-lg text-xs font-medium text-white shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                                            Editar canción
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* =========================================================================
                2. MOBILE FLOATING ACTION BAR (Visible on mobile screens)
               ========================================================================= */}
            {!isFocusMode && (
                <div
                    className={`md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-bg-secondary/95 backdrop-blur-md border border-white/10 rounded-full shadow-2xl px-2.5 py-1.5 flex items-center gap-1.5 max-w-[95vw] no-print transition-all duration-300 ease-fluid origin-bottom ${
                        !(isMinimized || showScrollWidget) && !isMobileDrawerOpen
                            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                            : 'opacity-0 scale-75 translate-y-6 pointer-events-none'
                    }`}
                >
                    {showChords ? (
                        <>
                            {/* Bajar tono */}
                            <button
                                type="button"
                                onClick={() => handleTransposeStep(-1)}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                                title="Bajar medio tono"
                            >
                                <AppIcon name="minus" className="text-xs" />
                            </button>

                            {/* Tono badge central */}
                            <div
                                onClick={() => setIsMobileDrawerOpen(true)}
                                className="px-2.5 py-1 rounded-full bg-white/5 flex items-center gap-1 cursor-pointer font-mono text-xs select-none active:bg-white/10 transition-colors"
                                title="Ver herramientas de tono"
                            >
                                <span className="text-text-secondary text-[11px]">Ton:</span>
                                <span className="text-accent-main font-bold">{currentKey}</span>
                                {semitonesFromOriginal !== 0 && (
                                    <span className="text-[10px] text-accent-main font-semibold">
                                        {semitonesFromOriginal > 0 ? `+${semitonesFromOriginal}` : semitonesFromOriginal}
                                    </span>
                                )}
                            </div>

                            {/* Subir tono */}
                            <button
                                type="button"
                                onClick={() => handleTransposeStep(1)}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                                title="Subir medio tono"
                            >
                                <AppIcon name="plus" className="text-xs" />
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Disminuir tamaño de letra */}
                            <button
                                type="button"
                                onClick={() => handleFontSizeChange(-1)}
                                disabled={fontSize <= FONT_SIZES[0]}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer disabled:opacity-30"
                                title="Disminuir tamaño de letra"
                            >
                                <AppIcon name="minus" className="text-xs" />
                            </button>

                            {/* Letra badge central */}
                            <div
                                onClick={() => setIsMobileDrawerOpen(true)}
                                className="px-2.5 py-1 rounded-full bg-white/5 flex items-center gap-1 cursor-pointer font-mono text-xs select-none active:bg-white/10 transition-colors"
                                title="Ajustar tamaño de letra"
                            >
                                <span className="text-text-secondary text-[11px]">Letra:</span>
                                <span className="text-accent-main font-bold">{fontSize}px</span>
                            </div>

                            {/* Aumentar tamaño de letra */}
                            <button
                                type="button"
                                onClick={() => handleFontSizeChange(1)}
                                disabled={fontSize >= FONT_SIZES[FONT_SIZES.length - 1]}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer disabled:opacity-30"
                                title="Aumentar tamaño de letra"
                            >
                                <AppIcon name="plus" className="text-xs" />
                            </button>
                        </>
                    )}

                    <div className="h-4 w-px bg-white/10 mx-0.5"></div>

                    {/* Toggle Acordes */}
                    <button
                        type="button"
                        onClick={handleToggleChords}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                            showChords ? 'bg-accent-main text-white' : 'bg-white/5 text-text-secondary'
                        }`}
                        title={showChords ? 'Ocultar acordes' : 'Mostrar acordes'}
                    >
                        <AppIcon name="music" className="text-xs" />
                    </button>

                    {/* Auto-scroll */}
                    <button
                        type="button"
                        onClick={handleToggleAutoScroll}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                            isAutoScrolling ? 'bg-accent-main text-white' : 'bg-white/5 text-text-secondary'
                        }`}
                        title="Auto-scroll"
                    >
                        <AppIcon name={isAutoScrolling ? 'pause' : 'angles-down'} className="text-xs" />
                    </button>

                    <div className="h-4 w-px bg-white/10 mx-0.5"></div>

                    {/* Abrir Drawer de Más Herramientas */}
                    <button
                        type="button"
                        onClick={() => setIsMobileDrawerOpen(true)}
                        className="px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95 transition-transform"
                    >
                        <AppIcon name="sliders" className="text-xs text-accent-main" />
                        <span>Más</span>
                    </button>

                    {/* Botón Minimizar a bolita flotante */}
                    <button
                        type="button"
                        onClick={() => handleSetMinimized(true)}
                        className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                        title="Minimizar a botón flotante"
                    >
                        <AppIcon name="down-left-and-up-right-to-center" className="text-[10px]" />
                    </button>
                </div>
            )}

            {/* =========================================================================
                3. FLOATING CIRCULAR BUBBLE (BOLITA FLOTANTE ABAJO A LA DERECHA)
                   Visible whenever user minimizes the tools panel
               ========================================================================= */}
            {!isFocusMode && (
                <div
                    className={`fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 no-print transition-all duration-300 ease-spring origin-center ${
                        (isMinimized || showScrollWidget) && !isMobileDrawerOpen
                            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                            : 'opacity-0 scale-40 translate-y-6 pointer-events-none'
                    }`}
                >
                    <button
                        type="button"
                        onClick={() => {
                            if (showScrollWidget) {
                                setIsMobileDrawerOpen(true);
                            } else {
                                handleSetMinimized(false);
                            }
                        }}
                        className="w-13 h-13 rounded-full bg-accent-main hover:bg-accent-main/90 text-white shadow-xl flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 relative border border-white/20 group"
                        title="Mostrar herramientas (Tono, Acordes, Scroll)"
                        aria-label="Mostrar herramientas de canción"
                    >
                        <AppIcon name="sliders" className="text-lg transition-transform duration-300 group-hover:rotate-45" />

                        {/* Micro-badge si el tono está transportado (solo con acordes activos) */}
                        {showChords && semitonesFromOriginal !== 0 && (
                            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-bg-secondary text-accent-main text-[10px] font-mono font-bold rounded-full border border-accent-main/40 shadow-md">
                                {currentKey}
                            </span>
                        )}

                        {/* Tooltip en hover en desktop */}
                        <div className="hidden md:block absolute right-full mr-3 px-3 py-1.5 bg-bg-secondary border border-white/10 rounded-xl text-xs font-medium text-white shadow-2xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 -translate-x-1 group-hover:translate-x-0 z-50">
                            <div className="flex items-center gap-1.5">
                                <span>Herramientas</span>
                                {showChords ? (
                                    <span className="text-accent-main font-mono">({currentKey})</span>
                                ) : (
                                    <span className="text-accent-main font-mono">({fontSize}px)</span>
                                )}
                            </div>
                        </div>
                    </button>
                </div>
            )}

            {/* =========================================================================
                4. MOBILE BOTTOM SHEET (DRAWER)
               ========================================================================= */}
            <div
                className={`md:hidden fixed inset-0 z-[70] flex flex-col justify-end no-print transition-all duration-300 ${
                    isMobileDrawerOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible delay-300'
                }`}
            >
                {/* Backdrop */}
                <div
                    className={`fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300 ease-fluid ${
                        isMobileDrawerOpen ? 'opacity-100' : 'opacity-0'
                    }`}
                    onClick={() => setIsMobileDrawerOpen(false)}
                ></div>

                {/* Sheet Content */}
                <div
                    className={`relative z-10 bg-bg-secondary border-t border-white/10 rounded-t-2xl p-5 pb-12 max-h-[85vh] overflow-y-auto overscroll-contain space-y-4 shadow-2xl transition-transform duration-300 ease-fluid ${
                        isMobileDrawerOpen ? 'translate-y-0' : 'translate-y-full'
                    }`}
                >
                        {/* Drag Handle & Header */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-1 bg-white/20 rounded-full"></div>
                            <div className="flex items-center justify-between w-full pt-1">
                                <h3 className="text-base font-bold text-text-main">
                                    Herramientas de Canción
                                </h3>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => handleSetMinimized(true)}
                                        className="w-8 h-8 rounded-full bg-white/5 text-text-secondary hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                        title="Minimizar a botón flotante"
                                    >
                                        <AppIcon name="down-left-and-up-right-to-center" className="text-xs" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsMobileDrawerOpen(false)}
                                        className="w-8 h-8 rounded-full bg-white/5 text-text-secondary hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                        <AppIcon name="xmark" className="text-sm" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 1: TONO (Solo si los acordes están activados) */}
                        {showChords && (
                            <div className="bg-bg-main border border-white/5 rounded-xl p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono font-semibold text-text-secondary uppercase">
                                        Tono Musical
                                    </span>
                                    {semitonesFromOriginal !== 0 && (
                                        <button
                                            type="button"
                                            onClick={handleResetTranspose}
                                            className="text-xs font-mono text-accent-main underline cursor-pointer"
                                        >
                                            Restablecer ({initialKey})
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleTransposeStep(-1)}
                                        className="flex-1 py-2.5 rounded-xl bg-white/5 active:bg-white/10 text-white font-bold text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <AppIcon name="minus" className="text-xs" />
                                        <span>Bajar</span>
                                    </button>

                                    <div className="flex flex-col items-center px-4">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xl font-bold font-mono text-accent-main">
                                                {currentKey}
                                            </span>
                                            {semitonesFromOriginal !== 0 && (
                                                <span className="text-xs font-mono px-1 rounded bg-accent-main/20 text-accent-main font-bold">
                                                    {semitonesFromOriginal > 0 ? `+${semitonesFromOriginal}` : semitonesFromOriginal}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-mono text-text-secondary">
                                            Orig: {initialKey}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleTransposeStep(1)}
                                        className="flex-1 py-2.5 rounded-xl bg-white/5 active:bg-white/10 text-white font-bold text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <AppIcon name="plus" className="text-xs" />
                                        <span>Subir</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* SECCIÓN 2: LECTURA Y VISTA */}
                        <div className="bg-bg-main border border-white/5 rounded-xl p-3 space-y-3">
                            <span className="text-xs font-mono font-semibold text-text-secondary uppercase">
                                Vista y Lectura
                            </span>

                            {/* Acordes */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AppIcon name="music" className="text-accent-main text-xs" />
                                    <span className="text-sm font-semibold text-text-main">Mostrar Acordes</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleToggleChords}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                                        showChords ? 'bg-accent-main text-white' : 'bg-white/5 text-text-secondary'
                                    }`}
                                >
                                    {showChords ? 'ACTIVADOS' : 'OCULTOS'}
                                </button>
                            </div>

                            {/* Tamaño de letra */}
                            <div className="flex items-center justify-between pt-1 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <AppIcon name="font" className="text-text-secondary text-xs" />
                                    <span className="text-sm font-semibold text-text-main">Tamaño de Letra</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleFontSizeChange(-1)}
                                        disabled={fontSize <= FONT_SIZES[0]}
                                        className="w-8 h-8 rounded-lg bg-white/5 active:bg-white/10 text-white font-mono font-bold text-xs flex items-center justify-center disabled:opacity-30"
                                    >
                                        A-
                                    </button>
                                    <span className="text-xs font-mono text-white w-10 text-center">
                                        {fontSize}px
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleFontSizeChange(1)}
                                        disabled={fontSize >= FONT_SIZES[FONT_SIZES.length - 1]}
                                        className="w-8 h-8 rounded-lg bg-white/5 active:bg-white/10 text-white font-mono font-bold text-xs flex items-center justify-center disabled:opacity-30"
                                    >
                                        A+
                                    </button>
                                </div>
                            </div>

                            {/* Auto-scroll */}
                            <div className="pt-1 border-t border-white/5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AppIcon name="angles-down" className="text-accent-main text-xs" />
                                        <span className="text-sm font-semibold text-text-main">Auto-scroll</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleToggleAutoScroll}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                            isAutoScrolling ? 'bg-accent-main text-white' : 'bg-white/5 text-text-main'
                                        }`}
                                    >
                                        {isAutoScrolling ? 'Pausar' : 'Iniciar'}
                                    </button>
                                </div>
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-mono text-text-secondary">Velocidad:</span>
                                    <div className="flex items-center gap-1 bg-bg-main/60 p-1 rounded-xl border border-white/5">
                                        {SCROLL_SPEEDS.map(s => (
                                            <button
                                                key={s.level}
                                                type="button"
                                                onClick={() => handleSetScrollSpeed(s.level)}
                                                title={`Nivel ${s.level} (${s.label})`}
                                                className={`w-7 h-7 rounded-lg text-xs font-mono transition-colors ${
                                                    scrollSpeed === s.level
                                                        ? 'bg-accent-main text-white font-bold shadow-sm'
                                                        : 'text-text-secondary hover:text-white hover:bg-white/10'
                                                }`}
                                            >
                                                {s.level}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Modo Atril */}
                            <div className="pt-1 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMobileDrawerOpen(false);
                                        toggleFocusMode();
                                    }}
                                    className="w-full py-2.5 rounded-xl bg-white/5 active:bg-white/10 text-text-main font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                                >
                                    <AppIcon name="expand" className="text-accent-main" />
                                    <span>Modo Atril (Pantalla Completa)</span>
                                </button>
                            </div>
                        </div>

                        {/* SECCIÓN 3: ACCIONES */}
                        <div className="bg-bg-main border border-white/5 rounded-xl p-3 space-y-2">
                            <span className="text-xs font-mono font-semibold text-text-secondary uppercase">
                                Exportar y Compartir
                            </span>

                            {/* Guardar sin conexión móvil */}
                            <button
                                type="button"
                                onClick={handleToggleOfflineSave}
                                disabled={isSavingOffline}
                                className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 border ${
                                    isSavedOffline
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                        : 'bg-white/5 border-white/10 text-white active:bg-white/10'
                                }`}
                            >
                                {isSavingOffline ? (
                                    <AppIcon name="circle-notch" spin className="text-xs" />
                                ) : (
                                    <AppIcon name={isSavedOffline ? 'check' : 'cloud-arrow-down'} />
                                )}
                                <span>{isSavedOffline ? 'Disponible sin conexión (Descargado)' : 'Guardar para uso sin conexión'}</span>
                            </button>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleDownload(true)}
                                    disabled={isDownloading}
                                    className="py-2.5 px-3 rounded-xl bg-white/5 active:bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    <AppIcon name="file-pdf" className="text-accent-main" />
                                    <span>PDF Acordes</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleDownload(false)}
                                    disabled={isDownloading}
                                    className="py-2.5 px-3 rounded-xl bg-white/5 active:bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    <AppIcon name="file-lines" className="text-text-secondary" />
                                    <span>PDF Letra</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMobileDrawerOpen(false);
                                        if (onPrint) onPrint();
                                        else window.print();
                                    }}
                                    className="py-2.5 px-3 rounded-xl bg-white/5 active:bg-white/10 text-text-secondary hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                >
                                    <AppIcon name="print" />
                                    <span>Imprimir</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleShare}
                                    className="py-2.5 px-3 rounded-xl bg-white/5 active:bg-white/10 text-text-secondary hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                >
                                    <AppIcon name="share-nodes" />
                                    <span>Compartir</span>
                                </button>
                            </div>

                            {canEdit && (
                                <a
                                    href={`/songs/edit/${id}`}
                                    className="w-full py-2.5 px-3 rounded-xl bg-accent-main/10 border border-accent-main/30 text-accent-main text-xs font-semibold flex items-center justify-center gap-2 transition-colors block text-center"
                                >
                                    <AppIcon name="pencil" />
                                    <span>Editar Canción</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>

            {/* =========================================================================
                5. FLOATING AUTO-SCROLL CONTROL WIDGET (Centered at bottom when scrolling or paused)
               ========================================================================= */}
            {showScrollWidget && !isMobileDrawerOpen && (
                <div
                    className={`fixed ${
                        isFocusMode
                            ? 'bottom-6 md:bottom-8'
                            : 'bottom-20 md:bottom-8'
                    } left-1/2 -translate-x-1/2 z-[55] bg-bg-secondary/95 backdrop-blur-md border border-white/15 rounded-full px-3 py-2 shadow-2xl flex items-center gap-2.5 no-print transition-all duration-200 animate-in fade-in`}
                >
                    <button
                        type="button"
                        onClick={handleToggleAutoScroll}
                        className="w-8 h-8 rounded-full bg-accent-main text-white flex items-center justify-center hover:bg-accent-main/90 transition-colors shadow-md cursor-pointer active:scale-95"
                        title={isAutoScrolling ? "Pausar scroll" : "Reanudar scroll"}
                    >
                        <AppIcon name={isAutoScrolling ? 'pause' : 'play'} className="text-xs" />
                    </button>

                    <div className="flex items-center gap-1.5 text-xs font-mono text-text-secondary">
                        <button
                            type="button"
                            onClick={() => handleSetScrollSpeed(s => Math.max(1, s - 1))}
                            disabled={scrollSpeed <= 1}
                            className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                            title="Disminuir velocidad"
                        >
                            <AppIcon name="minus" className="text-[10px]" />
                        </button>
                        <span className="text-white font-bold w-12 text-center font-mono">
                            {SCROLL_SPEEDS.find(s => s.level === scrollSpeed)?.label}
                        </span>
                        <button
                            type="button"
                            onClick={() => handleSetScrollSpeed(s => Math.min(SCROLL_SPEEDS.length, s + 1))}
                            disabled={scrollSpeed >= SCROLL_SPEEDS.length}
                            className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                            title="Aumentar velocidad"
                        >
                            <AppIcon name="plus" className="text-[10px]" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleCloseAutoScroll}
                        className="w-7 h-7 rounded-full hover:bg-white/10 text-text-secondary hover:text-white flex items-center justify-center ml-1 cursor-pointer transition-colors"
                        title="Cerrar control de auto-scroll"
                    >
                        <AppIcon name="xmark" className="text-xs" />
                    </button>
                </div>
            )}

            {/* =========================================================================
                6. FLOATING MODO ATRIL EXIT BUTTON
               ========================================================================= */}
            {isFocusMode && (
                <div className="fixed top-4 right-4 z-50 flex items-center gap-2 no-print">
                    <button
                        type="button"
                        onClick={toggleFocusMode}
                        className="px-4 py-2 bg-bg-secondary/90 hover:bg-bg-secondary border border-white/15 rounded-full text-xs font-medium text-white shadow-2xl flex items-center gap-2 backdrop-blur-md transition-all cursor-pointer"
                    >
                        <AppIcon name="compress" className="text-accent-main" />
                        <span>Salir del modo atril</span>
                    </button>
                </div>
            )}
        </>
    );
};
