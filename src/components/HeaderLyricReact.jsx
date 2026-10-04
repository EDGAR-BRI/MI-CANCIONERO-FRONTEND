import React, { useState, useEffect } from 'react';
import { transposeKey } from "../utils/music";
import { getYouTubeId } from "./YouTubePlayerReact";

export const HeaderLyricReact = ({ id, title, author, artist, tone, category, categories: categoriesProp, user, videoUrl }) => {
    const categories = categoriesProp && categoriesProp.length > 0
        ? categoriesProp
        : (category ? [category] : []);
    const authorName = author?.name || (typeof author === 'string' ? author : (artist || "Desconocido"));
    const hasVideo = !!(videoUrl && getYouTubeId(videoUrl));

    const handlePlayVideo = () => {
        window.dispatchEvent(new CustomEvent('play-song-video'));
        const player = document.getElementById('youtube-player-section');
        if (player) {
            player.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const [currentTone, setCurrentTone] = useState(tone);
    const [semitoneDiff, setSemitoneDiff] = useState(0);

    useEffect(() => {
        if (tone) {
            setCurrentTone(tone);
            setSemitoneDiff(0);
        }
    }, [tone]);

    useEffect(() => {
        const handleTransposeEvent = (e) => {
            if (!e || !e.detail) return;

            if (e.detail.reset) {
                setCurrentTone(tone);
                setSemitoneDiff(0);
                return;
            }

            if (e.detail.newKey) {
                setCurrentTone(e.detail.newKey);
                if (typeof e.detail.semitonesFromOriginal === 'number') {
                    setSemitoneDiff(e.detail.semitonesFromOriginal);
                } else if (typeof e.detail.semitones === 'number') {
                    setSemitoneDiff(prev => prev + e.detail.semitones);
                }
                return;
            }

            if (typeof e.detail.semitones === 'number') {
                setCurrentTone(prev => transposeKey(prev || tone || 'C', e.detail.semitones));
                setSemitoneDiff(prev => prev + e.detail.semitones);
            }
        };

        window.addEventListener('song-transpose', handleTransposeEvent);
        return () => window.removeEventListener('song-transpose', handleTransposeEvent);
    }, [tone]);

    return (
        <header className="mb-8 lyric-header">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <h1
                        className="text-3xl sm:text-4xl font-extrabold text-text-main mb-1"
                        style={{ viewTransitionName: `song-title-${id}` }}
                    >
                        {title || "Título Desconocido"}
                    </h1>
                    <h2 className="text-lg sm:text-xl text-accent-main font-medium">
                        <span className="text-text-secondary">Autor:</span>{" "}
                        <span style={{ viewTransitionName: `song-artist-${id}` }}>{authorName}</span>
                    </h2>
                </div>

                {hasVideo && (
                    <button
                        type="button"
                        onClick={handlePlayVideo}
                        className="lg:hidden shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-secondary hover:bg-white/10 text-white border border-white/10 hover:border-accent-main/50 transition-all duration-200 active:scale-95 shadow-sm group cursor-pointer no-print no-focus-mode"
                        title="Reproducir video de YouTube"
                        aria-label="Reproducir video de YouTube"
                    >
                        <span className="w-7 h-7 rounded-lg bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-all">
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                        </span>
                        <div className="flex flex-col text-left">
                            <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold leading-none">YouTube</span>
                            <span className="text-xs font-bold text-text-main group-hover:text-accent-main transition-colors leading-tight mt-0.5">Reproducir</span>
                        </div>
                    </button>
                )}
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-start justify-between gap-4 mt-4 text-sm text-text-secondary">
                <div className="flex flex-wrap items-center justify-start gap-2">
                    <span
                        className="bg-bg-secondary px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5 font-mono text-xs sm:text-sm"
                        style={{ viewTransitionName: `song-tone-${id}` }}
                    >
                        <span className="text-text-secondary">Ton:</span>
                        <span className="text-accent-main font-bold">{currentTone || tone}</span>
                        {semitoneDiff !== 0 && (
                            <span className="text-[11px] text-accent-main font-semibold bg-accent-main/10 px-1.5 py-0.5 rounded">
                                {semitoneDiff > 0 ? `+${semitoneDiff}` : semitoneDiff}
                            </span>
                        )}
                        {semitoneDiff !== 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    const event = new CustomEvent('song-transpose', {
                                        detail: { reset: true, newKey: tone, originalKey: tone, semitonesFromOriginal: 0 }
                                    });
                                    window.dispatchEvent(event);
                                }}
                                className="text-[11px] text-text-secondary hover:text-white underline cursor-pointer ml-0.5"
                                title={`Restablecer al tono original (${tone})`}
                            >
                                (Orig: {tone})
                            </button>
                        )}
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

