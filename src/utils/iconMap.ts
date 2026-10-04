// Mapeo ultraligero y desacoplado para resolver nombres de iconos sin importar React ni paquetes pesados.
// Cero dependencias externas. 100% puro y rápido para SSR y cliente.

export const ICON_ALIASES: Record<string, string> = {
  // Aliases frecuentes FontAwesome 5/6
  home: 'fa6-solid:house',
  house: 'fa6-solid:house',
  search: 'fa6-solid:magnifying-glass',
  'magnifying-glass': 'fa6-solid:magnifying-glass',
  edit: 'fa6-solid:pen-to-square',
  'pen-to-square': 'fa6-solid:pen-to-square',
  pencil: 'fa6-solid:pencil',
  cog: 'fa6-solid:gear',
  gear: 'fa6-solid:gear',
  cogs: 'fa6-solid:gears',
  gears: 'fa6-solid:gears',
  refresh: 'fa6-solid:arrows-rotate',
  sync: 'fa6-solid:arrows-rotate',
  'arrows-rotate': 'fa6-solid:arrows-rotate',
  'trash-alt': 'fa6-solid:trash-can',
  trash: 'fa6-solid:trash-can',
  'trash-can': 'fa6-solid:trash-can',
  remove: 'fa6-solid:xmark',
  close: 'fa6-solid:xmark',
  xmark: 'fa6-solid:xmark',
  'sign-in': 'fa6-solid:right-to-bracket',
  'right-to-bracket': 'fa6-solid:right-to-bracket',
  'sign-out': 'fa6-solid:right-from-bracket',
  'right-from-bracket': 'fa6-solid:right-from-bracket',
  'external-link': 'fa6-solid:up-right-from-square',
  'up-right-from-square': 'fa6-solid:up-right-from-square',
  'sliders-h': 'fa6-solid:sliders',
  sliders: 'fa6-solid:sliders',
  sort: 'fa6-solid:arrows-up-down',
  'arrows-up-down': 'fa6-solid:arrows-up-down',
  'plus-circle': 'fa6-solid:circle-plus',
  'circle-plus': 'fa6-solid:circle-plus',

  // Lucide icons
  'wifi-slash': 'lucide:wifi-off',
  'wifi-off': 'lucide:wifi-off',
  'music-slash': 'lucide:music-2',
  'music-2': 'lucide:music-2',

  // Brands
  google: 'fa6-brands:google',
  whatsapp: 'fa6-brands:whatsapp',
  github: 'fa6-brands:github',
  youtube: 'fa6-brands:youtube',
};

export function normalizeIconName(name: string): string {
  if (!name) return 'fa6-solid:circle-question';

  const trimmed = name.trim();

  // Si ya tiene el prefijo de colección explícito (ej: fa6-solid:music, lucide:wifi-off)
  if (trimmed.includes(':')) {
    return trimmed;
  }

  // Limpiar prefijos clásicos de FontAwesome
  const cleaned = trimmed
    .replace(/^fa-(solid|regular|brands)\s+/, '')
    .replace(/^fa-/, '');

  // Buscar en alias directos
  if (ICON_ALIASES[cleaned]) {
    return ICON_ALIASES[cleaned];
  }
  if (ICON_ALIASES[trimmed]) {
    return ICON_ALIASES[trimmed];
  }

  // Colecciones por defecto
  if (cleaned === 'google' || cleaned === 'whatsapp' || cleaned === 'github' || cleaned === 'youtube') {
    return `fa6-brands:${cleaned}`;
  }

  return `fa6-solid:${cleaned}`;
}
