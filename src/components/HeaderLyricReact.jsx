import React from 'react';
import { transposeChord } from "../utils/music";

export const HeaderLyricReact = ({ id, title, author, artist, tone, category, categories: categoriesProp, user }) => {
    const categories = categoriesProp && categoriesProp.length > 0
        ? categoriesProp
        : (category ? [category] : []);
    const authorName = author?.name || (typeof author === 'string' ? author : (artist || "Desconocido"));

    return (
        <header className="mb-8">
            <h1
                className="text-4xl font-extrabold text-text-main mb-1"
                style={{ viewTransitionName: `song-title-${id}` }}
            >
                {title || "Título Desconocido"}
            </h1>
            <h2 className="text-xl text-accent-main font-medium">
                <span className="text-text-secondary">Autor:</span>{" "}
                <span style={{ viewTransitionName: `song-artist-${id}` }}>{authorName}</span>
            </h2>
            <div className="flex flex-col sm:flex-row sm:justify-start justify-between gap-4 mt-4 text-sm text-text-secondary">
                <div className="flex flex-wrap items-center justify-start gap-2">
                    <span
                        className="bg-bg-secondary px-3 py-1 rounded-full border border-white/10"
                        style={{ viewTransitionName: `song-tone-${id}` }}
                    >
                        Ton: <span className="text-accent-main font-bold">{tone}</span>
                    </span>
                    {categories.map((cat) => (
                        <a
                            key={cat.id}
                            href={`/songs/search/all?categoryId=${cat.id}`}
                            className="bg-bg-secondary hover:bg-white/10 px-3 py-1 rounded-full border border-white/10 text-accent-main font-semibold transition-colors"
                        >
                            {cat.name}
                        </a>
                    ))}
                </div>
                {user && (
                    <span className="text-sm text-text-secondary/80 sm:ml-auto ml-0">
                        Creado por: {user.name}
                    </span>
                )}
            </div>
        </header>
    );
};
