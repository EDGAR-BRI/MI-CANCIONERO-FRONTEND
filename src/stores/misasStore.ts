import { atom } from 'nanostores';
import type { Misa } from '../types/misa';

export const $misas = atom<Misa[]>([]);
export const $misasLoaded = atom<boolean>(false);
export const $misasLastFetched = atom<number>(0);

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos de frescura en RAM

export function initMisasStore(initialMisas?: Misa[]) {
    if (Array.isArray(initialMisas) && initialMisas.length > 0) {
        // Solo actualizar si no teníamos datos o si pasaron más de CACHE_TTL_MS
        const now = Date.now();
        if (!$misasLoaded.get() || now - $misasLastFetched.get() > CACHE_TTL_MS) {
            $misas.set(initialMisas);
            $misasLoaded.set(true);
            $misasLastFetched.set(now);
        }
    }
}

export function setMisasStore(misas: Misa[]) {
    $misas.set(misas);
    $misasLoaded.set(true);
    $misasLastFetched.set(Date.now());
}

export function addMisaToStore(misa: Misa) {
    const current = $misas.get();
    // Evitar duplicados
    const filtered = current.filter(m => m.id !== misa.id);
    $misas.set([misa, ...filtered]);
    $misasLoaded.set(true);
}

export function updateMisaInStore(id: number, partial: Partial<Misa>) {
    const current = $misas.get();
    $misas.set(current.map(m => m.id === id ? { ...m, ...partial } : m));
}

export function deleteMisaFromStore(id: number) {
    const current = $misas.get();
    $misas.set(current.filter(m => m.id !== id));
}

export function getMisasFromStore(): Misa[] {
    return $misas.get();
}

export function isMisasStoreLoaded(): boolean {
    return $misasLoaded.get();
}
