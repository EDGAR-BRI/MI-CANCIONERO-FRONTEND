export interface Author {
    id: number;
    name: string;
    createdAt?: string;
    updatedAt?: string;
    _count?: {
        songs: number;
    };
}
