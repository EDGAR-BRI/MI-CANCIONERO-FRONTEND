import { registerSW } from 'virtual:pwa-register';

let registrationRef: ServiceWorkerRegistration | undefined;

registerSW({
    immediate: true,
    onRegisteredSW(_swScriptUrl, registration) {
        registrationRef = registration;
        if (registration) {
            // Comprobar actualizaciones periódicamente cada 60 minutos
            setInterval(() => {
                registration.update().catch((err) => {
                    console.warn('[PWA] Error al comprobar actualización periódica:', err);
                });
            }, 60 * 60 * 1000);
        }
    },
    onOfflineReady() {
        console.log('[PWA] Cancionero listo para uso sin conexión');
    },
});

// Comprobar actualización al navegar entre páginas con Astro View Transitions
document.addEventListener('astro:page-load', () => {
    if (registrationRef) {
        registrationRef.update().catch(() => {});
    } else if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
            reg?.update().catch(() => {});
        }).catch(() => {});
    }
});

// Guardar el evento beforeinstallprompt para soporte de instalación WebAPK
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).deferredPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-deferred-prompt-ready'));
    console.log('[PWA] Aplicación lista para instalación WebAPK');
});

// Detectar cuando la aplicación se instaló exitosamente
window.addEventListener('appinstalled', () => {
    (window as any).deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa-app-installed'));
    console.log('[PWA] Aplicación instalada exitosamente');
});

