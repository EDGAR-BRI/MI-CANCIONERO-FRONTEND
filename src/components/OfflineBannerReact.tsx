import React, { useState, useEffect } from "react";
import { subscribeNetworkStatus } from "../utils/networkStatus";
import AppIcon from "./Ui/AppIcon";

export default function OfflineBannerReact() {
    const [isOnline, setIsOnline] = useState(true);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeNetworkStatus((online) => {
            setIsOnline(online);
            if (online) {
                setDismissed(false);
            }
        });

        return () => unsubscribe();
    }, []);

    if (isOnline || dismissed) {
        return null;
    }

    return (
        <div className="w-full bg-bg-secondary border-b border-amber-500/30 px-3 py-2 text-xs text-text-main flex items-center justify-between gap-3 shadow-md z-40 transition-all">
            <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1 min-w-0">
                <AppIcon name="wifi-slash" className="text-amber-400 shrink-0 text-sm w-4 h-4" />
                <div className="truncate">
                    <span className="font-semibold text-white">Modo sin conexión.</span>{" "}
                    <span className="text-text-secondary hidden sm:inline">
                        Mostrando contenido guardado en tu dispositivo.
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <a
                    href="/offline"
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-accent-main border border-white/10 text-[11px] font-semibold transition-colors flex items-center gap-1.5"
                >
                    <AppIcon name="cloud-arrow-down" className="text-[10px] w-3 h-3" />
                    <span>Descargas</span>
                </a>
                <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    className="p-1 text-text-secondary hover:text-white rounded transition-colors cursor-pointer"
                    aria-label="Cerrar aviso"
                    title="Cerrar aviso temporalmente"
                >
                    <AppIcon name="xmark" className="text-xs w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
