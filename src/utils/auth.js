const parseSessionUser = (rawSessionUser) => {
    if (!rawSessionUser) return null;

    try {
        const decoded = decodeURIComponent(rawSessionUser);
        const parsed = JSON.parse(decoded);
        if (!parsed || typeof parsed !== "object") return null;
        return parsed;
    } catch {
        return null;
    }
};

export const getUserFromToken = (token, rawSessionUser) => {
    if (!token) return null;

    const sessionUser = parseSessionUser(rawSessionUser);

    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

        // Supabase access token does not include app role/permissions from Prisma.
        // Merge role and permissions from the session cookie when available.
        return {
            ...payload,
            id: sessionUser?.id ?? payload.id,
            role: sessionUser?.role ?? payload.role,
            permissions: sessionUser?.permissions ?? payload.permissions,
            email: sessionUser?.email ?? payload.email
        };
    } catch {
        // If token payload cannot be parsed, fallback to session user for SSR rendering.
        return sessionUser;
    }
};

export const hasPermission = (user, permission) => {
    if (!user) return false;
    // Admin always has permission (fallback) or if explicitly in list
    if (user.role === 'ADMIN') return true;
    return user.permissions?.includes(permission) || false;
};
