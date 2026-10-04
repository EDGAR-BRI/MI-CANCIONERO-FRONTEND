import fs from 'node:fs';
import path from 'node:path';

export function migrateFile(filePath, isAstro = false) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Ensure AppIcon import
  const importStatement = isAstro
    ? 'import AppIcon from "@/components/Ui/AppIcon.astro";'
    : 'import AppIcon from "./Ui/AppIcon";'; // or '@/components/Ui/AppIcon'

  const normalizedImport = isAstro
    ? 'import AppIcon from "@/components/Ui/AppIcon.astro";'
    : 'import AppIcon from "@/components/Ui/AppIcon";';

  if (!content.includes('AppIcon')) {
    if (isAstro) {
      content = content.replace(/^---\n/, `---\n${normalizedImport}\n`);
    } else {
      // Add after first import
      const firstImportIndex = content.indexOf('import ');
      if (firstImportIndex !== -1) {
        content = `${normalizedImport}\n${content}`;
      }
    }
  }

  // 1. Static simple tags: <i className="fa-solid fa-foo ..."></i> or class="fa-solid fa-foo ..."
  // Matches: <i (className|class)="fa-(solid|regular|brands) fa-([a-z0-9-]+)( fa-spin)?([^"]*)"(></i>|/>)
  const staticRegex = /<i\s+(className|class)="fa-(?:solid|regular|brands)\s+fa-([a-z0-9-]+)(?:\s+fa-spin)?([^"]*)"(?:\s*><\/i>|\s*\/>)/g;
  content = content.replace(staticRegex, (match, attr, iconName, extraClasses) => {
    const hasSpin = match.includes('fa-spin');
    const cleanedClasses = extraClasses.trim();
    const spinAttr = hasSpin ? ' spin' : '';
    const classAttr = cleanedClasses ? ` ${attr}="${cleanedClasses}"` : '';
    return `<AppIcon name="${iconName}"${spinAttr}${classAttr} />`;
  });

  // 2. Dynamic template literals: <i (className|class)={`fa-(?:solid|regular|brands) \${...}...`}></i>
  // Pattern A: <i className={`fa-solid ${isAutoScrolling ? 'fa-pause' : 'fa-angles-down'} text-xs`}></i>
  const ternaryRegex = /<i\s+(className|class)=\{`fa-(?:solid|regular|brands)\s+\$\{([^?]+)\?\s*['"]fa-([a-z0-9-]+)['"]\s*:\s*['"]fa-([a-z0-9-]+)['"]\}\s*([^`]*)`\}(?:\s*><\/i>|\s*\/>)/g;
  content = content.replace(ternaryRegex, (match, attr, condition, iconTrue, iconFalse, extraClasses) => {
    const cleanedClasses = extraClasses.trim();
    const classAttr = cleanedClasses ? ` ${attr}="${cleanedClasses}"` : '';
    return `<AppIcon name={${condition.trim()} ? '${iconTrue}' : '${iconFalse}'}${classAttr} />`;
  });

  // Pattern B: <i className={`fa-solid fa-music text-xs ${showChords ? 'text-accent-main' : 'text-text-secondary'}`}></i>
  const staticIconDynamicClassRegex = /<i\s+(className|class)=\{`fa-(?:solid|regular|brands)\s+fa-([a-z0-9-]+)\s+([^`]+)`\}(?:\s*><\/i>|\s*\/>)/g;
  content = content.replace(staticIconDynamicClassRegex, (match, attr, iconName, templateClasses) => {
    return `<AppIcon name="${iconName}" ${attr}={\`${templateClasses.trim()}\`} />`;
  });

  // Pattern C: <i className={`fa-solid ${item.icon}...`}></i>
  const variableIconRegex = /<i\s+(className|class)=\{`fa-(?:solid|regular|brands)\s+\$\{([^}]+)\}([^`]*)`\}(?:\s*><\/i>|\s*\/>)/g;
  content = content.replace(variableIconRegex, (match, attr, varExpr, extraClasses) => {
    const cleanedClasses = extraClasses.trim();
    const classAttr = cleanedClasses ? ` ${attr}={\`${cleanedClasses}\`}` : '';
    return `<AppIcon name={${varExpr.trim()}}${classAttr} />`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[Migrated] ${filePath}`);
    return true;
  }
  return false;
}
