import React from 'react';

const SongCardReact = ({ song }) => {
    const categories = song.categories && song.categories.length > 0
        ? song.categories
        : (song.category ? [song.category] : []);
    const authorName = song.author?.name || song.author || "Desconocido";

    return (
        <a href={`/songs/${song.id}`} className="block group">
            <article className="bg-bg-secondary border border-white/5 rounded-xl p-4 sm:p-5 hover:border-accent-main/50 transition-colors h-full flex flex-col justify-between">
                <div>
                    <h2
                        style={{ viewTransitionName: `song-title-${song.id}` }}
                        className="text-xl font-bold text-white group-hover:text-accent-main transition-colors mb-1 truncate"
                    >
                        {song.title}
                    </h2>
                    <p
                        style={{ viewTransitionName: `song-artist-${song.id}` }}
                        className="text-text-secondary text-sm mb-4 truncate"
                    >
                        {authorName}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    <span
                        style={{ viewTransitionName: `song-tone-${song.id}` }}
                        className="text-xs bg-white/5 px-2 py-1 rounded text-text-secondary group-hover:bg-accent-main/10 group-hover:text-accent-main transition-colors font-mono"
                    >
                        Ton: {song.key}
                    </span>
                    {categories.slice(0, 2).map((cat) => (
                        <span
                            key={cat.id}
                            className="text-xs bg-white/5 px-2 py-1 rounded text-text-secondary group-hover:bg-accent-main/10 group-hover:text-accent-main transition-colors truncate max-w-[120px]"
                        >
                            {cat.name}
                        </span>
                    ))}
                    {categories.length > 2 && (
                        <span className="text-[11px] bg-white/5 px-1.5 py-1 rounded text-text-secondary/70">
                            +{categories.length - 2}
                        </span>
                    )}
                </div>
            </article>
        </a>
    );
};

export default SongCardReact;
