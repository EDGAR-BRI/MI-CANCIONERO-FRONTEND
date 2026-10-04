import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const PKG_PATH = path.resolve('package.json');

function main() {
  try {
    if (!fs.existsSync(PKG_PATH)) return;

    // Si la versión ya fue modificada manualmente en el staging actual, no duplicar el incremento
    try {
      const stagedDiff = execSync('git diff --cached package.json', { encoding: 'utf8' });
      if (stagedDiff.includes('"version":')) {
        return;
      }
    } catch {
      // Ignorar si git diff falla
    }

    // Obtener los argumentos de la línea de comandos del proceso git padre
    const ppid = process.ppid;
    let cmdline = [];
    try {
      cmdline = fs.readFileSync(`/proc/${ppid}/cmdline`, 'utf8').split('\0');
    } catch {
      return;
    }

    let msg = '';
    const mIndex = cmdline.indexOf('-m');
    if (mIndex !== -1 && cmdline[mIndex + 1]) {
      msg = cmdline[mIndex + 1];
    } else {
      const fileArg = cmdline.find(arg => arg.startsWith('-F') || arg.startsWith('--file=') || arg === '--file');
      if (fileArg) {
        const filePath = fileArg.startsWith('--file=') ? fileArg.split('=')[1] : cmdline[cmdline.indexOf(fileArg) + 1];
        if (filePath && fs.existsSync(filePath)) {
          msg = fs.readFileSync(filePath, 'utf8');
        }
      }
    }

    msg = msg.trim();
    if (!msg) return;

    // Omitir commits de merge o revert automático
    if (msg.startsWith('Merge ') || msg.startsWith('Revert ')) {
      return;
    }

    // Mapeo de Conventional Commits a SemVer
    let bumpType = null;
    if (/^[a-z]+(\([^\)]+\))?!:/.test(msg) || /BREAKING CHANGE/i.test(msg)) {
      bumpType = 'major';
    } else if (/^feat(\([^\)]+\))?:/i.test(msg)) {
      bumpType = 'minor';
    } else if (/^(fix|style|perf|refactor)(\([^\)]+\))?:/i.test(msg)) {
      bumpType = 'patch';
    }

    if (!bumpType) {
      // docs, test, chore, build, ci, etc. no modifican la versión del usuario
      return;
    }

    const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
    const [maj, min, pat] = pkg.version.split('.').map(Number);
    let newVersion = pkg.version;

    if (bumpType === 'major') newVersion = `${maj + 1}.0.0`;
    else if (bumpType === 'minor') newVersion = `${maj}.${min + 1}.0`;
    else if (bumpType === 'patch') newVersion = `${maj}.${min}.${pat + 1}`;

    pkg.version = newVersion;
    fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
    execSync('git add package.json');
    console.log(`\n🚀 [AutoVersion] Mensaje: "${msg.split('\n')[0]}"`);
    console.log(`📦 [AutoVersion] Versión actualizada a ${newVersion} (${bumpType.toUpperCase()}) en package.json.\n`);
  } catch (err) {
    console.warn('[AutoVersion] Nota:', err.message);
  }
}

main();
