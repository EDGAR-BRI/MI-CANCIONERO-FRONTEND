import React, { useState, useEffect } from 'react';
import MisaCardSkeleton from './skeletons/MisaCardSkeleton';
import { getMisas } from '../services/misas';

const MisaListReact = ({ token }) => {
    const [loading, setLoading] = useState(true);
    const [misas, setMisas] = useState([]);
    const [showAllPasadas, setShowAllPasadas] = useState(false);

    useEffect(() => {
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

        fetchMisas();
    }, [token]);

    const formatDate = (dateString) => {
        // Ensure we are working with a date object
        const date = new Date(dateString);

        // If the date string is YYYY-MM-DD, it might be interpreted as UTC midnight,
        // which could show as previous day in Western Hemisphere.
        // We want to treat the date components as local.
        if (dateString.length === 10) { // Simple check for YYYY-MM-DD
            return new Date(dateString + 'T00:00:00').toLocaleDateString("es-ES", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        }

        // Fallback for full ISO strings or others
        return date.toLocaleDateString("es-ES", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "UTC" // Force UTC if we assume the server sends UTC midnight for "dates"
        });
    };

    if (loading) {
        return (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <MisaCardSkeleton key={i} />
                ))}
            </div>
        );
    }

    if (!loading && misas.length === 0) {
        return (
            <section className="flex flex-col items-center justify-center h-full gap-3.5 min-h-[50vh]">
                <p className="text-center text-gray-500">
                    No hay misas registradas.
                </p>

                {!token && (
                    <p className="text-center text-gray-500">
                        Inicia sesión para registrar misas.
                        <a
                            href="/login"
                            className="text-blue-600 hover:text-blue-700 ml-1"
                        >
                            Iniciar Sesión
                        </a>
                    </p>
                )}
            </section>
        );
    }

    // Filter logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Group misas
    const myMisas = misas.filter(m => m.isOwner);
    const otherPublicMisas = misas.filter(m => !m.isOwner && m.visibility === 'PUBLIC');

    // Sort helper
    const sortMisas = (list) => {
        return list.sort((a, b) => new Date(a.dateMisa) - new Date(b.dateMisa));
    };

    const myMisasVigentes = sortMisas(myMisas.filter(m => new Date(m.dateMisa) >= today));
    const allMyMisasPasadas = sortMisas(myMisas.filter(m => new Date(m.dateMisa) < today)).reverse(); // Show recent past first

    const myMisasPasadas = showAllPasadas ? allMyMisasPasadas : allMyMisasPasadas.slice(0, 6);

    const publicMisasVigentes = sortMisas(otherPublicMisas.filter(m => new Date(m.dateMisa) >= today));

    const renderMisaCard = (misa) => (
        <a
            key={misa.id}
            href={`/misas/${misa.id}`}
            className="block bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-md transition border border-gray-200 dark:border-gray-700 relative overflow-hidden group"
        >
            <div className="absolute top-0 right-0 p-2">
                {misa.visibility === 'PUBLIC' ? (
                    <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-accent-main ring-1 ring-inset ring-accent-main/20 dark:bg-accent-main/30 dark:text-accent-main">
                        Pública
                    </span>
                ) : (
                    <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700">
                        Privada
                    </span>
                )}
            </div>

            <h3 className="text-xl font-bold mb-2 pr-12 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {misa.title}
            </h3>

            <p className="text-gray-600 dark:text-gray-400 mb-1">
                📅 {formatDate(misa.dateMisa)}
            </p>

            <div className="flex items-center justify-between mt-3">
                <p className="text-sm text-gray-500">
                    {misa.misaSongs.length} canciones
                </p>
                {misa.user && !misa.isOwner && (
                    <p className="text-xs text-gray-400">
                        Por: {misa.user.name}
                    </p>
                )}
            </div>
        </a>
    );

    return (
        <div className="space-y-12">
            {/* My Misas Section */}
            {(myMisasVigentes.length > 0 || allMyMisasPasadas.length > 0) && (
                <section>
                    <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                        Mis Misas
                    </h2>

                    {myMisasVigentes.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-xl font-semibold mb-4 text-accent-main dark:text-accent-main flex items-center gap-2">
                                Próximas
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {myMisasVigentes.map(renderMisaCard)}
                            </div>
                        </div>
                    )}

                    {allMyMisasPasadas.length > 0 && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold text-gray-500 flex items-center gap-2">
                                    <span>history</span> Anteriores
                                </h3>
                                {!showAllPasadas && allMyMisasPasadas.length > 6 && (
                                    <button
                                        onClick={() => setShowAllPasadas(true)}
                                        className="text-accent-main hover:text-accent-main text-sm font-medium hover:underline"
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
                                        className="text-gray-500 hover:text-gray-700 text-sm hover:underline"
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
                    <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                        Misas Públicas
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {publicMisasVigentes.map(renderMisaCard)}
                    </div>
                </section>
            )}

            {!token && publicMisasVigentes.length > 0 && (
                <section>
                    <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                        Próximas Misas Públicas
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {publicMisasVigentes.map(renderMisaCard)}
                    </div>
                </section>
            )}
        </div>
    );
};

export default MisaListReact;
