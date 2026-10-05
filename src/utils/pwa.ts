import { showAlert, showSuccessToast } from "@/utils/alerts";

/**
 * Detecta si la aplicación se está ejecutando actualmente en modo PWA / standalone.
 */
export function isPWAStandalone(): boolean {
  if (typeof window === "undefined") return false;

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const isIOSStandalone = (window.navigator as any).standalone === true;
  const isAndroidTWA = typeof document !== "undefined" && document.referrer?.startsWith("android-app://");

  return isStandalone || isIOSStandalone || !!isAndroidTWA;
}

/**
 * Detecta si el dispositivo es un iPhone, iPad o iPod.
 */
export function isIOSDevice(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS = Boolean(ua.includes("Macintosh") && navigator.maxTouchPoints > 1);

  return isIOS || isIPadOS;
}

/**
 * Detecta si el dispositivo es móvil (Android / iOS).
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Muestra una alerta con los pasos manuales para instalar la PWA
 * (útil en iOS Safari o navegadores donde beforeinstallprompt no esté disponible).
 */
export function showInstallInstructions(isIOS: boolean = isIOSDevice()) {
  if (isIOS) {
    return showAlert({
      title: "Instalar en iPhone o iPad",
      html: `
        <div class="text-left text-sm space-y-3 py-2 text-zinc-300 font-sans">
          <p>Para instalar <strong class="text-white">Cancionero</strong> en tu pantalla de inicio:</p>
          <div class="flex items-start gap-2.5 bg-black/40 p-3 rounded-xl border border-white/5">
            <span class="text-accent-main font-bold text-base leading-none">1.</span>
            <span>Pulsa el botón <strong class="text-white">Compartir</strong> en la barra inferior de Safari (el icono de un cuadro con flecha hacia arriba).</span>
          </div>
          <div class="flex items-start gap-2.5 bg-black/40 p-3 rounded-xl border border-white/5">
            <span class="text-accent-main font-bold text-base leading-none">2.</span>
            <span>Desplázate hacia abajo y selecciona <strong class="text-white">«Añadir a pantalla de inicio»</strong>.</span>
          </div>
          <div class="flex items-start gap-2.5 bg-black/40 p-3 rounded-xl border border-white/5">
            <span class="text-accent-main font-bold text-base leading-none">3.</span>
            <span>Toca <strong class="text-white">Añadir</strong> en la esquina superior derecha.</span>
          </div>
        </div>
      `,
      confirmButtonText: "Entendido",
    });
  }

  const isMobile = isMobileDevice();

  if (!isMobile) {
    return showAlert({
      title: "Instalar en tu Ordenador",
      html: `
        <div class="text-left text-sm space-y-3 py-2 text-zinc-300 font-sans">
          <p>Para instalar <strong class="text-white">Cancionero</strong> como aplicación en Brave o Chrome:</p>
          <div class="flex items-start gap-2.5 bg-black/40 p-3 rounded-xl border border-white/5">
            <span class="text-accent-main font-bold text-base leading-none">1.</span>
            <span>En la <strong>barra de direcciones (URL)</strong>, busca el icono de <strong>Instalar</strong> en el extremo derecho (junto a los escudos o favoritos).</span>
          </div>
          <div class="flex items-start gap-2.5 bg-black/40 p-3 rounded-xl border border-white/5">
            <span class="text-accent-main font-bold text-base leading-none">2.</span>
            <span>O abre el menú del navegador (<strong class="text-white">☰ en Brave</strong> o <strong class="text-white">⋮ en Chrome</strong>) y selecciona <strong class="text-white">«Instalar Cancionero...»</strong>.</span>
          </div>
        </div>
      `,
      confirmButtonText: "Entendido",
    });
  }

  return showAlert({
    title: "Instalar Cancionero",
    html: `
      <div class="text-left text-sm space-y-3 py-2 text-zinc-300 font-sans">
        <p>Para instalar <strong class="text-white">Cancionero</strong> como aplicación:</p>
        <div class="flex items-start gap-2.5 bg-black/40 p-3 rounded-xl border border-white/5">
          <span class="text-accent-main font-bold text-base leading-none">1.</span>
          <span>Abre el menú de tu navegador (<strong class="text-white">los tres puntos ⋮</strong> en la esquina superior o inferior).</span>
        </div>
        <div class="flex items-start gap-2.5 bg-black/40 p-3 rounded-xl border border-white/5">
          <span class="text-accent-main font-bold text-base leading-none">2.</span>
          <span>Selecciona <strong class="text-white">«Instalar aplicación»</strong> o <strong class="text-white">«Añadir a pantalla de inicio»</strong>.</span>
        </div>
      </div>
    `,
    confirmButtonText: "Entendido",
  });
}

/**
 * Dispara el proceso de instalación de la PWA.
 * Si deferredPrompt está guardado, ejecuta el prompt nativo.
 * Si no está disponible o es iOS, muestra las instrucciones guiadas.
 */
export async function installPWA(): Promise<{ installed: boolean; outcome?: string }> {
  if (typeof window === "undefined") return { installed: false };

  if (isPWAStandalone()) {
    showSuccessToast("Ya estás en la App", "Cancionero ya está instalado y funcionando como aplicación.");
    return { installed: true, outcome: "already_installed" };
  }

  const promptEvent = (window as any).deferredPrompt;

  if (promptEvent) {
    try {
      promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      if (choiceResult.outcome === "accepted") {
        (window as any).deferredPrompt = null;
        window.dispatchEvent(new CustomEvent("pwa-app-installed"));
        showSuccessToast("¡Cancionero Instalado!", "La app se ha añadido a tu dispositivo.");
        return { installed: true, outcome: "accepted" };
      }
      return { installed: false, outcome: "dismissed" };
    } catch (err) {
      console.warn("[PWA] Error al invocar prompt:", err);
    }
  }

  // Si no hay prompt nativo disponible (iOS Safari, navegadores no-Chromium o prompt cerrado previamente)
  showInstallInstructions();
  return { installed: false, outcome: "instructions_shown" };
}
