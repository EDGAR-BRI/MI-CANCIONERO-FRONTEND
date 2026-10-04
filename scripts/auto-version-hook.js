import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const PKG_PATH = path.resolve('package.json');

/**
 * Recorre el árbol de procesos ancestros en Linux (/proc/<pid>/...)
 * para localizar la línea de comandos original del proceso git commit.
 */
function findGitCommitCmdline() {
  let curr = process.ppid;
  while (curr && curr > 1) {
    try {
      const rawCmd = fs.readFileSync(`/proc/${curr}/cmdline`, 'utf8');
      if (rawCmd) {
        const cmdline = rawCmd.split('\0').filter(Boolean);
        const isGit = cmdline.some(arg => arg === 'git' || arg.endsWith('/git'));
        const isCommit = cmdline.includes('commit');
        if (isGit && isCommit) {
          return cmdline;
        }
      }
      const stat = fs.readFileSync(`/proc/${curr}/stat`, 'utf8').split(' ');
      curr = parseInt(stat[3], 10);
    } catch {
      break;
    }
  }
  return null;
}

/**
 * Extrae el mensaje del commit desde los argumentos de git commit.
 */
function extractCommitMessage(cmdline) {
  if (!cmdline || !Array.isArray(cmdline)) return '';

  // 1. Flags -m o --message (soporta múltiples -m, toma el título del primero)
  for (let i = 0; i < cmdline.length; i++) {
    const arg = cmdline[i];
    if (arg === '-m' || arg === '--message') {
      if (cmdline[i + 1]) return cmdline[i + 1];
    } else if (arg.startsWith('--message=')) {
      return arg.slice('--message='.length);
    } else if (arg.startsWith('-m=')) {
      return arg.slice(3);
    }
  }

  // 2. Flags -F o --file
  for (let i = 0; i < cmdline.length; i++) {
    const arg = cmdline[i];
    if (arg === '-F' || arg === '--file') {
      const filePath = cmdline[i + 1];
      if (filePath && fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
      }
    } else if (arg.startsWith('--file=') || arg.startsWith('-F=')) {
      const filePath = arg.split('=')[1];
      if (filePath && fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
      }
    }
  }

  return '';
}

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

    const cmdline = findGitCommitCmdline();
    let msg = extractCommitMessage(cmdline);

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
