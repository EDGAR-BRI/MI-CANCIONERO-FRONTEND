import AppIcon from "@/components/Ui/AppIcon";
import React, { useState, useEffect } from "react";
import type { Misa } from "../types/misa";
import {
    isMisaOffline,
    saveMisaOffline,
    deleteMisaOffline,
    cacheUrlsForOffline,
} from "../utils/offlineStorage";
import { showSuccessToast, showError, showConfirm } from "../utils/alerts";
import { API_URL } from "../services/songs";

interface Props {
    misaId: number;
    initialMisa?: Misa | null;
    token?: string;
    variant?: "compact" | "full" | "icon";
    className?: string;
}

export default function MisaOfflineDownloadButtonReact({
    misaId,
    initialMisa,
    token,
    variant = "full",
    className = "",
}: Props) {
    const [isSaved, setIsSaved] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        if (misaId) {
            isMisaOffline(misaId)
                .then((saved) => {
                    if (mounted) setIsSaved(saved);
                })
                .catch(() => {});
        }

        const handleOfflineChange = (e: any) => {
            if (e?.detail?.type === "misa" && Number(e?.detail?.id) === Number(misaId)) {
                setIsSaved(e.detail.action === "saved");
            }
        };

        window.addEventListener("cancionero-offline-change", handleOfflineChange);
        return () => {
            mounted = false;
            window.removeEventListener("cancionero-offline-change", handleOfflineChange);
        };
    }, [misaId]);

    const handleToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isLoading || !misaId) return;

        if (isSaved) {
            const confirm = await showConfirm(
                "¿Quitar descarga?",
                "Esta misa ya no estará disponible sin conexión.",
                "Sí, quitar descarga"
            );
            if (!confirm.isConfirmed) return;

            try {
                setIsLoading(true);
                await deleteMisaOffline(misaId);
                setIsSaved(false);
                await showSuccessToast("Misa quitada de descargas");
            } catch (err) {
                console.error("Error al quitar descarga de misa:", err);
                showError("Error", "No se pudo quitar la misa de descargas.");
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // Proceso de guardado offline
        try {
            setIsLoading(true);
            let fullMisa = initialMisa;

            // Si no tenemos la misa o faltan sus cantos, la consultamos a la API
            if (!fullMisa || !Array.isArray(fullMisa.misaSongs)) {
                const headers: HeadersInit = {};
                if (token) headers["Authorization"] = `Bearer ${token}`;
                const res = await fetch(`${API_URL}/misas/${misaId}`, {
                    headers,
                    credentials: "include",
                });
                if (res.ok) {
                    fullMisa = await res.json();
                }
            }

            if (!fullMisa) {
                showError("Error", "No se pudo obtener la información de la misa para descargar.");
                return;
            }

            await saveMisaOffline(fullMisa);

            // Precachear rutas en el Service Worker
            await cacheUrlsForOffline([
                `/misas/${misaId}`,
                `/misas/view/${misaId}`,
            ]);

            setIsSaved(true);
            const songCount = (fullMisa.misaSongs || []).length;
            await showSuccessToast(
                "Misa lista para sin conexión",
                `Guardada con ${songCount} ${songCount === 1 ? "canto" : "cantos"}. Podrás verla sin internet.`
            );
        } catch (err) {
            console.error("Error al guardar misa offline:", err);
            showError("Error al guardar", "Ocurrió un problema al guardar la misa sin conexión.");
        } finally {
            setIsLoading(false);
        }
    };

    if (variant === "icon") {
        return (
            <button
                type="button"
                onClick={handleToggle}
                disabled={isLoading}
                title={isSaved ? "Descargada sin conexión (clic para quitar)" : "Descargar para uso sin conexión"}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 ${
                    isSaved
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/5"
                } ${className}`}
            >
                {isLoading ? (
                    <AppIcon name="circle-notch" spin className="text-xs" />
                ) : isSaved ? (
                    <AppIcon name="check" className="text-xs" />
                ) : (
                    <AppIcon name="cloud-arrow-down" className="text-xs" />
                )}
            </button>
        );
    }

    if (variant === "compact") {
        return (
            <button
                type="button"
                onClick={handleToggle}
                disabled={isLoading}
                title={isSaved ? "Disponible sin conexión (clic para quitar)" : "Descargar para uso sin conexión"}
                className={`h-9 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 ${
                    isSaved
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/10"
                } ${className}`}
            >
                {isLoading ? (
                    <AppIcon name="circle-notch" spin className="text-[11px]" />
                ) : isSaved ? (
                    <>
                        <AppIcon name="check" className="text-[10px]" />
                        <span className="hidden sm:inline">Descargada</span>
                    </>
                ) : (
                    <>
                        <AppIcon name="cloud-arrow-down" className="text-[11px]" />
                        <span className="hidden sm:inline">Descargar</span>
                    </>
                )}
            </button>
        );
    }

    // Default: full button
    return (
        <button
            type="button"
            onClick={handleToggle}
            disabled={isLoading}
            title={isSaved ? "Misa guardada en tu dispositivo (clic para quitar)" : "Guardar toda la misa para usar sin internet"}
            className={`w-full sm:w-auto h-9 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 whitespace-nowrap ${
                isSaved
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                    : "bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/10"
            } ${className}`}
        >
            {isLoading ? (
                <>
                    <AppIcon name="circle-notch" spin className="text-[11px] text-accent-main" />
                    <span>Guardando...</span>
                </>
            ) : isSaved ? (
                <>
                    <AppIcon name="check" className="text-[10px] text-emerald-400" />
                    <span>Descargada</span>
                </>
            ) : (
                <>
                    <AppIcon name="cloud-arrow-down" className="text-[11px]" />
                    <span>Guardar Offline</span>
                </>
            )}
        </button>
    );
}
