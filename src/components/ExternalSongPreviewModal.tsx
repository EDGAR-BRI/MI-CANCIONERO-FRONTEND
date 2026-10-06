import React, { useState, useEffect } from 'react';
import type { ExternalSongSearchResult, ExternalSongData } from '../services/externalSongs';
import { importExternalSong } from '../services/externalSongs';
import { createSongDirect } from '../services/songs';
import type { Category } from '../types/category';
import SongLine from './SongLine';
import { sanitizeSongContent } from '../utils/songSanitizer';
import { showSuccessToast, showError, showLoading, showLoginPrompt } from '../utils/alerts';
import Swal from 'sweetalert2';
import AppIcon from './Ui/AppIcon';
import { useBodyScrollLock } from '@/utils/useBodyScrollLock';

interface ExternalSongPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    song: ExternalSongSearchResult | null;
    apiUrl?: string;
    canCreate?: boolean;
    token?: string;
    user?: any;
    categories?: Category[];
    enrichWithAi?: boolean;
    zIndexClass?: string;
    onSongImported?: (newSongId: number) => void;
    onApplyToForm?: (songData: ExternalSongData) => void;
}

export default function ExternalSongPreviewModal({
    isOpen,
    onClose,
    song,
    apiUrl,
    canCreate = false,
    token,
    user,
    categories = [],
    enrichWithAi = true,
    zIndexClass = 'z-[130]',
    onSongImported,
    onApplyToForm
}: ExternalSongPreviewModalProps) {
    useBodyScrollLock(isOpen);

    const [loading, setLoading] = useState(false);
    const [songData, setSongData] = useState<ExternalSongData | null>(null);
    const [showChords, setShowChords] = useState(true);
    const [saving, setSaving] = useState(false);
    const isAdmin = user?.role === 'ADMIN';

    // Cargar datos completos con IA al abrir modal para la canción seleccionada
    useEffect(() => {
        if (!isOpen || !song) {
            setSongData(null);
            return;
        }

        // Si no está autenticado, no consumir IA ni recursos del backend
        if (!token && !user) {
            onClose();
            showLoginPrompt('previsualizar canciones de internet');
            return;
        }

        let isMounted = true;
        setLoading(true);

        const fetchFullSong = async () => {
            try {
                const res = await importExternalSong({
                    source: song.source,
                    id: song.id,
                    artistSlug: song.artistSlug,
                    songSlug: song.songSlug,
                    title: song.title,
                    artist: song.artist,
                    enrichWithAi: enrichWithAi !== undefined ? enrichWithAi : true
                }, apiUrl, token);

                if (isMounted) {
                    if (res.success && res.data) {
                        setSongData(res.data);
                    } else {
                        if (res.error?.includes('iniciar sesión') || res.error?.includes('Authentication')) {
                            onClose();
                            showLoginPrompt('previsualizar canciones');
                            return;
                        }
                        showError('Error al cargar', res.error || 'No se pudo obtener la letra y acordes');
                        onClose();
                    }
                }
            } catch (err: any) {
                if (isMounted) {
                    showError('Error de conexión', err?.message || 'Fallo al comunicarse con el servidor');
                    onClose();
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchFullSong();

        return () => {
            isMounted = false;
        };
    }, [isOpen, song, apiUrl, enrichWithAi, token, user]);


    // Cerrar con tecla Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !song) return null;

    // Acción: Copiar cifrado al portapapeles
    const handleCopy = async () => {
        if (!songData?.chordPro) return;
        try {
            await navigator.clipboard.writeText(songData.chordPro);
            await showSuccessToast('Cifrado copiado', 'Letra y acordes copiados al portapapeles');
        } catch {
            showError('Error', 'No se pudo copiar al portapapeles');
        }
    };

    // Acción: Abrir en el editor de canciones (/songs/add) con prefill o aplicar al formulario actual
    const handleOpenInEditor = () => {
        if (!songData) return;
        if (onApplyToForm) {
            onApplyToForm(songData);
            onClose();
            return;
        }
        sessionStorage.setItem('prefill_external_song', JSON.stringify(songData));
        window.location.href = '/songs/add';
    };

    // Acción: Guardar directamente en la base de datos
    const handleDirectSave = async () => {
        if (!songData) return;
        setSaving(true);
        showLoading('Guardando en tu cancionero...');

        try {
            // Mapear nombres de categorías a IDs si existen en la BD
            let categoryIds: number[] = [];
            if (songData.categories && songData.categories.length > 0 && categories.length > 0) {
                const lowerCatNames = songData.categories.map(c => c.toLowerCase().trim());
                for (const cat of categories) {
                    const dbName = cat.name.toLowerCase().trim();
                    if (lowerCatNames.some(l => l.includes(dbName) || dbName.includes(l))) {
                        categoryIds.push(cat.id);
                    }
                }
            }
            if (categoryIds.length === 0 && categories.length > 0) {
                categoryIds = [categories[0].id];
            }

            const res = await createSongDirect({
                title: songData.title || song.title,
                authorName: songData.artist || song.artist || 'Desconocido',
                key: songData.key || 'C',
                url_song: songData.youtubeUrl || '',
                content: sanitizeSongContent(songData.chordPro || ''),
                categoryIds,
                active: true
            }, token);

            Swal.close();

            if (res.success && res.data) {
                await showSuccessToast('¡Canción guardada!', `«${res.data.title}» ya forma parte de tu cancionero`);
                if (onSongImported) {
                    onSongImported(res.data.id);
                } else {
                    window.location.href = `/songs/${res.data.id}`;
                }
            } else {
                showError('Error al guardar', res.error || 'No se pudo registrar la canción en la base de datos');
            }
        } catch (err: any) {
            Swal.close();
            showError('Error', err?.message || 'Error inesperado al guardar la canción');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            data-modal-open="true"
            role="dialog"
            aria-modal="true"
            className={`fixed inset-0 ${zIndexClass || 'z-[130]'} flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in overscroll-contain`}
            onClick={onClose}
            onTouchMove={(e) => {
                if (e.target === e.currentTarget) {
                    e.preventDefault();
                }
            }}
        >
            <div
                className="w-full max-w-3xl bg-bg-secondary border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] overflow-hidden my-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-4 sm:p-6 border-b border-white/10 bg-bg-secondary shrink-0">
                    <div className="min-w-0 flex-1 pr-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-white/5 text-zinc-300 border border-white/10 whitespace-nowrap flex items-center gap-1.5">
                                {isAdmin && song && (
                                    <span
                                        className={`w-2 h-2 rounded-full shrink-0 ${
                                            song.source === 'lacuerda' ? 'bg-amber-400' : 'bg-sky-400'
                                        }`}
                                        title={song.source === 'lacuerda' ? 'LaCuerda.net' : 'Recursos Católicos'}
                                    />
                                )}
                                <AppIcon name="globe" className="w-3 h-3 text-accent-main" />
                                {isAdmin && song ? (song.source === 'lacuerda' ? 'LaCuerda.net' : 'Recursos Católicos') : 'Internet'}
                            </span>

                            {songData?.key && (
                                <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-white/5 text-accent-main border border-white/10 font-bold">
                                    Tono: {songData.key}
                                </span>
                            )}

                            {enrichWithAi !== false && (
                                <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/5 text-zinc-400 border border-white/5 flex items-center gap-1">
                                    <AppIcon name="wand-magic-sparkles" className="w-3 h-3 text-accent-main" />
                                    Estructurada con IA
                                </span>
                            )}
                        </div>

                        <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
                            {songData?.title || song.title}
                        </h2>
                        <p className="text-sm text-text-secondary truncate mt-0.5">
                            Autor: <strong className="text-zinc-200 font-medium">{songData?.artist || song.artist || 'Desconocido'}</strong>
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                        title="Cerrar (Esc)"
                    >
                        <AppIcon name="xmark" className="w-5 h-5" />
                    </button>
                </div>

                {/* Sub-toolbar (Categories & Controls) */}
                <div className="px-4 sm:px-6 py-2.5 bg-bg-main/50 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
                    {/* Categorías sugeridas */}
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span className="text-text-secondary font-medium mr-1">Categorías:</span>
                        {songData?.categories && songData.categories.length > 0 ? (
                            songData.categories.map((cat, i) => (
                                <span
                                    key={i}
                                    className="px-2 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10"
                                >
                                    {cat}
                                </span>
                            ))
                        ) : (
                            <span className="text-zinc-500 italic">Pendiente de clasificar</span>
                        )}
                    </div>

                    {/* Controles: Ver Acordes & Video */}
                    <div className="flex items-center gap-3 ml-auto">
                        {songData?.youtubeUrl && (
                            <a
                                href={songData.youtubeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-red-400 hover:text-red-300 hover:underline transition-colors"
                            >
                                <AppIcon name="youtube" className="w-3.5 h-3.5" />
                                <span>Ver en YouTube</span>
                            </a>
                        )}

                        <button
                            type="button"
                            onClick={() => setShowChords(!showChords)}
                            className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                                showChords
                                    ? 'bg-accent-main/15 text-accent-main border-accent-main/30'
                                    : 'bg-white/5 text-text-secondary border-white/10 hover:text-white'
                            }`}
                        >
                            {showChords ? 'Acordes activos' : 'Solo letra'}
                        </button>
                    </div>
                </div>

                {/* Body (Lyrics with rendered chords) */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-[300px]">
                    {loading ? (
                        <div className="space-y-4 py-8">
                            <div className="flex items-center justify-center gap-3 text-accent-main">
                                <AppIcon name="spinner" spin className="h-6 w-6 text-accent-main" />
                                <span className="text-sm font-semibold text-white">
                                    Importando y armonizando acordes con IA...
                                </span>
                            </div>
                            <div className="space-y-3 max-w-lg mx-auto opacity-40">
                                <div className="h-4 bg-white/10 rounded w-full animate-pulse"></div>
                                <div className="h-4 bg-white/10 rounded w-4/5 animate-pulse"></div>
                                <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse"></div>
                                <div className="h-4 bg-white/10 rounded w-5/6 animate-pulse"></div>
                            </div>
                        </div>
                    ) : songData?.chordPro ? (
                        <div
                            className="bg-bg-main p-4 sm:p-6 rounded-xl border border-white/5 font-sans leading-relaxed text-text-main max-w-full overflow-x-auto"
                            style={{ '--song-font-size': '1.05rem' } as React.CSSProperties}
                        >
                            {sanitizeSongContent(songData.chordPro || '').split('\n').map((line, idx) => (
                                <SongLine key={idx} line={line} showChords={showChords} />
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-text-secondary">
                            <p>No se pudo visualizar la letra de la canción.</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-3 sm:p-5 border-t border-white/10 bg-bg-secondary flex flex-wrap items-center justify-between gap-2.5 shrink-0">
                    <button
                        type="button"
                        onClick={handleCopy}
                        disabled={loading || !songData}
                        className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                        <AppIcon name="copy" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">Copiar </span><span>Cifrado</span>
                    </button>

                    <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                            Cerrar
                        </button>

                        {canCreate ? (
                            <>
                                <button
                                    type="button"
                                    onClick={handleOpenInEditor}
                                    disabled={loading || !songData || saving}
                                    className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    <AppIcon name="pen-to-square" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent-main" />
                                    <span className="hidden sm:inline">Editar en Formulario</span>
                                    <span className="sm:hidden">Editar</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDirectSave}
                                    disabled={loading || !songData || saving}
                                    className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold bg-accent-main hover:bg-accent-main/90 text-white transition-colors flex items-center gap-1.5 sm:gap-2 shadow-md cursor-pointer disabled:opacity-50"
                                >
                                    <AppIcon name="check" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    <span className="hidden sm:inline">Guardar en Cancionero</span>
                                    <span className="sm:hidden">Guardar</span>
                                </button>
                            </>
                        ) : (
                            <a
                                href="/login"
                                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-accent-main border border-white/10 transition-colors"
                            >
                                Iniciar sesión
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
