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
