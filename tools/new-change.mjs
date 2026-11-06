/**
 * Cria a nota de mudanca da iteracao atual, a partir do modelo.
 *
 *   npm run change -- "adicionar minijogo da era 2"
 *
 * Gera `docs/changes/AAAA-MM-DD-adicionar-minijogo-da-era-2.md` e acrescenta a
 * linha no indice `docs/CHANGELOG.md`. Depois disso, preencha a nota: o script
 * so monta o esqueleto, quem explica o motivo e voce.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'docs', 'changes');
const INDEX = join(ROOT, 'docs', 'CHANGELOG.md');

const title = process.argv.slice(2).join(' ').trim();
if (!title) {
  console.error('Faltou o titulo.\n\n  npm run change -- "o que voce fez"\n');
  process.exit(1);
}

/** Remove acento e pontuacao para virar nome de arquivo. */
function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const today = new Date().toISOString().slice(0, 10);
const slug = slugify(title);
const name = `${today}-${slug}.md`;
const file = join(DIR, name);

if (existsSync(file)) {
  console.error(`Ja existe: docs/changes/${name}`);
  process.exit(1);
}

mkdirSync(DIR, { recursive: true });

const template = readFileSync(join(DIR, 'TEMPLATE.md'), 'utf8');
const note = template
  .replace(/^# .*$/m, `# ${title[0].toUpperCase()}${title.slice(1)}`)
  .replace('- **Data:** AAAA-MM-DD', `- **Data:** ${today}`);

writeFileSync(file, note, 'utf8');

// Indice: a entrada nova entra no topo, logo abaixo do cabecalho.
const header = '# Registro de mudancas\n';
const line = `- [${title}](changes/${name}) — ${today}\n`;
if (existsSync(INDEX)) {
  const current = readFileSync(INDEX, 'utf8');
  const at = current.indexOf('\n', current.indexOf('## Notas'));
  writeFileSync(INDEX, `${current.slice(0, at + 1)}\n${line}${current.slice(at + 1)}`, 'utf8');
} else {
  writeFileSync(INDEX, `${header}\n## Notas\n\n${line}`, 'utf8');
}

console.log(`Nota criada: docs/changes/${name}`);
console.log('Preencha "Por que", "O que isso quebra" e "Como conferir" antes de encerrar.');
