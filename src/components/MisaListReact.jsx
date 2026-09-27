import React, { useState, useEffect } from 'react';
import MisaCardSkeleton from './skeletons/MisaCardSkeleton';
import { getMisas, createMisa } from '../services/misas';
import { showError, showSuccessToast } from '../utils/alerts';
import { jwtDecode } from "jwt-decode";

const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const MisaListReact = ({ token }) => {
    const [loading, setLoading] = useState(true);
    const [misas, setMisas] = useState([]);
    const [userId, setUserId] = useState(null);
    const [showAllPasadas, setShowAllPasadas] = useState(false);

    // Modal state for creating misa
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDate, setNewDate] = useState(getTodayString());
    const [newVisibility, setNewVisibility] = useState('PRIVATE');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUserId(decoded.id || decoded.sub);
            } catch (e) {
                console.error("Error decoding token:", e);
            }
        }

        fetchMisas();
    }, [token]);

    const fetchMisas = async () => {
        try {
            const { success, data } = await getMisas(token);
            if (success && data) {
                setMisas(data);
            }
        } catch (error) {
            console.error("Error fetching misas:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        if (dateString.length === 10) {
            return new Date(dateString + 'T00:00:00').toLocaleDateString("es-ES", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        }
        return date.toLocaleDateString("es-ES", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "UTC"
        });
    };

    const handleCreateMisa = async (e) => {
        e.preventDefault();
        const titleTrimmed = newTitle.trim();
        if (!titleTrimmed) {
            showError("Campo requerido", "Por favor ingresa un título para la misa");
            return;
        }
        if (!newDate) {
            showError("Campo requerido", "Por favor selecciona una fecha");
            return;
        }
        if (!token) {
            showError("Sesión requerida", "Inicia sesión para crear misas");
            window.location.href = "/login?redirect=/misas";
            return;
        }

        setCreating(true);
        try {
            const { success, data, error } = await createMisa(titleTrimmed, newDate, newVisibility, token);
            if (success) {
                await showSuccessToast("Misa creada correctamente");
                setShowCreateModal(false);
                setNewTitle('');
                setNewDate(getTodayString());
                setNewVisibility('PRIVATE');
                if (data?.id) {
                    window.location.href = `/misas/${data.id}`;
                } else {
                    await fetchMisas();
                }
            } else {
                showError("Error", error || "No se pudo crear la misa");
            }
        } catch (err) {
            showError("Error", "Error inesperado al crear la misa");
        } finally {
            setCreating(false);
        }
    };

    const renderHeader = () => (
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-main/10 border border-accent-main/20 flex items-center justify-center text-accent-main shadow-inner">
                    <i className="fa-solid fa-book-bible text-lg"></i>
                </div>
                <span>Misas</span>
            </h1>
            {token ? (
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-accent-main hover:bg-amber-600 text-black font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all shadow-md inline-flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                    <i className="fa-solid fa-plus text-xs"></i>
                    <span>Nueva Misa</span>
                </button>
            ) : (
                <a
                    href="/login?redirect=/misas"
                    className="border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs sm:text-sm py-2 px-3.5 rounded-xl transition-all inline-flex items-center gap-2"
                >
                    <i className="fa-solid fa-user text-xs"></i>
                    <span>Ingresar</span>
                </a>
            )}
        </div>
    );

    const renderModal = () => {
        if (!showCreateModal) return null;
        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
                onClick={() => !creating && setShowCreateModal(false)}
            >
                <div
                    className="bg-[#121212] border border-white/15 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-5"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header Modal */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-accent-main/10 border border-accent-main/20 flex items-center justify-center text-accent-main">
                                <i className="fa-solid fa-book-bible text-lg"></i>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Crear Nueva Misa</h3>
                                <p className="text-xs text-zinc-400">Organiza el repertorio litúrgico</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => !creating && setShowCreateModal(false)}
                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    {/* Formulario */}
                    <form onSubmit={handleCreateMisa} className="space-y-4">
                        {/* Título */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                                Título / Ocasión <span className="text-accent-main">*</span>
                            </label>
                            <div className="relative">
                                <i className="fa-solid fa-heading absolute left-3.5 top-3 text-zinc-500 text-sm"></i>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="Ej. Misa de Domingo, Jueves Santo, Pascua..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors"
                                />
                            </div>
                        </div>

                        {/* Fecha */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                                Fecha <span className="text-accent-main">*</span>
                            </label>
                            <div className="relative">
                                <i className="fa-solid fa-calendar-day absolute left-3.5 top-3 text-zinc-500 text-sm"></i>
                                <input
                                    type="date"
                                    required
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors dark:[&::-webkit-calendar-picker-indicator]:invert cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Visibilidad */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                                Visibilidad
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setNewVisibility('PRIVATE')}
                                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                                        newVisibility === 'PRIVATE'
                                            ? 'border-accent-main bg-accent-main/10 text-white'
                                            : 'border-white/10 bg-[#0a0a0a] text-zinc-400 hover:border-white/20'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 font-bold text-xs">
                                        <i className="fa-solid fa-lock text-accent-main"></i>
                                        <span>Privada</span>
                                    </div>
                                    <span className="text-[10px] text-zinc-400">Solo tú y enlace</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setNewVisibility('PUBLIC')}
                                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                                        newVisibility === 'PUBLIC'
                                            ? 'border-accent-main bg-accent-main/10 text-white'
                                            : 'border-white/10 bg-[#0a0a0a] text-zinc-400 hover:border-white/20'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 font-bold text-xs">
                                        <i className="fa-solid fa-globe text-emerald-400"></i>
                                        <span>Pública</span>
                                    </div>
                                    <span className="text-[10px] text-zinc-400">Visible a todos</span>
                                </button>
                            </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                disabled={creating}
                                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={creating}
                                className="px-5 py-2.5 bg-accent-main hover:bg-amber-600 text-black font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                            >
                                {creating ? (
                                    <>
                                        <i className="fa-solid fa-spinner fa-spin"></i>
                                        <span>Creando...</span>
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-plus"></i>
                                        <span>Crear Misa</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div>
                {renderHeader()}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <MisaCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    if (!loading && misas.length === 0) {
        return (
            <div>
                {renderHeader()}
                <section className="bg-[#121212] border border-white/10 rounded-2xl p-10 text-center space-y-3 min-h-[300px] flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 mb-2">
                        <i className="fa-solid fa-book-bible text-2xl"></i>
                    </div>
                    <p className="text-base font-bold text-white">
                        No hay misas registradas todavía
                    </p>
                    <p className="text-xs text-zinc-400 max-w-sm">
                        Crea tu primera misa para planificar los cantos litúrgicos de tu comunidad o ministerio.
                    </p>
                    {token ? (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-2 px-5 py-2.5 bg-accent-main hover:bg-amber-600 text-black font-bold text-xs rounded-xl transition-all shadow-md inline-flex items-center gap-2 active:scale-95 cursor-pointer"
                        >
                            <i className="fa-solid fa-plus"></i>
                            <span>Crear Primera Misa</span>
                        </button>
                    ) : (
                        <a
                            href="/login?redirect=/misas"
                            className="mt-2 px-5 py-2.5 bg-accent-main hover:bg-amber-600 text-black font-bold text-xs rounded-xl transition-all shadow-md inline-flex items-center gap-2 active:scale-95"
                        >
                            <i className="fa-solid fa-arrow-right-to-bracket"></i>
                            <span>Iniciar Sesión</span>
                        </a>
                    )}
                </section>
                {renderModal()}
            </div>
        );
    }

    // Filter logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const myMisas = misas.filter(m => m.userId === userId);
    const otherPublicMisas = misas.filter(m => m.userId !== userId && m.visibility === 'PUBLIC');

    const sortMisas = (list) => {
        return list.sort((a, b) => new Date(a.dateMisa) - new Date(b.dateMisa));
    };

    const myMisasVigentes = sortMisas(myMisas.filter(m => new Date(m.dateMisa) >= today));
    const allMyMisasPasadas = sortMisas(myMisas.filter(m => new Date(m.dateMisa) < today)).reverse();

    const myMisasPasadas = showAllPasadas ? allMyMisasPasadas : allMyMisasPasadas.slice(0, 6);

    const publicMisasVigentes = sortMisas(otherPublicMisas.filter(m => new Date(m.dateMisa) >= today));
    const allPublicMisasPasadas = sortMisas(otherPublicMisas.filter(m => new Date(m.dateMisa) < today)).reverse();
    const publicMisasPasadas = showAllPasadas ? allPublicMisasPasadas : allPublicMisasPasadas.slice(0, 6);

    const renderMisaCard = (misa) => (
        <a
            key={misa.id}
            href={`/misas/${misa.id}`}
            className="block bg-[#121212] hover:bg-[#181818] p-5 sm:p-6 rounded-2xl transition-all border border-white/10 hover:border-accent-main/40 relative overflow-hidden group shadow-lg flex flex-col justify-between"
        >
            <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                    {misa.visibility === 'PUBLIC' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                            <i className="fa-solid fa-globe text-[10px]"></i> Pública
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-zinc-400 border border-white/10">
                            <i className="fa-solid fa-lock text-[10px]"></i> Privada
                        </span>
                    )}
                </div>

                <h3 className="text-lg font-bold mb-2.5 text-white group-hover:text-accent-main transition-colors line-clamp-2">
                    {misa.title}
                </h3>

                <p className="text-zinc-400 text-xs flex items-center gap-2 mb-4">
                    <i className="fa-solid fa-calendar-day text-accent-main/80"></i>
                    <span className="capitalize">{formatDate(misa.dateMisa)}</span>
                </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs mt-2">
                <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
                    <i className="fa-solid fa-music text-zinc-500"></i>
                    {misa.misaSongs?.length || 0} {(misa.misaSongs?.length === 1) ? 'canción' : 'canciones'}
                </span>
                {misa.user && misa.userId !== userId && (
                    <span className="text-zinc-500 text-[11px] truncate max-w-[130px]">
                        Por: {misa.user.name}
                    </span>
                )}
            </div>
        </a>
    );

    return (
        <div className="space-y-10">
            {renderHeader()}

            {/* My Misas Section */}
            {(myMisasVigentes.length > 0 || allMyMisasPasadas.length > 0) && (
                <section>
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 text-white border-b border-white/10 pb-2">
                        Mis Misas
                    </h2>

                    {myMisasVigentes.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-sm sm:text-base font-semibold mb-3 text-accent-main flex items-center gap-2">
                                <i className="fa-solid fa-circle-check text-xs"></i>
                                <span>Próximas Celebraciones</span>
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {myMisasVigentes.map(renderMisaCard)}
                            </div>
                        </div>
                    )}

                    {allMyMisasPasadas.length > 0 && (
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm sm:text-base font-semibold text-zinc-400 flex items-center gap-2">
                                    <i className="fa-solid fa-clock-rotate-left text-xs"></i>
                                    <span>Anteriores</span>
                                </h3>
                                {!showAllPasadas && allMyMisasPasadas.length > 6 && (
                                    <button
                                        onClick={() => setShowAllPasadas(true)}
                                        className="text-accent-main hover:text-amber-400 text-xs font-semibold cursor-pointer"
                                    >
                                        Ver todas &rarr;
                                    </button>
                                )}
                            </div>

                            <div className="grid gap-4 opacity-80 hover:opacity-100 transition-opacity sm:grid-cols-2 lg:grid-cols-3">
                                {myMisasPasadas.map(renderMisaCard)}
                            </div>

                            {showAllPasadas && (
                                <div className="mt-4 text-center">
                                    <button
                                        onClick={() => setShowAllPasadas(false)}
                                        className="text-zinc-400 hover:text-white text-xs font-semibold hover:underline cursor-pointer"
                                    >
                                        Ver menos
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            )}

            {/* Public Misas Section */}
            {publicMisasVigentes.length > 0 && (
                <section>
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 text-white border-b border-white/10 pb-2">
                        Misas Públicas
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {publicMisasVigentes.map(renderMisaCard)}
                    </div>
                </section>
            )}

            {allPublicMisasPasadas.length > 0 && (
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm sm:text-base font-semibold text-zinc-400 flex items-center gap-2">
                            <i className="fa-solid fa-clock-rotate-left text-xs"></i>
                            <span>Misas Públicas Anteriores</span>
                        </h3>
                        {!showAllPasadas && allPublicMisasPasadas.length > 6 && (
                            <button
                                onClick={() => setShowAllPasadas(true)}
                                className="text-accent-main hover:text-amber-400 text-xs font-semibold cursor-pointer"
                            >
                                Ver todas &rarr;
                            </button>
                        )}
                    </div>

                    <div className="grid gap-4 opacity-80 hover:opacity-100 transition-opacity sm:grid-cols-2 lg:grid-cols-3">
                        {publicMisasPasadas.map(renderMisaCard)}
                    </div>

                    {showAllPasadas && (
                        <div className="mt-4 text-center">
                            <button
                                onClick={() => setShowAllPasadas(false)}
                                className="text-zinc-400 hover:text-white text-xs font-semibold hover:underline cursor-pointer"
                            >
                                Ver menos
                            </button>
                        </div>
                    )}
                </div>
            )}

            {renderModal()}
        </div>
    );
};

export default MisaListReact;
