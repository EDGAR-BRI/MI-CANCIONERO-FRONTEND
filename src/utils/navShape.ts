/**
 * navShape.ts
 * Cálculo geométrico de la silueta del BottomNav con muesca líquida deslizante (Lukas Stranak style).
 */

export const NOTCH_WIDTH = 44; // Ancho de los hombros de la muesca (44px a cada lado = 88px total)
export const NOTCH_DEPTH = 36; // Profundidad de la muesca (36px)

/**
 * Genera el path SVG del borde superior del BottomNav con la muesca líquida en la posición cx.
 */
export function getFluidNotchPath(width: number, cx: number): string {
    const w = Math.max(width, 320);
    const aw = NOTCH_WIDTH;
    const d = NOTCH_DEPTH;

    // Curva cúbica Bézier simétrica fluida estilo Dribbble
    return `M 0,0 L ${cx - aw},0 C ${cx - 26},0 ${cx - 22},${d} ${cx},${d} C ${cx + 22},${d} ${cx + 24},0 ${cx + aw},0 L ${w},0`;
}

/**
 * Genera el path SVG cerrado para rellenar el fondo del BottomNav (#1A1A1A).
 */
export function getFluidNotchBgPath(width: number, cx: number, heightTotal: number = 160): string {
    const topPath = getFluidNotchPath(width, cx);
    const w = Math.max(width, 320);
    return `${topPath} L ${w},${heightTotal} L 0,${heightTotal} Z`;
}

/**
 * Genera el path SVG para la máscara interior de la muesca (#050505) evitando que el contenido
 * de la página en scroll se filtre visualmente detrás de la esfera.
 */
export function getNotchMaskPath(cx: number): string {
    const aw = NOTCH_WIDTH;
    const d = NOTCH_DEPTH;
    return `M ${cx - aw},0 C ${cx - 26},0 ${cx - 22},${d} ${cx},${d} C ${cx + 22},${d} ${cx + 24},0 ${cx + aw},0 Z`;
}
