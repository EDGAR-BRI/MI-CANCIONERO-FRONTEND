import React, { useState, useEffect } from 'react';
import { API_URL } from '../services/songs';

const getCategoryIcon = (name = '') => {
    const lower = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (lower.includes('adorac')) return 'fa-heart';
    if (lower.includes('alabanz')) return 'fa-hands-clapping';
    if (lower.includes('maria') || lower.includes('virgen')) return 'fa-crown';
    if (lower.includes('cuaresma') || lower.includes('pasion')) return 'fa-cross';
    if (lower.includes('pascua') || lower.includes('resurrecc')) return 'fa-sun';
    if (lower.includes('navidad')) return 'fa-gift';
    if (lower.includes('adviento')) return 'fa-fire-flame-curved';
    if (lower.includes('espiritu') || lower.includes('pentecost')) return 'fa-dove';
    if (lower.includes('joven') || lower.includes('juventud')) return 'fa-guitar';
    if (lower.includes('vocacion') || lower.includes('mision')) return 'fa-globe';
    if (lower.includes('nino') || lower.includes('infantil')) return 'fa-child';
    if (lower.includes('comunion') || lower.includes('eucarist')) return 'fa-wine-glass';
    if (lower.includes('entrada')) return 'fa-door-open';
    if (lower.includes('piedad') || lower.includes('perdon')) return 'fa-hands-praying';
    if (lower.includes('gloria')) return 'fa-sun';
    if (lower.includes('aleluya')) return 'fa-book-open';
    if (lower.includes('ofertorio')) return 'fa-bread-slice';
    if (lower.includes('santo')) return 'fa-dove';
    if (lower.includes('paz') || lower.includes('cordero')) return 'fa-heart';
    if (lower.includes('salida') || lower.includes('envio')) return 'fa-person-walking-arrow-right';
    if (lower.includes('inactiv')) return 'fa-eye-slash';
    return 'fa-music';
};

export default function CategoryFilter({ isAdmin, currentCategoryId = null }) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch(`${API_URL}/categories`);
                if (res.ok) {
                    const data = await res.json();
                    if (isAdmin) {
                        data.push({ id: -1, name: "Inactivas" });
                    }
                    setCategories(data);
                }
            } catch (err) {
                console.error("Error fetching categories:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, [isAdmin]);

    const SkeletonPill = () => (
        <div className="h-9 w-28 bg-white/5 rounded-full animate-pulse shrink-0 border border-white/5"></div>
    );

    const isActive = (id) => {
        if (!currentCategoryId && id === "all") return true;
        return String(id) === String(currentCategoryId);
    };

    return (
        <div className="flex overflow-x-auto pb-4 gap-2 mb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <a
                href="/songs/search/all"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 border ${
                    !currentCategoryId
                        ? "bg-accent-main text-white border-transparent shadow-md"
                        : "bg-bg-secondary text-text-secondary hover:text-white hover:bg-white/10 border-white/5 hover:border-accent-main/30"
                }`}
            >
                <i className={`fa-solid fa-layer-group text-xs ${!currentCategoryId ? "text-white" : "text-accent-main"}`}></i>
                <span>Explorar Todas</span>
            </a>

            {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonPill key={i} />)
            ) : (
                categories.map((cat) => {
                    const active = isActive(cat.id);
                    const isInactiveFilter = cat.id === -1;
                    const icon = getCategoryIcon(cat.name);

                    let itemClass = "bg-bg-secondary text-text-secondary hover:text-white hover:bg-white/10 border-white/5 hover:border-accent-main/30";
                    let iconClass = "text-accent-main";

                    if (active) {
                        itemClass = "bg-accent-main text-white border-transparent shadow-md";
                        iconClass = "text-white";
                    } else if (isInactiveFilter) {
                        itemClass = "bg-red-900/20 text-red-200 border-red-500/30 hover:bg-red-900/40";
                        iconClass = "text-red-400";
                    }

                    return (
                        <a
                            key={cat.id}
                            href={
                                isInactiveFilter
                                    ? `/songs/search/all?active=false`
                                    : `/songs/search/all?categoryId=${cat.id}`
                            }
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 border ${itemClass}`}
                        >
                            <i className={`fa-solid ${icon} text-xs ${iconClass}`}></i>
                            <span>{cat.name}</span>
                        </a>
                    );
                })
            )}
        </div>
    );
}
