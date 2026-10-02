import React, { useState, useEffect } from 'react';
import MisaCardSkeleton from './skeletons/MisaCardSkeleton';
import { getMisas } from '../services/misas';
import CreateMisaModal from './CreateMisaModal';

const parseJwt = (tokenStr) => {
    if (!tokenStr) return null;
    try {
        const base64Url = tokenStr.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
};

const MisaListReact = ({ token, currentUser, initialMisas }) => {
    const [loading, setLoading] = useState(initialMisas === undefined);
    const [misas, setMisas] = useState(initialMisas || []);
    const [userId, setUserId] = useState(() => {
        if (currentUser?.id) return currentUser.id;
        if (token) {
            const decoded = parseJwt(token);
            return decoded?.id || decoded?.sub || null;
        }
        return null;
    });
    const [showAllPasadas, setShowAllPasadas] = useState(false);

    // Modal state for creating misa (unified)
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            if (params.get("create") === "true" || params.get("create") === "1") {
                setShowCreateModal(true);
            }
        }
    }, []);

    useEffect(() => {
        if (!userId && token) {
            const decoded = parseJwt(token);
            if (decoded) {
                setUserId(decoded.id || decoded.sub || null);
            }
        }

        if (initialMisas === undefined) {
            fetchMisas();
        }
    }, [token]);

    const fetchMisas = async () => {
        try {
            setLoading(true);
            const { success, data, error } = await getMisas(token);
            if (success && Array.isArray(data)) {
                setMisas(data);
            } else if (error) {
                console.error("Error fetching misas:", error);
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


    const renderHeader = () => (
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-main/10 border border-accent-main/20 flex items-center justify-center text-accent-main shadow-inner">
                    <i className="fa-solid fa-book-bible text-lg"></i>
                </div>
                <span>Misas</span>
            </h1>
            {token || currentUser ? (
                <button
                    type="button"
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

    // Filter logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const myMisas = userId ? misas.filter(m => m.userId === userId) : [];
    const otherPublicMisas = misas.filter(m => m.visibility === 'PUBLIC' && (!userId || m.userId !== userId));

    const sortMisas = (list) => {
        return [...list].sort((a, b) => new Date(a.dateMisa) - new Date(b.dateMisa));
    };

    const myMisasVigentes = sortMisas(myMisas.filter(m => new Date(m.dateMisa) >= today));
    const allMyMisasPasadas = sortMisas(myMisas.filter(m => new Date(m.dateMisa) < today)).reverse();

    const myMisasPasadas = showAllPasadas ? allMyMisasPasadas : allMyMisasPasadas.slice(0, 6);

    const publicMisasVigentes = sortMisas(otherPublicMisas.filter(m => new Date(m.dateMisa) >= today));
    const allPublicMisasPasadas = sortMisas(otherPublicMisas.filter(m => new Date(m.dateMisa) < today)).reverse();
    const publicMisasPasadas = showAllPasadas ? allPublicMisasPasadas : allPublicMisasPasadas.slice(0, 6);

    const hasAnyMisasToShow = myMisasVigentes.length > 0 || allMyMisasPasadas.length > 0 || publicMisasVigentes.length > 0 || allPublicMisasPasadas.length > 0;

    if (!loading && (!misas.length || !hasAnyMisasToShow)) {
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
                    {token || currentUser ? (
                        <button
                            type="button"
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
                <CreateMisaModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    token={token}
                    currentUser={currentUser}
                    onSuccess={() => fetchMisas()}
                />
            </div>
        );
    }

    const renderMisaCard = (misa) => (
        <a
            key={misa.id}
            href={`/misas/view/${misa.id}`}
            className="block bg-[#121212] hover:bg-[#181818] p-4 sm:p-6 rounded-2xl transition-all border border-white/10 hover:border-accent-main/40 relative overflow-hidden group shadow-lg flex flex-col justify-between"
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

            <CreateMisaModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                token={token}
                currentUser={currentUser}
                onSuccess={() => fetchMisas()}
            />
        </div>
    );
};

export default MisaListReact;
