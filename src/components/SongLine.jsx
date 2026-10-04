import React from 'react';

/**
 * Parsea una línea en formato ChordPro dividiéndola en palabras,
 * y cada palabra en fragmentos { chord, text }.
 *
 * Agrupar por palabras garantiza que cuando la pantalla sea estrecha
 * y el texto salte de línea (wrap), la palabra entera salte junta
 * (por ejemplo "qu[G]e" o "mañ[G]ana") en lugar de romperse por la mitad.
 */
function parseChordLineIntoWords(line) {
    const cleanLine = (line || '').replace(/\r/g, '').replace(/\t/g, '  ');
    const tokens = [];
    const regex = /\[(.*?)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(cleanLine)) !== null) {
        if (match.index > lastIndex) {
            tokens.push({ type: 'text', value: cleanLine.slice(lastIndex, match.index) });
        }
        tokens.push({ type: 'chord', value: match[1] });
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < cleanLine.length) {
        tokens.push({ type: 'text', value: cleanLine.slice(lastIndex) });
    }

    const words = [];
    let currentWord = [];
    let currentChord = null;

    for (const token of tokens) {
        if (token.type === 'chord') {
            if (currentChord !== null) {
                currentWord.push({ chord: currentChord, text: '' });
            }
            currentChord = token.value;
        } else {
            const parts = token.value.split(/( +)/);
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (!part) continue;

                if (/^ +$/.test(part)) {
                    if (currentChord !== null) {
                        currentWord.push({ chord: currentChord, text: part });
                        currentChord = null;
                    } else if (currentWord.length > 0) {
                        currentWord[currentWord.length - 1].text += part;
                    } else {
                        currentWord.push({ chord: null, text: part });
                    }
                    words.push(currentWord);
                    currentWord = [];
                } else {
                    currentWord.push({ chord: currentChord, text: part });
                    currentChord = null;
                }
            }
        }
    }

    if (currentChord !== null) {
        currentWord.push({ chord: currentChord, text: '' });
    }
    if (currentWord.length > 0) {
        words.push(currentWord);
    }

    return words;
}

const SongLine = ({ line, showChords = false }) => {
    // Normalizar línea eliminando posibles retornos de carro (\r)
    const cleanLine = (line || '').replace(/\r/g, '');

    // Línea vacía entre estrofas
    if (!cleanLine.trim()) {
        return <div className="h-3.5 sm:h-4"></div>;
    }

    // Directivas de sección o comentario ChordPro ({c: Estrofa 1}, {c: Coro}, etc.)
    const commentMatch = cleanLine.match(/^\s*\{(?:c|comment|oc|soc|eoc):\s*(.*?)\}\s*$/i);
    if (commentMatch) {
        const label = commentMatch[1];
        if (!label) return null;

        return (
            <div
                style={{ fontSize: 'calc(var(--song-font-size, 1.125rem) * 0.9)' }}
                className="font-bold italic text-accent-main/90 my-3 bg-accent-main/10 border-l-4 border-accent-main px-3 py-1 rounded-r w-fit select-none"
            >
                {label}
            </div>
        );
    }

    const hasChords = showChords && cleanLine.includes('[');

    // Si no se deben mostrar acordes o la línea no contiene acordes
    if (!hasChords) {
        const textOnly = cleanLine.replace(/\[.*?\]/g, '');
        return (
            <div
                style={{ fontSize: 'var(--song-font-size, 1.125rem)' }}
                className="text-inherit leading-relaxed whitespace-pre-wrap mb-1 transition-[font-size] duration-150 break-words max-w-full"
            >
                {textOnly}
            </div>
        );
    }

    // Línea con acordes: renderizamos agrupando por palabras completas (evita partir palabras como qu[G]e)
    const words = parseChordLineIntoWords(cleanLine);

    return (
        <div
            style={{ fontSize: 'var(--song-font-size, 1.125rem)' }}
            className="flex flex-wrap items-end mb-1 transition-[font-size] duration-150 text-inherit max-w-full"
        >
            {words.map((word, wIdx) => (
                <span key={wIdx} className="inline-flex items-end flex-shrink-0">
                    {word.map((c, i) => {
                        const text = c.text ? c.text.replace(/\r/g, '') : '';
                        const isChordOnly = !text;

                        return (
                            <span key={i} className="inline-flex flex-col justify-end">
                                <span
                                    style={{ fontSize: 'calc(var(--song-font-size, 1.125rem) * 0.85)' }}
                                    className={`text-accent-main font-mono font-bold leading-none min-h-[1.15em] select-none whitespace-pre pb-0.5 ${c.chord ? 'pr-1' : ''}`}
                                >
                                    {c.chord || ''}
                                </span>
                                <span className="leading-snug min-h-[1.35em] whitespace-pre">
                                    {isChordOnly ? '\u00A0' : text}
                                </span>
                            </span>
                        );
                    })}
                </span>
            ))}
        </div>
    );
};

export default SongLine;
