import React from 'react';
import SongLine from './SongLine';
import { sanitizeSongContent } from '../utils/songSanitizer';

export const SongRenderer = ({ content, showChords }) => {
    const cleanContent = sanitizeSongContent(content || "");
    return (
        <div className="pb-20 max-w-full" style={{ '--song-font-size': '1.125rem' }}>
            {cleanContent.split('\n').map((line, i) => (
                <SongLine key={i} line={line} showChords={showChords} />
            ))}
        </div>
    );
};
