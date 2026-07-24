import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const iconNames = [
  'arrow-left',
  'arrow-right',
  'bot',
  'check',
  'copy',
  'rotate-ccw',
  'user',
  'x'
];

const projectRoot = resolve(import.meta.dirname, '..');
const outputPath = resolve(projectRoot, 'public/assets/icons/actions.svg');

const symbols = await Promise.all(iconNames.map(async (name) => {
  const sourcePath = resolve(projectRoot, `node_modules/lucide-static/icons/${name}.svg`);
  const source = await readFile(sourcePath, 'utf8');
  const viewBox = source.match(/viewBox="([^"]+)"/)?.[1];
  const body = source.match(/<svg[\s\S]*?>([\s\S]*?)<\/svg>/)?.[1]?.trim();

  if (!viewBox || !body) throw new Error(`Unable to build sprite symbol: ${name}`);
  return `  <symbol id="${name}" viewBox="${viewBox}">\n    ${body.replace(/\n/g, '\n    ')}\n  </symbol>`;
}));

const sprite = [
  '<?xml version="1.0" encoding="utf-8"?>',
  '<!-- Generated from lucide-static (ISC). Do not edit directly. -->',
  '<svg xmlns="http://www.w3.org/2000/svg">',
  ...symbols,
  '</svg>',
  ''
].join('\n');

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, sprite, 'utf8');
