import { API_URL, type ServiceResponse } from "./songs";

export type MinistryRole = 'ADMIN' | 'MEMBER';
export type MembershipStatus = 'ACTIVE' | 'PENDING';

export interface MinistryMember {
    id: number;
    userId: number;
    name: string;
    email: string;
    avatarUrl?: string | null;
    phoneNumber?: string | null;
    role: MinistryRole;
    joinedAt: string;
}

export interface MinistryPendingRequest {
    id: number;
    userId: number;
    name: string;
    email: string;
    avatarUrl?: string | null;
    phoneNumber?: string | null;
    requestedAt: string;
}

export interface MinistrySummary {
    id: number;
    name: string;
    description?: string | null;
    avatarUrl?: string | null;
    inviteCode: string;
    requireApproval: boolean;
    allowMemberInvites: boolean;
    foundedAt: string;
    createdAt: string;
    myRole: MinistryRole;
    myStatus: MembershipStatus;
    memberCount: number;
}

export interface MyPendingRequest {
    ministryId: number;
    name: string;
    description?: string | null;
    avatarUrl?: string | null;
    requestedAt: string;
}

export interface MyMinistriesResponse {
    ministries: MinistrySummary[];
    pendingRequests: MyPendingRequest[];
}

export interface MinistryDetail {
    id: number;
    name: string;
    description?: string | null;
    avatarUrl?: string | null;
    inviteCode: string;
    requireApproval: boolean;
    allowMemberInvites: boolean;
    foundedAt: string;
    createdAt: string;
    myRole: MinistryRole;
    myStatus: MembershipStatus;
    isGroupAdmin: boolean;
    canManageInvites: boolean;
    activeMembers: MinistryMember[];
    pendingRequests: MinistryPendingRequest[];
    misas: any[];
}

export interface CreateMinistryPayload {
    name: string;
    description?: string;
    avatarUrl?: string;
    foundedAt?: string;
    requireApproval?: boolean;
    allowMemberInvites?: boolean;
}

export interface SearchUserResult {
    id: number;
    name: string;
    email: string;
    avatarUrl?: string | null;
    phoneNumber?: string | null;
}

let activeAuthToken: string | null = null;

export const setMinistriesAuthToken = (token: string | null) => {
    if (token) activeAuthToken = token;
};

export const getMinistriesAuthToken = () => activeAuthToken;

const getAuthHeaders = (token?: string, isJson: boolean = false): HeadersInit => {
    const headers: Record<string, string> = {};
    if (isJson) {
        headers["Content-Type"] = "application/json";
    }
    const effToken = token || activeAuthToken;
    if (effToken) {
        headers["Authorization"] = `Bearer ${effToken}`;
    }
    return headers;
};

