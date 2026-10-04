type NetworkListener = (isOnline: boolean) => void;

let listeners: Set<NetworkListener> = new Set();
let initialized = false;

export const isDeviceOnline = (): boolean => {
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
        return navigator.onLine;
    }
    return true;
};

const initNetworkListeners = () => {
    if (initialized || typeof window === "undefined") return;
    initialized = true;

    window.addEventListener("online", () => {
        listeners.forEach((listener) => listener(true));
        window.dispatchEvent(new CustomEvent("cancionero-network-status", { detail: { isOnline: true } }));
    });

    window.addEventListener("offline", () => {
        listeners.forEach((listener) => listener(false));
        window.dispatchEvent(new CustomEvent("cancionero-network-status", { detail: { isOnline: false } }));
    });
};

export const subscribeNetworkStatus = (callback: NetworkListener): (() => void) => {
    initNetworkListeners();
    listeners.add(callback);
    callback(isDeviceOnline());

    return () => {
        listeners.delete(callback);
    };
};
