import type { Category } from "./category";
import type { Author } from "./author";

export type Song = {
    id: number;
    title: string;
    authorId: number;
    author?: Author | null;
    content: string;
    key: string;
    url_song: string;
    categories: Category[];
    categoryId?: number;
    category?: Category | null;
    active: boolean;
    user?: {
        id: number;
        name: string;
    } | null;
    userId?: number;
};
