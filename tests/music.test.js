import { describe, it, expect } from 'vitest';
import {
    NOTES,
    normalizeNote,
    getSemidistance,
    transposeChord,
    transposeText
} from '../src/utils/music';

describe('Music Utilities (front/src/utils/music)', () => {
    describe('NOTES constant', () => {
        it('debe tener las 12 notas cromáticas estándar', () => {
            expect(NOTES).toHaveLength(12);
            expect(NOTES).toEqual(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
        });
    });

    describe('normalizeNote', () => {
        it('debe convertir bemoles a sus sostenidos equivalentes', () => {
            expect(normalizeNote('Db')).toBe('C#');
            expect(normalizeNote('Eb')).toBe('D#');
            expect(normalizeNote('Gb')).toBe('F#');
            expect(normalizeNote('Ab')).toBe('G#');
            expect(normalizeNote('Bb')).toBe('A#');
        });

        it('debe convertir enarmónicos teóricos Cb, Fb, E#, B#', () => {
            expect(normalizeNote('Cb')).toBe('B');
            expect(normalizeNote('Fb')).toBe('E');
            expect(normalizeNote('E#')).toBe('F');
            expect(normalizeNote('B#')).toBe('C');
        });

        it('debe mantener inalteradas las notas naturales o ya en sostenido', () => {
            expect(normalizeNote('C')).toBe('C');
            expect(normalizeNote('C#')).toBe('C#');
            expect(normalizeNote('F#')).toBe('F#');
            expect(normalizeNote('A')).toBe('A');
        });
    });

    describe('getSemidistance', () => {
        it('debe calcular la distancia en semitonos correcta entre dos notas', () => {
            expect(getSemidistance('C', 'D')).toBe(2);
            expect(getSemidistance('C', 'G')).toBe(7);
            expect(getSemidistance('D', 'C')).toBe(-2);
        });

        it('debe soportar notas con bemol convirtiéndolas internamente', () => {
            // Db es C# (índice 1), D es índice 2 -> 2 - 1 = 1
            expect(getSemidistance('Db', 'D')).toBe(1);
            // C (índice 0) a Eb (D#, índice 3) -> 3
            expect(getSemidistance('C', 'Eb')).toBe(3);
        });

        it('debe retornar 0 si alguna nota es inválida o no reconocida', () => {
            expect(getSemidistance('X', 'C')).toBe(0);
            expect(getSemidistance('C', 'Z')).toBe(0);
        });
    });

    describe('transposeChord', () => {
        it('debe transportar acordes mayores y menores básicos', () => {
            expect(transposeChord('C', 2)).toBe('D');
            expect(transposeChord('Am', 2)).toBe('Bm');
            expect(transposeChord('G', 2)).toBe('A');
            expect(transposeChord('E', 1)).toBe('F');
            expect(transposeChord('B', 1)).toBe('C');
        });

        it('debe transportar hacia abajo con semitonos negativos', () => {
            expect(transposeChord('D', -2)).toBe('C');
            expect(transposeChord('C', -1)).toBe('B');
            expect(transposeChord('F', -1)).toBe('E');
        });

        it('debe conservar sufijos de acordes (séptimas, disminuidos, suspendidos)', () => {
            expect(transposeChord('Am7', 2)).toBe('Bm7');
            expect(transposeChord('Csus4', 2)).toBe('Dsus4');
            expect(transposeChord('Dmaj7', 2)).toBe('Emaj7');
            expect(transposeChord('Bdim', 1)).toBe('Cdim');
            expect(transposeChord('F#m7b5', 1)).toBe('Gm7b5');
        });

        it('debe transportar correctamente el bajo en acordes con barra (slash chords)', () => {
            // C/E + 2 -> D/F#
            expect(transposeChord('C/E', 2)).toBe('D/F#');
            // G/B + 1 -> G#/C
            expect(transposeChord('G/B', 1)).toBe('G#/C');
            // C#m7/G# + 2 -> D#m7/A#
            expect(transposeChord('C#m7/G#', 2)).toBe('D#m7/A#');
        });

        it('debe normalizar bemoles al transportar', () => {
            // Bb (+2 semitonos) -> C
            expect(transposeChord('Bb', 2)).toBe('C');
            // Eb (+1 semitono) -> E
            expect(transposeChord('Eb', 1)).toBe('E');
        });

        it('debe devolver el acorde intacto si es falsy o no tiene raíz válida', () => {
            expect(transposeChord(null, 2)).toBeNull();
            expect(transposeChord('', 2)).toBe('');
            expect(transposeChord('SoloTexto', 2)).toBe('SoloTexto');
        });
    });

    describe('transposeText', () => {
        it('debe transportar todos los acordes entre corchetes dentro de una letra', () => {
            const input = '[C] Hoy vengo a decirte [G] Dios del cielo\n[Am] que te amo [F] con el corazón';
            const result = transposeText(input, 'C', 'D');

            expect(result).toBe('[D] Hoy vengo a decirte [A] Dios del cielo\n[Bm] que te amo [G] con el corazón');
        });

        it('debe manejar acordes compuestos y con bajo dentro del texto', () => {
            const input = '[C/E] Te alabamos [F#m7] Señor [G]';
            const result = transposeText(input, 'C', 'D');

            expect(result).toBe('[D/F#] Te alabamos [G#m7] Señor [A]');
        });

        it('debe retornar el texto original si la distancia en semitonos es 0', () => {
            const input = '[C] Alabaré [G] al Señor';
            expect(transposeText(input, 'C', 'C')).toBe(input);
        });
    });
});
