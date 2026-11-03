/**
 * Post-processes the ESM build in dist/esm:
 *  1. Node ESM requires explicit extensions on relative specifiers.
 *  2. A nested package.json marks the tree as ESM without touching dist/ (CJS).
 */
import fs from 'node:fs';
import path from 'node:path';

const esmDir = path.resolve('dist/esm');

if (!fs.existsSync(esmDir)) {
  console.error('❌ dist/esm is missing — run `tsc -p tsconfig.esm.json` first.');
  process.exit(1);
}

function rewrite(file) {
  const dir = path.dirname(file);
  const source = fs.readFileSync(file, 'utf8');
  const rewritten = source.replace(
    /(\bfrom\s+|\bimport\s*\(\s*)(['"])(\.\.?\/[^'"]+)\2/g,
    (match, prefix, quote, specifier) => {
      if (/\.(js|mjs|json)$/.test(specifier)) return match;

      // `./types` may be a directory containing index.js rather than types.js.
      const base = path.resolve(dir, specifier);
      const target = fs.existsSync(`${base}.js`)
        ? `${specifier}.js`
        : fs.existsSync(path.join(base, 'index.js'))
          ? `${specifier}/index.js`
          : `${specifier}.js`;

      return `${prefix}${quote}${target}${quote}`;
    }
  );

  if (rewritten !== source) fs.writeFileSync(file, rewritten);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) rewrite(full);
  }
}

walk(esmDir);
fs.writeFileSync(
  path.join(esmDir, 'package.json'),
  `${JSON.stringify({ type: 'module' }, null, 2)}\n`
);

console.log('✅ ESM build ready → dist/esm (explicit extensions + type:module)');
