/**
 * Utilidades para preferencias de usuario (acordes, herramientas, visualización)
 */

export const CHORDS_PREFERENCE_KEY = 'cancionero_show_chords';
export const TOOLS_MINIMIZED_KEY = 'cancionero_tools_minimized';

/**
 * Obtiene la preferencia de acordes del usuario.
 * Por defecto es false (sin acordes).
 */
export const getChordsPreference = (defaultValue = false): boolean => {
    if (typeof window === 'undefined') return defaultValue;
    try {
        const saved = localStorage.getItem(CHORDS_PREFERENCE_KEY);
        if (saved !== null) {
            return saved === 'true';
        }
    } catch (e) {
        console.warn('Error al leer preferencia de acordes:', e);
    }
    return defaultValue;
};

/**
 * Guarda la preferencia de acordes del usuario y notifica a todas las vistas.
 */
export const setChordsPreference = (show: boolean): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(CHORDS_PREFERENCE_KEY, String(show));
        window.dispatchEvent(new CustomEvent('song-chords-preference-changed', {
            detail: { show }
        }));
        window.dispatchEvent(new CustomEvent('song-toggle-chords', {
            detail: { show }
        }));
    } catch (e) {
        console.warn('Error al guardar preferencia de acordes:', e);
    }
};

/**
 * Obtiene si el panel/barra de herramientas de canciones está minimizado a una bolita flotante.
 */
export const getToolsMinimizedPreference = (defaultValue = false): boolean => {
    if (typeof window === 'undefined') return defaultValue;
    try {
        const saved = localStorage.getItem(TOOLS_MINIMIZED_KEY);
        if (saved !== null) {
            return saved === 'true';
        }
    } catch (e) {
        // ignore
    }
    return defaultValue;
};

/**
 * Guarda el estado de minimizado de las herramientas.
 */
export const setToolsMinimizedPreference = (minimized: boolean): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(TOOLS_MINIMIZED_KEY, String(minimized));
    } catch (e) {
        // ignore
    }
};