// 1. Get current user's ministries and pending requests
export const getMyMinistries = async (token?: string): Promise<ServiceResponse<MyMinistriesResponse>> => {
    try {
        const res = await fetch(`${API_URL}/ministries`, {
            headers: getAuthHeaders(token),
            credentials: "include"
        });
        const data = await res.json();
        if (!res.ok) {
            return { success: false, error: data.error || "Error al obtener tus ministerios." };
        }
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// 2. Create a new ministry
export const createMinistry = async (payload: CreateMinistryPayload, token?: string): Promise<ServiceResponse<MinistrySummary>> => {
    try {
        const res = await fetch(`${API_URL}/ministries`, {
            method: "POST",
            headers: getAuthHeaders(token, true),
            credentials: "include",
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            return { success: false, error: data.error || "Error al crear el ministerio." };
        }
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// 3. Get ministry details by ID
export const getMinistryById = async (id: number | string, token?: string): Promise<ServiceResponse<MinistryDetail>> => {
    try {
        const res = await fetch(`${API_URL}/ministries/${id}`, {
            headers: getAuthHeaders(token),
            credentials: "include"
        });
        const data = await res.json();
        if (!res.ok) {
            return { success: false, error: data.error || "Error al cargar el ministerio." };
        }
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// 4. Update ministry details & settings
export const updateMinistry = async (id: number | string, payload: Partial<CreateMinistryPayload>, token?: string): Promise<ServiceResponse<any>> => {
    try {
        const res = await fetch(`${API_URL}/ministries/${id}`, {
            method: "PUT",
            headers: getAuthHeaders(token, true),
            credentials: "include",
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            return { success: false, error: data.error || "Error al actualizar el ministerio." };
        }
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// 5. Join a ministry by invite code
export const joinMinistryByCode = async (code: string, token?: string): Promise<ServiceResponse<{ message: string; ministry?: any; status: MembershipStatus }>> => {
    try {
        const res = await fetch(`${API_URL}/ministries/join`, {
            method: "POST",
            headers: getAuthHeaders(token, true),
            credentials: "include",
            body: JSON.stringify({ code })
        });
        const data = await res.json();
        if (!res.ok) {
            return { success: false, error: data.error || "No se pudo unir al ministerio." };
        }
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// 6. Search users not in this ministry
export const searchUsersToInvite = async (ministryId: number | string, query: string, token?: string): Promise<ServiceResponse<SearchUserResult[]>> => {
    try {
        const res = await fetch(`${API_URL}/ministries/${ministryId}/search-users?q=${encodeURIComponent(query)}`, {
            headers: getAuthHeaders(token),
            credentials: "include"
        });
        const data = await res.json();
        if (!res.ok) {
            return { success: false, error: data.error || "Error al buscar usuarios." };
        }
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// 7. Add a member directly
export const addMemberDirectly = async (ministryId: number | string, payload: { userId?: number; email?: string }, token?: string): Promise<ServiceResponse<any>> => {
    try {
        const res = await fetch(`${API_URL}/ministries/${ministryId}/members/direct`, {
            method: "POST",
            headers: getAuthHeaders(token, true),
            credentials: "include",
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            return { success: false, error: data.error || "Error al agregar integrante." };
        }
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// 8. Accept or Reject a pending request
export const handlePendingRequest = async (ministryId: number | string, userId: number, action: 'ACCEPT' | 'REJECT', token?: string): Promise<ServiceResponse<any>> => {
    try {
        const res = await fetch(`${API_URL}/ministries/${ministryId}/requests/${userId}`, {
            method: "POST",
            headers: getAuthHeaders(token, true),
            credentials: "include",
            body: JSON.stringify({ action })
        });
        const data = await res.json();
        if (!res.ok) {
            return { success: false, error: data.error || "Error al procesar solicitud." };
        }
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// 9. Update member role (ADMIN / MEMBER)
export const updateMemberRole = async (ministryId: number | string, userId: number, role: MinistryRole, token?: string): Promise<ServiceResponse<any>> => {
    try {
        const res = await fetch(`${API_URL}/ministries/${ministryId}/members/${userId}`, {
            method: "PUT",
            headers: getAuthHeaders(token, true),
            credentials: "include",
            body: JSON.stringify({ role })
        });
        const data = await res.json();
        if (!res.ok) {
            return { success: false, error: data.error || "Error al cambiar el rol." };
        }
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// 10. Remove member or leave ministry
export const removeMember = async (ministryId: number | string, userId: number, token?: string): Promise<ServiceResponse<any>> => {
    try {
        const res = await fetch(`${API_URL}/ministries/${ministryId}/members/${userId}`, {
            method: "DELETE",
            headers: getAuthHeaders(token),
            credentials: "include"
        });
        const data = await res.json();
        if (!res.ok) {
            return { success: false, error: data.error || "Error al remover integrante." };
        }
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// 11. Regenerate invite code
export const regenerateInviteCode = async (ministryId: number | string, token?: string): Promise<ServiceResponse<{ message: string; inviteCode: string }>> => {
    try {
        const res = await fetch(`${API_URL}/ministries/${ministryId}/invite-code/regenerate`, {
            method: "POST",
            headers: getAuthHeaders(token),
            credentials: "include"
        });
        const data = await res.json();
        if (!res.ok) {
            return { success: false, error: data.error || "Error al regenerar código." };
        }
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// 12. Delete ministry
export const deleteMinistry = async (ministryId: number | string, token?: string): Promise<ServiceResponse<any>> => {
    try {
        const res = await fetch(`${API_URL}/ministries/${ministryId}`, {
            method: "DELETE",
            headers: getAuthHeaders(token),
            credentials: "include"
        });
        const data = await res.json();
        if (!res.ok) {
            return { success: false, error: data.error || "Error al eliminar el ministerio." };
        }
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};
