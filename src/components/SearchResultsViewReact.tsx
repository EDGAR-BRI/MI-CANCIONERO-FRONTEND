import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Blobatar } from '@blobatar/react';
import { scared } from 'blobatar/expression';
import 'blobatar/motion.css';
import type { Song } from '../types/song';
import type { Category } from '../types/category';
import { searchExternalSongs, importExternalSong, type ExternalSongSearchResult } from '../services/externalSongs';
import { createSongDirect } from '../services/songs';
import SongCardReact from './SongCardReact';
import ExternalSongPreviewModal from './ExternalSongPreviewModal';
import { showSuccessToast, showError, showLoading, showLoginPrompt } from '../utils/alerts';
import Swal from 'sweetalert2';

interface SearchResultsViewProps {
    initialQuery?: string;
    initialCategoryId?: number | string | null;
    initialTab?: 'local' | 'external';
    categories?: Category[];
    token?: string;
    user?: any;
    canCreate?: boolean;
    isMusician?: boolean;
    apiUrl: string;
}

export default function SearchResultsViewReact({
    initialQuery = '',
    initialCategoryId = null,
    initialTab = 'local',
    categories = [],
    token,
    user,
    canCreate = false,
    isMusician: isMusicianProp,
    apiUrl
}: SearchResultsViewProps) {
    const isUserMusician = isMusicianProp !== undefined
        ? isMusicianProp
        : Boolean(canCreate || user?.role === 'MUSICO' || user?.role === 'ADMIN');
    const isAdmin = user?.role === 'ADMIN';

    const cleanInitial = initialQuery === 'all' ? '' : initialQuery;
    const [query, setQuery] = useState(cleanInitial);
    const [searchInput, setSearchInput] = useState(cleanInitial);
    const [activeTab, setActiveTab] = useState<'local' | 'external'>(isUserMusician ? initialTab : 'local');
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | string | null>(initialCategoryId);

    // Estado de canciones locales
    const [localSongs, setLocalSongs] = useState<Song[]>([]);
    const [loadingLocal, setLoadingLocal] = useState(true);
    const [localError, setLocalError] = useState<string | null>(null);

    // Estado de canciones externas (Internet)
    const [externalResults, setExternalResults] = useState<ExternalSongSearchResult[]>([]);
    const [loadingExternal, setLoadingExternal] = useState(false);
    const [enrichWithAi, setEnrichWithAi] = useState(true);

    // Modal de vista previa
    const [previewSong, setPreviewSong] = useState<ExternalSongSearchResult | null>(null);
    const [importingKey, setImportingKey] = useState<string | null>(null);

    // Buscar en el catálogo local
    useEffect(() => {
        let isMounted = true;
        setLoadingLocal(true);
        setLocalError(null);

        const fetchLocal = async () => {
            try {
                const params = new URLSearchParams();
                if (query.trim()) {
                    params.append('q', query.trim());
                }
                if (selectedCategoryId && selectedCategoryId !== 'all') {
                    params.append('categoryId', String(selectedCategoryId));
                }

                const url = `${apiUrl}/songs?${params.toString()}`;
                const res = await fetch(url, { credentials: 'include' });

                if (!res.ok) throw new Error('Error al consultar canciones');

                const data = await res.json();
                if (isMounted) {
                    setLocalSongs(Array.isArray(data) ? data : []);
                }
            } catch (err: any) {
                if (isMounted) {
                    setLocalError(err.message || 'Error al cargar canciones locales');
                }
            } finally {
                if (isMounted) setLoadingLocal(false);
            }
        };

        fetchLocal();

        return () => {
            isMounted = false;
        };
    }, [query, selectedCategoryId, apiUrl]);

    // Buscar automáticamente en fuentes externas solo si el usuario es músico
    useEffect(() => {
        if (!isUserMusician) {
            setExternalResults([]);
            setLoadingExternal(false);
            return;
        }

        const trimmed = query.trim();
        if (!trimmed || trimmed.length < 2) {
            setExternalResults([]);
            setLoadingExternal(false);
            return;
        }

        // Si estamos en tab external o si el local terminó y dio 0 resultados
        const shouldFetchExternal = activeTab === 'external' || (!loadingLocal && localSongs.length === 0);

        if (!shouldFetchExternal) return;

        let isMounted = true;
        setLoadingExternal(true);

        const fetchExternal = async () => {
            try {
                const res = await searchExternalSongs(trimmed, apiUrl);
                if (isMounted) {
                    if (res.success && res.data) {
                        setExternalResults(res.data);
                    } else {
                        setExternalResults([]);
                    }
                }
            } catch (err) {
                if (isMounted) setExternalResults([]);
            } finally {
                if (isMounted) setLoadingExternal(false);
            }
        };

        const timer = setTimeout(fetchExternal, 200);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [query, activeTab, loadingLocal, localSongs.length, isUserMusician, apiUrl]);

    // Enviar formulario de búsqueda
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = searchInput.trim();
        setQuery(trimmed);

        // Actualizar URL sin recargar para permitir compartir enlaces
        const newUrl = trimmed
            ? `/songs/search/${encodeURIComponent(trimmed)}${selectedCategoryId ? `?categoryId=${selectedCategoryId}` : ''}`
            : `/songs/search/all${selectedCategoryId ? `?categoryId=${selectedCategoryId}` : ''}`;
        window.history.replaceState({}, '', newUrl);
    };

    // Limpiar búsqueda
    const handleClearSearch = () => {
        setSearchInput('');
        setQuery('');
        window.history.replaceState({}, '', '/songs/search/all');
    };

    // Resultados externos unificados de internet
    const filteredExternalResults = externalResults;

    // Solicitar vista previa validando autenticación
    const handleRequestPreview = (item: ExternalSongSearchResult) => {
        if (!user) {
            showLoginPrompt('previsualizar canciones de internet con acordes y armonización con IA');
            return;
        }
        setPreviewSong(item);
    };

    // Importar canción directamente con IA
    const handleQuickImport = async (item: ExternalSongSearchResult) => {
        if (!user) {
            showLoginPrompt('importar canciones de internet a tu cancionero');
            return;
        }

        const key = item.source === 'recursos_catolicos' ? `rc_${item.id}` : `lc_${item.artistSlug}_${item.songSlug}`;
        setImportingKey(key);

        try {
            const res = await importExternalSong({
                source: item.source,
                id: item.id,
                artistSlug: item.artistSlug,
                songSlug: item.songSlug,
                title: item.title,
                artist: item.artist,
                enrichWithAi: true
            }, apiUrl, token);

            if (!res.success || !res.data) {
                if (res.error?.includes('iniciar sesión') || res.error?.includes('Authentication')) {
                    showLoginPrompt('importar canciones');
                    return;
                }
                throw new Error(res.error || 'No se pudo descargar la canción');
            }

            const data = res.data;

            // Si el usuario tiene permisos de creación, le ofrecemos guardar directamente o abrir en editor
            if (canCreate) {
                const choice = await Swal.fire({
                    background: "#1A1A1A",
                    color: "#F2F0E6",
                    title: `«${data.title}»`,
                    text: `Canción armonizada con éxito. ¿Deseas guardarla directamente en tu cancionero o abrir el editor para personalizarla?`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Guardar directamente',
                    cancelButtonText: 'Abrir en editor',
                    confirmButtonColor: '#FF5722',
                    cancelButtonColor: 'rgba(255, 255, 255, 0.15)',
                    customClass: {
                        popup: 'swal2-dark-popup'
                    }
                });

                if (choice.isConfirmed) {
                    showLoading('Registrando en tu cancionero...');

                    // Resolver categorías sugeridas
                    let categoryIds: number[] = [];
                    if (data.categories && data.categories.length > 0 && categories.length > 0) {
                        const lowerCatNames = data.categories.map(c => c.toLowerCase().trim());
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

                    const saveRes = await createSongDirect({
                        title: data.title || item.title,
                        authorName: data.artist || item.artist || 'Desconocido',
                        key: data.key || 'C',
                        url_song: data.youtubeUrl || '',
                        content: data.chordPro,
                        categoryIds,
                        active: true
                    }, token);

                    Swal.close();

                    if (saveRes.success && saveRes.data) {
                        await showSuccessToast('¡Guardada con éxito!', `«${saveRes.data.title}» agregada`);
                        window.location.href = `/songs/${saveRes.data.id}`;
                    } else {
                        showError('Error al guardar', saveRes.error || 'No se pudo guardar la canción');
                    }
                } else if (choice.dismiss === Swal.DismissReason.cancel) {
                    sessionStorage.setItem('prefill_external_song', JSON.stringify(data));
                    window.location.href = '/songs/add';
                }
            } else {
                // Usuario no autenticado o sin permiso: abrimos vista previa
                setPreviewSong(item);
            }
        } catch (err: any) {
            showError('Error al importar', err?.message || 'Fallo de conexión');
        } finally {
            setImportingKey(null);
        }
    };

    // Skeletons para carga local
    const SkeletonCard = () => (
        <div className="bg-bg-secondary border border-white/5 rounded-xl p-5 h-[130px] animate-pulse">
            <div className="h-6 bg-white/10 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-white/5 rounded w-1/2 mb-4"></div>
            <div className="flex gap-2">
                <div className="h-6 w-16 bg-white/5 rounded"></div>
                <div className="h-6 w-24 bg-white/5 rounded"></div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header Principal con Barra de Búsqueda Integrada */}
            <div className="bg-bg-secondary border border-white/5 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                            {query ? (
                                <span>
                                    Resultados para <span className="text-accent-main">«{query}»</span>
                                </span>
                            ) : (
                                <span>Explorar Cancionero</span>
                            )}
                        </h1>
                        <p className="text-xs sm:text-sm text-text-secondary mt-1">
                            {isUserMusician
                                ? 'Busca cantos litúrgicos en el cancionero o impórtalos al instante desde internet.'
                                : 'Busca cantos litúrgicos en el cancionero por título, autor o fragmento de letra.'}
                        </p>
                    </div>

                    {/* Botón rápido para agregar canción si tiene permiso */}
                    {canCreate && (
                        <a
                            href="/songs/add"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-main hover:bg-accent-main/90 text-white font-bold text-sm shadow-md transition-colors shrink-0"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Nueva Canción</span>
                        </a>
                    )}
                </div>

                {/* Input de Búsqueda en la Vista */}
                <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                    <div className="absolute left-3.5 flex items-center pointer-events-none text-accent-main">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Buscar por título, autor, fragmento de letra..."
                        className="w-full bg-bg-main border border-white/10 focus:border-accent-main focus:ring-1 focus:ring-accent-main rounded-xl py-3 pl-11 pr-24 text-white placeholder-text-secondary text-sm sm:text-base outline-none transition-all shadow-inner"
                    />

                    <div className="absolute right-2.5 flex items-center gap-1.5">
                        {searchInput && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 text-xs transition-colors cursor-pointer"
                                title="Limpiar búsqueda"
                            >
                                ✕
                            </button>
                        )}
                        <button
                            type="submit"
                            className="px-3.5 py-1.5 rounded-lg bg-accent-main hover:bg-accent-main/90 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer shadow-sm"
                        >
                            Buscar
                        </button>
                    </div>
                </form>

                {/* Selector de Pestañas (Tabs) - Solo visible para músicos */}
                {isUserMusician && (
                    <div className="flex items-stretch gap-2 pt-1 border-t border-white/5">
                        <button
                            type="button"
                            onClick={() => setActiveTab('local')}
                            className={`flex-1 sm:flex-initial h-10 sm:h-11 py-0 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 border box-border whitespace-nowrap leading-none ${
                                activeTab === 'local'
                                    ? 'bg-accent-main text-white border-accent-main'
                                    : 'bg-bg-main text-text-secondary hover:text-white hover:bg-white/5 border-white/10'
                            }`}
                        >
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span className="hidden sm:inline leading-none">En tu Cancionero</span>
                            <span className="sm:hidden truncate leading-none">Cancionero</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-mono leading-none shrink-0 ${
                                activeTab === 'local' ? 'bg-white/20 text-white' : 'bg-white/5 text-text-secondary'
                            }`}>
                                {loadingLocal ? '...' : localSongs.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('external')}
                            className={`flex-1 sm:flex-initial h-10 sm:h-11 py-0 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 border box-border whitespace-nowrap leading-none ${
                                activeTab === 'external'
                                    ? 'bg-accent-main text-white border-accent-main'
                                    : 'bg-bg-main text-text-secondary hover:text-white hover:bg-white/5 border-white/10'
                            }`}
                        >
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                            <span className="hidden sm:inline leading-none">Buscar en internet</span>
                            <span className="sm:hidden truncate leading-none">En internet</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-mono leading-none shrink-0 ${
                                activeTab === 'external' ? 'bg-white/20 text-white' : 'bg-white/5 text-text-secondary'
                            }`}>
                                {loadingExternal ? '...' : externalResults.length}
                            </span>
                        </button>
                    </div>
                )}
            </div>

            {/* VISTA 1: EN TU CANCIONERO LOCAL */}
            {activeTab === 'local' && (
                <div className="space-y-4">
                    {/* Filtro de Categorías */}
                    {categories.length > 0 && (
                        <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0">
                            <button
                                type="button"
                                onClick={() => setSelectedCategoryId(null)}
                                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 border cursor-pointer ${
                                    !selectedCategoryId
                                        ? 'bg-accent-main text-white border-transparent shadow-md'
                                        : 'bg-bg-secondary text-text-secondary hover:text-white hover:bg-white/10 border-white/5 hover:border-accent-main/30'
                                }`}
                            >
                                <span>Todas las categorías</span>
                            </button>

                            {categories.map((cat) => {
                                const isSelected = String(selectedCategoryId) === String(cat.id);
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                                        className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 border cursor-pointer ${
                                            isSelected
                                                ? 'bg-accent-main text-white border-transparent shadow-md'
                                                : 'bg-bg-secondary text-text-secondary hover:text-white hover:bg-white/10 border-white/5 hover:border-accent-main/30'
                                        }`}
                                    >
                                        <span>{cat.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Grid de Canciones Locales */}
                    {localError ? (
                        <div className="p-6 rounded-xl bg-red-950/20 border border-red-500/20 text-center text-red-300">
                            {localError}
                        </div>
                    ) : loadingLocal ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <SkeletonCard key={i} />
                            ))}
                        </div>
                    ) : localSongs.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {localSongs.map((song) => (
                                <SongCardReact key={song.id} song={song} />
                            ))}
                        </div>
                    ) : (
                        /* ESTADO VACÍO CON SUGERENCIAS EXTERNAS INTELIGENTES */
                        <div className="space-y-6">
                            <div className="bg-bg-secondary border border-white/5 rounded-2xl p-6 sm:p-8 text-center max-w-2xl mx-auto space-y-4">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto flex items-center justify-center transition-transform duration-300 hover:scale-105">
                                    <Blobatar
                                        name="alain00"
                                        traits={{ shape: 0.11 }}
                                        expression={scared}
                                        animate="always"
                                        style={{ '--mo-head': '#f26a38' } as React.CSSProperties}
                                        className="w-full h-full scale-125 object-contain drop-shadow-md select-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <h3 className="text-lg sm:text-xl font-bold text-white">
                                        {query ? 'No se encontraron canciones' : 'Sin canciones en esta categoría'}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto">
                                        {query ? (
                                            isUserMusician ? (
                                                <span>No encontramos canciones que coincidan con <strong className="text-white">«{query}»</strong> en el cancionero. Puedes buscar en internet para agregarla.</span>
                                            ) : (
                                                <span>No encontramos canciones que coincidan con <strong className="text-white">«{query}»</strong>. Intenta buscar por otro título, autor o parte de la letra.</span>
                                            )
                                        ) : (
                                            <span>No hay canciones registradas en esta categoría por el momento.</span>
                                        )}
                                    </p>
                                </div>

                                {query && (
                                    <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                                        {isUserMusician && (
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('external')}
                                                className="px-5 py-2.5 rounded-xl bg-accent-main hover:bg-accent-main/90 text-white font-bold text-sm shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                                </svg>
                                                <span>Buscar en internet</span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleClearSearch}
                                            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-sm font-medium transition-colors cursor-pointer"
                                        >
                                            Ver todas las canciones
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Mostrar resultados externos directamente como sugerencia (solo músicos) */}
                            {isUserMusician && query && externalResults.length > 0 && (
                                <div className="space-y-3 pt-2">
                                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                                                Sugerencias de internet
                                            </h2>
                                            <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-accent-main/15 text-accent-main border border-accent-main/30 whitespace-nowrap shrink-0">
                                                {externalResults.length} <span className="hidden sm:inline">{externalResults.length === 1 ? 'encontrada' : 'encontradas'}</span>
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('external')}
                                            className="text-xs text-accent-main hover:text-white font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ml-auto sm:ml-0"
                                        >
                                            <span className="hidden sm:inline">Ver pestaña completa</span>
                                            <span className="sm:hidden">Ver todas</span>
                                            <span>→</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {externalResults.slice(0, 6).map((item, idx) => {
                                            const itemKey = item.source === 'recursos_catolicos' ? `rc_${item.id}` : `lc_${item.artistSlug}_${item.songSlug}`;
                                            const isImporting = importingKey === itemKey;

                                            return (
                                                <div
                                                    key={`${itemKey}_${idx}`}
                                                    onClick={() => handleRequestPreview(item)}
                                                    className="bg-bg-secondary border border-white/5 rounded-xl p-3 sm:p-4 hover:border-accent-main/50 transition-colors flex items-center justify-between gap-2.5 sm:gap-3 group cursor-pointer"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-accent-main transition-colors truncate">
                                                                {item.title}
                                                            </h3>
                                                            {isAdmin && (
                                                                <span
                                                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                                                        item.source === 'lacuerda' ? 'bg-amber-400' : 'bg-sky-400'
                                                                    }`}
                                                                    title={item.source === 'lacuerda' ? 'LaCuerda.net' : 'Recursos Católicos'}
                                                                />
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-text-secondary truncate mt-0.5">
                                                            {item.artist || 'Autor desconocido'}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRequestPreview(item);
                                                            }}
                                                            className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/10 transition-colors cursor-pointer whitespace-nowrap"
                                                        >
                                                            Vista previa
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleQuickImport(item);
                                                            }}
                                                            disabled={isImporting}
                                                            className="px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold bg-accent-main hover:bg-accent-main/90 text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                                                        >
                                                            {isImporting ? (
                                                                <>
                                                                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                    <span className="hidden sm:inline">Importando...</span>
                                                                </>
                                                            ) : (
                                                                <span>Importar</span>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* VISTA 2: FUENTES EXTERNAS (INTERNET) - Reservado para músicos */}
            {isUserMusician && activeTab === 'external' && (
                <div className="space-y-4">
                    {/* Cabecera de resultados de internet */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-bg-secondary border border-white/5 rounded-xl p-3.5">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-bg-main text-text-main border border-white/10">
                                <svg className="w-3.5 h-3.5 text-accent-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                                <span>Resultados en internet ({externalResults.length})</span>
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            {isAdmin && (
                                <div className="hidden sm:flex items-center gap-3 text-xs text-text-secondary">
                                    <span className="flex items-center gap-1.5" title="Canciones de LaCuerda.net">
                                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                        <span>LaCuerda ({externalResults.filter(r => r.source === 'lacuerda').length})</span>
                                    </span>
                                    <span className="flex items-center gap-1.5" title="Canciones de Recursos Católicos">
                                        <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                                        <span>Recursos Católicos ({externalResults.filter(r => r.source === 'recursos_catolicos').length})</span>
                                    </span>
                                </div>
                            )}

                            <div className="text-xs text-text-secondary flex items-center gap-1.5 shrink-0">
                                <svg className="w-3.5 h-3.5 text-accent-main" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                                </svg>
                                <span>Armonización con IA activa</span>
                            </div>
                        </div>
                    </div>

                    {!user && (
                        <div className="bg-bg-secondary border border-white/5 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2.5 text-zinc-300">
                                <svg className="w-4 h-4 text-accent-main shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span>Inicia sesión para previsualizar canciones con acordes e importarlas con armonización IA.</span>
                            </div>
                            <a
                                href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? (window.location.pathname + window.location.search) : '/songs/search/all')}`}
                                className="px-3.5 py-1.5 rounded-xl bg-accent-main hover:bg-accent-main/90 text-white font-bold text-xs shrink-0 transition-colors shadow-sm text-center"
                            >
                                Iniciar sesión
                            </a>
                        </div>
                    )}

                    {/* Lista / Grid de Resultados Externos */}
                    {loadingExternal ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="bg-bg-secondary border border-white/5 rounded-xl p-4.5 animate-pulse flex items-center justify-between">
                                    <div className="space-y-2 flex-1">
                                        <div className="h-5 bg-white/10 rounded w-1/2"></div>
                                        <div className="h-3.5 bg-white/5 rounded w-1/3"></div>
                                    </div>
                                    <div className="h-8 w-24 bg-white/5 rounded-xl"></div>
                                </div>
                            ))}
                        </div>
                    ) : filteredExternalResults.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredExternalResults.map((item, idx) => {
                                const itemKey = item.source === 'recursos_catolicos' ? `rc_${item.id}` : `lc_${item.artistSlug}_${item.songSlug}`;
                                const isImporting = importingKey === itemKey;

                                return (
                                    <div
                                        key={`${itemKey}_${idx}`}
                                        onClick={() => handleRequestPreview(item)}
                                        className="bg-bg-secondary border border-white/5 rounded-xl p-3 sm:p-4 hover:border-accent-main/50 transition-colors flex items-center justify-between gap-2.5 sm:gap-3 group cursor-pointer"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-accent-main transition-colors truncate">
                                                    {item.title}
                                                </h3>
                                                {isAdmin && (
                                                    <span
                                                        className={`w-2 h-2 rounded-full shrink-0 ${
                                                            item.source === 'lacuerda' ? 'bg-amber-400' : 'bg-sky-400'
                                                        }`}
                                                        title={item.source === 'lacuerda' ? 'LaCuerda.net' : 'Recursos Católicos'}
                                                    />
                                                )}
                                            </div>
                                            <p className="text-xs text-text-secondary truncate mt-0.5">
                                                {item.artist && item.artist !== 'Desconocido' ? (
                                                    <span>Por <strong className="text-zinc-300 font-medium">{item.artist}</strong></span>
                                                ) : (
                                                    <span>Autor por verificar</span>
                                                )}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRequestPreview(item);
                                                }}
                                                className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/10 transition-colors cursor-pointer whitespace-nowrap"
                                            >
                                                Vista previa
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleQuickImport(item);
                                                }}
                                                disabled={isImporting}
                                                className="px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold bg-accent-main hover:bg-accent-main/90 text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                                            >
                                                {isImporting ? (
                                                    <>
                                                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        <span className="hidden sm:inline">Importando...</span>
                                                    </>
                                                ) : (
                                                    <span>Importar</span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-bg-secondary border border-white/5 rounded-2xl p-8 text-center max-w-lg mx-auto space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-accent-main mx-auto">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-white">
                                {query ? 'No se encontraron resultados externos' : 'Escribe para buscar'}
                            </h3>
                            <p className="text-xs text-text-secondary leading-relaxed">
                                {query
                                    ? `No encontramos coincidencias para «${query}». Intenta buscando solo el nombre principal o una palabra clave (ej. «Pescador», «Cordero», «Glenda»).`
                                    : 'Ingresa el nombre o compositor de la canción para buscar canciones y acordes en internet.'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Vista Previa y Guardado */}
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
            />
        </div>
    );
}
