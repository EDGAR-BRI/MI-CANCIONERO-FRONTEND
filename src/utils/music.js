export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const normalizeNote = (note) => {
    const map = {
        'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
        'Cb': 'B', 'Fb': 'E', 'E#': 'F', 'B#': 'C'
    };
    return map[note] || note;
};

export const getSemidistance = (note1, note2) => {
    const n1 = normalizeNote(note1);
    const n2 = normalizeNote(note2);
    const i1 = NOTES.indexOf(n1);
    const i2 = NOTES.indexOf(n2);
    if (i1 === -1 || i2 === -1) return 0;
    return i2 - i1;
};

export const transposeChord = (chord, semitones) => {
    if (!chord) return chord;

    // Regex para separar la nota base del resto (m, 7, sus4, /G, etc)
    // Ejemplo: C#m7/G# -> C#, m7/G#
    const match = chord.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return chord;

    let [_, root, suffix] = match;
    root = normalizeNote(root);

    const rootIndex = NOTES.indexOf(root);
    if (rootIndex === -1) return chord;

    let newIndex = (rootIndex + semitones) % 12;
    if (newIndex < 0) newIndex += 12;

    let newRoot = NOTES[newIndex];

    // Manejo de bajos (bass notes) ej: /G -> /A
    if (suffix.includes('/')) {
        const parts = suffix.split('/');
        // El primer elemento es el sufijo del acorde (m7, sus), el ultimo es el bajo
        const bass = parts[parts.length - 1];
        const bassMatch = bass.match(/^([A-G][#b]?)$/);

        if (bassMatch) {
            const bassRoot = normalizeNote(bassMatch[1]);
            const bassIndex = NOTES.indexOf(bassRoot);
            if (bassIndex !== -1) {
                let newBassIndex = (bassIndex + semitones) % 12;
                if (newBassIndex < 0) newBassIndex += 12;
                const newBass = NOTES[newBassIndex];
                // Reconstruir sufijo reemplazando el bajo
                suffix = suffix.substring(0, suffix.lastIndexOf('/')) + '/' + newBass;
            }
        }
    }

    return newRoot + suffix;
};

export const transposeText = (text, fromKey, toKey) => {
    if (!text || typeof text !== 'string') return text || "";
    const semitones = getSemidistance(fromKey, toKey);
    if (semitones === 0) return text;

    return text.replace(/\[(.*?)\]/g, (match, chord) => {
        return `[${transposeChord(chord, semitones)}]`;
    });
};
