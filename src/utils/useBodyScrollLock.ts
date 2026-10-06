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

        if (currentCount === 0) {
            document.body.classList.add('modal-open');
            document.documentElement.classList.add('modal-open');
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overscrollBehavior = 'contain';
            document.documentElement.style.overscrollBehavior = 'contain';
        }

        return () => {
            const count = parseInt(document.body.dataset.modalCount || '1', 10) - 1;
            if (count <= 0) {
                delete document.body.dataset.modalCount;
                document.body.classList.remove('modal-open');
                document.documentElement.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
                document.body.style.overscrollBehavior = '';
                document.documentElement.style.overscrollBehavior = '';
            } else {
                document.body.dataset.modalCount = String(count);
            }
        };
    }, [isLocked]);
}

export default useBodyScrollLock;
