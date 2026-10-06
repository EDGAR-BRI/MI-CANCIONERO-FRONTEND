import Swal, { type SweetAlertOptions } from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { OFFLINE_ICONS } from '@/components/Ui/icons-bundle';
import { normalizeIconName } from '@/utils/iconMap';

const getSystemIconHtml = (name: string): string => {
    const key = normalizeIconName(name);
    const icon = OFFLINE_ICONS[key];
    if (!icon) return '&times;';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${icon.width || 512} ${icon.height || 512}" width="1em" height="1em" fill="currentColor" aria-hidden="true">${icon.body}</svg>`;
};

const CLOSE_ICON_HTML = getSystemIconHtml('xmark');

const swalDark: SweetAlertOptions = {
    background: "#1A1A1A",
    color: "#F2F0E6",
    confirmButtonColor: "#FF5722",
    cancelButtonColor: "rgba(255, 255, 255, 0.1)",
    showCloseButton: true,
    closeButtonHtml: CLOSE_ICON_HTML,
    closeButtonAriaLabel: 'Cerrar alerta',
    customClass: {
        popup: 'swal2-dark-popup',
        confirmButton: 'swal2-dark-confirm',
        cancelButton: 'swal2-dark-cancel',
        closeButton: 'swal2-dark-close',
    }
};

/**
 * Attaches swipe-to-dismiss gesture to a SweetAlert2 popup or toast.
 * Optimized for mobile touch swipes and desktop mouse drag.
 */
