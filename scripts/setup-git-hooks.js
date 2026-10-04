import fs from 'node:fs';
import path from 'node:path';

const hookPath = path.resolve('.git/hooks/pre-commit');
const scriptContent = `#!/usr/bin/env bash

# Ejecutar auto-versionador basado en Conventional Commits
if [ -f "scripts/auto-version-hook.js" ]; then
  exec node scripts/auto-version-hook.js
fi
`;

try {
  if (fs.existsSync(path.resolve('.git/hooks'))) {
    fs.writeFileSync(hookPath, scriptContent, { mode: 0o755 });
    console.log('[Setup] Hook pre-commit configurado exitosamente.');
  }
} catch (e) {
  // Ignorar en entornos sin git
}
