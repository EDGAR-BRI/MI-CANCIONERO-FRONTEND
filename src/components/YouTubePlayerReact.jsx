import React, { useState, useEffect, useRef } from 'react';

export const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
};

export const YouTubePlayerReact = ({ url }) => {
    if (!url) return null;

    const videoId = getYouTubeId(url);
    if (!videoId) return null;

    const [isPlaying, setIsPlaying] = useState(false);
    const [isHighlighted, setIsHighlighted] = useState(false);
    const iframeRef = useRef(null);

    useEffect(() => {
        const handlePlayEvent = () => {
            setIsPlaying(true);
            setIsHighlighted(true);
            setTimeout(() => setIsHighlighted(false), 2200);

            try {
                if (iframeRef.current && iframeRef.current.contentWindow) {
                    iframeRef.current.contentWindow.postMessage(
                        JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
                        '*'
                    );
                }
            } catch (e) {
                // Silenciar error en caso de restricciones de origen
            }
        };

        window.addEventListener('play-song-video', handlePlayEvent);
        return () => window.removeEventListener('play-song-video', handlePlayEvent);
    }, []);

    const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1${isPlaying ? '&autoplay=1' : ''}`;

    return (
        <div
            id="youtube-player-section"
            className={`sticky top-20 rounded-xl overflow-hidden shadow-2xl bg-black aspect-video transition-all duration-500 ${
                isHighlighted ? 'ring-2 ring-accent-main ring-offset-2 ring-offset-bg-main shadow-accent-main/30' : ''
            }`}
        >
            <iframe
                ref={iframeRef}
                width="100%"
                height="100%"
                src={embedUrl}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
            />
        </div>
    );
};
