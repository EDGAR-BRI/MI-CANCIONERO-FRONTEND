import React, { useEffect } from 'react';
import AppIcon from './AppIcon';
import { useBodyScrollLock } from '@/utils/useBodyScrollLock';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    badge?: React.ReactNode;
    headerExtra?: React.ReactNode;
    maxWidthClass?: string; // e.g. 'max-w-md', 'max-w-lg', 'max-w-2xl', 'max-w-3xl'
    zIndexClass?: string; // e.g. 'z-[100]'
    children: React.ReactNode;
    footer?: React.ReactNode;
    closeOnBackdropClick?: boolean;
    closeOnEsc?: boolean;
    showCloseButton?: boolean;
    className?: string;
    bodyClassName?: string;
    cardClassName?: string;
    customHeader?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    badge,
    headerExtra,
    maxWidthClass = 'max-w-lg',
    zIndexClass = 'z-[100]',
    children,
    footer,
    closeOnBackdropClick = true,
    closeOnEsc = true,
    showCloseButton = true,
    className = '',
    bodyClassName = '',
    cardClassName = '',
    customHeader,
}) => {
    useBodyScrollLock(isOpen);

    useEffect(() => {
        if (!isOpen || !closeOnEsc) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeOnEsc, onClose]);

    if (!isOpen) return null;

    return (
        <div
            data-modal-open="true"
            role="dialog"
            aria-modal="true"
            className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overscroll-contain select-auto ${className}`}
            onClick={() => closeOnBackdropClick && onClose()}
        >
            <div
                className={`w-full ${maxWidthClass} bg-bg-secondary border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] overflow-hidden my-auto ${cardClassName}`}
                onClick={(e) => e.stopPropagation()}
            >
                {customHeader ? (
                    customHeader
                ) : (title || showCloseButton) ? (
                    <div className="flex items-start justify-between p-3.5 sm:p-5 border-b border-white/10 bg-bg-secondary shrink-0 gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                                {typeof title === 'string' ? (
                                    <h2 className="text-base sm:text-xl font-bold text-white tracking-tight">
                                        {title}
                                    </h2>
                                ) : (
                                    title
                                )}
                                {badge}
                            </div>
                            {subtitle && (
                                typeof subtitle === 'string' ? (
                                    <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">
                                        {subtitle}
                                    </p>
                                ) : (
                                    subtitle
                                )
                            )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {headerExtra}
                            {showCloseButton && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-1.5 sm:p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0 -mr-1 -mt-0.5 sm:mr-0 sm:mt-0"
                                    title="Cerrar (Esc)"
                                    aria-label="Cerrar modal"
                                >
                                    <AppIcon name="xmark" className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                ) : null}

                <div className={`flex-1 overflow-y-auto scrollbar-thin overscroll-contain ${bodyClassName}`}>
                    {children}
                </div>

                {footer && (
                    <div className="p-3 sm:p-4 border-t border-white/10 bg-bg-secondary shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
