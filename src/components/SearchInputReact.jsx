import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { API_URL } from '../services/songs';
import AppIcon from './Ui/AppIcon';

export default function SearchInputReact({ className = "" }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [query, setQuery] = useState("");
    const [mounted, setMounted] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const inputRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Sincroniza clases en <header> y bloqueo de scroll al expandir/colapsar
    useEffect(() => {
        const header = document.querySelector('header');
        if (isExpanded) {
            header?.classList.add('search-expanded');
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';

            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 60);

            return () => {
                header?.classList.remove('search-expanded');
                document.body.style.overflow = originalOverflow;
                clearTimeout(timer);
            };
        } else {
            header?.classList.remove('search-expanded');
            document.body.style.overflow = '';
            setSuggestions([]);
            setIsLoading(false);
            setSelectedIndex(-1);
        }
    }, [isExpanded]);

    // Búsqueda en vivo con debounce de 300ms
    useEffect(() => {
        const trimmed = query.trim();
        if (!isExpanded || !trimmed) {
            setSuggestions([]);
            setIsLoading(false);
            setSelectedIndex(-1);
            return;
        }

        setIsLoading(true);
        const controller = new AbortController();

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`${API_URL}/songs?q=${encodeURIComponent(trimmed)}`, {
                    signal: controller.signal,
                    credentials: 'include',
                });
                if (res.ok) {
                    const data = await res.json();
                    setSuggestions(Array.isArray(data) ? data.slice(0, 6) : []);
                } else {
                    setSuggestions([]);
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error al obtener sugerencias:', err);
                    setSuggestions([]);
                }
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query, isExpanded]);

    // Cerrar al hacer clic fuera del contenedor unificado
    useEffect(() => {
        if (!isExpanded) return;

        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsExpanded(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isExpanded]);

    // Navegación con teclado (Escape, flechas arriba/abajo y Enter)
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setIsExpanded(false);
            inputRef.current?.blur();
            return;
        }

        if (!isExpanded) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => {
                if (suggestions.length === 0) return -1;
                return prev < suggestions.length - 1 ? prev + 1 : 0;
            });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => {
                if (suggestions.length === 0) return -1;
                return prev > 0 ? prev - 1 : suggestions.length - 1;
            });
        }
    };

    // Atajo global de teclado: Ctrl+K / Cmd+K
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsExpanded((prev) => !prev);
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    // Limpieza al navegar entre páginas con Astro ClientRouter
    useEffect(() => {
        const handleBeforeSwap = () => {
            document.querySelector('header')?.classList.remove('search-expanded');
            document.body.style.overflow = '';
            setIsExpanded(false);
        };
        window.addEventListener('astro:before-swap', handleBeforeSwap);
        return () => window.removeEventListener('astro:before-swap', handleBeforeSwap);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            setIsExpanded(false);
            window.location.href = `/songs/${suggestions[selectedIndex].id}`;
            return;
        }

        const trimmed = query.trim();
        setIsExpanded(false);
        if (trimmed) {
            window.location.href = `/songs/search/${encodeURIComponent(trimmed)}`;
        } else {
            window.location.href = '/songs/search/all';
        }
    };

    const highlightMatch = (text, term) => {
        if (!term || !text) return text;
        const escaped = term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
        return parts.map((part, i) =>
            part.toLowerCase() === term.toLowerCase() ? (
                <span key={i} className="text-accent-main font-bold">
                    {part}
                </span>
            ) : (
                part
            )
        );
    };

    return (
        <div className={`relative flex items-center justify-center w-full min-w-0 h-8.5 sm:h-9 ${className}`}>
            {/* Contenedor Unificado (agrupa buscador y sugerencias en columna vertical cuando está expandido) */}
            <div
                ref={containerRef}
                className={`
                    transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                    ${isExpanded
                        ? 'fixed top-2 sm:top-2.5 left-1/2 -translate-x-1/2 w-[94vw] max-w-2xl z-[100] flex flex-col items-stretch pointer-events-auto'
                        : 'relative w-full h-full flex items-center'
                    }
                `}
            >
                {/* Formulario / Cápsula de búsqueda con animación fluida */}
                <form
                    onSubmit={handleSubmit}
                    onClick={() => {
                        if (!isExpanded) {
                            setIsExpanded(true);
                        }
                    }}
                    className={`
                        w-full flex items-center transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] shrink-0
                        ${isExpanded
                            ? 'h-12 sm:h-13 bg-[#141414]/98 border-accent-main/50 ring-1 ring-accent-main/20 shadow-2xl'
                            : 'h-8.5 sm:h-9 bg-[#171717] hover:bg-[#1c1c1c] border-white/10 hover:border-white/20 active:scale-[0.99] shadow-sm cursor-pointer'
                        }
                        backdrop-blur-xl border rounded-full overflow-hidden group
                    `}
                >
                    {/* Ícono de búsqueda animado */}
                    <div className={`
                        absolute left-0 top-0 flex items-center justify-center shrink-0
                        transition-all duration-300
                        ${isExpanded ? 'h-12 sm:h-13 w-12 sm:w-14 pl-2' : 'h-full w-8 sm:w-9 pl-2 sm:pl-2.5'}
                    `}>
                        <AppIcon
                            name="magnifying-glass"
                            className={`transition-all duration-300 ${isExpanded ? 'h-5 w-5 text-accent-main' : 'h-4 w-4 text-zinc-400 group-hover:text-white'}`}
                        />
                    </div>

                    {/* Input de texto con debounce de 300ms */}
                    <input
                        ref={inputRef}
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setIsExpanded(true)}
                        onKeyDown={handleKeyDown}
                        placeholder={isExpanded ? "Buscar canciones, artistas, categorías..." : "Buscar canciones..."}
                        className={`
                            w-full min-w-0 h-full bg-transparent border-none outline-none text-white placeholder-zinc-400 font-medium
                            transition-all duration-300
                            ${isExpanded ? 'text-sm sm:text-base pl-12 sm:pl-14 pr-20 sm:pr-24' : 'text-xs sm:text-sm pl-8 sm:pl-9 pr-8 truncate'}
                        `}
                        autoComplete="off"
                    />

                    {/* Atajo ⌘K cuando está colapsado */}
                    {!isExpanded && (
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center pointer-events-none transition-opacity duration-200">
                            <span className="text-[10px] font-bold text-zinc-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded tracking-wider">
                                ⌘K
                            </span>
                        </div>
                    )}

                    {/* Indicador de carga y botones en estado expandido */}
                    {isExpanded && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 transition-all duration-300">
                            {isLoading && (
                                <div className="w-3.5 h-3.5 border-2 border-accent-main/30 border-t-accent-main rounded-full animate-spin shrink-0 mr-0.5" />
                            )}

                            {query && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setQuery("");
                                        setSuggestions([]);
                                        inputRef.current?.focus();
                                    }}
                                    className="p-1 rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                                    title="Limpiar búsqueda"
                                >
                                    <AppIcon name="xmark" className="h-4 w-4" />
                                </button>
                            )}
                            <span className="h-4 w-px bg-white/10 mx-0.5 hidden sm:block"></span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsExpanded(false);
                                }}
                                className="text-[10px] uppercase font-bold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded transition-colors hidden sm:block cursor-pointer"
                            >
                                ESC
                            </button>
                        </div>
                    )}
                </form>

                {/* Panel de Sugerencias en Vivo (ubicado SIEMPRE debajo del buscador en flex-col, sin posibilidad de solaparse) */}
                {isExpanded && query.trim().length > 0 && (
                    <div
                        className="w-full mt-2 bg-[#141414]/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 animate-fadeIn shrink-0"
                    >
                        <div className="max-h-[50vh] sm:max-h-[55vh] overflow-y-auto divide-y divide-white/5">
                            {isLoading && suggestions.length === 0 && (
                                <div className="flex items-center justify-center gap-2.5 py-8 text-sm text-zinc-400">
                                    <div className="w-4 h-4 border-2 border-accent-main/30 border-t-accent-main rounded-full animate-spin" />
                                    <span>Buscando canciones...</span>
                                </div>
                            )}

                            {!isLoading && suggestions.length === 0 && (
                                <div className="py-7 px-4 text-center space-y-3">
                                    <p className="text-sm text-zinc-300">
                                        No se encontraron canciones locales para <span className="text-accent-main font-semibold">"{query.trim()}"</span>
                                    </p>
                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                                        <a
                                            href={`/songs/search/${encodeURIComponent(query.trim())}?tab=external`}
                                            onClick={() => setIsExpanded(false)}
                                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-accent-main hover:bg-accent-main/90 text-white font-medium text-xs shadow-md transition-colors cursor-pointer"
                                        >
                                            <AppIcon name="globe" className="w-3.5 h-3.5" />
                                            <span>Buscar en internet</span>
                                        </a>
                                        <button
                                            type="button"
                                            onClick={handleSubmit}
                                            className="w-full sm:w-auto px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                        >
                                            Búsqueda general (Enter)
                                        </button>
                                    </div>
                                </div>
                            )}

                            {suggestions.map((song, index) => (
                                <a
                                    key={song.id}
                                    href={`/songs/${song.id}`}
                                    data-astro-prefetch
                                    onClick={() => setIsExpanded(false)}
                                    className={`
                                        flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-colors group
                                        ${index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5'}
                                    `}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                                        <div className="w-8 h-8 rounded-full bg-accent-main/10 border border-accent-main/20 flex items-center justify-center shrink-0 text-accent-main group-hover:scale-110 transition-transform">
                                            <AppIcon name="music" className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-semibold text-white truncate">
                                                {highlightMatch(song.title, query.trim())}
                                            </div>
                                            <div className="text-xs text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
                                                <span>{song.author?.name || 'Desconocido'}</span>
                                                {song.category?.name && (
                                                    <>
                                                        <span className="text-zinc-600">•</span>
                                                        <span className="text-zinc-400">{song.category.name}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {song.key && (
                                            <span className="text-[11px] font-mono font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded text-accent-main">
                                                {song.key}
                                            </span>
                                        )}
                                        <span className="text-zinc-500 group-hover:text-accent-main transition-colors text-xs hidden sm:inline-block">
                                            →
                                        </span>
                                    </div>
                                </a>
                            ))}
                        </div>

                        {/* Footer con opciones de búsqueda */}
                        {suggestions.length > 0 && (
                            <div className="bg-white/[0.02] border-t border-white/5 divide-y divide-white/5">
                                <div
                                    onClick={handleSubmit}
                                    className="px-4 py-2.5 hover:bg-white/[0.05] flex items-center justify-between text-xs text-accent-main hover:text-white cursor-pointer font-medium transition-colors"
                                >
                                    <span>Ver todos los resultados locales para "{query.trim()}"</span>
                                    <span className="text-[10px] text-zinc-500 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                                        ↵ Enter
                                    </span>
                                </div>

                                <a
                                    href={`/songs/search/${encodeURIComponent(query.trim())}?tab=external`}
                                    onClick={() => setIsExpanded(false)}
                                    className="px-4 py-2 hover:bg-white/[0.05] flex items-center justify-between text-xs text-zinc-400 hover:text-accent-main cursor-pointer transition-colors"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <AppIcon name="globe" className="w-3.5 h-3.5 text-accent-main" />
                                        <span>Buscar "{query.trim()}" en internet</span>
                                    </span>
                                    <span className="text-zinc-500 text-xs">→</span>
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Backdrop Blur de pantalla completa montado directamente en document.body */}
            {mounted && createPortal(
                <div
                    className={`
                        fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300 z-[45]
                        ${isExpanded ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none'}
                    `}
                    onClick={() => setIsExpanded(false)}
                />,
                document.body
            )}
        </div>
    );
}
