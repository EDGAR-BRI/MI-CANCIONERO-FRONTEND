import React, { useState, useEffect } from 'react';
import SongLine from './SongLine';
import { transposeText, transposeKey } from '../utils/music';
import { getChordsPreference, setChordsPreference } from '../utils/preferences';
import { sanitizeSongContent } from '../utils/songSanitizer';

export default function SongView({
    initialContent,
    initialKey = 'C',
    originalKey = 'C',
    initialShowChords = false,
    className = "pb-20"
}) {
    const [content, setContent] = useState(() => {
        const safeContent = sanitizeSongContent(initialContent || "");
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
    const [showChords, setShowChords] = useState(() => {
        return getChordsPreference(initialShowChords);
    });
    const [fontSize, setFontSize] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('cancionero_font_size');
            if (saved) {
                const parsed = parseInt(saved, 10);
                if (!isNaN(parsed) && parsed >= 12 && parsed <= 32) return parsed;
            }
        }
        return 18;
    });

    useEffect(() => {
        const handleTransposeEvent = (e) => {
            if (!e || !e.detail) return;

            // Reset directly to original content and key
            if (e.detail.reset) {
                setCurrentKey(originalKey || initialKey || 'C');
                setContent(sanitizeSongContent(initialContent || ""));
                return;
            }

            // Direct target key specified
            if (e.detail.newKey) {
                const targetKey = e.detail.newKey;
                setCurrentKey(targetKey);
                setContent(transposeText(sanitizeSongContent(initialContent || ""), originalKey || 'C', targetKey));
                return;
            }

            // Relative semitone step
            if (typeof e.detail.semitones === 'number') {
                const semitones = e.detail.semitones;
                setCurrentKey(prevKey => {
                    const newKey = transposeKey(prevKey, semitones);
                    setContent(prevContent => transposeText(prevContent, prevKey, newKey));
                    return newKey;
                });
            }
        };

        const handleToggleChordsEvent = (e) => {
            if (e && e.detail && typeof e.detail.show === 'boolean') {
                setShowChords(e.detail.show);
            } else {
                setShowChords(prev => {
                    const next = !prev;
                    setChordsPreference(next);
                    return next;
                });
            }
        };

        const handleChordsPreferenceChanged = (e) => {
            if (e && e.detail && typeof e.detail.show === 'boolean') {
                setShowChords(e.detail.show);
            }
        };

        const handleFontSizeEvent = (e) => {
            if (e && e.detail && typeof e.detail.size === 'number') {
                setFontSize(e.detail.size);
            }
        };

        window.addEventListener('song-transpose', handleTransposeEvent);
        window.addEventListener('song-toggle-chords', handleToggleChordsEvent);
        window.addEventListener('song-chords-preference-changed', handleChordsPreferenceChanged);
        window.addEventListener('song-font-size', handleFontSizeEvent);

        return () => {
            window.removeEventListener('song-transpose', handleTransposeEvent);
            window.removeEventListener('song-toggle-chords', handleToggleChordsEvent);
            window.removeEventListener('song-chords-preference-changed', handleChordsPreferenceChanged);
            window.removeEventListener('song-font-size', handleFontSizeEvent);
        };
    }, [initialContent, originalKey, initialKey]);

    return (
        <div
            className={`max-w-full ${className || ''}`}
            style={{ '--song-font-size': `${fontSize}px` }}
        >
            {(content || "").replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map((line, i) => (
                <SongLine key={i} line={line} showChords={showChords} />
            ))}
        </div>
    );
}

