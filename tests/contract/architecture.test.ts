import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * CONTRATO: pureza do nucleo.
 *
 * O ESLint ja proibe isto, mas uma regra de lint pode ser afrouxada por quem
 * esta com pressa -- inclusive por um agente que "resolveu" um erro mexendo na
 * configuracao. Este teste le o codigo-fonte direto, entao afrouxar o lint nao
 * faz o problema sumir: a suite continua vermelha.
 *
 * Se voce precisa mesmo violar uma destas regras, mude ESTE arquivo junto, num
 * commit proprio, e explique o motivo na nota de mudanca.
 */

const ROOT = process.cwd();

/** Lista recursiva de arquivos .ts, em caminho relativo a raiz do projeto. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(path));
    else if (entry.name.endsWith('.ts')) out.push(path);
  }
  return out;
}

/** Arquivos que precisam ser puros: regra de jogo, sem mundo externo. */
function pureFiles(): string[] {
  return [
    ...walk('src/core'),
    ...walk('src/minigames').filter((p) => p.endsWith('/logic.ts')),
  ].filter((p) => !p.endsWith('.test.ts'));
}

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

/** Remove comentarios, para nao acusar um exemplo citado em comentario. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('contrato: o nucleo e puro', () => {
  const files = pureFiles();

  it('ha arquivos para checar (o padrao de busca nao pode ter quebrado)', () => {
    expect(files.length).toBeGreaterThan(5);
    expect(files).toContain('src/core/world.ts');
    expect(files).toContain('src/minigames/mecanica/logic.ts');
    expect(files).toContain('src/minigames/logica/logic.ts');
  });

  it('nao importa React, Three.js, Zustand nem camadas de cima', () => {
    const forbidden = [
      /from ['"]react/,
      /from ['"]react-dom/,
      /from ['"]three/,
      /from ['"]@react-three/,
      /from ['"]zustand/,
      /from ['"]@\/(ui|store|services|data)\//,
      /from ['"]\.\.\/(ui|store|services|data)\//,
    ];
    for (const file of files) {
      const text = code(read(file));
      for (const pattern of forbidden) {
        expect({ file, importa: pattern.source, achou: pattern.test(text) }).toEqual({
          file,
          importa: pattern.source,
          achou: false,
        });
      }
    }
  });

  it('nao toca em DOM, rede nem armazenamento do navegador', () => {
    const forbidden = [
      /\bwindow\./,
      /\bdocument\./,
      /\blocalStorage\b/,
      /\bfetch\(/,
      /\bnavigator\./,
    ];
    for (const file of files) {
      const text = code(read(file));
      for (const pattern of forbidden) {
        expect({ file, usa: pattern.source, achou: pattern.test(text) }).toEqual({
          file,
          usa: pattern.source,
          achou: false,
        });
      }
    }
  });

  it('nao usa Math.random nem Date.now: tudo vem de createRng(seed)', () => {
    for (const file of files) {
      const text = code(read(file));
      expect({ file, achou: /Math\.random/.test(text) }).toEqual({ file, achou: false });
      expect({ file, achou: /Date\.now/.test(text) }).toEqual({ file, achou: false });
    }
  });

  it('so o rng recebe a data, e sempre como parametro injetavel', () => {
    for (const file of files) {
      const text = code(read(file));
      if (!/new Date\(/.test(text)) continue;
      // Unica excecao aceita: `dailySeed(now = new Date())`, que permite
      // injetar a data nos testes. Qualquer outro uso e relogio escondido.
      expect({ file, forma: text.match(/new Date\([^)]*\)/g) }).toEqual({
        file,
        forma: ['new Date()'],
      });
      expect(/now: Date = new Date\(\)|now = new Date\(\)/.test(text)).toBe(true);
    }
  });
});

describe('contrato: todo numero de balanceamento mora em constants.ts', () => {
  it('constants.ts nao importa nada do projeto', () => {
    const text = code(read('src/core/constants.ts'));
    expect(/from ['"]/.test(text)).toBe(false);
  });

  it('o nucleo nao define limites magicos fora de constants.ts', () => {
    /*
     * Heuristica deliberadamente simples: procura numero de tres digitos ou
     * mais solto no codigo do nucleo. Nao pega tudo, mas pega o caso comum de
     * alguem cravar 1500 ou 600 no meio da regra em vez de usar a constante.
     */
    const permitido = new Set(['src/core/constants.ts', 'src/core/rng.ts']);
    for (const file of pureFiles()) {
      if (permitido.has(file)) continue;
      const text = code(read(file));
      const soltos = text.match(/(?<![\w.])\d{3,}(?![\w.])/g) ?? [];
      expect({ file, numerosSoltos: soltos }).toEqual({ file, numerosSoltos: [] });
    }
  });
});
