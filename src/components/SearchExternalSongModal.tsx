import React, { useState, useEffect, useRef } from 'react';
import { searchExternalSongs, importExternalSong, type ExternalSongSearchResult, type ExternalSongData } from '../services/externalSongs';
import { showSuccessToast, showError, showLoginPrompt } from '../utils/alerts';
import ExternalSongPreviewModal from './ExternalSongPreviewModal';
import type { Category } from '../types/category';
import AppIcon from './Ui/AppIcon';

interface SearchExternalSongModalProps {
    isOpen?: boolean;
    onClose?: () => void;
    apiUrl?: string;
    token?: string;
    user?: any;
    categories?: Category[];
    canCreate?: boolean;
}

export default function SearchExternalSongModal({
    isOpen: controlledIsOpen,
    onClose: controlledOnClose,
    apiUrl,
    token,
    user,
    categories = [],
    canCreate = true
}: SearchExternalSongModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;
    const isAdmin = user?.role === 'ADMIN';

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ExternalSongSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [importingItem, setImportingItem] = useState<string | null>(null);
    const [enrichWithAi, setEnrichWithAi] = useState(true);
    const [previewSong, setPreviewSong] = useState<ExternalSongSearchResult | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    // Escuchar evento global para abrir modal desde cualquier botón
    useEffect(() => {
        const handleOpen = (e?: any) => {
            const initialQuery = e?.detail?.query || '';
            if (initialQuery) {
                setQuery(initialQuery);
            }
            setInternalOpen(true);
        };
        const handleClose = () => {
            setInternalOpen(false);
            if (controlledOnClose) controlledOnClose();
        };

        window.addEventListener('open-external-search-modal' as any, handleOpen);
        window.addEventListener('close-external-search-modal' as any, handleClose);

        return () => {
            window.removeEventListener('open-external-search-modal' as any, handleOpen);
            window.removeEventListener('close-external-search-modal' as any, handleClose);
        };
    }, [controlledOnClose]);

    // Focus automático al abrir
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 60);
            return () => clearTimeout(timer);
        } else {
            setImportingItem(null);
            setPreviewSong(null);
        }
    }, [isOpen]);

    // Cerrar con Escape (si el preview está abierto, solo cerramos el preview)
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (previewSong) return;
                closeModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, previewSong]);

    // Búsqueda con debounce de 350ms
    useEffect(() => {
        const trimmed = query.trim();
        if (!isOpen || !trimmed || trimmed.length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const timer = setTimeout(async () => {
            const res = await searchExternalSongs(trimmed, apiUrl);
            if (res.success && res.data) {
                setResults(res.data);
            } else {
                setResults([]);
            }
            setLoading(false);
        }, 350);

        return () => clearTimeout(timer);
    }, [query, isOpen, apiUrl]);

    const closeModal = () => {
        setInternalOpen(false);
        setPreviewSong(null);
        if (controlledOnClose) {
            controlledOnClose();
        }
    };

    const filteredResults = results;

    // Aplica los datos estructurados directamente al formulario de la página
    const applySongToForm = (data: ExternalSongData) => {
        // 1. Título
        const titleInput = document.getElementById('title') as HTMLInputElement | null;
        if (titleInput && data.title) {
            titleInput.value = data.title;
        }

        // 2. Artista / Autor
        if (data.artist) {
            window.dispatchEvent(new CustomEvent('set-author', {
                detail: { name: data.artist }
            }));
        }

        // 3. Tono (Key)
        if (data.key) {
            const keySelect = document.getElementById('key') as HTMLSelectElement | null;
            if (keySelect) {
                keySelect.value = data.key;
                window.dispatchEvent(new CustomEvent('song-key-change', {
                    detail: { key: data.key }
                }));
            }
        }

        // 4. Video de YouTube
        if (data.youtubeUrl) {
            const urlInput = document.getElementById('url_song') as HTMLInputElement | null;
            if (urlInput) {
                urlInput.value = data.youtubeUrl;
            }
        }

        // 5. Categorías
        if (data.categories && data.categories.length > 0) {
            window.dispatchEvent(new CustomEvent('set-categories', {
                detail: { names: data.categories }
            }));
        }

        // 6. Contenido del editor (ChordPro)
        const chordContent = data.chordPro || (data as any).content;
        if (chordContent) {
            window.dispatchEvent(new CustomEvent('update-editor-content', {
                detail: { content: chordContent, key: data.key }
            }));
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('update-editor-content', {
                    detail: { content: chordContent, key: data.key }
                }));
            }, 100);
        }

        showSuccessToast(
            '¡Canción cargada en formulario!',
            `${data.title} - ${data.artist || 'Desconocido'} (Tono: ${data.key || 'C'})`
        );

        closeModal();
    };

    const handleRequestPreview = (song: ExternalSongSearchResult) => {
        if (!token && !user) {
            showLoginPrompt('previsualizar canciones de internet');
            return;
        }
        setPreviewSong(song);
    };

    const handleImportSong = async (song: ExternalSongSearchResult) => {
        if (!token && !user) {
            showLoginPrompt('importar canciones');
            return;
        }

        const itemKey = song.source === 'recursos_catolicos' ? `rc_${song.id}` : `lc_${song.artistSlug}_${song.songSlug}`;
        setImportingItem(itemKey);

        try {
            const res = await importExternalSong({
                source: song.source,
                id: song.id,
                artistSlug: song.artistSlug,
                songSlug: song.songSlug,
                title: song.title,
                artist: song.artist,
                enrichWithAi
            }, apiUrl, token);

            if (!res.success || !res.data) {
                if (res.error?.includes('iniciar sesión') || res.error?.includes('Authentication')) {
                    showLoginPrompt('importar canciones');
                    return;
                }
                throw new Error(res.error || 'No se pudo importar la canción');
            }

            applySongToForm(res.data);
        } catch (err: any) {
            console.error('Error importing external song:', err);
            showError('Error al importar', err.message || 'No se pudo descargar la canción');
        } finally {
            setImportingItem(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            {/* Modal Card */}
            <div
                className="w-full max-w-2xl bg-bg-secondary border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-3.5 sm:p-5 border-b border-white/10 bg-bg-secondary shrink-0 gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                            <h2 className="text-base sm:text-xl font-bold text-white tracking-tight">
                                Autocompletar Canción
                            </h2>
                            <span className="inline-flex items-center text-[10px] sm:text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-accent-main/15 text-accent-main border border-accent-main/30 whitespace-nowrap">
                                Internet
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">
                            Busca por nombre o autor para importar acordes, video y categorías automáticamente desde internet.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={closeModal}
                        className="p-1.5 sm:p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0 -mr-1 -mt-0.5 sm:mr-0 sm:mt-0"
                        title="Cerrar (Esc)"
                        aria-label="Cerrar modal"
                    >
                        <AppIcon name="xmark" className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Bar & Filters */}
                <div className="p-3.5 sm:p-5 border-b border-white/5 space-y-3 bg-bg-main/40 shrink-0">
                    <div className="relative flex items-center">
                        <AppIcon
                            name="magnifying-glass"
                            className="absolute left-3.5 h-4.5 w-4.5 text-text-secondary pointer-events-none"
                        />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ej. Pescador de hombres, Cara a cara, Santo, Glenda..."
                            className="w-full bg-bg-main border border-white/10 focus:border-accent-main focus:ring-1 focus:ring-accent-main rounded-xl py-2.5 pl-10 pr-10 text-white placeholder-text-secondary text-sm outline-none transition-colors"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                className="absolute right-3 p-1 text-text-secondary hover:text-white rounded-md text-xs cursor-pointer"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Info bar & AI Checkbox */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0.5 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium border border-white/10 bg-bg-secondary text-text-secondary text-xs">
                                <AppIcon name="globe" className="w-3.5 h-3.5 text-accent-main" />
                                <span>Resultados de internet</span>
                                <span className="font-mono text-[11px] text-white bg-white/10 px-1.5 py-0.2 rounded-full">
                                    {results.length}
                                </span>
                            </span>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer text-text-secondary hover:text-white select-none shrink-0 self-start sm:self-auto py-0.5">
                            <input
                                type="checkbox"
                                checked={enrichWithAi}
                                onChange={(e) => setEnrichWithAi(e.target.checked)}
                                className="w-3.5 h-3.5 accent-accent-main rounded cursor-pointer"
                            />
                            <span className="text-xs">Armonizar y estructurar con IA</span>
                        </label>
                    </div>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 min-h-[260px] max-h-[480px]">
                    {loading ? (
                        <div className="space-y-2 py-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="p-3.5 rounded-xl bg-bg-main border border-white/5 animate-pulse flex items-center justify-between">
                                    <div className="space-y-2 flex-1">
                                        <div className="h-4 bg-white/10 rounded w-1/3"></div>
                                        <div className="h-3 bg-white/5 rounded w-1/4"></div>
                                    </div>
                                    <div className="h-6 w-20 bg-white/5 rounded-full"></div>
                                </div>
                            ))}
                        </div>
                    ) : filteredResults.length > 0 ? (
                        <div className="space-y-2">
                            {filteredResults.map((song, idx) => {
                                const itemKey = song.source === 'recursos_catolicos' ? `rc_${song.id}` : `lc_${song.artistSlug}_${song.songSlug}`;
                                const isImporting = importingItem === itemKey;

                                return (
                                    <div
                                        key={`${itemKey}_${idx}`}
                                        onClick={() => !importingItem && handleRequestPreview(song)}
                                        className={`group flex items-center justify-between p-2.5 sm:p-3.5 rounded-xl bg-bg-main/60 border border-white/5 hover:border-accent-main/50 hover:bg-white/5 transition-all cursor-pointer ${
                                            isImporting ? 'opacity-80 pointer-events-none ring-1 ring-accent-main' : ''
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0 pr-2 sm:pr-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <h3 className="text-sm sm:text-base font-semibold text-text-main group-hover:text-accent-main transition-colors truncate">
                                                    {song.title}
                                                </h3>
                                                {isAdmin && (
                                                    <span
                                                        className={`w-2 h-2 rounded-full shrink-0 ${
                                                            song.source === 'lacuerda' ? 'bg-amber-400' : 'bg-sky-400'
                                                        }`}
                                                        title={song.source === 'lacuerda' ? 'LaCuerda.net' : 'Recursos Católicos'}
                                                    />
                                                )}
                                            </div>
                                            <p className="text-xs text-text-secondary truncate mt-0.5">
                                                {song.artist && song.artist !== 'Desconocido' ? (
                                                    <span>Por <strong className="text-zinc-300 font-medium">{song.artist}</strong></span>
                                                ) : (
                                                    <span>Autor por verificar</span>
                                                )}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRequestPreview(song);
                                                }}
                                                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/10 transition-colors cursor-pointer"
                                            >
                                                Vista previa
                                            </button>

                                            {isImporting ? (
                                                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-accent-main/20 text-accent-main text-xs font-semibold">
                                                    <AppIcon name="spinner" spin className="h-3.5 w-3.5" />
                                                    <span className="hidden xs:inline">Importando...</span>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleImportSong(song);
                                                    }}
                                                    className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold bg-accent-main hover:bg-accent-main/90 text-white transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shadow-sm"
                                                >
                                                    <span>Seleccionar</span>
                                                    <span>→</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : query.trim().length >= 2 ? (
                        <div className="text-center py-12 px-4">
                            <p className="text-text-main font-semibold text-base mb-1">
                                No se encontraron resultados
                            </p>
                            <p className="text-text-secondary text-xs max-w-sm mx-auto">
                                Intenta buscando solo el nombre principal o una palabra clave (ej. "Pescador", "Cara a cara", "Cordero").
                            </p>
                        </div>
                    ) : (
                        <div className="text-center py-10 px-4">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-accent-main">
                                <AppIcon name="music" className="w-6 h-6" />
                            </div>
                            <h3 className="text-sm font-semibold text-white mb-1">
                                Explora canciones y acordes en internet
                            </h3>
                            <p className="text-xs text-text-secondary max-w-md mx-auto mb-4">
                                Escribe al menos 2 letras para buscar acordes, tonos y canciones disponibles en la web listos para importar.
                            </p>
                            <div className="flex flex-wrap justify-center gap-1.5 max-w-md mx-auto">
                                {['Pescador de hombres', 'Cara a cara', 'Alabado sea el Santísimo', 'Cántico de María', 'Santo'].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => setQuery(suggestion)}
                                        className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/5 transition-colors cursor-pointer"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 sm:p-4 border-t border-white/10 bg-bg-secondary flex items-center justify-between text-xs text-text-secondary shrink-0">
                    <span className="hidden sm:inline">
                        Presiona <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded font-mono text-[10px]">Esc</kbd> para salir
                    </span>
                    <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium border border-white/10 transition-colors ml-auto cursor-pointer"
                    >
                        Cerrar
                    </button>
                </div>
            </div>

            {/* Modal de Vista Previa de la Canción Externa */}
            <ExternalSongPreviewModal
                isOpen={!!previewSong}
                onClose={() => setPreviewSong(null)}
                song={previewSong}
                apiUrl={apiUrl}
                canCreate={canCreate}
                token={token}
                user={user}
                categories={categories}
                enrichWithAi={enrichWithAi}
                zIndexClass="z-[130]"
                onApplyToForm={(data) => {
                    applySongToForm(data);
                    setPreviewSong(null);
                }}
                onSongImported={(newSongId) => {
                    setPreviewSong(null);
                    closeModal();
                    window.location.href = `/songs/${newSongId}`;
                }}
            />
        </div>
    );
}
