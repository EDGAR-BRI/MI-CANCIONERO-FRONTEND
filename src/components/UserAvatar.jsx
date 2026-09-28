import React, { useState } from 'react';
import { Blobatar } from '@blobatar/react';
import * as expressions from 'blobatar/expression';

/**
 * @param {Object} [props]
 * @param {any} [props.user]
 * @param {string} [props.avatarUrl]
 * @param {string} [props.name]
 * @param {string} [props.email]
 * @param {number} [props.hue]
 * @param {any} [props.expression]
 * @param {string} [props.animate]
 * @param {string} [props.size]
 * @param {string} [props.rounded]
 * @param {string} [props.border]
 * @param {string} [props.className]
 * @param {string} [props.headColor]
 * @param {React.CSSProperties} [props.style]
 * @param {Record<string, any>} [props.traits]
 */
export default function UserAvatar({
    user = null,
    avatarUrl = undefined,
    name = '',
    email = '',
    hue = undefined,
    expression = undefined,
    animate = 'always',
    size = 'w-20 h-20',
    rounded = 'rounded-2xl',
    border = 'border-2 border-accent-main/40',
    className = '',
    headColor = undefined,
    style = undefined,
    traits = undefined
} = {}) {
    const [imgError, setImgError] = useState(false);

    const effectiveAvatarUrl = avatarUrl !== undefined ? avatarUrl : user?.avatarUrl;
    const effectiveName = name || user?.name || 'Usuario';
    const effectiveEmail = email || user?.email || '';

    // El nombre del usuario tiene la máxima prioridad como semilla por defecto
    const defaultSeed = (effectiveName && effectiveName !== 'Usuario' ? effectiveName : (effectiveEmail || effectiveName || 'Usuario')).trim();

    const isBlobatarScheme = Boolean(effectiveAvatarUrl?.startsWith('blobatar:'));
    let blobatarSeed = defaultSeed;
    let blobatarHue = hue !== undefined ? hue : undefined;
    let blobatarExpr = typeof expression === 'string' ? expression : (expression ? null : 'idle');
    let resolvedHeadColor = headColor;
    let resolvedTraits = traits;

    if (isBlobatarScheme && effectiveAvatarUrl) {
        const raw = effectiveAvatarUrl.slice(9);
        if (raw.includes('?')) {
            const [s, q] = raw.split('?');
            const params = new URLSearchParams(q);
            blobatarSeed = s ? s.trim() : defaultSeed;
            const h = params.get('hue');
            if (blobatarHue === undefined && h !== null && !isNaN(Number(h))) {
                blobatarHue = Number(h);
            }
            const ex = params.get('expr');
            if (expression === undefined && ex && expressions[ex]) {
                blobatarExpr = ex;
            }
            const col = params.get('color') || params.get('headColor');
            if (resolvedHeadColor === undefined && col) {
                resolvedHeadColor = col;
            }
            const shapeParam = params.get('shape');
            if (resolvedTraits === undefined && shapeParam !== null && !isNaN(Number(shapeParam))) {
                resolvedTraits = { shape: Number(shapeParam) };
            }
        } else if (raw) {
            blobatarSeed = raw.trim();
        }
    }

    // Determine the resolved expression object or fallback to expressions.idle
    const resolvedExpression = typeof expression === 'object' && expression !== null
        ? expression
        : (blobatarExpr && expressions[blobatarExpr] ? expressions[blobatarExpr] : expressions.idle);

    const hasPhoto = Boolean(effectiveAvatarUrl && !isBlobatarScheme && !imgError);

    if (hasPhoto) {
        return (
            <img
                src={effectiveAvatarUrl}
                alt={effectiveName}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className={`${size} ${rounded} object-cover ${border} shadow-lg shrink-0 transition-transform duration-300 hover:scale-105 ${className}`}
            />
        );
    }

    const blobatarStyle = resolvedHeadColor
        ? { '--mo-head': resolvedHeadColor, ...style }
        : style;

    return (
        <div
            className={`${size} shrink-0 flex items-center justify-center transition-transform duration-300 hover:scale-110 active:scale-95 ${className}`}
            title={effectiveName}
        >
            <Blobatar
                name={blobatarSeed}
                hue={blobatarHue}
                expression={resolvedExpression}
                traits={resolvedTraits}
                animate={animate}
                style={blobatarStyle}
                className="w-full h-full scale-125 object-contain drop-shadow-sm select-none"
            />
        </div>
    );
}

