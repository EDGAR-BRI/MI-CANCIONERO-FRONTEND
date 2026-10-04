import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontDir = path.resolve(__dirname, '..');

// Load datasets
const faSolidPath = path.resolve(frontDir, 'node_modules/@iconify-json/fa6-solid/icons.json');
const faRegularPath = path.resolve(frontDir, 'node_modules/@iconify-json/fa6-regular/icons.json');
const faBrandsPath = path.resolve(frontDir, 'node_modules/@iconify-json/fa6-brands/icons.json');
const lucidePath = path.resolve(frontDir, 'node_modules/@iconify-json/lucide/icons.json');

const faSolid = JSON.parse(fs.readFileSync(faSolidPath, 'utf8'));
const faRegular = JSON.parse(fs.readFileSync(faRegularPath, 'utf8'));
const faBrands = JSON.parse(fs.readFileSync(faBrandsPath, 'utf8'));
const lucide = JSON.parse(fs.readFileSync(lucidePath, 'utf8'));

// Escaneo recursivo nativo en Node.js de src/ para encontrar iconos
function getFilesRecursively(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath));
    } else if (/\.(astro|jsx|tsx|ts|js|json)$/.test(file)) {
      results.push(fullPath);
    }
  }
  return results;
}

const allSrcFiles = getFilesRecursively(path.resolve(frontDir, 'src'));
const rawSet = new Set();

