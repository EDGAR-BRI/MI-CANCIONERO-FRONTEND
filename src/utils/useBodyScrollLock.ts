import { useEffect } from 'react';

/**
 * Hook universal para bloquear el scroll de fondo (body y html) cuando una modal está abierta.
 * Soporta modales apiladas/anidadas mediante contador en dataset para no desbloquear prematuramente el fondo.
 */
export function useBodyScrollLock(isLocked: boolean = false) {
    useEffect(() => {
        if (!isLocked || typeof document === 'undefined') return;

        const currentCount = parseInt(document.body.dataset.modalCount || '0', 10);
        document.body.dataset.modalCount = String(currentCount + 1);
        document.body.classList.add('modal-open');

        return () => {
            const count = parseInt(document.body.dataset.modalCount || '1', 10) - 1;
            if (count <= 0) {
                delete document.body.dataset.modalCount;
                document.body.classList.remove('modal-open');
            } else {
                document.body.dataset.modalCount = String(count);
            }
        };
    }, [isLocked]);
}

export default useBodyScrollLock;