export function enableSwipeToDismiss(popup: HTMLElement, _isToast: boolean = true) {
    if (!popup || (popup as any)._swipeInitialized) return;
    (popup as any)._swipeInitialized = true;

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let startTime = 0;
    let isDragging = false;
    let isLocked = false;
    let isHorizontal = false;

    const shouldIgnoreTarget = (target: HTMLElement | null): boolean => {
        if (!target) return false;
        return !!target.closest('button, a, input, textarea, select, .swal2-close, .swal2-actions');
    };

    // Mobile touch gestures
    const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length !== 1) return;
        const target = e.target as HTMLElement;
        if (shouldIgnoreTarget(target)) return;

        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        currentX = startX;
        currentY = startY;
        startTime = Date.now();
        isDragging = false;
        isLocked = false;
        isHorizontal = false;

        Swal.stopTimer();
    };

    const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length !== 1) return;
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;

        if (!isLocked) {
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);
            if (absX > 6 || absY > 6) {
                isLocked = true;
                if (absX > absY) {
                    isHorizontal = true;
                    isDragging = true;
                    popup.classList.add('swal2-swiping');
                    popup.style.transition = 'none';
                } else {
                    isHorizontal = false;
                    isDragging = false;
                }
            }
        }

        if (isDragging && isHorizontal) {
            if (e.cancelable) e.preventDefault();

            const width = popup.offsetWidth || 300;
            const rotation = (deltaX / width) * 8;
            const opacity = Math.max(0.05, 1 - (Math.abs(deltaX) / (width * 0.85)));

            popup.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;
            popup.style.opacity = `${opacity}`;
        }
    };

    const onTouchEnd = () => {
        if (!isDragging || !isHorizontal) {
            Swal.resumeTimer();
            return;
        }

        const deltaX = currentX - startX;
        const deltaTime = Math.max(Date.now() - startTime, 1);
        const velocity = Math.abs(deltaX) / deltaTime;
        const width = popup.offsetWidth || 300;
        const threshold = Math.min(width * 0.3, 80);

        popup.classList.remove('swal2-swiping');

        if (Math.abs(deltaX) > threshold || (velocity > 0.35 && Math.abs(deltaX) > 20)) {
            // Dismissed! Animate out smoothly in the swipe direction
            const direction = deltaX > 0 ? 1 : -1;
            popup.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
            popup.style.transform = `translateX(${direction * 125}%) rotate(${direction * 8}deg)`;
            popup.style.opacity = '0';

            setTimeout(() => {
                Swal.close();
            }, 180);
        } else {
            // Snap back
            popup.style.transition = 'transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s ease';
            popup.style.transform = 'translateX(0) rotate(0deg)';
            popup.style.opacity = '1';
            Swal.resumeTimer();

            setTimeout(() => {
                if (popup) {
                    popup.style.transition = '';
                    popup.style.transform = '';
                    popup.style.opacity = '';
                }
            }, 240);
        }

        isDragging = false;
        isLocked = false;
        isHorizontal = false;
    };

    popup.addEventListener('touchstart', onTouchStart, { passive: true });
    popup.addEventListener('touchmove', onTouchMove, { passive: false });
    popup.addEventListener('touchend', onTouchEnd, { passive: true });
    popup.addEventListener('touchcancel', onTouchEnd, { passive: true });

    // Desktop mouse drag
    let isMouseDown = false;
    const onMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (shouldIgnoreTarget(target)) return;

        isMouseDown = true;
        startX = e.clientX;
        startY = e.clientY;
        currentX = startX;
        currentY = startY;
        startTime = Date.now();
        isDragging = false;
        isLocked = false;
        isHorizontal = false;
        Swal.stopTimer();

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!isMouseDown) return;
        currentX = e.clientX;
        currentY = e.clientY;
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;

        if (!isLocked) {
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);
            if (absX > 6 || absY > 6) {
                isLocked = true;
                if (absX > absY) {
                    isHorizontal = true;
                    isDragging = true;
                    popup.classList.add('swal2-swiping');
                    popup.style.transition = 'none';
                } else {
                    isHorizontal = false;
                    isDragging = false;
                }
            }
        }

        if (isDragging && isHorizontal) {
            e.preventDefault();
            const width = popup.offsetWidth || 300;
            const rotation = (deltaX / width) * 6;
            const opacity = Math.max(0.05, 1 - (Math.abs(deltaX) / (width * 0.85)));

            popup.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;
            popup.style.opacity = `${opacity}`;
        }
    };

    const onMouseUp = () => {
        if (!isMouseDown) return;
        isMouseDown = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        if (!isDragging || !isHorizontal) {
            Swal.resumeTimer();
            return;
        }

        const deltaX = currentX - startX;
        const deltaTime = Math.max(Date.now() - startTime, 1);
        const velocity = Math.abs(deltaX) / deltaTime;
        const width = popup.offsetWidth || 300;
        const threshold = Math.min(width * 0.3, 80);

        popup.classList.remove('swal2-swiping');

        if (Math.abs(deltaX) > threshold || (velocity > 0.35 && Math.abs(deltaX) > 20)) {
            const direction = deltaX > 0 ? 1 : -1;
            popup.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
            popup.style.transform = `translateX(${direction * 125}%) rotate(${direction * 8}deg)`;
            popup.style.opacity = '0';

            setTimeout(() => {
                Swal.close();
            }, 180);
        } else {
            popup.style.transition = 'transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s ease';
            popup.style.transform = 'translateX(0) rotate(0deg)';
            popup.style.opacity = '1';
            Swal.resumeTimer();

            setTimeout(() => {
                if (popup) {
                    popup.style.transition = '';
                    popup.style.transform = '';
                    popup.style.opacity = '';
                }
            }, 240);
        }

        isDragging = false;
        isLocked = false;
        isHorizontal = false;
    };

    popup.addEventListener('mousedown', onMouseDown);
}

let isObserverRunning = false;

/**
 * Initializes global MutationObserver so ANY SweetAlert2 modal or toast
 * created anywhere in the app automatically gets swipe-to-dismiss.
 */
