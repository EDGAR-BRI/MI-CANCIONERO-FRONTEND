import React, { useState, useEffect, useRef } from 'react';
import { showSuccessToast } from '../utils/alerts';
import { getChordsPreference, setChordsPreference } from '../utils/preferences';

const FONT_SIZES = [14, 16, 18, 20, 24, 28];
const SCROLL_SPEEDS = [
    { level: 1, label: '0.25x', pps: 8 },
    { level: 2, label: '0.5x', pps: 16 },
    { level: 3, label: '1.0x', pps: 32 },
    { level: 4, label: '1.5x', pps: 50 },
    { level: 5, label: '2.0x', pps: 72 },
    { level: 6, label: '2.5x', pps: 96 },
];

export default function MisaAutoScrollReact() {
    // Auto-scroll state
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

    // Chords state
    const [showChords, setShowChords] = useState(() => getChordsPreference(false));

    // Font size state
    const [fontSize, setFontSize] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('cancionero_font_size');
            if (saved) {
                const parsed = parseInt(saved, 10);
                if (FONT_SIZES.includes(parsed)) return parsed;
            }
        }
        return 18;
    });

    // Modo Atril (Focus Mode) state
    const [isFocusMode, setIsFocusMode] = useState(false);
    const wakeLockRef = useRef(null);

    // Minimized toolbar state (collapsed to bubble)
    const [isMinimized, setIsMinimized] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const animFrameRef = useRef(null);
    const lastScrollTimeRef = useRef(null);
    const scrollAccumulatorRef = useRef(0);
    const isAutoScrollingRef = useRef(isAutoScrolling);
    isAutoScrollingRef.current = isAutoScrolling;
    const scrollSpeedRef = useRef(scrollSpeed);
    scrollSpeedRef.current = scrollSpeed;

    // Handle font size change
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

    // Sync external font size events
    useEffect(() => {
        const handleFontSizeEvent = (e) => {
            if (e && e.detail && typeof e.detail.size === 'number') {
                setFontSize(e.detail.size);
            }
        };
        window.addEventListener('song-font-size', handleFontSizeEvent);
        return () => window.removeEventListener('song-font-size', handleFontSizeEvent);
    }, []);

    // Sync chords with external events
    useEffect(() => {
        const handleChordsChanged = (e) => {
            if (e && e.detail && typeof e.detail.show === 'boolean') {
                setShowChords(e.detail.show);
            }
        };
        window.addEventListener('song-chords-preference-changed', handleChordsChanged);
        window.addEventListener('song-toggle-chords', handleChordsChanged);
        return () => {
            window.removeEventListener('song-chords-preference-changed', handleChordsChanged);
            window.removeEventListener('song-toggle-chords', handleChordsChanged);
        };
    }, []);

    // Toggle chords and sync with top button & all songs
    const handleToggleChords = () => {
        const nextVal = !showChords;
        setShowChords(nextVal);
        setChordsPreference(nextVal);
        window.dispatchEvent(new CustomEvent('song-toggle-chords', { detail: { show: nextVal } }));

        // Sync static header button in misas/view/[id]
        if (typeof document !== 'undefined') {
            const toggleChordsBtn = document.getElementById('toggleChordsBtn');
            if (toggleChordsBtn) {
                const icon = toggleChordsBtn.querySelector('i');
                if (nextVal) {
                    toggleChordsBtn.classList.remove('bg-white/5', 'hover:bg-white/10', 'text-text-secondary', 'border-white/10');
                    toggleChordsBtn.classList.add('bg-accent-main', 'hover:bg-accent-main/90', 'text-white', 'border-transparent', 'shadow-md');
                    toggleChordsBtn.setAttribute('aria-pressed', 'true');
                    if (icon) {
                        icon.classList.remove('text-text-secondary', 'group-hover:text-white');
                        icon.classList.add('text-white');
                    }
                } else {
                    toggleChordsBtn.classList.remove('bg-accent-main', 'hover:bg-accent-main/90', 'border-transparent', 'shadow-md');
                    toggleChordsBtn.classList.add('bg-white/5', 'hover:bg-white/10', 'text-text-secondary', 'border-white/10');
                    toggleChordsBtn.setAttribute('aria-pressed', 'false');
                    if (icon) {
                        icon.classList.remove('text-white');
                        icon.classList.add('text-text-secondary', 'group-hover:text-white');
                    }
                }
            }
        }
    };

    // Modo Atril / Focus Mode toggle
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
                console.warn('WakeLock request failed:', e);
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
                    wakeLockRef.current = null;
                } catch (e) {
                    console.warn('WakeLock release failed:', e);
                }
            }
        }
    };

    // Fullscreen change listener
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
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, [isFocusMode]);

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

                // Asegurar que todos los momentos de la misa estén desplegados para poder leerla completa
                if (typeof document !== 'undefined') {
                    document.querySelectorAll('details.moment-details').forEach(d => {
                        if (!d.hasAttribute('open')) {
                            d.setAttribute('open', 'true');
                        }
                    });
                }

                if (typeof window !== 'undefined') {
                    const scrollHeight = Math.max(
                        document.documentElement.scrollHeight,
                        document.body.scrollHeight
                    );
                    const maxScroll = scrollHeight - window.innerHeight;
                    const currentScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
                    // Si ya está al final, reiniciar al inicio
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

    // Auto-scroll animation loop
    useEffect(() => {
        if (!isAutoScrolling) {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
                animFrameRef.current = null;
            }
            return;
        }

        const htmlElement = document.documentElement;
        const prevScrollBehavior = htmlElement.style.scrollBehavior;
        htmlElement.style.scrollBehavior = 'auto';

        scrollAccumulatorRef.current = 0;
        lastScrollTimeRef.current = performance.now();

        const scrollStep = (time) => {
            if (!isAutoScrollingRef.current) return;

            const rawDelta = (time - (lastScrollTimeRef.current || time)) / 1000;
            const delta = Math.min(Math.max(rawDelta, 0), 0.1);
            lastScrollTimeRef.current = time;

            const currentSpeedObj = SCROLL_SPEEDS.find(s => s.level === scrollSpeedRef.current) || SCROLL_SPEEDS[1];
            const pxToScroll = currentSpeedObj.pps * delta;

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

            const scrollHeight = Math.max(
                document.documentElement.scrollHeight,
                document.body.scrollHeight
            );
            const maxScroll = scrollHeight - window.innerHeight;
            const currentScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;

            if (maxScroll > 20 && currentScroll >= (maxScroll - 15)) {
                setIsAutoScrolling(false);
                showSuccessToast('Fin de la misa');
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

    // Determines if the compact menu should be in bubble form
    const isMenuInBubble = (isMinimized || showScrollWidget) && !isDrawerOpen;

    return (
        <>
            {/* 1. BOTÓN EN LA CABECERA DE LA MISA */}
            <button
                type="button"
                onClick={handleToggleAutoScroll}
                title={isAutoScrolling ? "Pausar auto-scroll" : "Iniciar auto-scroll"}
                className={`w-full sm:w-auto h-9 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 group focus:outline-none whitespace-nowrap border ${
                    isAutoScrolling
                        ? "bg-accent-main hover:bg-accent-main/90 text-white border-transparent shadow-md"
                        : showScrollWidget
                            ? "bg-accent-main/15 text-accent-main border-accent-main/30 hover:bg-accent-main/25"
                            : "bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border-white/10"
                }`}
            >
                <i className={`fa-solid ${isAutoScrolling ? 'fa-pause' : 'fa-angles-down'} text-[11px] ${isAutoScrolling ? 'text-white' : 'text-text-secondary group-hover:text-white'} transition-colors`}></i>
                <span>{isAutoScrolling ? "Pausar" : "Auto-scroll"}</span>
            </button>

            {/* Control de tamaño de letra en cabecera desktop */}
            <div className="hidden sm:flex items-center gap-1.5 h-9 px-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-text-secondary">
                <button
                    type="button"
                    onClick={() => handleFontSizeChange(-1)}
                    disabled={fontSize <= FONT_SIZES[0]}
                    className="w-6 h-6 rounded-lg hover:bg-white/10 hover:text-white text-text-secondary flex items-center justify-center font-bold disabled:opacity-30 cursor-pointer active:scale-95 transition-colors"
                    title="Disminuir tamaño de letra"
                >
                    <span className="text-[11px]">A-</span>
                </button>
                <span className="text-white font-bold px-1 select-none text-[11px]">
                    {fontSize}px
                </span>
                <button
                    type="button"
                    onClick={() => handleFontSizeChange(1)}
                    disabled={fontSize >= FONT_SIZES[FONT_SIZES.length - 1]}
                    className="w-6 h-6 rounded-lg hover:bg-white/10 hover:text-white text-text-secondary flex items-center justify-center font-bold disabled:opacity-30 cursor-pointer active:scale-95 transition-colors"
                    title="Aumentar tamaño de letra"
                >
                    <span className="text-[11px]">A+</span>
                </button>
            </div>

            {/* 2. BARRA FLOTANTE DE AJUSTES REDUCIDA (Visible en cualquier parte del scroll de la página) */}
            {!isFocusMode && (
                <div
                    className={`fixed bottom-20 left-1/2 -translate-x-1/2 md:bottom-8 md:left-1/2 md:-translate-x-1/2 z-40 bg-bg-secondary/95 backdrop-blur-md border border-white/10 rounded-full shadow-2xl px-2.5 py-1.5 flex items-center gap-1.5 max-w-[95vw] no-print transition-all duration-300 ease-fluid origin-bottom ${
                        !isMenuInBubble && !isDrawerOpen
                            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                            : "opacity-0 scale-75 translate-y-6 pointer-events-none"
                    }`}
                >
                    {/* Botón Acordes */}
                    <button
                        type="button"
                        onClick={handleToggleChords}
                        className={`h-8 px-2.5 sm:px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 ${
                            showChords
                                ? "bg-accent-main text-white shadow-sm"
                                : "bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white"
                        }`}
                        title={showChords ? "Ocultar acordes" : "Mostrar acordes"}
                    >
                        <i className="fa-solid fa-music text-[11px]"></i>
                        <span className="hidden xs:inline sm:inline">Acordes</span>
                    </button>

                    {/* Control Tamaño de Letra */}
                    <div className="flex items-center gap-1 bg-white/5 rounded-full px-1.5 py-0.5 border border-white/5">
                        <button
                            type="button"
                            onClick={() => handleFontSizeChange(-1)}
                            disabled={fontSize <= FONT_SIZES[0]}
                            className="w-6 h-6 rounded-full hover:bg-white/10 text-white flex items-center justify-center font-mono font-bold text-[10px] disabled:opacity-30 cursor-pointer active:scale-95 transition-transform"
                            title="Disminuir tamaño de letra"
                        >
                            A-
                        </button>
                        <span className="text-[11px] font-mono text-white font-bold px-0.5 select-none">
                            {fontSize}px
                        </span>
                        <button
                            type="button"
                            onClick={() => handleFontSizeChange(1)}
                            disabled={fontSize >= FONT_SIZES[FONT_SIZES.length - 1]}
                            className="w-6 h-6 rounded-full hover:bg-white/10 text-white flex items-center justify-center font-mono font-bold text-[10px] disabled:opacity-30 cursor-pointer active:scale-95 transition-transform"
                            title="Aumentar tamaño de letra"
                        >
                            A+
                        </button>
                    </div>

                    {/* Botón Auto-scroll */}
                    <button
                        type="button"
                        onClick={handleToggleAutoScroll}
                        className={`h-8 px-2.5 sm:px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 ${
                            isAutoScrolling
                                ? "bg-accent-main text-white shadow-sm"
                                : "bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white"
                        }`}
                        title={isAutoScrolling ? "Pausar scroll" : "Iniciar auto-scroll"}
                    >
                        <i className={`fa-solid ${isAutoScrolling ? 'fa-pause' : 'fa-angles-down'} text-[11px]`}></i>
                        <span className="hidden xs:inline sm:inline">Scroll</span>
                    </button>

                    {/* Botón Modo Atril */}
                    <button
                        type="button"
                        onClick={toggleFocusMode}
                        className={`h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 ${
                            isFocusMode
                                ? "bg-accent-main text-white shadow-sm"
                                : "bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white"
                        }`}
                        title="Modo atril (pantalla completa)"
                    >
                        <i className="fa-solid fa-expand text-[11px]"></i>
                        <span>Atril</span>
                    </button>

                    <div className="h-4 w-px bg-white/10 mx-0.5"></div>

                    {/* Botón Minimizar a burbuja flotante */}
                    <button
                        type="button"
                        onClick={() => setIsMinimized(true)}
                        className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                        title="Minimizar a botón flotante"
                    >
                        <i className="fa-solid fa-down-left-and-up-right-to-center text-[10px]"></i>
                    </button>
                </div>
            )}

            {/* 3. BURBUJA FLOTANTE (BOLITA) A LA DERECHA (Cuando está minimizado o cuando auto-scroll está activo) */}
            {!isFocusMode && (
                <div
                    className={`fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 no-print transition-all duration-300 ease-spring origin-center ${
                        isMenuInBubble
                            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                            : "opacity-0 scale-40 translate-y-6 pointer-events-none"
                    }`}
                >
                    <button
                        type="button"
                        onClick={() => {
                            if (showScrollWidget) {
                                setIsDrawerOpen(true);
                            } else {
                                setIsMinimized(false);
                            }
                        }}
                        className="w-13 h-13 rounded-full bg-accent-main hover:bg-accent-main/90 text-white shadow-xl flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 relative border border-white/20 group"
                        title="Ajustes de la misa (Acordes, Atril, Scroll)"
                        aria-label="Ajustes de la misa"
                    >
                        <i className="fa-solid fa-sliders text-lg transition-transform duration-300 group-hover:rotate-45"></i>
                    </button>
                </div>
            )}

            {/* 4. MODAL / DRAWER RÁPIDO AL TOCAR LA BURBUJA DURANTE EL SCROLL */}
            {isDrawerOpen && (
                <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/60 backdrop-blur-sm no-print animate-in fade-in duration-200">
                    <div
                        className="fixed inset-0"
                        onClick={() => setIsDrawerOpen(false)}
                    ></div>
                    <div className="relative bg-bg-secondary border-t border-white/10 rounded-t-2xl p-4 pb-12 space-y-3 z-10 max-w-md mx-auto w-full shadow-2xl">
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <span className="text-sm font-bold text-white flex items-center gap-2">
                                <i className="fa-solid fa-sliders text-accent-main"></i>
                                <span>Ajustes de Misa</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsDrawerOpen(false)}
                                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white flex items-center justify-center cursor-pointer"
                            >
                                <i className="fa-solid fa-xmark text-xs"></i>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                            {/* Toggle Acordes */}
                            <button
                                type="button"
                                onClick={handleToggleChords}
                                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                                    showChords
                                        ? "bg-accent-main text-white"
                                        : "bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white"
                                }`}
                            >
                                <i className="fa-solid fa-music"></i>
                                <span>{showChords ? "Ocultar Acordes" : "Mostrar Acordes"}</span>
                            </button>

                            {/* Toggle Modo Atril */}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsDrawerOpen(false);
                                    toggleFocusMode();
                                }}
                                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                                    isFocusMode
                                        ? "bg-accent-main text-white"
                                        : "bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white"
                                }`}
                            >
                                <i className="fa-solid fa-expand"></i>
                                <span>Modo Atril</span>
                            </button>
                        </div>

                        {/* Control de Tamaño de Letra en el Drawer */}
                        <div className="bg-bg-main/60 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <i className="fa-solid fa-font text-text-secondary text-xs"></i>
                                <span className="text-xs font-semibold text-text-main">Tamaño de Letra</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleFontSizeChange(-1)}
                                    disabled={fontSize <= FONT_SIZES[0]}
                                    className="w-8 h-8 rounded-lg bg-white/5 active:bg-white/10 text-white font-mono font-bold text-xs flex items-center justify-center disabled:opacity-30 cursor-pointer"
                                    title="Disminuir tamaño de letra"
                                >
                                    A-
                                </button>
                                <span className="text-xs font-mono text-white w-10 text-center font-bold">
                                    {fontSize}px
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleFontSizeChange(1)}
                                    disabled={fontSize >= FONT_SIZES[FONT_SIZES.length - 1]}
                                    className="w-8 h-8 rounded-lg bg-white/5 active:bg-white/10 text-white font-mono font-bold text-xs flex items-center justify-center disabled:opacity-30 cursor-pointer"
                                    title="Aumentar tamaño de letra"
                                >
                                    A+
                                </button>
                            </div>
                        </div>

                        {/* Selector de velocidad */}
                        <div className="bg-bg-main/60 p-2.5 rounded-xl border border-white/5 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-mono text-text-secondary">Velocidad de Scroll:</span>
                                <span className="font-bold text-accent-main font-mono">
                                    {SCROLL_SPEEDS.find(s => s.level === scrollSpeed)?.label}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-1 pt-1">
                                {SCROLL_SPEEDS.map(s => (
                                    <button
                                        key={s.level}
                                        type="button"
                                        onClick={() => handleSetScrollSpeed(s.level)}
                                        title={`Nivel ${s.level} (${s.label})`}
                                        className={`w-8 h-8 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                                            scrollSpeed === s.level
                                                ? "bg-accent-main text-white font-bold shadow-sm"
                                                : "text-text-secondary hover:text-white hover:bg-white/10"
                                        }`}
                                    >
                                        {s.level}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Restaurar barra completa */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsMinimized(false);
                                setIsDrawerOpen(false);
                            }}
                            className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white text-xs font-medium transition-colors"
                        >
                            Restaurar barra flotante
                        </button>
                    </div>
                </div>
            )}

            {/* 5. CONTROL FLOTANTE DE AUTO-SCROLL (Centrado en bottom-20 en móvil / bottom-8 en desktop) */}
            {showScrollWidget && !isDrawerOpen && (
                <div
                    className={`fixed ${
                        isFocusMode
                            ? "bottom-6 md:bottom-8"
                            : "bottom-20 md:bottom-8"
                    } left-1/2 -translate-x-1/2 z-[55] bg-bg-secondary/95 backdrop-blur-md border border-white/15 rounded-full px-3 py-2 shadow-2xl flex items-center gap-2.5 no-print transition-all duration-200 animate-in fade-in`}
                >
                    <button
                        type="button"
                        onClick={handleToggleAutoScroll}
                        className="w-8 h-8 rounded-full bg-accent-main text-white flex items-center justify-center hover:bg-accent-main/90 transition-colors shadow-md cursor-pointer active:scale-95"
                        title={isAutoScrolling ? "Pausar scroll" : "Reanudar scroll"}
                    >
                        <i className={`fa-solid ${isAutoScrolling ? 'fa-pause' : 'fa-play'} text-xs`}></i>
                    </button>

                    <div className="flex items-center gap-1.5 text-xs font-mono text-text-secondary">
                        <button
                            type="button"
                            onClick={() => handleSetScrollSpeed(s => Math.max(1, s - 1))}
                            disabled={scrollSpeed <= 1}
                            className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                            title="Disminuir velocidad"
                        >
                            <i className="fa-solid fa-minus text-[10px]"></i>
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
                            <i className="fa-solid fa-plus text-[10px]"></i>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleCloseAutoScroll}
                        className="w-7 h-7 rounded-full hover:bg-white/10 text-text-secondary hover:text-white flex items-center justify-center ml-1 cursor-pointer transition-colors"
                        title="Cerrar control de auto-scroll"
                    >
                        <i className="fa-solid fa-xmark text-xs"></i>
                    </button>
                </div>
            )}

            {/* 6. BOTÓN FLOTANTE PARA SALIR DEL MODO ATRIL */}
            {isFocusMode && (
                <div className="fixed top-4 right-4 z-50 flex items-center gap-2 no-print animate-in fade-in duration-200">
                    <button
                        type="button"
                        onClick={toggleFocusMode}
                        className="px-4 py-2 bg-bg-secondary/90 hover:bg-bg-secondary border border-white/15 rounded-full text-xs font-medium text-white shadow-2xl flex items-center gap-2 backdrop-blur-md transition-all cursor-pointer"
                    >
                        <i className="fa-solid fa-compress text-accent-main"></i>
                        <span>Salir del modo atril</span>
                    </button>
                </div>
            )}
        </>
    );
}
