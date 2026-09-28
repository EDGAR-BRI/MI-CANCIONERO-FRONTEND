import type { APIRoute } from "astro";
import { API_URL } from "@/services/songs";
import { getOAuthRedirectUri } from "@/services/auth";

export const GET: APIRoute = async ({ request, redirect }) => {
    try {
        const redirectUri = getOAuthRedirectUri(request);

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
