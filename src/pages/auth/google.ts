import type { APIRoute } from "astro";
import { API_URL } from "@/services/songs";

export const GET: APIRoute = async ({ url, redirect }) => {
    try {
        // En desarrollo local siempre usar el puerto canónico 4321 autorizado en Google Cloud Console
        const redirectUri = import.meta.env.PROD
            ? `${url.origin}/auth/callback`
            : "http://localhost:4321/auth/callback";

        const res = await fetch(`${API_URL}/auth/google?redirectUri=${encodeURIComponent(redirectUri)}&json=true`);
        if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data.url) {
                return redirect(data.url, 302);
            }
        }
        return redirect(`${API_URL}/auth/google`, 302);
    } catch (e) {
        console.error("Error initiating Google OAuth flow:", e);
        return redirect(`${API_URL}/auth/google`, 302);
    }
};
