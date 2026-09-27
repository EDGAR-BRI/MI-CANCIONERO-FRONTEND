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
}

export const updateProfile = async (data: UpdateProfileData, token?: string) => {
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