export function initGlobalAlertSwipe() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (isObserverRunning) return;
    isObserverRunning = true;

    const setupPopup = (node: Node) => {
        if (node instanceof HTMLElement) {
            const popup = node.classList.contains('swal2-popup')
                ? node
                : (node.querySelector?.('.swal2-popup') as HTMLElement | null);
            if (popup) {
                const isToast = popup.classList.contains('swal2-toast');
                enableSwipeToDismiss(popup, isToast);
            }
        }
    };

    const observer = new MutationObserver((mutations) => {
        for (let m = 0; m < mutations.length; m++) {
            const added = mutations[m].addedNodes;
            for (let i = 0; i < added.length; i++) {
                setupPopup(added[i]);
            }
        }
    });

    const startObserving = () => {
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
            const existing = document.querySelector('.swal2-popup');
            if (existing instanceof HTMLElement) {
                setupPopup(existing);
            }
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserving, { once: true });
    } else {
        startObserving();
    }
}

// Auto-run if running in browser
if (typeof window !== 'undefined') {
    initGlobalAlertSwipe();
}

export const showAlert = (options: SweetAlertOptions) => {
    const userDidOpen = options.didOpen;
    return Swal.fire({
        ...swalDark,
        ...options,
        didOpen: (popup) => {
            enableSwipeToDismiss(popup, !!options.toast);
            if (userDidOpen) userDidOpen(popup);
        }
    } as SweetAlertOptions);
};

export const showSuccessToast = (title: string, text?: string, timer: number = 3000) => {
    return Swal.fire({
        ...swalDark,
        icon: "success",
        title: title,
        text: text,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        showCloseButton: true,
        timer: timer,
        timerProgressBar: true,
        didOpen: (toast) => {
            enableSwipeToDismiss(toast, true);
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
        }
    });
};

export const showErrorToast = (title: string, text?: string, timer: number = 4000) => {
    return Swal.fire({
        ...swalDark,
        icon: "error",
        title: title,
        text: text,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        showCloseButton: true,
        timer: timer,
        timerProgressBar: true,
        didOpen: (toast) => {
            enableSwipeToDismiss(toast, true);
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
        }
    });
};

export const showToast = (options: SweetAlertOptions) => {
    const userDidOpen = options.didOpen;
    return Swal.fire({
        ...swalDark,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        showCloseButton: true,
        timer: 3000,
        timerProgressBar: true,
        ...options,
        didOpen: (toast) => {
            enableSwipeToDismiss(toast, true);
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
            if (userDidOpen) userDidOpen(toast);
        }
    } as SweetAlertOptions);
};

export const showError = (title: string, text?: string) => {
    return Swal.fire({
        ...swalDark,
        icon: "error",
        title: title,
        text: text,
        showCloseButton: true,
        didOpen: (popup) => {
            enableSwipeToDismiss(popup, false);
        }
    });
};

export const showConfirm = (
    title: string,
    text: string,
    confirmText: string = "Sí",
    cancelText: string = "Cancelar"
) => {
    return Swal.fire({
        ...swalDark,
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        showCloseButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        reverseButtons: false,
        focusCancel: true,
        didOpen: (popup) => {
            enableSwipeToDismiss(popup, false);
        }
    });
};

export const showLoading = (title: string) => {
    return Swal.fire({
        ...swalDark,
        title,
        showCloseButton: false,
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
};

export const showLoginPrompt = (
    actionDescription: string = 'utilizar esta función',
    redirectUrl?: string
) => {
    const currentUrl = typeof window !== 'undefined' ? (window.location.pathname + window.location.search) : '/';
    const target = redirectUrl || `/login?redirect=${encodeURIComponent(currentUrl)}`;

    return Swal.fire({
        ...swalDark,
        title: "Inicio de sesión requerido",
        text: `Debes iniciar sesión para ${actionDescription}.`,
        icon: 'info',
        showCancelButton: true,
        showCloseButton: true,
        confirmButtonText: 'Iniciar sesión',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#FF5722',
        cancelButtonColor: 'rgba(255, 255, 255, 0.15)',
        reverseButtons: false,
        focusConfirm: true,
        didOpen: (popup) => {
            enableSwipeToDismiss(popup, false);
        }
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = target;
        }
        return result;
    });
};
