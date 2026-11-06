/**
 * Confere as notas de mudanca. Roda dentro do `npm run ci`.
 *
 * O que ele cobra:
 *   1. Toda nota em docs/changes/ esta listada em docs/CHANGELOG.md.
 *   2. Toda nota tem as secoes obrigatorias do modelo.
 *   3. Nenhuma nota ficou com os campos do modelo por preencher.
 *
 * O que ele NAO cobra: se a nota diz a verdade. Isso e com a revisao de quem
 * le. O script so impede o caso comum de abrir a nota e esquecer de escrever.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'docs', 'changes');
const INDEX = join(ROOT, 'docs', 'CHANGELOG.md');

const REQUIRED = [
  '## O que mudou',
  '## Por que',
  '## O que isso quebra',
  '## Decisoes que tomei sozinho',
  '## Como conferir',
  '## Verificacao',
];

/** Trechos do modelo que denunciam nota nao preenchida. */
const PLACEHOLDERS = [
  '<titulo curto',
  '<nome da pessoa',
  'AAAA-MM-DD',
  'conteudo | regra de jogo',
  '<Uma lista do que foi mexido',
  '<O motivo.',
  '<Mudancas que obrigam',
  '<Escolhas que o pedido',
  '<Como a proxima pessoa',
];

const problems = [];

if (!existsSync(DIR)) {
  problems.push('Falta a pasta docs/changes/.');
} else {
  const notes = readdirSync(DIR).filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md');

  if (notes.length === 0) {
    problems.push(
      'Nenhuma nota em docs/changes/. Toda iteracao precisa da sua: npm run change -- "o que voce fez"',
    );
  }

  const index = existsSync(INDEX) ? readFileSync(INDEX, 'utf8') : '';
  if (!index) problems.push('Falta docs/CHANGELOG.md, o indice das notas.');

  for (const note of notes) {
    const text = readFileSync(join(DIR, note), 'utf8');

    if (index && !index.includes(note)) {
      problems.push(`${note}: nao esta listada em docs/CHANGELOG.md.`);
    }
    for (const section of REQUIRED) {
      if (!text.includes(section)) problems.push(`${note}: falta a secao "${section}".`);
    }
    for (const placeholder of PLACEHOLDERS) {
      if (text.includes(placeholder)) {
        problems.push(`${note}: ficou texto do modelo por preencher ("${placeholder}...").`);
      }
    }
    if (!/^- \*\*Data:\*\* \d{4}-\d{2}-\d{2}$/m.test(text)) {
      problems.push(`${note}: a data precisa estar como "- **Data:** AAAA-MM-DD".`);
    }
  }
}

if (problems.length > 0) {
  console.error('\nNotas de mudanca com problema:\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('\nVeja docs/changes/TEMPLATE.md e CONTRIBUINDO.md.\n');
  process.exit(1);
}

console.log('Notas de mudanca: tudo certo.');
