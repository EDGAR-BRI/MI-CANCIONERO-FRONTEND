import type { Song } from "./song";

export interface Moment {
    id: number;
    nombre: string;
}

export interface MisaMoment {
    id: number;
    misaId: number;
    momentId: number;
    order: number;
    moment: Moment;
}

export interface MisaSong {
    id: number;
    misaId: number;
    songId: number;
    momentId: number | null;
    key: string | null;
    order?: number;
    song: Song;
    moment: Moment | null;
}

export interface Misa {
    id: number;
    title: string;
    dateCreate: string;
    dateMisa: string;
    misaSongs: MisaSong[];
    misaMoments?: MisaMoment[];
    visibility: 'PUBLIC' | 'PRIVATE';
    userId: number;
    shareToken?: string | null;
    editToken?: string | null;
    isOwner?: boolean;
    canEdit?: boolean;
    ministryId?: number | null;
    ministry?: {
        id: number;
        name: string;
        avatarUrl?: string | null;
    } | null;
    user?: {
        id?: number;
        name: string;
        email?: string;
    };
}
