import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { searchSongs } from "../services/songs";
import { addSongToMisa } from "../services/misas";
import Modal from "@/components/Ui/Modal";
import AppIcon from "@/components/Ui/AppIcon";

export default function MisaSongManager({ misaId, moments, token, editToken }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedSong, setSelectedSong] = useState(null);
    const [selectedMomentId, setSelectedMomentId] = useState("");
    const [selectedKey, setSelectedKey] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // const [message, setMessage] = useState({ type: "", text: "" }); // Removing manual message state if not used elsewhere, but might be used by search. Keeping clean.
    const [message, setMessage] = useState({ type: "", text: "" });
    const [isOpen, setIsOpen] = useState(false);

    const openModal = () => setIsOpen(true);
    const closeModal = () => {
        setIsOpen(false);
        handleCancelSelection();
        setSearchResults([]);
        setSearchTerm("");
    };

    useEffect(() => {
        if (!isOpen) return;
        document.body.classList.add("modal-open");
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.classList.remove("modal-open");
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        setIsSearching(true);
        setMessage({ type: "", text: "" });
        try {
            const res = await searchSongs(searchTerm);
            if (res.success) {
                setSearchResults(res.data);
                if (res.data.length === 0) {
                    setMessage({ type: "info", text: "No se encontraron canciones." });
                }
            } else {
                setMessage({ type: "error", text: res.error });
            }
        } catch (error) {
            setMessage({ type: "error", text: "Error al buscar canciones." });
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectSong = (song) => {
        setSelectedSong(song);
        setSelectedKey(song.key || "C");
        setSearchResults([]);
        setSearchTerm("");
    };

    const handleAddSong = async () => {
        if (!selectedSong) return;

        if (!selectedMomentId) {
            Swal.fire({
                icon: "warning",
                title: "Momento requerido",
                text: "Por favor selecciona un momento para la canción.",
                background: "#1f2937",
                color: "#fff"
            });
            return;
        }

        setIsSubmitting(true);
        // setMessage({ type: "", text: "" });

        try {
            const res = await addSongToMisa(
                misaId,
                selectedSong.id,
                parseInt(selectedMomentId),
                selectedKey,
                token,
                editToken
            );

            if (res.success) {
                Swal.fire({
                    icon: "success",
                    title: "¡Añadida!",
                    text: "La canción se agregó correctamente",
                    timer: 1500,
                    showConfirmButton: false,
                    background: "#1f2937",
                    color: "#fff"
                }).then(() => {
                    // Reload page to show new song
                    window.location.reload();
                });

                // Reset form
                setSelectedSong(null);
                setSelectedMomentId("");
                setSelectedKey("");

            } else {
                console.error("Error adding song:", res.error, res.data);
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: res.error || "No se pudo agregar la canción",
                    footer: res.data ? `<pre class="text-xs text-left">${JSON.stringify(res.data, null, 2)}</pre>` : null,
                    background: "#1f2937",
                    color: "#fff"
                });
            }
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Error de conexión",
                background: "#1f2937",
                color: "#fff"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelSelection = () => {
        setSelectedSong(null);
        setSelectedKey("");
        setMessage({ type: "", text: "" });
    };

    useEffect(() => {
        // Function to handle the custom event
        const handleOpenModalEvent = (event) => {
            const { momentId } = event.detail;
            console.log("Received open-add-song-modal event with:", momentId);
            setSelectedMomentId(momentId);
            setIsOpen(true);
        };

        // Listen for the custom event dispatched by vanilla JS buttons
        window.addEventListener("open-add-song-modal", handleOpenModalEvent);

        // Keep the global function as a fallback/legacy, but the event is preferred
        window.openAddSongModal = (momentId) => {
            console.log("Global openAddSongModal called with:", momentId);
            setSelectedMomentId(momentId);
            setIsOpen(true);
        };

        return () => {
            window.removeEventListener("open-add-song-modal", handleOpenModalEvent);
            delete window.openAddSongModal;
        };
    }, []);

    const selectedMoment = selectedMomentId ? moments.find(m => m.id.toString() === selectedMomentId.toString()) : null;

    return (
        <>
            <button
                onClick={openModal}
                className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-dashed border-gray-300 dark:border-gray-600 mt-8"
            >
                + Agregar Canción Manualmente
            </button>

            <Modal
                isOpen={isOpen}
                onClose={closeModal}
                title="Agregar Canción"
                maxWidthClass="max-w-lg"
                bodyClassName="p-5 sm:p-6"
            >
                {selectedMoment && !selectedSong && (
                    <div className="flex justify-between items-center bg-accent-main/15 text-accent-main p-3 rounded-xl mb-4 border border-accent-main/20">
                        <span className="font-medium text-xs sm:text-sm">
                            Agregando a: <strong>{selectedMoment.nombre}</strong>
                        </span>
                        <button
                            onClick={() => setSelectedMomentId("")}
                            className="text-xs hover:underline cursor-pointer"
                        >
                            Cancelar
                        </button>
                    </div>
                )}

                            {message.text && (
                                <div
                                    className={`p-3 rounded mb-4 text-sm ${message.type === "error"
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                        : message.type === "success"
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                        }`}
                                >
                                    {message.text}
                                </div>
                            )}

                            {!selectedSong ? (
                                <div className="space-y-4">
                                    <form onSubmit={handleSearch} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Buscar canción..."
                                            className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isSearching || !searchTerm.trim()}
                                            className="bg-accent-main hover:bg-accent-main/90 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {isSearching ? "Buscando..." : "Buscar"}
                                        </button>
                                    </form>

                                    {searchResults.length > 0 ? (
                                        <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-60 overflow-y-auto">
                                            {searchResults.map((song) => (
                                                <li
                                                    key={song.id}
                                                    className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex justify-between items-center transition-colors"
                                                    onClick={() => handleSelectSong(song)}
                                                >
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                                            {song.title}
                                                        </div>
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            {song.author?.name || "Desconocido"}
                                                        </div>
                                                    </div>
                                                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300">
                                                        {song.key}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        searchTerm && !isSearching && message.text === "No se encontraron canciones." && (
                                            <div className="text-center py-4 space-y-3">
                                                <p className="text-gray-500 text-sm">¿No encuentras la canción?</p>
                                                <a
                                                    href="/songs/add"
                                                    target="_blank"
                                                    className="inline-block bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-4 rounded transition-colors"
                                                >
                                                    + Crear Nueva Canción
                                                </a>
                                                <p className="text-xs text-gray-400">Se abrirá en una nueva pestaña. Luego vuelve aquí y búscala.</p>
                                            </div>
                                        )
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex justify-between items-start bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                                        <div>
                                            <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                                                {selectedSong.title}
                                            </h4>
                                            <p className="text-gray-600 dark:text-gray-400">
                                                {selectedSong.author?.name || "Desconocido"}
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleCancelSelection}
                                            className="text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 font-medium"
                                        >
                                            Cambiar
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Momento
                                            </label>
                                            <select
                                                value={selectedMomentId}
                                                onChange={(e) => setSelectedMomentId(e.target.value)}
                                                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400"
                                            >
                                                <option value="">Seleccionar momento...</option>
                                                {moments.map((moment) => (
                                                    <option key={moment.id} value={moment.id}>
                                                        {moment.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Tono
                                            </label>
                                            <select
                                                value={selectedKey}
                                                onChange={(e) => setSelectedKey(e.target.value)}
                                                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            >
                                                {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map(
                                                    (key) => (
                                                        <option key={key} value={key}>
                                                            {key}
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            onClick={handleCancelSelection}
                                            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleAddSong}
                                            disabled={isSubmitting}
                                            className="bg-accent-main hover:bg-accent-main/90 text-white font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg shadow-accent-main/20 disabled:opacity-50 disabled:scale-100 close-modal-btn"
                                        >
                                            {isSubmitting ? "Agregando..." : "Agregar a la Misa"}
                                        </button>
                                    </div>
                                </div>
                            )}
            </Modal>
        </>
    );
}
