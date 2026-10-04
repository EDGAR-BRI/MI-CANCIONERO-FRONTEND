import AppIcon from "@/components/Ui/AppIcon";
import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $misas, initMisasStore } from '../stores/misasStore';
import { getMyMinistries, type MinistrySummary } from '../services/ministries';
import type { Misa } from '../types/misa';
import CreateMisaModal from './CreateMisaModal';

const getUpcomingSundayString = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (7 - day) % 7 || 7;
    d.setDate(d.getDate() + diff);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
};

export interface HomeDashboardUser {
    id?: number;
    name?: string;
    email?: string;
    role?: string;
    permissions?: string[];
}

export interface HomeDashboardProps {
    currentUser?: HomeDashboardUser | null;
    token?: string;
    initialMisas?: Misa[];
    initialMinistries?: MinistrySummary[];
}

export default function HomeDashboardReact({
    currentUser,
    token,
    initialMisas = [],
    initialMinistries = []
}: HomeDashboardProps) {
    const storeMisas = useStore($misas);

    useEffect(() => {
        if (Array.isArray(initialMisas) && initialMisas.length > 0) {
            initMisasStore(initialMisas);
        }
    }, [initialMisas]);

    const misas = storeMisas.length > 0 ? storeMisas : initialMisas;
    const [ministries, setMinistries] = useState<MinistrySummary[]>(initialMinistries);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const isLoggedIn = !!currentUser;

    useEffect(() => {
        if (isLoggedIn && token && (!initialMinistries || initialMinistries.length === 0)) {
            getMyMinistries(token).then((res) => {
                if (res.success && res.data?.ministries) {
                    setMinistries(res.data.ministries);
                }
            });
        }
    }, [isLoggedIn, token]);

    const formatMisaDate = (dateStr: string) => {
        if (!dateStr) return { relative: '', formatted: '', fullDate: '' };
        const d = new Date(dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const target = new Date(d);
        target.setHours(0, 0, 0, 0);

        const diffTime = target.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        let relative = '';
        if (diffDays === 0) relative = 'HOY';
        else if (diffDays === 1) relative = 'MAÑANA';
        else if (diffDays > 1 && diffDays <= 6) relative = `En ${diffDays} días`;
        else if (diffDays < 0) relative = 'Pasada';

        const formatted = d.toLocaleDateString('es-ES', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });

        const fullDate = d.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return { relative, formatted, fullDate };
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingMisas = misas
        .filter((m) => new Date(m.dateMisa) >= today)
        .sort((a, b) => new Date(a.dateMisa).getTime() - new Date(b.dateMisa).getTime());

    const nextMisa = upcomingMisas[0];
    const secondaryUpcoming = upcomingMisas.slice(1, 4);

    const handleOpenCreateModal = () => {
        if (!isLoggedIn) {
            window.location.href = '/login?redirect=/misas/add';
        } else {
            setShowCreateModal(true);
        }
    };

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* 2. Opciones Rápidas (Botonera móvil con estilo de tarjetas estándar de la app) */}
            <section aria-label="Opciones Rápidas">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {/* Botón: Mis Grupos */}
                    <a
                        href="/ministerios"
                        data-astro-prefetch="hover"
                        className="bg-bg-secondary border border-white/5 hover:border-accent-main/50 rounded-xl p-4 sm:p-5 transition-colors group flex flex-col justify-between active:scale-[0.98]"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-white/5 text-accent-main flex items-center justify-center">
                                <AppIcon name="users" className="text-lg" />
                            </div>
                            <span className="text-xs font-mono bg-white/5 px-2 py-0.5 rounded text-text-secondary">
                                {isLoggedIn ? (ministries.length > 0 ? `${ministries.length}` : '0') : 'Ver'}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white group-hover:text-accent-main transition-colors flex items-center justify-between">
                                <span>Mis Grupos</span>
                                <AppIcon name="arrow-right" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity text-accent-main" />
                            </h2>
                            <p className="text-xs text-text-secondary mt-0.5 truncate">
                                {isLoggedIn
                                    ? ministries.length > 0
                                        ? `${ministries.length} ${ministries.length === 1 ? 'ministerio activo' : 'ministerios activos'}`
                                        : 'Crear o unirse'
                                    : 'Ministerios y coros'}
                            </p>
                        </div>
                    </a>

                    {/* Botón: Nueva Misa */}
                    <button
                        type="button"
                        onClick={handleOpenCreateModal}
                        className="bg-bg-secondary border border-white/5 hover:border-accent-main/50 rounded-xl p-4 sm:p-5 transition-colors group flex flex-col justify-between text-left cursor-pointer"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-accent-main/10 text-accent-main flex items-center justify-center">
                                <AppIcon name="plus" className="text-base" />
                            </div>
                            <span className="text-xs font-mono bg-white/5 px-2 py-0.5 rounded text-accent-main">
                                + Misa
                            </span>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white group-hover:text-accent-main transition-colors flex items-center justify-between">
                                <span>Nueva Misa</span>
                                <AppIcon name="book-bible" className="text-xs text-text-secondary" />
                            </h2>
                            <p className="text-xs text-text-secondary mt-0.5 truncate">
                                Planificar repertorio
                            </p>
                        </div>
                    </button>
                </div>
            </section>

            {/* 3. Próximas Misas */}
            <section aria-label="Próximas Misas">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <AppIcon name="book-bible" className="text-lg text-accent-main" />
                        <h2 className="text-lg font-bold text-white tracking-tight">
                            Próxima Misa
                        </h2>
                    </div>
                    <a
                        href="/misas"
                        data-astro-prefetch="hover"
                        className="text-xs font-medium text-accent-main hover:text-white transition-colors flex items-center gap-1 active:scale-[0.98]"
                    >
                        <span>Ver todas</span>
                        <AppIcon name="angle-right" className="text-[10px]" />
                    </a>
                </div>

                {nextMisa ? (
                    <div className="space-y-3">
                        {/* Tarjeta Destacada con el estilo oficial de artículo de la app */}
                        {(() => {
                            const dateInfo = formatMisaDate(nextMisa.dateMisa);
                            const songCount = nextMisa.misaSongs?.length || 0;
                            const hasMinistry = !!nextMisa.ministry;

                            return (
                                <article className="bg-bg-secondary border border-white/5 hover:border-accent-main/50 rounded-xl p-4 sm:p-6 transition-colors group">
                                    {/* Cabecera de la tarjeta */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-2">
                                            {dateInfo.relative && (
                                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-accent-main/15 text-accent-main uppercase font-mono">
                                                    {dateInfo.relative}
                                                </span>
                                            )}
                                            <span className="text-xs text-text-secondary uppercase font-mono">
                                                {dateInfo.formatted}
                                            </span>
                                        </div>

                                        {/* Badge de pertenencia (Ministerio o Personal) */}
                                        {hasMinistry && nextMisa.ministry ? (
                                            <span className="text-xs bg-white/5 px-2.5 py-1 rounded-full text-text-secondary flex items-center gap-1.5 max-w-[160px] truncate">
                                                <AppIcon name="users" className="text-[10px] text-accent-main" />
                                                <span className="truncate">{nextMisa.ministry.name}</span>
                                            </span>
                                        ) : (
                                            <span className="text-xs bg-white/5 px-2.5 py-1 rounded-full text-text-secondary flex items-center gap-1.5">
                                                <AppIcon name="user" className="text-[10px]" />
                                                <span>Personal</span>
                                            </span>
                                        )}
                                    </div>

                                    {/* Título de la Misa */}
                                    <h3 className="text-xl font-bold text-white group-hover:text-accent-main transition-colors mb-2">
                                        <a href={`/misas/view/${nextMisa.id}`}>
                                            {nextMisa.title}
                                        </a>
                                    </h3>

                                    {/* Cantos */}
                                    <div className="flex items-center gap-2 mb-5">
                                        <span className="text-xs bg-white/5 px-2.5 py-1 rounded text-text-secondary font-mono flex items-center gap-1.5">
                                            <AppIcon name="music" className="text-accent-main" />
                                            <span>
                                                {songCount} {songCount === 1 ? 'canto listo' : 'cantos listos'}
                                            </span>
                                        </span>
                                    </div>

                                    {/* Botones de acción con clases nativas de la app */}
                                    <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                                        <a
                                            href={`/misas/view/${nextMisa.id}`}
                                            data-astro-prefetch="hover"
                                            className="flex-1 bg-accent-main hover:bg-accent-main/90 text-white font-bold text-sm py-2.5 px-4 rounded-xl transition-colors text-center active:scale-[0.98]"
                                        >
                                            Ver Misa
                                        </a>

                                        <a
                                            href={`/misas/${nextMisa.id}`}
                                            data-astro-prefetch="hover"
                                            title="Modo Edición / Organizar cantos"
                                            className="bg-white/5 hover:bg-white/10 text-white font-medium text-sm py-2.5 px-4 rounded-xl border border-white/10 transition-colors flex items-center gap-2 shrink-0 active:scale-[0.98]"
                                        >
                                            <AppIcon name="pen-to-square" className="text-accent-main text-xs" />
                                            <span>Editar</span>
                                        </a>
                                    </div>
                                </article>
                            );
                        })()}

                        {/* Misas secundarias */}
                        {secondaryUpcoming.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                {secondaryUpcoming.map((misa) => {
                                    const dInfo = formatMisaDate(misa.dateMisa);
                                    return (
                                        <a
                                            key={misa.id}
                                            href={`/misas/view/${misa.id}`}
                                            data-astro-prefetch="hover"
                                            className="bg-bg-secondary border border-white/5 hover:border-accent-main/50 rounded-xl p-4 transition-colors group flex items-center justify-between active:scale-[0.98]"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-mono text-accent-main">
                                                        {dInfo.formatted}
                                                    </span>
                                                    {misa.ministry && (
                                                        <span className="text-xs text-text-secondary truncate">
                                                            • {misa.ministry.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="text-sm font-bold text-white group-hover:text-accent-main transition-colors truncate">
                                                    {misa.title}
                                                </h4>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-text-secondary shrink-0">
                                                <span>{misa.misaSongs?.length || 0} cantos</span>
                                                <AppIcon name="angle-right" className="text-xs" />
                                            </div>
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Estado vacío con estilo de la app */
                    <div className="bg-bg-secondary border border-white/5 rounded-xl p-8 text-center space-y-3">
                        <div className="w-12 h-12 rounded-xl bg-white/5 text-text-secondary flex items-center justify-center mx-auto">
                            <AppIcon name="calendar-plus" className="text-xl" />
                        </div>
                        <h3 className="text-base font-bold text-white">
                            No tienes misas programadas próximamente
                        </h3>
                        <p className="text-sm text-text-secondary max-w-sm mx-auto">
                            Planifica las canciones para este domingo con tu coro o comunidad.
                        </p>
                        <button
                            type="button"
                            onClick={handleOpenCreateModal}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-main hover:bg-accent-main/90 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                            <AppIcon name="plus" className="text-xs" />
                            <span>Planificar Misa de este Domingo</span>
                        </button>
                    </div>
                )}
            </section>

            {/* 4. Modal Unificado de Creación de Misa */}
            <CreateMisaModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                token={token}
                currentUser={currentUser}
                initialMinistries={ministries}
            />
        </div>
    );
}
