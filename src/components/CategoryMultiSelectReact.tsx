import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Category } from '../types/category';
import { API_URL } from '../services/songs';
import { showSuccessToast, showError } from '../utils/alerts';

interface CategoryMultiSelectProps {
    categories?: Category[];
    selectedIds?: number[];
    token?: string;
}

export default function CategoryMultiSelectReact({
    categories: initialCategories = [],
    selectedIds: initialSelectedIds = [],
    token = ''
}: CategoryMultiSelectProps) {
    // Deduplicate initial categories by ID and trimmed name
    const [categories, setCategories] = useState<Category[]>(() => {
        const seenNames = new Set<string>();
        const unique: Category[] = [];
        for (const cat of initialCategories) {
            const key = cat.name.toLowerCase().trim();
            if (!seenNames.has(key)) {
                seenNames.add(key);
                unique.push(cat);
            }
        }
        return unique;
    });

    const [selectedIds, setSelectedIds] = useState<number[]>(() => {
        if (Array.isArray(initialSelectedIds) && initialSelectedIds.length > 0) {
            return Array.from(new Set(initialSelectedIds.map(Number)));
        }
        return initialCategories.length > 0 ? [initialCategories[0].id] : [];
    });

    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [savingNew, setSavingNew] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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

    // Escuchar evento externo para autoseleccionar categorías
    useEffect(() => {
        const handleSetCategories = (e: CustomEvent<{ names?: string[], ids?: number[] }>) => {
            if (e.detail?.ids && Array.isArray(e.detail.ids)) {
                setSelectedIds(e.detail.ids);
            } else if (e.detail?.names && Array.isArray(e.detail.names)) {
                const matchedIds: number[] = [];
                for (const name of e.detail.names) {
                    const found = categories.find(c => c.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(c.name.toLowerCase()));
                    if (found && !matchedIds.includes(found.id)) {
                        matchedIds.push(found.id);
                    }
                }
                if (matchedIds.length > 0) {
                    setSelectedIds(matchedIds);
                }
            }
        };
        window.addEventListener('set-categories' as any, handleSetCategories);
        return () => window.removeEventListener('set-categories' as any, handleSetCategories);
    }, [categories]);


    const toggleCategory = (id: number) => {
        setSelectedIds((prev) => {
            if (prev.includes(id)) {
                return prev.filter((item) => item !== id);
            } else {
                return [...prev, id];
            }
        });
        // Keep focus on input
        inputRef.current?.focus();
    };

    const removeCategory = (id: number) => {
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        inputRef.current?.focus();
    };

    const handleCreateCategory = async () => {
        const trimmed = search.trim();
        if (!trimmed) return;

        // Check if a category with exact same name already exists
        const existing = categories.find(
            (c) => c.name.toLowerCase().trim() === trimmed.toLowerCase()
        );
        if (existing) {
            if (!selectedIds.includes(existing.id)) {
                setSelectedIds((prev) => [...prev, existing.id]);
            }
            setSearch('');
            return;
        }

        setSavingNew(true);
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`${API_URL}/categories`, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({ name: trimmed })
            });

            if (res.ok) {
                const created: Category = await res.json();
                setCategories((prev) => [...prev, created]);
                setSelectedIds((prev) => [...prev, created.id]);
                setSearch('');
                showSuccessToast(`Categoría "${created.name}" creada y seleccionada`);
            } else {
                const err = await res.json().catch(() => ({}));
                showError('Error', err.error || 'No se pudo crear la categoría');
            }
        } catch (err) {
            console.error('Error creating category:', err);
            showError('Error de conexión', 'No se pudo conectar con el servidor');
        } finally {
            setSavingNew(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const trimmed = search.trim();
            if (!trimmed) return;

            // If there's an exact match in filtered categories, toggle it
            const exactMatch = categories.find(
                (c) => c.name.toLowerCase().trim() === trimmed.toLowerCase()
            );
            if (exactMatch) {
                if (!selectedIds.includes(exactMatch.id)) {
                    setSelectedIds((prev) => [...prev, exactMatch.id]);
                }
                setSearch('');
            } else {
                // Otherwise create a new one
                handleCreateCategory();
            }
        } else if (e.key === 'Backspace' && search === '' && selectedIds.length > 0) {
            // Remove last selected category on backspace
            e.preventDefault();
            const lastId = selectedIds[selectedIds.length - 1];
            removeCategory(lastId);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    // Filter categories based on search input (accent insensitive)
    const normalize = (str: string) =>
        str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const filteredCategories = useMemo(() => {
        if (!search.trim()) return categories;
        const q = normalize(search.trim());
        return categories.filter((c) => normalize(c.name).includes(q));
    }, [categories, search]);

    const canCreateNew = useMemo(() => {
        const trimmed = search.trim();
        if (!trimmed) return false;
        const exists = categories.some(
            (c) => normalize(c.name) === normalize(trimmed)
        );
        return !exists;
    }, [categories, search]);

    const selectedCategories = useMemo(() => {
        return categories.filter((c) => selectedIds.includes(c.id));
    }, [categories, selectedIds]);

    return (
        <div className="space-y-2 relative" ref={containerRef}>
            {/* Hidden inputs for SSR FormData compatibility */}
            {selectedIds.map((id) => (
                <input key={id} type="hidden" name="categoryIds" value={id} />
            ))}
            {selectedIds.length > 0 && (
                <input type="hidden" name="categoryId" value={selectedIds[0]} />
            )}

            {/* Label Row - matches other form field headers exactly */}
            <div className="flex justify-between items-center h-5">
                <label
                    htmlFor="category-search-input"
                    className="block text-sm font-medium text-text-secondary cursor-pointer"
                    onClick={() => {
                        setIsOpen(true);
                        inputRef.current?.focus();
                    }}
                >
                    Categorías / Etiquetas
                </label>
                {selectedIds.length > 0 && (
                    <span className="text-xs text-text-secondary">
                        {selectedIds.length} {selectedIds.length === 1 ? 'seleccionada' : 'seleccionadas'}
                    </span>
                )}
            </div>

            {/* Combobox Trigger Box */}
            <div
                onClick={() => {
                    setIsOpen(true);
                    inputRef.current?.focus();
                }}
                className={`min-h-[50px] w-full bg-bg-secondary border rounded-lg px-3 py-2 text-text-main flex flex-wrap items-center gap-1.5 cursor-pointer transition-colors relative ${
                    isOpen ? 'border-accent-main ring-1 ring-accent-main/30' : 'border-white/10 hover:border-white/20'
                }`}
            >
                {/* Selected Tag Badges */}
                {selectedCategories.map((cat) => (
                    <span
                        key={cat.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-accent-main text-white shadow-sm shadow-accent-main/20 animate-fadeIn"
                    >
                        <span>{cat.name}</span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeCategory(cat.id);
                            }}
                            className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/25 transition-colors cursor-pointer text-[10px]"
                            title={`Eliminar ${cat.name}`}
                        >
                            ✕
                        </button>
                    </span>
                ))}

                {/* Search / Filter Input */}
                <input
                    ref={inputRef}
                    id="category-search-input"
                    type="text"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        selectedIds.length === 0
                            ? 'Buscar o seleccionar categorías...'
                            : search.length === 0
                            ? 'Agregar más...'
                            : ''
                    }
                    className="flex-1 min-w-[120px] bg-transparent text-sm text-text-main placeholder-white/30 focus:outline-none py-1"
                />

                {/* Right controls: chevron indicator */}
                <div className="ml-auto flex items-center gap-1 text-text-secondary">
                    {search && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSearch('');
                                inputRef.current?.focus();
                            }}
                            className="p-1 hover:text-white transition-colors text-xs"
                            title="Limpiar búsqueda"
                        >
                            ✕
                        </button>
                    )}
                    <span
                        className={`text-xs transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-accent-main' : 'text-text-secondary/70'
                        }`}
                    >
                        ▼
                    </span>
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#161616] border border-white/15 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl animate-fadeIn">
                    {/* List of categories */}
                    <div className="max-h-60 overflow-y-auto scrollbar-thin divide-y divide-white/5 py-1">
                        {filteredCategories.length === 0 && !canCreateNew && (
                            <div className="px-4 py-3 text-xs text-text-secondary text-center italic">
                                No se encontraron categorías disponibles.
                            </div>
                        )}

                        {filteredCategories.map((cat) => {
                            const isSelected = selectedIds.includes(cat.id);
                            return (
                                <div
                                    key={cat.id}
                                    onClick={() => toggleCategory(cat.id)}
                                    className={`flex items-center justify-between px-3.5 py-2.5 text-sm cursor-pointer transition-colors ${
                                        isSelected
                                            ? 'bg-accent-main/15 text-white font-medium'
                                            : 'text-text-secondary hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                                isSelected
                                                    ? 'bg-accent-main border-accent-main text-white'
                                                    : 'border-white/20 bg-white/5'
                                            }`}
                                        >
                                            {isSelected && (
                                                <span className="text-[10px] font-bold">✓</span>
                                            )}
                                        </div>
                                        <span>{cat.name}</span>
                                    </div>
                                    {isSelected && (
                                        <span className="text-xs text-accent-main font-semibold">
                                            Seleccionada
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Option to create a new category when typed */}
                    {canCreateNew && (
                        <div className="border-t border-white/10 bg-accent-main/5 p-1">
                            <button
                                type="button"
                                onClick={handleCreateCategory}
                                disabled={savingNew}
                                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-accent-main hover:bg-accent-main hover:text-white transition-all cursor-pointer"
                            >
                                <span className="flex items-center gap-1.5 truncate">
                                    <span className="text-base leading-none font-bold">+</span>
                                    <span className="truncate">
                                        Crear categoría <strong>"{search.trim()}"</strong>
                                    </span>
                                </span>
                                <span className="text-[10px] uppercase tracking-wider opacity-80 shrink-0">
                                    {savingNew ? 'Guardando...' : 'Presiona Enter'}
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Validation warning if none selected */}
            {selectedIds.length === 0 && (
                <p className="text-xs text-amber-400/90 pt-0.5">
                    ⚠️ Selecciona al menos una categoría para la canción.
                </p>
            )}
        </div>
    );
}
