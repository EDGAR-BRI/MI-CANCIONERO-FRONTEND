import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Author } from '../types/author';
import { API_URL } from '../services/songs';
import { showSuccessToast, showError } from '../utils/alerts';
import AppIcon from './Ui/AppIcon';

interface AuthorSelectProps {
    authors?: Author[];
    selectedId?: number;
    token?: string;
    onChange?: (author: Author) => void;
}

export default function AuthorSelectReact({
    authors: initialAuthors = [],
    selectedId: initialSelectedId,
    token = '',
    onChange
}: AuthorSelectProps) {
    const [authors, setAuthors] = useState<Author[]>(() => {
        const seen = new Set<string>();
        const list: Author[] = [];
        for (const a of initialAuthors) {
            const key = a.name.toLowerCase().trim();
            if (!seen.has(key)) {
                seen.add(key);
                list.push(a);
            }
        }
        return list;
    });

    const [selectedId, setSelectedId] = useState<number>(() => {
        if (initialSelectedId) return initialSelectedId;
        const desconocido = initialAuthors.find(a => a.name.toLowerCase() === 'desconocido');
        return desconocido ? desconocido.id : (initialAuthors[0]?.id || 1);
    });

    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [savingNew, setSavingNew] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync if prop changes
    useEffect(() => {
        if (initialSelectedId && initialSelectedId !== selectedId) {
            setSelectedId(initialSelectedId);
        }
    }, [initialSelectedId]);

    // Listen for custom event (e.g. from AI assistant or auto-detection)
    useEffect(() => {
        const handleExternalSetAuthor = async (e: Event) => {
            const customEvent = e as CustomEvent<{ name: string; id?: number }>;
            const targetName = customEvent.detail?.name?.trim();
            const targetId = customEvent.detail?.id;

            if (targetId) {
                setSelectedId(targetId);
                return;
            }

            if (!targetName) return;

            const existing = authors.find(
                a => a.name.toLowerCase() === targetName.toLowerCase()
            );

            if (existing) {
                setSelectedId(existing.id);
                if (onChange) onChange(existing);
            } else {
                try {
                    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                    if (token) headers['Authorization'] = `Bearer ${token}`;

                    const res = await fetch(`${API_URL}/authors`, {
                        method: 'POST',
                        headers,
                        credentials: 'include',
                        body: JSON.stringify({ name: targetName })
                    });

                    if (res.ok) {
                        const created: Author = await res.json();
                        setAuthors(prev => [...prev, created]);
                        setSelectedId(created.id);
                        if (onChange) onChange(created);
                    }
                } catch (err) {
                    console.error('Error auto-creating author from event:', err);
                }
            }
        };

        window.addEventListener('set-author', handleExternalSetAuthor);
        return () => window.removeEventListener('set-author', handleExternalSetAuthor);
    }, [authors, token, onChange]);

    const selectedAuthor = useMemo(() => {
        return authors.find(a => a.id === selectedId) || null;
    }, [authors, selectedId]);

    const filteredAuthors = useMemo(() => {
        if (!search.trim()) return authors;
        const q = search.toLowerCase().trim();
        return authors.filter(a => a.name.toLowerCase().includes(q));
    }, [authors, search]);

    const handleSelect = (author: Author) => {
        setSelectedId(author.id);
        setIsOpen(false);
        setSearch('');
        if (onChange) onChange(author);
    };

    const handleCreateAuthor = async () => {
        const trimmed = search.trim();
        if (!trimmed) return;

        // Check if exists
        const existing = authors.find(a => a.name.toLowerCase().trim() === trimmed.toLowerCase());
        if (existing) {
            handleSelect(existing);
            return;
        }

        setSavingNew(true);
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`${API_URL}/authors`, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({ name: trimmed })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                showError(errData.error || 'No se pudo crear el autor.');
                setSavingNew(false);
                return;
            }

            const newAuthor: Author = await res.json();
            setAuthors(prev => [...prev, newAuthor]);
            setSelectedId(newAuthor.id);
            setIsOpen(false);
            setSearch('');
            showSuccessToast(`Autor "${newAuthor.name}" creado`);
            if (onChange) onChange(newAuthor);
        } catch (e) {
            console.error('Error creating author:', e);
            showError('Error de red al crear el autor.');
        } finally {
            setSavingNew(false);
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Hidden Input for Form Submission */}
            <input type="hidden" name="authorId" value={selectedId} id="authorIdInput" />

            {/* Select Trigger Button */}
            <button
                type="button"
                id="authorSelectButton"
                onClick={() => {
                    setIsOpen(prev => !prev);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                className={`w-full h-[50px] flex items-center justify-between px-3 py-2 bg-bg-secondary border rounded-lg text-text-main text-sm sm:text-base transition-colors cursor-pointer text-left ${
                    isOpen ? 'border-accent-main ring-1 ring-accent-main/30' : 'border-white/10 hover:border-white/20'
                }`}
            >
                <div className="flex items-center gap-2 truncate">
                    <AppIcon name="user" className="w-4 h-4 text-accent-main shrink-0" />
                    <span className="truncate font-medium">
                        {selectedAuthor ? selectedAuthor.name : 'Selecciona un autor'}
                    </span>
                </div>
                <AppIcon
                    name="chevron-down"
                    className={`w-4 h-4 text-text-secondary shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-bg-secondary border border-white/10 rounded-lg shadow-2xl overflow-hidden backdrop-blur-md">
                    {/* Search bar inside dropdown */}
                    <div className="p-2 border-b border-white/5">
                        <div className="relative">
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (filteredAuthors.length === 1) {
                                            handleSelect(filteredAuthors[0]);
                                        } else if (filteredAuthors.length === 0 && search.trim()) {
                                            handleCreateAuthor();
                                        }
                                    }
                                }}
                                placeholder="Buscar o crear autor..."
                                className="w-full px-2.5 py-1.5 pl-8 bg-bg-main border border-white/10 rounded text-xs text-text-main placeholder-text-secondary/50 focus:outline-none focus:border-accent-main"
                            />
                            <AppIcon
                                name="magnifying-glass"
                                className="w-3.5 h-3.5 text-text-secondary absolute left-2.5 top-1/2 -translate-y-1/2"
                            />
                        </div>
                    </div>

                    {/* Authors List */}
                    <div className="max-h-56 overflow-y-auto p-1 divide-y divide-white/5">
                        {filteredAuthors.map(author => {
                            const isSelected = author.id === selectedId;
                            return (
                                <button
                                    key={author.id}
                                    type="button"
                                    onClick={() => handleSelect(author)}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-md text-xs transition-colors cursor-pointer ${
                                        isSelected
                                            ? 'bg-accent-main/15 text-accent-main font-medium'
                                            : 'text-text-secondary hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <span>{author.name}</span>
                                    </div>
                                    {isSelected && (
                                        <AppIcon name="check" className="w-4 h-4 text-accent-main shrink-0" />
                                    )}
                                </button>
                            );
                        })}

                        {/* Option to create new author if search has value */}
                        {search.trim() && !authors.some(a => a.name.toLowerCase() === search.toLowerCase().trim()) && (
                            <div className="p-1">
                                <button
                                    type="button"
                                    onClick={handleCreateAuthor}
                                    disabled={savingNew}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent-main/10 border border-accent-main/30 text-accent-main hover:bg-accent-main/20 text-xs rounded-md font-medium transition-colors cursor-pointer"
                                >
                                    {savingNew ? (
                                        <span>Creando...</span>
                                    ) : (
                                        <>
                                            <AppIcon name="plus" className="w-3.5 h-3.5" />
                                            <span>Crear autor "{search.trim()}"</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {filteredAuthors.length === 0 && !search.trim() && (
                            <p className="p-3 text-center text-xs text-text-secondary">
                                No hay autores disponibles
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
