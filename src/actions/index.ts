import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { forgotPassword, login, register, resendVerification, resetPassword } from "../services/auth";
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
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    let message = "Error al eliminar en base de datos";
                    try {
                        const err = await response.json();
                        message = err.error || message;
                    } catch (e) {
                        // ignore
                    }
                    throw new ActionError({
                        code: "INTERNAL_SERVER_ERROR",
                        message,
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

                return {
                    success: true,
                    message: "Cuenta creada. Revisa tu correo para verificarla antes de iniciar sesion."
                };
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
                    let message = "Credenciales incorrectas";
                    try {
                        const err = await response?.clone().json();
                        if (err?.error) message = err.error;
                    } catch (e) {
                        // ignore and use default message
                    }
                    throw new ActionError({
                        code: "UNAUTHORIZED",
                        message,
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
    forgotPassword: defineAction({
        accept: "json",
        input: z.object({
            email: z.string().email(),
        }),
        handler: async ({ email }) => {
            const response = await forgotPassword(email);

            if (!response?.ok) {
                let message = "No se pudo enviar el correo de recuperacion";
                try {
                    const err = await response.json();
                    message = err.error || message;
                } catch (e) {
                    // ignore
                }
                throw new ActionError({ code: "BAD_REQUEST", message });
            }

            return {
                success: true,
                message: "Si el correo existe, enviamos instrucciones para recuperar tu contrasena."
            };
        },
    }),
    resendVerification: defineAction({
        accept: "json",
        input: z.object({
            email: z.string().email(),
        }),
        handler: async ({ email }) => {
            const response = await resendVerification(email);

            if (!response?.ok) {
                let message = "No se pudo reenviar el correo de verificacion";
                try {
                    const err = await response.json();
                    message = err.error || message;
                } catch (e) {
                    // ignore
                }
                throw new ActionError({ code: "BAD_REQUEST", message });
            }

            return {
                success: true,
                message: "Si el correo existe, enviamos un nuevo enlace de verificacion."
            };
        },
    }),
    resetPassword: defineAction({
        accept: "json",
        input: z.object({
            accessToken: z.string().min(1),
            newPassword: z.string().min(6),
        }),
        handler: async ({ accessToken, newPassword }) => {
            const response = await resetPassword(accessToken, newPassword);

            if (!response?.ok) {
                let message = "No se pudo actualizar la contrasena";
                try {
                    const err = await response.json();
                    message = err.error || message;
                } catch (e) {
                    // ignore
                }
                throw new ActionError({ code: "BAD_REQUEST", message });
            }

            return { success: true, message: "Contrasena actualizada correctamente" };
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
                    message: "No autorizado",
                });
            }

            try {
                const response = await fetch(`${API_URL}/misas`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ title, dateMisa, visibility }),
                });

                if (!response.ok) {
                    let message = "Error al crear la misa en base de datos";
                    try {
                        const err = await response.json();
                        message = err.error || message;
                    } catch (e) {
                        // ignore
                    }
                    throw new ActionError({
                        code: "INTERNAL_SERVER_ERROR",
                        message,
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
};