const faRegex = /\bfa-([a-z0-9-]+)\b/g;
const namePropRegex = /name=["']([a-zA-Z0-9-:]+)["']/g;
const nameAttrRegex = /name=\{([^}]+)\}/g;
const stringLiteralRegex = /['"]([a-zA-Z0-9-:]+)['"]/g;
const iconPropRegex = /icon:\s*['"]([a-zA-Z0-9-:]+)['"]/g;

for (const filePath of allSrcFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  let match;
  while ((match = faRegex.exec(content)) !== null) {
    rawSet.add(match[1]);
    rawSet.add(`fa-${match[1]}`);
  }
  while ((match = namePropRegex.exec(content)) !== null) {
    rawSet.add(match[1]);
  }
  while ((match = nameAttrRegex.exec(content)) !== null) {
    const expr = match[1];
    let strMatch;
    while ((strMatch = stringLiteralRegex.exec(expr)) !== null) {
      rawSet.add(strMatch[1]);
    }
  }
  while ((match = iconPropRegex.exec(content)) !== null) {
    rawSet.add(match[1]);
  }
}

const aliasMap = {
  home: 'house',
  search: 'magnifying-glass',
  edit: 'pen-to-square',
  cog: 'gear',
  cogs: 'gears',
  refresh: 'arrows-rotate',
  sync: 'arrows-rotate',
  'trash-alt': 'trash-can',
  trash: 'trash-can',
  remove: 'xmark',
  close: 'xmark',
  'sign-in': 'right-to-bracket',
  'sign-out': 'right-from-bracket',
  'external-link': 'up-right-from-square',
  'sliders-h': 'sliders',
  sort: 'arrows-up-down',
  pencil: 'pencil',
  'plus-circle': 'circle-plus',
  'wifi-slash': 'wifi-off',
  'music-slash': 'music-2',
};

function extractIcon(set, iconName) {
  const icon = set.icons[iconName];
  if (!icon) return null;
  return {
    body: icon.body,
    width: icon.width || set.width || 512,
    height: icon.height || set.height || 512,
    left: icon.left || set.left || 0,
    top: icon.top || set.top || 0,
  };
}

const icons = {};
const aliases = {};

// Process all discovered icons
for (const raw of rawSet) {
  if (['fa-solid', 'fa-regular', 'fa-brands', 'fa-spin'].includes(raw)) continue;
  const base = raw.replace(/^fa-/, '');
  const mapped = aliasMap[base] || base;

  let data = null;
  let canonicalKey = null;

  if (base === 'wifi-slash' || base === 'music-slash' || mapped === 'wifi-off' || mapped === 'music-2') {
    data = extractIcon(lucide, aliasMap[base] || mapped);
    canonicalKey = `lucide:${aliasMap[base] || mapped}`;
  } else if (faSolid.icons[mapped]) {
    data = extractIcon(faSolid, mapped);
    canonicalKey = `fa6-solid:${mapped}`;
  } else if (faRegular.icons[mapped]) {
    data = extractIcon(faRegular, mapped);
    canonicalKey = `fa6-regular:${mapped}`;
  } else if (faBrands.icons[mapped]) {
    data = extractIcon(faBrands, mapped);
    canonicalKey = `fa6-brands:${mapped}`;
  } else if (lucide.icons[mapped]) {
    data = extractIcon(lucide, mapped);
    canonicalKey = `lucide:${mapped}`;
  }

  if (data && canonicalKey) {
    icons[canonicalKey] = data;
    aliases[raw] = canonicalKey;
    aliases[base] = canonicalKey;
    if (aliasMap[base]) {
      aliases[aliasMap[base]] = canonicalKey;
    }
  }
}

// Extra essential UI, playback, liturgical and admin icons
const extras = [
  // Media / Playback
  { set: faSolid, name: 'play', key: 'fa6-solid:play' },
  { set: faSolid, name: 'pause', key: 'fa6-solid:pause' },
  { set: faSolid, name: 'stop', key: 'fa6-solid:stop' },
  { set: faSolid, name: 'backward', key: 'fa6-solid:backward' },
  { set: faSolid, name: 'forward', key: 'fa6-solid:forward' },
  { set: faSolid, name: 'angles-down', key: 'fa6-solid:angles-down' },
  { set: faSolid, name: 'angles-up', key: 'fa6-solid:angles-up' },
  { set: faSolid, name: 'rotate-left', key: 'fa6-solid:rotate-left' },
  { set: faSolid, name: 'rotate-right', key: 'fa6-solid:rotate-right' },
  // Status & Fallback
  { set: faSolid, name: 'circle-question', key: 'fa6-solid:circle-question' },
  { set: faSolid, name: 'spinner', key: 'fa6-solid:spinner' },
  { set: faSolid, name: 'circle-notch', key: 'fa6-solid:circle-notch' },
  { set: faSolid, name: 'triangle-exclamation', key: 'fa6-solid:triangle-exclamation' },
  { set: faSolid, name: 'check', key: 'fa6-solid:check' },
  { set: faSolid, name: 'xmark', key: 'fa6-solid:xmark' },
  { set: faSolid, name: 'magnifying-glass', key: 'fa6-solid:magnifying-glass' },
  { set: faSolid, name: 'plus', key: 'fa6-solid:plus' },
  { set: faSolid, name: 'minus', key: 'fa6-solid:minus' },
  { set: faSolid, name: 'circle-plus', key: 'fa6-solid:circle-plus' },
  { set: faSolid, name: 'user', key: 'fa6-solid:user' },
  { set: faSolid, name: 'users', key: 'fa6-solid:users' },
  { set: faSolid, name: 'lock', key: 'fa6-solid:lock' },
  { set: faSolid, name: 'globe', key: 'fa6-solid:globe' },
  { set: faSolid, name: 'book', key: 'fa6-solid:book' },
  { set: faSolid, name: 'book-open', key: 'fa6-solid:book-open' },
  { set: faSolid, name: 'copy', key: 'fa6-solid:copy' },
  { set: faSolid, name: 'pen-to-square', key: 'fa6-solid:pen-to-square' },
  { set: faSolid, name: 'pencil', key: 'fa6-solid:pencil' },
  { set: faSolid, name: 'trash-can', key: 'fa6-solid:trash-can' },
  { set: faSolid, name: 'chevron-down', key: 'fa6-solid:chevron-down' },
  { set: faSolid, name: 'chevron-up', key: 'fa6-solid:chevron-up' },
  { set: faSolid, name: 'arrow-left', key: 'fa6-solid:arrow-left' },
  { set: faSolid, name: 'arrow-right', key: 'fa6-solid:arrow-right' },
  { set: faSolid, name: 'arrows-rotate', key: 'fa6-solid:arrows-rotate' },
  { set: faSolid, name: 'cloud-arrow-down', key: 'fa6-solid:cloud-arrow-down' },
  { set: faSolid, name: 'right-to-bracket', key: 'fa6-solid:right-to-bracket' },
  { set: faSolid, name: 'right-from-bracket', key: 'fa6-solid:right-from-bracket' },
  { set: faSolid, name: 'music', key: 'fa6-solid:music' },
  { set: faSolid, name: 'wand-magic-sparkles', key: 'fa6-solid:wand-magic-sparkles' },
  // Liturgical & Categories
  { set: faSolid, name: 'church', key: 'fa6-solid:church' },
  { set: faSolid, name: 'cross', key: 'fa6-solid:cross' },
  { set: faSolid, name: 'dove', key: 'fa6-solid:dove' },
  { set: faSolid, name: 'guitar', key: 'fa6-solid:guitar' },
  { set: faSolid, name: 'hands-praying', key: 'fa6-solid:hands-praying' },
  { set: faSolid, name: 'bread-slice', key: 'fa6-solid:bread-slice' },
  { set: faSolid, name: 'wine-glass', key: 'fa6-solid:wine-glass' },
  { set: faSolid, name: 'clock', key: 'fa6-solid:clock' },
  { set: faSolid, name: 'calendar-day', key: 'fa6-solid:calendar-day' },
  { set: faSolid, name: 'heart', key: 'fa6-solid:heart' },
  { set: faSolid, name: 'hands-clapping', key: 'fa6-solid:hands-clapping' },
  { set: faSolid, name: 'crown', key: 'fa6-solid:crown' },
  { set: faSolid, name: 'sun', key: 'fa6-solid:sun' },
  { set: faSolid, name: 'gift', key: 'fa6-solid:gift' },
  { set: faSolid, name: 'fire-flame-curved', key: 'fa6-solid:fire-flame-curved' },
  { set: faSolid, name: 'child', key: 'fa6-solid:child' },
  { set: faSolid, name: 'door-open', key: 'fa6-solid:door-open' },
  { set: faSolid, name: 'person-walking-arrow-right', key: 'fa6-solid:person-walking-arrow-right' },
  { set: faSolid, name: 'eye-slash', key: 'fa6-solid:eye-slash' },
  { set: faSolid, name: 'eye', key: 'fa6-solid:eye' },
  // Admin & Controls
  { set: faSolid, name: 'gauge', key: 'fa6-solid:gauge' },
  { set: faSolid, name: 'tags', key: 'fa6-solid:tags' },
  { set: faSolid, name: 'feather-pointed', key: 'fa6-solid:feather-pointed' },
  { set: faSolid, name: 'shield', key: 'fa6-solid:shield' },
  { set: faSolid, name: 'shield-halved', key: 'fa6-solid:shield-halved' },
  { set: faSolid, name: 'server', key: 'fa6-solid:server' },
  { set: faSolid, name: 'broom', key: 'fa6-solid:broom' },
  { set: faSolid, name: 'database', key: 'fa6-solid:database' },
  { set: faSolid, name: 'layer-group', key: 'fa6-solid:layer-group' },
  { set: faSolid, name: 'bolt', key: 'fa6-solid:bolt' },
  { set: faSolid, name: 'circle-info', key: 'fa6-solid:circle-info' },
  // Brands & Lucide
  { set: faBrands, name: 'youtube', key: 'fa6-brands:youtube' },
  { set: faBrands, name: 'google', key: 'fa6-brands:google' },
  { set: faBrands, name: 'whatsapp', key: 'fa6-brands:whatsapp' },
  { set: faBrands, name: 'github', key: 'fa6-brands:github' },
  { set: lucide, name: 'wifi-off', key: 'lucide:wifi-off' },
  { set: lucide, name: 'music-2', key: 'lucide:music-2' },
];

for (const extra of extras) {
  const data = extractIcon(extra.set, extra.name);
  if (data) {
    icons[extra.key] = data;
    aliases[extra.name] = extra.key;
  }
}

const outputFile = path.resolve(frontDir, 'src/components/Ui/icons-bundle.ts');

const tsContent = `// Archivo autogenerado para soporte 100% offline y de altísimo rendimiento en React.
// Generado por scripts/generate-icon-bundle.js. Cero dependencias de runtime en el cliente.

export interface SimpleIconData {
  body: string;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
}

export const OFFLINE_ICONS: Record<string, SimpleIconData> = ${JSON.stringify(icons, null, 2)};
`;

fs.writeFileSync(outputFile, tsContent, 'utf8');
console.log(`[Iconify] Registrados ${Object.keys(icons).length} iconos en ${outputFile}`);
