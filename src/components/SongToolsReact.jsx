import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { downloadSongPdf } from '../services/songs';
import { transposeChord } from '../utils/music';
import { showLoading, showSuccessToast, showError } from '../utils/alerts';

export const SongToolsReact = ({
    id,
    initialKey = 'C',
    onTranspose,
    onToggleChords,
    onPrint,
    canEdit
}) => {
    const [currentKey, setCurrentKey] = useState(initialKey);
    const [showDownloadOptions, setShowDownloadOptions] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const downloadContainerRef = useRef(null);

    // Keep currentKey in sync with initialKey if it updates from props
    useEffect(() => {
        if (initialKey) setCurrentKey(initialKey);
    }, [initialKey]);

    // Wrapper handlers to support both Props (Container) and Events (Independent)
    const handleTranspose = (amount) => {
        if (onTranspose) {
            onTranspose(amount);
        } else {
            // Dispatch event for other components (SongView)
            if (typeof window !== 'undefined') {
                const event = new CustomEvent('song-transpose', { detail: { semitones: amount } });
                window.dispatchEvent(event);
            }
        }
    };

    // Listen to song-transpose events to keep currentKey accurate for PDF export
    useEffect(() => {
        const handleTransposeEvent = (e) => {
            if (e && e.detail && typeof e.detail.semitones === 'number') {
                setCurrentKey(prev => transposeChord(prev || 'C', e.detail.semitones));
            }
        };

        window.addEventListener('song-transpose', handleTransposeEvent);
        return () => window.removeEventListener('song-transpose', handleTransposeEvent);
    }, []);

    // Close download dropdown on click outside or escape key
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

    const handleToggleChords = () => {
        if (onToggleChords) {
            onToggleChords();
        } else {
            if (typeof window !== 'undefined') {
                const event = new CustomEvent('song-toggle-chords');
                window.dispatchEvent(event);
            }
        }
    };

    const handleDownload = async (withChords) => {
        setShowDownloadOptions(false);
        setIsDownloading(true);
        showLoading('Generando PDF...');

        try {
            const res = await downloadSongPdf(id, {
                withChords,
                tone: currentKey
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

    const [isExpanded, setIsExpanded] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const toggleTools = () => setIsExpanded(!isExpanded);

    // Dynamic classes based on state
    const asideClasses = `w-16 flex flex-col items-center py-4 gap-4 sticky top-16 h-[calc(100vh-4rem)] border-r border-white/5 md:flex no-print transition-all duration-300 ease-in-out overflow-visible z-40 bg-bg-main
        ${isMobile
            ? (isExpanded ? "w-16 border-r py-4" : "w-0 border-none p-0 min-w-0")
            : (isExpanded ? "w-56" : "w-16")
        }`;

    const btnToggleClasses = `p-2 text-text-secondary hover:text-accent-main transition-all duration-300 absolute top-4 z-50 rounded-full
        ${isMobile
            ? (isExpanded ? "right-1/2 translate-x-1/2 bg-bg-main" : "left-2 bg-bg-secondary shadow-lg")
            : "right-1/2 translate-x-1/2 bg-bg-main"
        }`;

    const iconClasses = `fa-solid fa-arrow-left transition-transform duration-300
        ${isMobile
            ? (isExpanded ? "" : "rotate-180")
            : (isExpanded ? "" : "rotate-180")
        }`;

    const labelClasses = `tool-label whitespace-nowrap overflow-hidden transition-all duration-300
        ${isMobile
            ? "hidden md:block opacity-0 w-0"
            : (isExpanded ? "block opacity-100 w-auto" : "hidden opacity-0 w-0")
        }`;

    return (
        <aside id="song-tools-aside" className={asideClasses}>
            <button
                id="btn-toggle-tools"
                className={btnToggleClasses}
                title="Ocultar herramientas"
                onClick={toggleTools}
            >
                <i className={iconClasses}></i>
            </button>

            <div className={`flex flex-col items-center gap-4 mt-12 w-full transition-opacity duration-300 overflow-visible ${(!isExpanded && isMobile) ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                <div className="flex flex-col gap-2 w-full px-2 items-center md:items-stretch">
                    <button
                        onClick={() => handleTranspose(1)}
                        className="flex items-center justify-center md:justify-start gap-3 p-2 text-text-secondary hover:text-accent-main transition font-bold rounded-lg hover:bg-white/5 w-full cursor-pointer"
                        title="Subir Tono"
                    >
                        <i className="fa-solid fa-plus w-5 h-5 flex items-center justify-center"></i>
                        <span className={labelClasses}>Subir Tono</span>
                    </button>

                    <span className="text-xs text-text-secondary md:hidden mb-1 font-mono">
                        {currentKey || 'Tono'}
                    </span>

                    <button
                        onClick={() => handleTranspose(-1)}
                        className="flex items-center justify-center md:justify-start gap-3 p-2 text-text-secondary hover:text-accent-main transition font-bold rounded-lg hover:bg-white/5 w-full cursor-pointer"
                        title="Bajar Tono"
                    >
                        <i className="fa-solid fa-minus w-5 h-5 flex items-center justify-center"></i>
                        <span className={labelClasses}>Bajar Tono</span>
                    </button>
                </div>

                <div className="h-px w-8 bg-white/10 my-1"></div>

                <button
                    onClick={handleToggleChords}
                    className="flex items-center justify-center md:justify-start gap-3 p-2 text-text-secondary hover:text-accent-main transition rounded-lg hover:bg-white/5 w-[calc(100%-1rem)] cursor-pointer"
                    title="Alternar Acordes"
                >
                    <i className="fa-solid fa-music w-5 h-5 flex items-center justify-center"></i>
                    <span className={labelClasses}>Acordes</span>
                </button>

                <div className="h-px w-8 bg-white/10 my-1"></div>

                {/* Botón Descargar con Menú Desplegable */}
                <div ref={downloadContainerRef} className="relative w-[calc(100%-1rem)]">
                    <button
                        type="button"
                        onClick={() => setShowDownloadOptions(prev => !prev)}
                        disabled={isDownloading}
                        className={`flex items-center justify-center md:justify-start gap-3 p-2 text-text-secondary hover:text-accent-main transition rounded-lg hover:bg-white/5 w-full cursor-pointer disabled:opacity-50 ${showDownloadOptions ? 'bg-white/10 text-accent-main' : ''}`}
                        title="Descargar PDF"
                    >
                        {isDownloading ? (
                            <i className="fa-solid fa-circle-notch fa-spin w-5 h-5 flex items-center justify-center text-accent-main"></i>
                        ) : (
                            <i className="fa-solid fa-download w-5 h-5 flex items-center justify-center"></i>
                        )}
                        <span className={labelClasses}>Descargar</span>
                    </button>

                    {/* Popover flotante a la derecha de la barra lateral */}
                    {showDownloadOptions && (
                        <div className="absolute left-full ml-3 top-0 bg-bg-secondary border border-white/10 rounded-xl shadow-2xl p-2 z-50 min-w-[200px] max-w-[calc(100vw-80px)] space-y-1">
                            <div className="px-2.5 py-1.5 border-b border-white/5 mb-1">
                                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                                    Descargar Canción
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleDownload(true)}
                                className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-text-main hover:bg-accent-main hover:text-white transition-colors cursor-pointer text-left group"
                            >
                                <div className="flex items-center gap-2.5">
                                    <i className="fa-solid fa-file-pdf text-accent-main group-hover:text-white text-sm"></i>
                                    <span>Con Acordes</span>
                                </div>
                                {currentKey && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white group-hover:bg-white/20">
                                        {currentKey}
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => handleDownload(false)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-text-main hover:bg-white/10 transition-colors cursor-pointer text-left"
                            >
                                <i className="fa-solid fa-file-lines text-text-secondary text-sm"></i>
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
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-left"
                            >
                                <i className="fa-solid fa-print text-sm"></i>
                                <span>Imprimir pantalla</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="h-px w-8 bg-white/10 my-1"></div>

                <button
                    onClick={async () => {
                        if (navigator.share) {
                            try {
                                await navigator.share({
                                    title: document.title,
                                    url: window.location.href
                                });
                            } catch (err) {
                                console.error('Error sharing:', err);
                            }
                        } else {
                            try {
                                await navigator.clipboard.writeText(window.location.href);
                                alert('Enlace copiado al portapapeles');
                            } catch (err) {
                                console.error('Failed to copy:', err);
                            }
                        }
                    }}
                    className="flex items-center justify-center md:justify-start gap-3 p-2 text-text-secondary hover:text-accent-main transition rounded-lg hover:bg-white/5 w-[calc(100%-1rem)] cursor-pointer"
                    title="Compartir"
                >
                    <i className="fa-solid fa-share-nodes w-5 h-5 flex items-center justify-center"></i>
                    <span className={labelClasses}>Compartir</span>
                </button>

                {canEdit && (
                    <a
                        href={`/songs/edit/${id}`}
                        className="flex items-center justify-center md:justify-start gap-3 p-2 text-text-secondary hover:text-accent-main transition rounded-lg hover:bg-white/5 w-[calc(100%-1rem)]"
                        title="Editar"
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-pencil"
                        >
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                        </svg>
                        <span className={labelClasses}>Editar</span>
                    </a>
                )}
            </div>
        </aside>
    );
};
