import AppIcon from "@/components/Ui/AppIcon";
import React, { useState, useEffect } from 'react';
import {
    getMyMinistries,
    createMinistry,
    joinMinistryByCode,
    setMinistriesAuthToken,
    type MinistrySummary,
    type MyPendingRequest
} from '../services/ministries';
import { showSuccessToast, showError } from '../utils/alerts';

interface MinistriesViewProps {
    user: any;
    token?: string;
    initialMinistries?: MinistrySummary[];
    initialPendingRequests?: MyPendingRequest[];
}

export default function MinistriesViewReact({
    user,
    token,
    initialMinistries = [],
    initialPendingRequests = []
}: MinistriesViewProps) {
    const [ministries, setMinistries] = useState<MinistrySummary[]>(initialMinistries);
    const [pendingRequests, setPendingRequests] = useState<MyPendingRequest[]>(initialPendingRequests);
    const [loading, setLoading] = useState(false);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);

    // Create form state
    const [createForm, setCreateForm] = useState({
        name: '',
        description: '',
        foundedAt: new Date().toISOString().split('T')[0],
        requireApproval: false,
        allowMemberInvites: false
    });
    const [creating, setCreating] = useState(false);

    // Join form state
    const [joinCode, setJoinCode] = useState('');
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        if (token) setMinistriesAuthToken(token);
    }, [token]);

    const reloadData = async () => {
        setLoading(true);
        try {
            if (token) setMinistriesAuthToken(token);
            const res = await getMyMinistries(token);
            if (res.success && res.data) {
                setMinistries(res.data.ministries || []);
                setPendingRequests(res.data.pendingRequests || []);
            }
        } catch (err) {
            console.error("Error cargando ministerios:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createForm.name.trim()) {
            showError("Campo requerido", "Por favor ingresa un nombre para el ministerio.");
            return;
        }

        setCreating(true);
        const res = await createMinistry(createForm, token);
        setCreating(false);

        if (res.success && res.data) {
            showSuccessToast("¡Ministerio creado!", "Tu ministerio ha sido creado exitosamente.");
            setShowCreateModal(false);
            setCreateForm({
                name: '',
                description: '',
                foundedAt: new Date().toISOString().split('T')[0],
                requireApproval: false,
                allowMemberInvites: false
            });
            // Redirigir al nuevo ministerio
            window.location.href = `/ministerios/${res.data.id}`;
        } else {
            showError("Error", res.error || "No se pudo crear el ministerio.");
        }
    };

    const handleJoinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let code = joinCode.trim();
        if (!code) {
            showError("Campo requerido", "Por favor ingresa un código de invitación.");
            return;
        }

        if (code.includes('codigo=')) {
            code = code.split('codigo=')[1].split('&')[0];
        } else if (code.includes('/unirse/')) {
            code = code.split('/unirse/')[1].split('?')[0];
        }

        setJoining(true);
        const res = await joinMinistryByCode(code, token);
        setJoining(false);

        if (res.success) {
            if (res.data?.status === 'PENDING') {
                showSuccessToast("Solicitud enviada", "Un administrador del ministerio revisará tu solicitud.");
                setShowJoinModal(false);
                setJoinCode('');
                reloadData();
            } else {
                showSuccessToast("¡Te has unido!", "Ahora formas parte del ministerio.");
                setShowJoinModal(false);
                setJoinCode('');
                if (res.data?.ministry?.id) {
                    window.location.href = `/ministerios/${res.data.ministry.id}`;
                } else {
                    reloadData();
                }
            }
        } else {
            showError("No se pudo unir", res.error || "Código inválido o error al procesar.");
        }
    };

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                        <AppIcon name="users-viewfinder" className="text-accent-main" />
                        <span>Mis Ministerios de Música</span>
                    </h1>
                    <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                        Agrupaciones litúrgicas, coros y bandas a las que perteneces.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => setShowJoinModal(true)}
                        className="h-10 px-3 sm:px-4 bg-[#262626] hover:bg-[#333333] border border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap min-w-0"
                    >
                        <AppIcon name="key" className="text-accent-main shrink-0 text-xs sm:text-sm" />
                        <span className="truncate">
                            Unirme <span className="hidden min-[380px]:inline">con Código</span>
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="h-10 px-3 sm:px-4 bg-accent-main hover:bg-amber-600 rounded-xl text-xs sm:text-sm font-bold text-black transition-all shadow-lg shadow-accent-main/20 active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap min-w-0"
                    >
                        <AppIcon name="plus" className="shrink-0 text-xs sm:text-sm" />
                        <span className="truncate">
                            Crear <span className="hidden min-[380px]:inline">Ministerio</span>
                        </span>
                    </button>
                </div>
            </div>

            {/* Pending Requests Alert */}
            {pendingRequests.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
                    <h3 className="text-xs sm:text-sm font-semibold text-amber-400 flex items-center gap-2">
                        <AppIcon name="clock" />
                        <span>Solicitudes de Ingreso Pendientes ({pendingRequests.length})</span>
                    </h3>
                    <div className="grid gap-2">
                        {pendingRequests.map(req => (
                            <div key={req.ministryId} className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/5 text-xs sm:text-sm">
                                <span className="font-medium text-white">{req.name}</span>
                                <span className="text-[11px] text-amber-300/80 bg-amber-500/20 px-2 py-0.5 rounded-full">
                                    En espera de aprobación
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Content: List or Empty */}
            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-[#171717] border border-white/10 rounded-2xl p-5 h-48 animate-pulse"></div>
                    ))}
                </div>
            ) : ministries.length === 0 ? (
                <div className="bg-[#171717] border border-white/10 border-dashed rounded-2xl p-8 sm:p-12 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-accent-main/10 text-accent-main flex items-center justify-center mx-auto text-2xl">
                        <AppIcon name="music" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-lg font-bold text-white">Aún no perteneces a ningún ministerio</h4>
                        <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto">
                            Crea tu primer grupo para gestionar misas y repertorios con tu equipo, o únete a uno existente usando un código de invitación.
                        </p>
                    </div>
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowJoinModal(true)}
                            className="h-10 px-4 bg-[#262626] hover:bg-[#333333] border border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <AppIcon name="key" className="text-accent-main" />
                            <span>Unirme con Código</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(true)}
                            className="h-10 px-5 bg-accent-main hover:bg-amber-600 text-black font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <AppIcon name="plus" />
                            <span>Crear Ministerio</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {ministries.map(m => {
                        const isAdmin = m.myRole === 'ADMIN';
                        return (
                            <div
                                key={m.id}
                                className="bg-[#171717] border border-white/10 hover:border-accent-main/40 rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between hover:shadow-xl hover:shadow-black/50 group"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-accent-main/10 border border-accent-main/20 text-accent-main flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                                            <AppIcon name="church" />
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${isAdmin
                                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                : 'bg-zinc-800 text-zinc-300 border border-white/10'
                                            }`}>
                                            {isAdmin ? 'Administrador' : 'Miembro'}
                                        </span>
                                    </div>

                                    <div>
                                        <h4 className="text-base sm:text-lg font-bold text-white group-hover:text-accent-main transition-colors line-clamp-1">
                                            {m.name}
                                        </h4>
                                        <p className="text-zinc-400 text-xs line-clamp-2 mt-1">
                                            {m.description || 'Sin descripción.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 mt-4 border-t border-white/5 space-y-3">
                                    <div className="flex items-center justify-between text-xs text-zinc-400">
                                        <span className="flex items-center gap-1.5">
                                            <AppIcon name="user-group" className="text-zinc-500" />
                                            {m.memberCount} {m.memberCount === 1 ? 'integrante' : 'integrantes'}
                                        </span>
                                        {m.foundedAt && (
                                            <span className="flex items-center gap-1 text-zinc-500">
                                                <AppIcon name="calendar" />
                                                {new Date(m.foundedAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'short' })}
                                            </span>
                                        )}
                                    </div>

                                    <a
                                        href={`/ministerios/${m.id}`}
                                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#262626] hover:bg-accent-main hover:text-black font-semibold text-xs sm:text-sm text-white transition-all active:scale-95"
                                    >
                                        <span>Entrar al Ministerio</span>
                                        <AppIcon name="arrow-right" className="text-[11px]" />
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal: Crear Ministerio */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 pb-20 sm:pb-6 bg-black/85 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#171717] border border-white/15 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <AppIcon name="plus" className="text-accent-main" />
                                <span>Nuevo Ministerio de Música</span>
                            </h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-zinc-400 hover:text-white p-1 text-lg"
                            >
                                <AppIcon name="xmark" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                    Nombre del Ministerio / Coro *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Coro Parroquial San Juan Bautista"
                                    value={createForm.name}
                                    onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                    Descripción o Parroquia
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Ej: Ministerio encargado de las misas dominicales de 10:00 AM."
                                    value={createForm.description}
                                    onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                    Fecha de Fundación
                                </label>
                                <input
                                    type="date"
                                    value={createForm.foundedAt}
                                    onChange={e => setCreateForm({ ...createForm, foundedAt: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors"
                                />
                            </div>

                            <div className="space-y-3 pt-2">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={createForm.requireApproval}
                                        onChange={e => setCreateForm({ ...createForm, requireApproval: e.target.checked })}
                                        className="mt-1 w-4 h-4 rounded border-white/20 bg-[#0a0a0a] text-accent-main focus:ring-accent-main cursor-pointer"
                                    />
                                    <div className="text-xs">
                                        <span className="text-white font-medium group-hover:text-accent-main transition-colors">
                                            Requerir aprobación de administradores
                                        </span>
                                        <p className="text-zinc-500">
                                            Los nuevos integrantes esperarán tu aprobación antes de acceder.
                                        </p>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={createForm.allowMemberInvites}
                                        onChange={e => setCreateForm({ ...createForm, allowMemberInvites: e.target.checked })}
                                        className="mt-1 w-4 h-4 rounded border-white/20 bg-[#0a0a0a] text-accent-main focus:ring-accent-main cursor-pointer"
                                    />
                                    <div className="text-xs">
                                        <span className="text-white font-medium group-hover:text-accent-main transition-colors">
                                            Permitir a integrantes compartir enlace
                                        </span>
                                        <p className="text-zinc-500">
                                            Cualquier miembro podrá invitar a otros compañeros de coro.
                                        </p>
                                    </div>
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-5 py-2.5 bg-accent-main hover:bg-amber-600 text-black font-bold text-sm rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                    {creating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                            <span>Creando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <AppIcon name="check" />
                                            <span>Crear y Entrar</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Unirse con Código */}
            {showJoinModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 pb-20 sm:pb-6 bg-black/85 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#171717] border border-white/15 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <AppIcon name="key" className="text-accent-main" />
                                <span>Unirme a un Ministerio</span>
                            </h3>
                            <button
                                onClick={() => setShowJoinModal(false)}
                                className="text-zinc-400 hover:text-white p-1 text-lg"
                            >
                                <AppIcon name="xmark" />
                            </button>
                        </div>

                        <form onSubmit={handleJoinSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                    Código o Enlace de Invitación
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Pega el código o enlace recibido"
                                    value={joinCode}
                                    onChange={e => setJoinCode(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors"
                                />
                                <p className="text-[11px] text-zinc-500 mt-1">
                                    Pídele el código o enlace al administrador de tu coro o ministerio.
                                </p>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setShowJoinModal(false)}
                                    className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={joining}
                                    className="px-5 py-2.5 bg-accent-main hover:bg-amber-600 text-black font-bold text-sm rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                    {joining ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                            <span>Procesando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <AppIcon name="arrow-right-to-bracket" />
                                            <span>Unirme Ahora</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
