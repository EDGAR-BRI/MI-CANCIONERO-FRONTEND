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

export const login = async (
    email: FormDataEntryValue | null,
    password: FormDataEntryValue | null,
    rememberMe: boolean = true
) => {


    if (!email || !password) {
        console.error("Email and Password are required");
        return null;
    }

    const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, rememberMe }),
        credentials: "include",
    });

    return response;
}

export const forgotPassword = async (email: string) => {
    return fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
    });
};

export const resendVerification = async (email: string) => {
    return fetch(`${API_URL}/auth/resend-verification`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
    });
};

export const resetPassword = async (accessToken: string, newPassword: string) => {
    return fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessToken, newPassword }),
    });
};
