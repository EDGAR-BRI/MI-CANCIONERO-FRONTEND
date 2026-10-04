import React from 'react';

const commonChords = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Cm', 'Dm', 'Em', 'Am', 'Bm'];

export default function ChordToolbar({ onTranspose, onInsertChord, onInsertSection }) {
    return (
        <div className="p-2 bg-white/5 rounded-lg border border-white/10 space-y-2">
            {/* Fila 1: Transposición y Secciones */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => onTranspose(-1)}
                        className="px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-bold text-white bg-red-500/80 hover:bg-red-600 rounded transition-colors cursor-pointer active:scale-95"
                        title="Bajar medio tono"
                    >
                        - ½ Tono
                    </button>
                    <button
                        type="button"
                        onClick={() => onTranspose(1)}
                        className="px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-bold text-white bg-green-500/80 hover:bg-green-600 rounded transition-colors cursor-pointer active:scale-95"
                        title="Subir medio tono"
                    >
                        + ½ Tono
                    </button>
                </div>

                <div className="h-4 w-px bg-white/10 shrink-0"></div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => onInsertSection && onInsertSection('Estrofa')}
                        className="px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-bold text-white bg-blue-500/80 hover:bg-blue-600 rounded transition-colors cursor-pointer active:scale-95"
                        title="Insertar Estrofa"
                    >
                        Estrofa
                    </button>
                    <button
                        type="button"
                        onClick={() => onInsertSection && onInsertSection('Coro')}
                        className="px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-bold text-white bg-purple-500/80 hover:bg-purple-600 rounded transition-colors cursor-pointer active:scale-95"
                        title="Insertar Coro"
                    >
                        Coro
                    </button>
                </div>
            </div>

            {/* Fila 2: Barra táctil de acordes */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1.5 border-t border-white/10">
                <span className="text-xs text-white/50 shrink-0 mr-1 select-none">
                    Insertar:
                </span>
                <div className="flex items-center gap-1 shrink-0">
                    {commonChords.map(chord => (
                        <button
                            key={chord}
                            type="button"
                            onClick={() => onInsertChord(chord)}
                            className="px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-bold text-text-main bg-bg-secondary hover:bg-accent-main hover:text-white border border-white/10 rounded transition-colors cursor-pointer active:scale-90"
                        >
                            {chord}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
