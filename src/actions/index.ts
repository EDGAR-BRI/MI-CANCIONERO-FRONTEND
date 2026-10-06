import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { login, register } from "../services/auth";
import { API_URL } from "../services/songs";

export const server = {
    deleteSong: defineAction({
        accept: "json",
        input: z.object({
            id: z.number(),
        }),
        handler: async ({ id }, context) => {
            const token = context.cookies.get("token")?.value;

            if (!token) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No autorizado",
                });
            }

            try {
                const response = await fetch(`${API_URL}/songs/${id}`, {
                    method: "DELETE",
                    headers: {
                        "Cookie": `token=${token}`,
                        "Authorization": `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new ActionError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: errData.error || "Error al eliminar la canción",
                    });
                }

                return { success: true };
            } catch (e) {
                if (e instanceof ActionError) throw e;
                console.error("Exception deleting song:", e);
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error interno del servidor",
                });
            }
        },
    }),
    register: defineAction({
        accept: "json",
        input: z.object({
            email: z.string().email(),
            password: z.string().min(6),
            name: z.string().min(2),
            phoneNumber: z.string().optional(),
        }),
        handler: async ({ email, password, name, phoneNumber }) => {
            try {
                const response = await register(name, email, password, phoneNumber);

                if (!response?.ok) {
                    let message = "Error al registrar usuario";
                    try {
                        const err = await response.json();
                        message = err.error || message;
                    } catch (e) { }

                    throw new ActionError({
                        code: "BAD_REQUEST",
                        message,
                    });
                }

                return { success: true, message: "Usuario registrado correctamente" };
            } catch (error) {
                if (error instanceof ActionError) throw error;
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error al registrar usuario",
                });
            }
        },
    }),
    login: defineAction({
        accept: "json",
        input: z.object({
            email: z.string().email(),
            password: z.string().min(1),
        }),
        handler: async ({ email, password }, context) => {
            try {
                const response = await login(email, password);

                if (response && response.ok) {
                    // Forward cookies from backend to client
                    const setCookie = response.headers.get("set-cookie");
                    console.log("Action login - response set-cookie header:", setCookie);

                    if (setCookie) {
                        const match = setCookie.match(/token=([^;]+)/);
                        const token = match ? match[1] : null;

                        if (token) {
                            context.cookies.set("token", token, {
                                path: "/",
                                httpOnly: true,
                                secure: import.meta.env.PROD,
                                sameSite: "lax",
                            });
                            return { success: true };
                        }
                    } else {
                        // Fallback for token in body
                        const responseClone = response.clone();
                        try {
                            const responseBody = await responseClone.json();
                            if (responseBody.token) {
                                console.log("Action login - Token found in body, setting cookie");
                                context.cookies.set("token", responseBody.token, {
                                    path: "/",
                                    httpOnly: true,
                                    secure: import.meta.env.PROD,
                                    sameSite: "lax",
                                });
                                return { success: true };
                            }
                        } catch (e) {
                            // ignore
                        }
                    }
                    throw new ActionError({
                        code: "UNAUTHORIZED",
                        message: "Error: No se recibió el token de autenticación.",
                    });
                } else {
                    throw new ActionError({
                        code: "UNAUTHORIZED",
                        message: "Credenciales incorrectas",
                    });
                }
            } catch (error) {
                if (error instanceof ActionError) {
                    throw error;
                }
                console.error(error);
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error interno del servidor",
                });
            }
        },
    }),
    createMisa: defineAction({
        accept: "json",
        input: z.object({
            title: z.string().min(1),
            dateMisa: z.string(),
            visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
        }),
        handler: async ({ title, dateMisa, visibility }, context) => {
            const token = context.cookies.get("token")?.value;

            if (!token) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No autorizado. Inicia sesión para continuar.",
                });
            }

            try {
                const response = await fetch(`${API_URL}/misas`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Cookie": `token=${token}`,
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        title,
                        dateMisa,
                        visibility,
                    }),
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new ActionError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: errData.error || "Error al crear la misa",
                    });
                }

                const data = await response.json();
                return { success: true, data };
            } catch (e) {
                if (e instanceof ActionError) throw e;
                console.error("Exception creating misa:", e);
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error interno del servidor",
                });
            }
        },
    }),
    updateProfile: defineAction({
        accept: "json",
        input: z.object({
            name: z.string().optional(),
            avatarUrl: z.string().nullable().optional(),
            phoneNumber: z.string().nullable().optional(),
            currentPassword: z.string().optional(),
            newPassword: z.string().optional(),
        }),
        handler: async (inputData, context) => {
            const token = context.cookies.get("token")?.value;

            if (!token) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No autorizado. Inicia sesión para continuar.",
                });
            }

            try {
                const response = await fetch(`${API_URL}/auth/me`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Cookie": `token=${token}`,
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify(inputData),
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new ActionError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: errData.error || "Error al actualizar el perfil",
                    });
                }

                const responseData = await response.json();

                if (responseData.token) {
                    context.cookies.set("token", responseData.token, {
                        path: "/",
                        httpOnly: true,
                        secure: import.meta.env.PROD,
                        sameSite: "lax",
                        maxAge: 60 * 60 * 24 * 7,
                    });
                }

                return {
                    success: true,
                    data: responseData,
                };
            } catch (e) {
                if (e instanceof ActionError) throw e;
                console.error("Exception updating profile:", e);
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error interno del servidor al actualizar perfil",
                });
            }
        },
    }),
};
