import React, { useState, useEffect } from 'react';
import SongLine from './SongLine';
import { transposeText } from '../utils/music';

export default function SongView({
    initialContent,
    initialKey = 'C',
    originalKey = 'C',
    initialShowChords = true,
    className = "pb-20"
}) {
    const [content, setContent] = useState(() => {
        const safeContent = initialContent || "";
        // If initialKey (target) is different from originalKey (source), transpose immediately
        if (initialKey && originalKey && initialKey !== originalKey) {
            try {
                return transposeText(safeContent, originalKey, initialKey);
            } catch (e) {
                console.error("Error initial transposing:", e);
                return safeContent;
            }
        }
        return safeContent;
    });
    const [currentKey, setCurrentKey] = useState(initialKey || originalKey);
    const [showChords, setShowChords] = useState(initialShowChords);

    useEffect(() => {

        // Helper interno simple para calcular la nueva nota clave
        // Nota: music.js tiene transposeChord, pero aquí necesitamos mover solo el Key un paso.
        // Podríamos usar la lógica full de music.js pero para "semitonos" es más directo calcular el índice.
        const transposeKey = (key, semitones) => {
            const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            // Normalizar flat a sharp si es necesario
            const map = {
                'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
                'Cb': 'B', 'Fb': 'E', 'E#': 'F', 'B#': 'C'
            };
            const n = map[key] || key;
            let idx = NOTES.indexOf(n);
            if (idx === -1) return key;

            let newIdx = (idx + semitones) % 12;
            if (newIdx < 0) newIdx += 12;
            return NOTES[newIdx];
        };

        // Versión mejorada que usa transposeText directamente si pasamos la lógica correcta:
        // Pero transposeText pide (text, fromKey, toKey).
        // Así que calculemos el newKey primero.

        const handleTransposeEvent = (e) => {
            const semitones = e.detail.semitones;
            setCurrentKey(prevKey => {
                const newKey = transposeKey(prevKey, semitones);
                setContent(prevContent => transposeText(prevContent, prevKey, newKey));
                return newKey;
            });
        };

        const handleToggleChordsEvent = (e) => {
            if (e && e.detail && typeof e.detail.show === 'boolean') {
                setShowChords(e.detail.show);
            } else {
                setShowChords(prev => !prev);
            }
        };

        window.addEventListener('song-transpose', handleTransposeEvent);
        window.addEventListener('song-toggle-chords', handleToggleChordsEvent);

        return () => {
            window.removeEventListener('song-transpose', handleTransposeEvent);
            window.removeEventListener('song-toggle-chords', handleToggleChordsEvent);
        }
    }, []);

    return (
        <div className={className}>
            {(content || "").split('\n').map((line, i) => (
                <SongLine key={i} line={line} showChords={showChords} />
            ))}
        </div>
    );
}
