import React, { useState, useEffect } from "react";
import type { Misa } from "../types/misa";
import { createMisa } from "../services/misas";
import { getMyMinistries, type MinistrySummary } from "../services/ministries";
import { showError, showSuccessToast } from "../utils/alerts";

export interface CreateMisaModalProps {
    isOpen: boolean;
    onClose: () => void;
    token?: string;
    currentUser?: any;
    initialMinistries?: MinistrySummary[];
    defaultMinistryId?: number | string | null;
    onSuccess?: (createdMisa: Misa) => void;
    redirectToCreated?: boolean;
}

const getUpcomingSundayString = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday
    const daysUntilSunday = (7 - dayOfWeek) % 7;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilSunday);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export default function CreateMisaModal({
    isOpen,
    onClose,
    token,
    currentUser,
    initialMinistries = [],
    defaultMinistryId = "",
    onSuccess,
    redirectToCreated = true,
}: CreateMisaModalProps) {
    const [newTitle, setNewTitle] = useState("");
    const [newDate, setNewDate] = useState(getUpcomingSundayString());
    const [newTime, setNewTime] = useState("10:00");
    const [newVisibility, setNewVisibility] = useState<"PUBLIC" | "PRIVATE">("PRIVATE");
    const [selectedMinistryId, setSelectedMinistryId] = useState(
        defaultMinistryId ? String(defaultMinistryId) : ""
    );
    const [ministries, setMinistries] = useState<MinistrySummary[]>(initialMinistries);
    const [creating, setCreating] = useState(false);

    // Fetch user's ministries if not provided and token is available
    useEffect(() => {
        if (!isOpen) return;

        if (token && (!ministries || ministries.length === 0)) {
            getMyMinistries(token).then((res) => {
                if (res.success && res.data?.ministries) {
                    const list = res.data.ministries;
                    setMinistries(list);
                    // Si el usuario pertenece a un solo grupo y no se pasó uno por defecto, elegirlo por defecto
                    if (list.length === 1 && !defaultMinistryId) {
                        setSelectedMinistryId(String(list[0].id));
                    }
                }
            });
        } else if (ministries.length === 1 && !defaultMinistryId && !selectedMinistryId) {
            setSelectedMinistryId(String(ministries[0].id));
        }
    }, [isOpen, token, defaultMinistryId]);

    // Update default ministry when prop changes
    useEffect(() => {
        if (defaultMinistryId) {
            setSelectedMinistryId(String(defaultMinistryId));
        }
    }, [defaultMinistryId]);

    if (!isOpen) return null;

    const selectedMinistry = ministries.find((m) => String(m.id) === selectedMinistryId);

    const handleCreateMisa = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        const titleTrimmed = newTitle.trim();
        if (!titleTrimmed) {
            showError("Campo requerido", "Por favor ingresa un título para la misa.");
            return;
        }
        if (!newDate) {
            showError("Campo requerido", "Por favor selecciona una fecha.");
            return;
        }

        if (!token && !currentUser) {
            window.location.href = "/login?redirect=/misas";
            return;
        }

        setCreating(true);
        try {
            const combinedDateTime = `${newDate}T${newTime || "10:00"}:00`;
            const ministryIdNum = selectedMinistryId ? parseInt(selectedMinistryId) : null;

            const { success, data, error } = await createMisa(
                titleTrimmed,
                combinedDateTime,
                newVisibility,
                token,
                ministryIdNum
            );

            if (success && data?.id) {
                await showSuccessToast("Misa creada exitosamente");
                // Reset form state
                setNewTitle("");
                setNewDate(getUpcomingSundayString());
                setNewTime("10:00");
                setNewVisibility("PRIVATE");
                // Reset to default or single ministry if applicable
                const fallbackId = defaultMinistryId
                    ? String(defaultMinistryId)
                    : ministries.length === 1
                    ? String(ministries[0].id)
                    : "";
                setSelectedMinistryId(fallbackId);
                onClose();

                if (onSuccess) {
                    onSuccess(data);
                }

                if (redirectToCreated) {
                    window.location.href = `/misas/${data.id}`;
                }
            } else {
                showError("Error al crear misa", error || "No se pudo guardar la misa.");
            }
        } catch (err: any) {
            showError("Error inesperado", err?.message || "Error al conectar con el servidor.");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
            onClick={() => !creating && onClose()}
        >
            <div
                className="bg-bg-secondary border border-white/10 rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative space-y-5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Modal */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-main/10 border border-accent-main/20 text-accent-main flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-book-bible text-base"></i>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white tracking-tight">
                                Crear Nueva Misa
                            </h3>
                            <p className="text-xs text-text-secondary">
                                Organiza el repertorio litúrgico
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => !creating && onClose()}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Cerrar"
                    >
                        <i className="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleCreateMisa} className="space-y-4">
                    {/* Título */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                            Título / Ocasión <span className="text-accent-main">*</span>
                        </label>
                        <div className="relative">
                            <i className="fa-solid fa-heading absolute left-3.5 top-3 text-text-secondary text-sm"></i>
                            <input
                                type="text"
                                required
                                autoFocus
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Ej. Domingo 26 del Tiempo Ordinario, Jueves Santo..."
                                className="w-full pl-10 pr-4 py-2.5 bg-bg-main border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Fecha y Hora */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                Fecha <span className="text-accent-main">*</span>
                            </label>
                            <div className="relative">
                                <i className="fa-solid fa-calendar-day absolute left-3.5 top-3 text-text-secondary text-sm"></i>
                                <input
                                    type="date"
                                    required
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-bg-main border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors dark:[&::-webkit-calendar-picker-indicator]:invert cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                Hora <span className="text-accent-main">*</span>
                            </label>
                            <div className="relative">
                                <i className="fa-solid fa-clock absolute left-3.5 top-3 text-text-secondary text-sm"></i>
                                <input
                                    type="time"
                                    required
                                    value={newTime}
                                    onChange={(e) => setNewTime(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-bg-main border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors dark:[&::-webkit-calendar-picker-indicator]:invert cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Propietario de la Misa (Ministerio o Personal) */}
                    {ministries.length > 0 && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                    Propietario de la misa
                                </label>
                                <span className="text-[10px] text-text-secondary">
                                    {selectedMinistryId
                                        ? "Colaborativa con tu grupo"
                                        : "Solo para tu repertorio"}
                                </span>
                            </div>
                            {ministries.length === 1 ? (
                                <div className="grid grid-cols-2 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMinistryId(String(ministries[0].id))}
                                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2.5 ${
                                            selectedMinistryId === String(ministries[0].id)
                                                ? "border-accent-main bg-accent-main/10 text-white shadow-sm ring-1 ring-accent-main/30"
                                                : "border-white/10 bg-bg-main text-text-secondary hover:text-white hover:border-white/20"
                                        }`}
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-accent-main/20 text-accent-main flex items-center justify-center shrink-0">
                                            <i className="fa-solid fa-users text-xs"></i>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-bold truncate text-white">
                                                {ministries[0].name}
                                            </div>
                                            <div className="text-[10px] text-text-secondary">Propietario: Grupo</div>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setSelectedMinistryId("")}
                                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2.5 ${
                                            selectedMinistryId === ""
                                                ? "border-accent-main bg-accent-main/10 text-white shadow-sm ring-1 ring-accent-main/30"
                                                : "border-white/10 bg-bg-main text-text-secondary hover:text-white hover:border-white/20"
                                        }`}
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-white/10 text-text-secondary flex items-center justify-center shrink-0">
                                            <i className="fa-solid fa-user text-xs"></i>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-bold text-white">Personal</div>
                                            <div className="text-[10px] text-text-secondary">Propietario: Solo tú</div>
                                        </div>
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <i className="fa-solid fa-users absolute left-3.5 top-3 text-text-secondary text-sm"></i>
                                    <select
                                        value={selectedMinistryId}
                                        onChange={(e) => setSelectedMinistryId(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-bg-main border border-white/10 focus:border-accent-main rounded-xl text-white text-sm outline-none transition-colors cursor-pointer"
                                    >
                                        <option value="">👤 Personal (Propietario: Solo tú)</option>
                                        {ministries.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                👥 {m.name} (Propietario: Grupo) {m.myRole === "ADMIN" ? "· Admin" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {selectedMinistryId && (
                                <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-0.5">
                                    <i className="fa-solid fa-circle-info text-accent-main text-[10px]"></i>
                                    <span>Cualquier miembro del grupo podrá ver y editar el repertorio de esta misa.</span>
                                </p>
                            )}
                        </div>
                    )}

                    {/* Visibilidad / Privacidad */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                            Privacidad de la misa
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setNewVisibility("PRIVATE")}
                                className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                                    newVisibility === "PRIVATE"
                                        ? "border-accent-main bg-accent-main/10 text-white ring-1 ring-accent-main/30"
                                        : "border-white/10 bg-bg-main text-text-secondary hover:border-white/20 hover:text-white"
                                }`}
                            >
                                <div className="flex items-center gap-1.5 font-bold text-xs">
                                    <i className="fa-solid fa-lock text-accent-main"></i>
                                    <span>Privada</span>
                                </div>
                                <span className="text-[11px] text-text-secondary leading-snug">
                                    {selectedMinistryId
                                        ? `Solo para los miembros de ${selectedMinistry?.name || "tu grupo"}`
                                        : "Solo tú podrás verla"}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setNewVisibility("PUBLIC")}
                                className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                                    newVisibility === "PUBLIC"
                                        ? "border-accent-main bg-accent-main/10 text-white ring-1 ring-accent-main/30"
                                        : "border-white/10 bg-bg-main text-text-secondary hover:border-white/20 hover:text-white"
                                }`}
                            >
                                <div className="flex items-center gap-1.5 font-bold text-xs">
                                    <i className="fa-solid fa-globe text-emerald-400"></i>
                                    <span>Pública</span>
                                </div>
                                <span className="text-[11px] text-text-secondary leading-snug">
                                    {selectedMinistryId
                                        ? `Visible a todos (identificada con ${selectedMinistry?.name || "tu grupo"})`
                                        : "Visible para toda la comunidad"}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => onClose()}
                            disabled={creating}
                            className="px-4 py-2.5 text-xs font-semibold text-text-secondary hover:text-white rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={creating}
                            className="px-5 py-2.5 bg-accent-main hover:bg-accent-main/90 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                        >
                            {creating ? (
                                <>
                                    <i className="fa-solid fa-spinner animate-spin text-xs"></i>
                                    <span>Creando...</span>
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-plus text-xs"></i>
                                    <span>Crear Misa</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
