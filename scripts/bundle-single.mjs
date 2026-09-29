import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '../src');
const outDir = path.resolve(__dirname, '../dist-bundle');
const outFile = path.join(outDir, 'restorino-sdk.ts');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Order of types and modules to concatenate
const typeFiles = [
  'types/common.ts',
  'types/auth.ts',
  'types/customer.ts',
  'types/loyalty.ts',
  'types/vitrine.ts',
  'types/orders.ts',
  'types/delivery.ts',
  'types/tables.ts',
  'types/live-agent.ts'
];

const moduleFiles = [
  'http/http-client.ts',
  'modules/auth.ts',
  'modules/customer.ts',
  'modules/loyalty.ts',
  'modules/vitrine.ts',
  'modules/orders.ts',
  'modules/delivery.ts',
  'modules/tables.ts',
  'modules/tv.ts',
  'modules/live-agent.ts',
  'client.ts'
];

function cleanContent(content) {
  return content
    // Remove local imports (single-line or multi-line)
    .replace(/^import\s+[\s\S]*?from\s+['"]\.\.?\/.*?['"];?\s*$/gm, '')
    // Remove export * from './...'
    .replace(/^export\s+\*\s+from\s+['"]\.\.?\/.*?['"];?\s*$/gm, '')
    .trim();
}

let bundled = `/**
 * Restorino TypeScript SDK - Standalone Single-File Bundle
 * Idéal pour Lovable.dev, v0, Bolt, Next.js, Vite & React.
 * 
 * Contient l'intégralité des types, modules et le RestorinoClient unifié.
 * 
 * @version 1.0.0
 * @license MIT
 */

`;

for (const relPath of typeFiles) {
  const fullPath = path.join(srcDir, relPath);
  if (fs.existsSync(fullPath)) {
    bundled += `// ==========================================\n`;
    bundled += `// SOURCE: ${relPath}\n`;
    bundled += `// ==========================================\n\n`;
    bundled += cleanContent(fs.readFileSync(fullPath, 'utf8')) + '\n\n';
  }
}

for (const relPath of moduleFiles) {
  const fullPath = path.join(srcDir, relPath);
  if (fs.existsSync(fullPath)) {
    bundled += `// ==========================================\n`;
    bundled += `// SOURCE: ${relPath}\n`;
    bundled += `// ==========================================\n\n`;
    bundled += cleanContent(fs.readFileSync(fullPath, 'utf8')) + '\n\n';
  }
}

// Ensure default export of client
bundled += `
// Export par défaut
export default RestorinoClient;
`;

fs.writeFileSync(outFile, bundled, 'utf8');
console.log(`✅ Single-file standalone SDK bundle successfully generated at:\n${outFile} (${(bundled.length / 1024).toFixed(1)} KB)`);
