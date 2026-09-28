import React, { useState, useRef, useEffect } from 'react';

export default function SearchInputReact({ className = "" }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [query, setQuery] = useState("");
    const inputRef = useRef(null);
    const formRef = useRef(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            window.location.href = `/songs/search/${encodeURIComponent(query.trim())}`;
        } else {
            window.location.href = '/songs/search/all';
        }
    };

    // Handle click outside to collapse if empty
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (formRef.current && !formRef.current.contains(event.target)) {
                if (!query) {
                    setIsExpanded(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsExpanded(false);
                inputRef.current?.blur();
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [query]);

    return (
        <div className={`relative flex justify-center items-center w-full min-w-0 ${className}`}>
            <form
                ref={formRef}
                onSubmit={handleSubmit}
                onClick={() => {
                    setIsExpanded(true);
                    inputRef.current?.focus();
                }}
                className={`
                    flex items-center transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] min-w-0
                    ${isExpanded
                        ? 'fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 w-[95vw] max-w-2xl shadow-2xl scale-100 z-[100] h-12 bg-[#141414]/95 border-accent-main/40'
                        : 'relative w-full cursor-pointer hover:border-white/20 active:scale-[0.99] shadow-sm z-10 h-8.5 sm:h-9 bg-[#171717] hover:bg-[#1c1c1c] border-white/10'
                    }
                    backdrop-blur-xl border rounded-full overflow-hidden group
                `}
            >
                <div className={`
                    absolute left-0 top-0 h-full flex items-center justify-center shrink-0
                    transition-all duration-300
                    ${isExpanded ? 'w-12 pl-2' : 'w-8 sm:w-9 pl-2 sm:pl-2.5'}
                `}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-4 w-4 transition-colors duration-300 ${isExpanded ? 'text-accent-main' : 'text-zinc-400 group-hover:text-white'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsExpanded(true)}
                    placeholder="Buscar canciones..."
                    className={`
                        w-full min-w-0 h-full bg-transparent border-none outline-none text-white placeholder-zinc-400 font-medium
                        transition-all duration-300
                        ${isExpanded ? 'text-sm sm:text-base px-12' : 'text-xs sm:text-sm pl-8 sm:pl-9 pr-3 truncate'}
                    `}
                    autoComplete="off"
                />

                {/* Close/Clear Button included in dynamic island logic */}
                {isExpanded && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {query && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setQuery("");
                                    inputRef.current?.focus();
                                }}
                                className="p-1 rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                        <span className="h-4 w-px bg-white/10 mx-1"></span>
                        <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider hidden sm:block pointer-events-none pr-3">
                            ESC
                        </div>
                    </div>
                )}
            </form>

            {/* Backdrop for focus mode */}
            <div
                className={`
                    fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 z-[90]
                    ${isExpanded ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}
                `}
                onClick={() => {
                    setIsExpanded(false);
                }}
            />
        </div>
    );
}
