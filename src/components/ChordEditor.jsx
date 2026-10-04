import React, { useState, useRef, useEffect } from 'react';
import { transposeText, transposeChord } from '../utils/music';
import ChordToolbar from './ChordToolbar';
import SongLine from './SongLine';
import AppIcon from './Ui/AppIcon';

export default function ChordEditor({ name = "content", initialContent = "", initialKey = "C" }) {
    // Estado inicial: si viene initialContent usarlo, si no, revisar si hay datos precargados en sessionStorage
    const [content, setContent] = useState(() => {
        if (initialContent) return initialContent;
        if (typeof window !== 'undefined') {
            try {
                const raw = sessionStorage.getItem('prefill_external_song');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    const chord = parsed.chordPro || parsed.content;
                    if (chord) return chord;
                }
            } catch (e) {}
        }
        return '';
    });

    const [currentKey, setCurrentKey] = useState(() => {
        if (initialKey && initialKey !== 'C') return initialKey;
        if (typeof window !== 'undefined') {
            try {
                const raw = sessionStorage.getItem('prefill_external_song');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed.key) return parsed.key;
                }
            } catch (e) {}
        }
        return initialKey || 'C';
    });

    const [mobileTab, setMobileTab] = useState('editor'); // 'editor' | 'preview'
    const keyRef = useRef(currentKey); // Ref para acceso síncrono y evitar doble transposición
    const textareaRef = useRef(null);

    const commonChords = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Cm', 'Dm', 'Em', 'Am', 'Bm'];

    useEffect(() => {
        const handleKeyChange = (e) => {
            const newKey = e.detail.key;
            // Usamos keyRef.current para saber la tonalidad ACTUAL real (incluso si se acabó de cambiar localmente)
            const fromKey = keyRef.current;

            if (fromKey !== newKey) {
                setContent(prevContent => transposeText(prevContent, fromKey, newKey));
                setCurrentKey(newKey);
                keyRef.current = newKey; // Sincronizamos ref
            }
        };

        // Escuchar evento para actualizar contenido desde fuera (ej: AI autocomplete o importador)
        const handleContentUpdate = (e) => {
            const newContent = e.detail?.content || e.detail?.chordPro;
            if (newContent !== undefined && newContent !== null) {
                setContent(newContent);
                if (e.detail?.key) {
                    setCurrentKey(e.detail.key);
                    keyRef.current = e.detail.key;
                }
            }
        };

        window.addEventListener('song-key-change', handleKeyChange);
        window.addEventListener('update-editor-content', handleContentUpdate);

        // Notificar que el editor está montado y listo
        window.dispatchEvent(new CustomEvent('chord-editor-mounted'));

        return () => {
            window.removeEventListener('song-key-change', handleKeyChange);
            window.removeEventListener('update-editor-content', handleContentUpdate);
        };
    }, []);

    const addChord = (chordName) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;

        // Insertamos formato [Acorde]
        const newText = text.substring(0, start) + `[${chordName}]` + text.substring(end);

        setContent(newText);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + chordName.length + 2, start + chordName.length + 2);
        }, 0);
    };

    const handleTranspose = (semitones) => {
        const newContent = content.replace(/\[(.*?)\]/g, (match, chord) => {
            return `[${transposeChord(chord, semitones)}]`;
        });
        setContent(newContent);

        // Calcular nueva tonalidad
        const nextKey = transposeChord(keyRef.current, semitones);

        // Actualizamos Refs y Estado INMEDIATAMENTE antes de despachar el evento
        keyRef.current = nextKey;
        setCurrentKey(nextKey);

        // Despachamos evento. 
        // Cuando el evento 'song-key-change' regrese (eco), handleKeyChange verá que keyRef.current === nextKey
        // y NO hará una segunda transposición.
        window.dispatchEvent(new CustomEvent('editor-key-change', {
            detail: { key: nextKey }
        }));
    };

    const addSection = (type) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;

        let insertText = "";

        if (type === "Coro") {
            insertText = "{c: Coro}\n";
        } else if (type === "Estrofa") {
            // Contar estrofas existentes para auto-incrementar
            // Buscamos todas las ocurrencias de {c: Estrofa N}
            const matches = [...text.matchAll(/\{c:\s*Estrofa\s*(\d+)\}/gi)];

            let maxNum = 0;
            matches.forEach(m => {
                const num = parseInt(m[1], 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            });

            insertText = `{c: Estrofa ${maxNum + 1}}\n`;
        }

        const newText = text.substring(0, start) + insertText + text.substring(end);
        setContent(newText);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + insertText.length, start + insertText.length);
        }, 0);
    };

    return (
        <div className="space-y-4">
            {/* TRUCO: Input oculto para que el formulario de Astro reciba los datos */}
            <input type="hidden" name={name} value={content} />

            {/* Switch de modo para móviles (Editor / Vista Previa) */}
            <div className="lg:hidden flex bg-bg-secondary p-1 rounded-xl border border-white/10 shadow-sm">
                <button
                    type="button"
                    onClick={() => setMobileTab('editor')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                        mobileTab === 'editor'
                            ? 'bg-accent-main text-white shadow-md'
                            : 'text-text-secondary hover:text-white hover:bg-white/5'
                    }`}
                >
                    <AppIcon name="pen-to-square" className="w-4 h-4 shrink-0" />
                    <span>Editor</span>
                </button>
                <button
                    type="button"
                    onClick={() => setMobileTab('preview')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                        mobileTab === 'preview'
                            ? 'bg-accent-main text-white shadow-md'
                            : 'text-text-secondary hover:text-white hover:bg-white/5'
                    }`}
                >
                    <AppIcon name="eye" className="w-4 h-4 shrink-0" />
                    <span>Vista Previa</span>
                </button>
            </div>

            {/* Botonera Reutilizable (en móvil solo en pestaña de editor) */}
            <div className={mobileTab === 'editor' ? 'block' : 'hidden lg:block'}>
                <ChordToolbar onTranspose={handleTranspose} onInsertChord={addChord} onInsertSection={addSection} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Área de Edición */}
                <div className={`${mobileTab === 'editor' ? 'flex' : 'hidden'} lg:flex flex-col h-[400px] lg:h-[500px]`}>
                    <label className="text-sm font-medium text-text-secondary mb-2 hidden lg:block">Editor (Código)</label>
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full flex-1 bg-bg-secondary border border-white/10 rounded-lg p-4 font-mono text-sm text-text-main focus:outline-none focus:border-accent-main resize-none placeholder-white/20"
                        placeholder="Escribe la letra aquí y presiona los botones de acordes para insertar y los botones de secciones para insertar coro o estrofa...&#10;Ejemplo:&#10; {c: Estrofa 1}&#10; Dios es[C]ta aqui"
                    />
                </div>

                {/* Vista Previa */}
                <div className={`${mobileTab === 'preview' ? 'flex' : 'hidden'} lg:flex flex-col h-[400px] lg:h-[500px]`}>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-text-secondary">Vista Previa (En vivo)</label>
                        <div className="flex items-center gap-1.5 lg:hidden">
                            <span className="text-xs text-text-secondary font-mono mr-1">Tono: <strong className="text-accent-main">{currentKey}</strong></span>
                            <button
                                type="button"
                                onClick={() => handleTranspose(-1)}
                                className="px-2 py-0.5 text-xs font-bold text-white bg-red-500/80 hover:bg-red-600 rounded transition-colors"
                                title="Bajar medio tono"
                            >
                                - ½
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTranspose(1)}
                                className="px-2 py-0.5 text-xs font-bold text-white bg-green-500/80 hover:bg-green-600 rounded transition-colors"
                                title="Subir medio tono"
                            >
                                + ½
                            </button>
                        </div>
                    </div>
                    <div
                        className="w-full flex-1 bg-[#fffbf6] text-gray-900 border border-white/10 rounded-lg p-6 overflow-y-auto shadow-inner"
                        style={{ '--song-font-size': '1.05rem' }}
                    >
                        {content.trim() ? (
                            content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map((line, i) => (
                                <SongLine key={i} line={line} showChords={true} />
                            ))
                        ) : (
                            <div className="h-full flex items-center justify-center text-center text-gray-400 py-12 text-sm italic">
                                Escribe o pega la letra con acordes en el editor para previsualizar aquí en tiempo real.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}