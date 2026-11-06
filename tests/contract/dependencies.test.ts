import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * CONTRATO: nenhuma dependencia fantasma.
 *
 * Toda biblioteca que o codigo importa precisa estar declarada no
 * `package.json`. Parece obvio, mas o TypeScript e o Node procuram
 * `node_modules` tambem nas pastas ACIMA do projeto -- entao um pacote
 * instalado solto na pasta do usuario faz tudo compilar na maquina de quem o
 * tem, e quebrar em qualquer outro lugar.
 *
 * Foi exatamente assim que o deploy quebrou: `@types/node` nao estava
 * declarado, mas existia em `C:\\Users\\<usuario>\\node_modules`. Passava aqui,
 * falhava na Vercel.
 *
 * Este teste le os imports do codigo e cobra a declaracao.
 */

const ROOT = process.cwd();

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const declared = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
]);

/** Arquivos de codigo do projeto, em caminho relativo a raiz. */
function walk(dir: string, extensions: readonly string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(path, extensions));
    else if (extensions.some((ext) => entry.name.endsWith(ext))) out.push(path);
  }
  return out;
}

function sourceFiles(): string[] {
  return [
    ...walk('src', ['.ts', '.tsx']),
    ...walk('tests', ['.ts']),
    'vite.config.ts',
    'eslint.config.js',
    'playwright.config.ts',
  ];
}

/** Especificadores importados num arquivo, incluindo `import type`. */
function importsOf(text: string): string[] {
  const found: string[] = [];
  const patterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const spec = match[1];
      if (spec) found.push(spec);
    }
  }
  return found;
}

/** Nome do pacote a partir do especificador: `@scope/pkg/sub` -> `@scope/pkg`. */
function packageOf(spec: string): string {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : (parts[0] ?? spec);
}

function isLocal(spec: string): boolean {
  return spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('@/');
}

describe('contrato: dependencias declaradas', () => {
  const files = sourceFiles();

  it('ha arquivos para checar', () => {
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContain('vite.config.ts');
  });

  it('todo pacote importado esta no package.json', () => {
    const faltando = new Map<string, string[]>();

    for (const file of files) {
      for (const spec of importsOf(readFileSync(join(ROOT, file), 'utf8'))) {
        if (isLocal(spec) || spec.startsWith('node:')) continue;
        const name = packageOf(spec);
        if (declared.has(name)) continue;
        faltando.set(name, [...(faltando.get(name) ?? []), file]);
      }
    }

    expect(Object.fromEntries(faltando)).toEqual({});
  });

  it('quem importa modulo do Node exige @types/node declarado', () => {
    const usaNode = files.filter((file) =>
      importsOf(readFileSync(join(ROOT, file), 'utf8')).some((s) => s.startsWith('node:')),
    );
    expect(usaNode.length).toBeGreaterThan(0);
    expect({ arquivos: usaNode.length, declarado: declared.has('@types/node') }).toEqual({
      arquivos: usaNode.length,
      declarado: true,
    });
  });

  it('as versoes sao fixas, sem ^ nem ~', () => {
    // Build reproduzivel: a mesma arvore de pacotes em qualquer maquina.
    const soltas = Object.entries({ ...pkg.dependencies, ...pkg.devDependencies }).filter(
      ([, range]) => /^[\^~]/.test(range),
    );
    expect(Object.fromEntries(soltas)).toEqual({});
  });
});
