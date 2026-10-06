import { API_URL } from "./songs";

export const register = async (name: string, email: string, password: string, phoneNumber?: string) => {


    const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password, phoneNumber }),
    });

    return response;
};

export const login = async (email: FormDataEntryValue | null, password: FormDataEntryValue | null) => {


    if (!email || !password) {
        console.error("Email and Password are required");
        return null;
    }

    const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
    });

    return response;
};

export interface UpdateProfileData {
    name?: string;
    avatarUrl?: string | null;
    phoneNumber?: string | null;
    currentPassword?: string;
    newPassword?: string;
}

export const updateProfile = async (data: UpdateProfileData, token?: string) => {
    // Si estamos en el navegador, intentar usar Astro Action para actualizar la cookie HttpOnly en el dominio frontend
    if (typeof window !== "undefined") {
        try {
            const { actions } = await import("astro:actions");
            if (actions && typeof actions.updateProfile === "function") {
                const actionResult = await (actions as any).updateProfile(data);
                if (actionResult && !actionResult.error && actionResult.data) {
                    return {
                        success: true,
                        data: (actionResult.data as any).data || actionResult.data
                    };
                }
                if (actionResult?.error) {
                    return {
                        success: false,
                        error: actionResult.error.message || "Error al actualizar el perfil."
                    };
                }
            }
        } catch {
            // Continuar con fetch directo si astro:actions no está disponible (ej. entornos de test o SSR puro)
        }
    }

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            method: "PUT",
            headers,
            credentials: "include",
            body: JSON.stringify(data),
        });

        const resData = await response.json().catch(() => ({}));
        if (!response.ok) {
            return {
                success: false,
                error: resData.error || "Error al actualizar el perfil."
            };
        }

        return {
            success: true,
            data: resData
        };
    } catch (e: any) {
        return {
            success: false,
            error: e.message || "Error de conexión con el servidor."
        };
    }
};

/**
 * Resuelve la URI de redirección canónica para Google OAuth.
 * Evita el problema de Vercel Serverless donde url.origin devuelve "https://localhost".
 */
export const getOAuthRedirectUri = (request?: Request): string => {
    if (!import.meta.env.PROD) {
        return "http://localhost:4321/auth/callback";
    }

    if (import.meta.env.PUBLIC_FRONTEND_URL) {
        return `${import.meta.env.PUBLIC_FRONTEND_URL.replace(/\/$/, "")}/auth/callback`;
    }

    if (request) {
        const forwardedHost = request.headers.get("x-forwarded-host");
        const host = forwardedHost || request.headers.get("host");
        const proto = request.headers.get("x-forwarded-proto") || "https";

        if (host && !host.startsWith("localhost")) {
            return `${proto}://${host}/auth/callback`;
        }
    }

    return "https://www.micancionero.online/auth/callback";
};

