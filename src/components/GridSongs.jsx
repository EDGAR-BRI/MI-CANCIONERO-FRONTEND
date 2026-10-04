import React, { useState, useEffect } from 'react';
import { API_URL } from '../services/songs';
import SongCardReact from './SongCardReact';
import { getSongListFromStore, storeSongList } from '../stores/songsStore';

export default function GridSongs({ endpoint, initialSongs = [] }) {
    const cacheKey = endpoint || `${API_URL}/songs?limit=12`;
    const cachedSongs = getSongListFromStore(cacheKey);

    const [songs, setSongs] = useState(() => {
        if (cachedSongs && cachedSongs.length > 0) return cachedSongs;
        return initialSongs;
    });
    const [loading, setLoading] = useState(() => {
        if (cachedSongs && cachedSongs.length > 0) return false;
        return (!initialSongs || initialSongs.length === 0);
    });
    const [error, setError] = useState(null);

    useEffect(() => {
        const currentKey = endpoint || `${API_URL}/songs?limit=12`;
        const cached = getSongListFromStore(currentKey);
        if (cached && cached.length > 0) {
            setSongs(cached);
            setLoading(false);
            return;
        }

        const fetchSongs = async () => {
            if (songs.length === 0) setLoading(true);
            try {
                const url = endpoint || `${API_URL}/songs?limit=12`;
                const res = await fetch(url);
                if (!res.ok) {
                    throw new Error("Failed to fetch songs");
                }
                const data = await res.json();
                setSongs(data);
                storeSongList(currentKey, data);
                setError(null);
            } catch (err) {
                console.error("Error fetching songs:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSongs();
    }, [endpoint]);

    // Skeleton Component
    const SkeletonCard = () => (
        <div className="bg-bg-secondary border border-white/5 rounded-xl p-5 h-[130px] animate-pulse">
            <div className="h-6 bg-white/10 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-white/5 rounded w-1/2 mb-4"></div>
            <div className="flex gap-2">
                <div className="h-6 w-16 bg-white/5 rounded"></div>
                <div className="h-6 w-24 bg-white/5 rounded"></div>
            </div>
        </div>
    );

    if (error) {
        return <div className="text-red-500 py-10 text-center">Error al cargar canciones: {error}</div>;
    }

    return (

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
                // Show 6 skeletons while loading
                Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            ) : (
                songs.map(song => (
                    <SongCardReact key={song.id} song={song} />
                ))
            )}
            {songs.length === 0 && !loading && (
                <div className="text-center w-100 py-10 col-span-1 md:col-span-2 lg:col-span-3">
                    <p className="text-gray-500 text-xl">No se encontraron canciones.</p>
                </div>
            )}

        </div>

    );
}
