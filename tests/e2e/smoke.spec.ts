import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/*
 * Fumaca do jogo de fases (D73): menu -> mapa -> fase -> minijogo -> mapa.
 *
 * Os testes casam por rotulo (o que o jogador le), nunca por posicao na tela.
 * Para chegar rapido a uma fase do meio, o save e montado pronto no
 * localStorage; para chegar ao minijogo do fim, o modo desenvolvedor da o
 * botao "Ir ao terminal" (D53). Um teste joga a fase 1-A inteira de verdade,
 * com o piloto automatico pulando e atirando e o teste mexendo no portao.
 */

const SAVE_KEY = 'davalvulaaia:save:v1';
const ERAS = ['mecanica', 'logica', 'codigo', 'redes', 'seguranca', 'ia'] as const;
type Era = (typeof ERAS)[number];

interface SeedOptions {
  /** Eras com as duas fases concluidas (3 estrelas). */
  cleared?: readonly Era[];
  devMode?: boolean;
}

/** Save no formato atual (versao 2): so estrelas, fragmentos e ajustes. */
async function seed(
  page: Page,
  { cleared = [], devMode = false }: SeedOptions = {},
): Promise<void> {
  await page.addInitScript(
    ([key, eras, dev]: [string, string[], boolean]) => {
      // So na primeira carga: recarregar a pagina nao pode apagar o que foi jogado.
      if (localStorage.getItem(key)) return;
      const missions: Record<string, { stars: number; bestScore: number }> = {};
      for (const era of eras) {
        missions[era + '-A'] = { stars: 3, bestScore: 1000 };
        missions[era + '-B'] = { stars: 3, bestScore: 1000 };
      }
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 2,
          state: {
            player: { missions },
            fragments: [],
            bossDefeated: false,
            bossBestScore: 0,
            settings: { vibration: true, muted: true, music: true, devMode: dev },
          },
        }),
      );
    },
    [SAVE_KEY, [...cleared], devMode] as [string, string[], boolean],
  );
}

/** Do menu ao mapa: "Jogar" com progresso salvo, "Novo jogo" sem. */
async function openMap(page: Page): Promise<void> {
  await page.goto('/');
  await page
    .getByRole('button', { name: /^(Jogar|Novo jogo)$/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Mapa da jornada' })).toBeVisible();
}

/** Do mapa a fase em andamento (codigo como "2-A"). */
async function enterStage(page: Page, code: string): Promise<void> {
  await page.getByRole('button', { name: new RegExp('^Fase ' + code + ':') }).click();
  await page.getByRole('button', { name: 'Começar' }).click();
  await expect(page.getByRole('button', { name: 'Pular' })).toBeVisible();
}

/** Chega ao minijogo do fim de uma fase pelo atalho do modo desenvolvedor. */
async function openTerminal(page: Page, code: string): Promise<void> {
  await seed(page, { devMode: true });
  await openMap(page);
  await enterStage(page, code);
  // O Bit comeca parado (D81): nenhuma placa cobre os botoes antes de andar.
  await page.getByRole('button', { name: 'Ir ao terminal' }).click();
  await expect(page.getByRole('dialog', { name: 'Fase concluída!' })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir o terminal' }).click();
}

async function noSideScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
}

async function buttonsAtLeast44(page: Page, root: string): Promise<void> {
  const buttons = page.locator(root + ' button');
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    const box = await buttons.nth(i).boundingBox();
    if (!box) continue;
    expect(box.width, root + ': botao ' + i + ' estreito').toBeGreaterThanOrEqual(43.5);
    expect(box.height, root + ': botao ' + i + ' baixo').toBeGreaterThanOrEqual(43.5);
  }
}

// --- minijogos (as telas nao mudaram com o jogo de fases) -------------------

async function playRounds(page: Page, playRound: () => Promise<void>): Promise<void> {
  const next = page.locator('.mg__next');
  for (let guard = 0; guard < 8; guard += 1) {
    await playRound();
    await expect(next).toBeVisible();
    const label = ((await next.textContent()) ?? '').trim();
    await next.click();
    if (label === 'Concluir') return;
  }
  throw new Error('o minijogo nao chegou na ultima rodada');
}

/** Tear no chute: cores em rodizio. Fio errado nao avanca e fio certo avanca. */
async function weaveByTrial(page: Page): Promise<void> {
  const next = page.locator('.mg__next');
  const threads = page.locator('.loom__thread');
  const total = await threads.count();
  for (let i = 0; i < 80 && !(await next.isVisible()); i += 1) {
    await threads.nth(i % total).click();
  }
}

/** Tear sem errar: le o trecho que se repete e continua dele. */
async function weaveByReading(page: Page): Promise<void> {
  const shown = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.loom__tape .loom__cell')).map((cell) =>
      (cell.getAttribute('aria-label') ?? '').replace('fio ', ''),
    ),
  );
  const missing = await page.locator('.loom__tape .loom__ghost').count();
  let period = 1;
  while (!shown.every((color, i) => color === shown[i % period])) period += 1;
  for (let i = 0; i < missing; i += 1) {
    const color = shown[(shown.length + i) % period] as string;
    await page.getByRole('button', { name: 'Tecer fio ' + color }).click();
  }
}

async function finishLoom(page: Page): Promise<void> {
  await playRounds(page, () => weaveByTrial(page));
  await expect(page.getByRole('heading', { name: 'Missão concluída!' })).toBeVisible();
}

/** Acende a lampada passando pelas combinacoes das chaves livres (codigo de Gray). */
async function lightByTrial(page: Page): Promise<void> {
  const next = page.locator('.mg__next');
  const free = page.locator('.circuit__switch:not([disabled])');
  const total = await free.count();
  for (let k = 1; k < 2 ** total && !(await next.isVisible()); k += 1) {
    let bit = 0;
    while (Math.floor(k / 2 ** bit) % 2 === 0) bit += 1;
    await free.nth(bit).click();
    await page.getByRole('button', { name: 'Testar' }).click();
  }
}

/** A letra de verdade da casa destacada do Cofre: a cifrada, voltando a chave. */
async function plainLetter(page: Page): Promise<string> {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const chave = Number(await page.locator('.vault__key strong').textContent());
  const cifrada = (
    (await page.locator('.vault__tile[data-state="now"]').textContent()) ?? ''
  ).trim();
  return alfabeto[(alfabeto.indexOf(cifrada) - chave + 26) % 26] as string;
}

// --- menu e mapa ------------------------------------------------------------------

test('abre no menu do jogo, sem rolagem lateral e com alvos de 44 px', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Da Válvula à IA' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Novo jogo' })).toBeVisible();
  await noSideScroll(page);
  await buttonsAtLeast44(page, '.menu');
});

test('novo jogo abre o mapa com so a primeira fase aberta', async ({ page }) => {
  await openMap(page);
  await expect(page.getByRole('button', { name: /^Fase 1-A:/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: /^Fase 1-B:/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /^Fase 6-B:/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /^BUG Day 0/ })).toBeDisabled();
  // As seis habilidades aparecem, ainda por ganhar.
  await expect(page.getByRole('list', { name: 'Habilidades do Bit' }).locator('li')).toHaveCount(6);
  await noSideScroll(page);
  await buttonsAtLeast44(page, '.overworld');
});

test('o modo desenvolvedor abre todas as fases e o chefao no mapa', async ({ page }) => {
  await seed(page, { devMode: true });
  await openMap(page);
  await expect(page.getByRole('button', { name: /^Fase 6-B:/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: /^BUG Day 0/ })).toBeEnabled();
  // E nao inventa progresso: nenhuma estrela.
  await expect(page.getByLabel('Estrelas: 0')).toBeVisible();
});

test('um save do RPG antigo abre no mapa com as estrelas guardadas', async ({ page }) => {
  await page.addInitScript((key: string) => {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        state: {
          player: {
            level: 3,
            xp: 40,
            hp: 120,
            hpMax: 130,
            clock: 2,
            powers: { repetir: 3 },
            missions: { 'mecanica-A': { stars: 3, bestScore: 1000 } },
            year: 1642,
            items: { 'cartao-perfurado': 1 },
          },
          clearedEras: ['mecanica'],
          settings: { vibration: true, muted: true },
          tutorialDone: true,
        },
      }),
    );
  }, SAVE_KEY);
  await openMap(page);
  await expect(page.getByRole('button', { name: /^Fase 1-A:.*Concluída/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Fase 1-B:/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: /^Fase 2-A:/ })).toBeDisabled();

  const saved = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  const parsed = JSON.parse(saved ?? '{}') as { version: number; state: { player: object } };
  expect(parsed.version).toBe(2);
  expect(Object.keys(parsed.state.player)).toEqual(['missions']);
});

// --- a fase --------------------------------------------------------------------------

/** Segura um botao de segurar (direcao ou Pular) e solta depois de `ms`. */
async function holdFor(page: Page, name: string, ms: number): Promise<void> {
  const button = page.getByRole('button', { name, exact: true });
  await button.dispatchEvent('pointerdown');
  await page.waitForTimeout(ms);
  await button.dispatchEvent('pointerup');
}

test('a fase abre com o cartao da era, e o Bit so anda segurando a direcao', async ({ page }) => {
  await openMap(page);
  await page.getByRole('button', { name: /^Fase 1-A:/ }).click();
  const intro = page.getByRole('dialog', { name: 'O tear que se repete' });
  await expect(intro).toBeVisible();
  await expect(intro).toContainText('Era 1');
  await expect(intro).toContainText('Jacquard');
  await expect(intro).toContainText('Segure');

  await page.getByRole('button', { name: 'Começar' }).click();
  const canvas = page.locator('.stageScreen__canvas');
  await expect(canvas).toHaveAttribute('data-col', /\d+/);
  const start = Number(await canvas.getAttribute('data-col'));

  // Sem tocar em nada, como em Mario, o Bit fica parado.
  await page.waitForTimeout(700);
  expect(Number(await canvas.getAttribute('data-col'))).toBe(start);

  // Segurando para a frente ele anda, e a primeira placa aparece num balao,
  // sem parar o jogo (D83): nada de dialogo nem de botao "Entendi".
  const right = page.getByRole('button', { name: 'Andar para frente' });
  await right.dispatchEvent('pointerdown');
  await expect(right).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.stageScreen__bubble')).toContainText('Segure');
  await expect(page.getByRole('button', { name: 'Entendi' })).toHaveCount(0);
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-col')), { timeout: 5000 })
    .toBeGreaterThan(start + 3);

  await noSideScroll(page);
  await buttonsAtLeast44(page, '.stageScreen__controls');
});

test('soltar a direcao para o Bit, e segurar para tras o leva de volta', async ({ page }) => {
  await openMap(page);
  await enterStage(page, '1-A');
  const canvas = page.locator('.stageScreen__canvas');
  const col = async (): Promise<number> => Number(await canvas.getAttribute('data-col'));

  // Anda um pouco e solta: o Bit para.
  await holdFor(page, 'Andar para frente', 900);
  await expect(page.getByRole('button', { name: 'Andar para frente' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  const parado = await col();
  expect(parado).toBeGreaterThan(2);
  await page.waitForTimeout(600);
  expect(await col()).toBe(parado);

  await holdFor(page, 'Andar para trás', 900);
  expect(await col()).toBeLessThan(parado);
  await buttonsAtLeast44(page, '.stageScreen__dpad');
  await buttonsAtLeast44(page, '.stageScreen__actions');
});

test('pular tira o Bit do chao, e a pausa volta ao mapa', async ({ page }) => {
  await openMap(page);
  await enterStage(page, '1-A');
  const canvas = page.locator('.stageScreen__canvas');
  await expect(canvas).toHaveAttribute('data-grounded', 'true');
  await page.getByRole('button', { name: 'Pular' }).dispatchEvent('pointerdown');
  await expect(canvas).toHaveAttribute('data-grounded', 'false');

  await page.getByRole('button', { name: 'Pausar' }).click();
  await expect(page.getByRole('dialog', { name: 'Pausa' })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar ao mapa' }).click();
  await expect(page.getByRole('heading', { name: 'Mapa da jornada' })).toBeVisible();
});

test('a fase 1-A inteira: portao-tear, terminal, minijogo e a 1-B abre', async ({ page }) => {
  test.setTimeout(150_000);
  await seed(page, { devMode: true });
  await openMap(page);
  await enterStage(page, '1-A');
  await page.getByRole('button', { name: 'Piloto automático' }).click();

  const done = page.getByRole('dialog', { name: 'Fase concluída!' });
  const panel = page.locator('.gatePanel');
  let gates = 0;
  for (let guard = 0; guard < 400 && !(await done.isVisible()); guard += 1) {
    const ok = page.getByRole('button', { name: 'Entendi' });
    if (await ok.isVisible()) {
      await ok.click();
      continue;
    }
    if (await panel.isVisible()) {
      gates += 1;
      // O tecido mostra o trecho que se repete; o painel pede o proximo fio.
      const shown = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.gatePanel__thread'))
          .map((el) => el.getAttribute('data-color') ?? 'none')
          .filter((c) => c !== 'none'),
      );
      const names: Record<string, string> = { a: 'vermelho', b: 'azul', c: 'amarelo' };
      let period = 1;
      while (!shown.every((c, i) => c === shown[i % period])) period += 1;
      if (gates === 1) {
        // Cor errada: conta erro e o portao fica fechado.
        const right = shown[shown.length % period] as string;
        const wrong = Object.keys(names).find((c) => c !== right) as string;
        await page.getByRole('button', { name: names[wrong], exact: true }).click();
        await expect(page.getByText('Não é esse. Pense de novo.')).toBeVisible();
      }
      const missing = await page.locator('.gatePanel__thread[data-color="none"]').count();
      for (let i = 0; i < missing; i += 1) {
        const color = shown[(shown.length + i) % period] as string;
        await page.getByRole('button', { name: names[color], exact: true }).click();
      }
      await expect(panel).toBeHidden();
      continue;
    }
    await page.waitForTimeout(150);
  }
  expect(gates).toBe(2);
  await expect(done).toBeVisible();
  await expect(done).toContainText('Tear de Engrenagens');

  await page.getByRole('button', { name: 'Abrir o terminal' }).click();
  await expect(page.getByRole('heading', { name: 'Tear de Engrenagens' })).toBeVisible();
  await finishLoom(page);
  await page.getByRole('button', { name: 'Voltar ao mapa' }).click();
  await expect(page.getByText('Nova fase aberta!')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Fase 1-B:/ })).toBeEnabled();
});

test('o resultado do minijogo fica salvo depois de recarregar', async ({ page }) => {
  await openTerminal(page, '1-A');
  await finishLoom(page);
  const resultado = page.getByRole('region', { name: 'Resultado da missão' });
  await expect(resultado.getByText('Eficiência', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar ao mapa' }).click();

  await page.reload();
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(page.getByRole('button', { name: /^Fase 1-A:.*Concluída/ })).toBeVisible();
});

// --- minijogos no terminal do fim da fase -----------------------------------------

test('fio errado no Tear conta como erro e nao avanca o tecido', async ({ page }) => {
  await openTerminal(page, '1-A');
  await expect(page.getByText('Erros: 0')).toBeVisible();
  const faltam = await page.locator('.loom__ghost').count();
  const threads = page.locator('.loom__thread');
  for (let i = 0; i < 3; i += 1) {
    if (await page.locator('.mg__next').isVisible()) break;
    await threads.nth(i).click();
  }
  await expect(page.getByText(/Erros: [12]/)).toBeVisible();
  expect(await page.locator('.loom__ghost').count()).toBeLessThan(faltam);
});

test('quem enxerga o trecho que se repete fecha o Tear com 3 estrelas', async ({ page }) => {
  await openTerminal(page, '1-A');
  await playRounds(page, () => weaveByReading(page));
  await expect(page.getByRole('heading', { name: 'Missão concluída!' })).toBeVisible();
  await expect(page.getByLabel('3 estrelas')).toBeVisible();
});

test('o minijogo diz o que representa e libera dicas uma a uma', async ({ page }) => {
  await openTerminal(page, '1-A');
  await expect(page.locator('.help__panel')).toBeHidden();
  await page.getByRole('button', { name: 'O que é isto?' }).click();
  const painel = page.locator('.help__panel');
  await expect(painel).toContainText('Jacquard');
  await expect(painel).toContainText('REPETIR');
  await page.getByRole('button', { name: 'Fechar explicação' }).click();

  const dicas = page.locator('.help__hints li');
  await expect(dicas).toHaveCount(0);
  await page.getByRole('button', { name: 'Dica', exact: true }).click();
  await expect(dicas).toHaveCount(1);
  await page.getByRole('button', { name: /^Dica 2 de/ }).click();
  await expect(dicas).toHaveCount(2);
});

test('os Circuitos fecham no toque, e teste que nao acende conta erro', async ({ page }) => {
  await openTerminal(page, '2-A');
  await expect(page.getByRole('heading', { name: 'Circuitos Lógicos' })).toBeVisible();
  await page.getByRole('button', { name: 'Testar' }).click();
  await expect(
    page.getByText('A lâmpada não acendeu. Veja no circuito onde o sinal parou.'),
  ).toBeVisible();
  await expect(page.getByText('Erros: 1')).toBeVisible();
  await playRounds(page, () => lightByTrial(page));
  await expect(page.getByRole('heading', { name: 'Missão concluída!' })).toBeVisible();
});

test('a Mesa de Bits grava os numeros e fecha com 3 estrelas', async ({ page }) => {
  await openTerminal(page, '3-A');
  await expect(page.getByRole('heading', { name: 'Mesa de Bits' })).toBeVisible();
  await playRounds(page, async () => {
    let falta = Number(await page.locator('.bits__target strong').textContent());
    const bits = page.locator('.bits__bit');
    const total = await bits.count();
    for (let i = 0; i < total; i += 1) {
      const vale = Number(await bits.nth(i).locator('.bits__value').textContent());
      if (vale <= falta) {
        await bits.nth(i).click();
        falta -= vale;
      }
    }
    expect(falta).toBe(0);
    await page.getByRole('button', { name: 'Gravar' }).click();
  });
  await expect(page.getByLabel('3 estrelas')).toBeVisible();
});

test('a Rota leva o pacote de vizinha em vizinha ate o destino', async ({ page }) => {
  await openTerminal(page, '4-A');
  await expect(page.getByRole('heading', { name: 'Rota dos Pacotes' })).toBeVisible();
  const opcoes = page.locator('.route__option');
  await playRounds(page, async () => {
    const next = page.locator('.mg__next');
    for (let i = 0; i < 12 && !(await next.isVisible()); i += 1) await opcoes.last().click();
  });
  await expect(page.getByRole('heading', { name: 'Missão concluída!' })).toBeVisible();
});

test('o Cofre abre decifrando letra por letra', async ({ page }) => {
  await openTerminal(page, '5-A');
  await expect(page.getByRole('heading', { name: 'Cofre Criptográfico' })).toBeVisible();
  await playRounds(page, async () => {
    const next = page.locator('.mg__next');
    for (let i = 0; i < 8 && !(await next.isVisible()); i += 1) {
      await page.getByRole('button', { name: 'Letra ' + (await plainLetter(page)) }).click();
    }
  });
  await expect(page.getByRole('heading', { name: 'Missão concluída!' })).toBeVisible();
});

test('o Detector mostra exemplos carimbados dos dois tipos', async ({ page }) => {
  await openTerminal(page, '6-A');
  await expect(page.getByRole('heading', { name: 'Treinar o Detector' })).toBeVisible();
  const carimbados = page.getByLabel('Programas já carimbados').locator('.model__card');
  expect(await carimbados.count()).toBeGreaterThanOrEqual(4);
  await expect(carimbados.filter({ hasText: 'Vírus' }).first()).toBeVisible();
  await expect(carimbados.filter({ hasText: 'Seguro' }).first()).toBeVisible();
});

for (const tela of [
  { code: '2-A', raiz: '.circuit' },
  { code: '3-A', raiz: '.bits' },
  { code: '4-A', raiz: '.route' },
  { code: '5-A', raiz: '.vault' },
  { code: '6-A', raiz: '.model' },
] as const) {
  test(`o minijogo da fase ${tela.code} cabe no celular: 44 px e sem rolagem`, async ({ page }) => {
    await openTerminal(page, tela.code);
    await page.getByRole('button', { name: 'O que é isto?' }).click();
    await expect(page.locator('.help__panel')).toBeVisible();
    await noSideScroll(page);
    await buttonsAtLeast44(page, tela.raiz);
  });
}

// --- chefao --------------------------------------------------------------------------

test('o BUG Day 0 abre no mapa com as 12 fases e responde com o micro-desafio', async ({
  page,
}) => {
  await seed(page, { cleared: ERAS });
  await openMap(page);
  await page.getByRole('button', { name: /^BUG Day 0/ }).click();

  const arena = page.locator('.bossStage');
  await expect(arena.locator('.bossStage__bug')).toBeVisible();
  await expect(arena.getByRole('meter', { name: /Integridade do BUG/ })).toBeVisible();
  await expect(arena.getByLabel('Corações: 3')).toBeVisible();
  await noSideScroll(page);
  await buttonsAtLeast44(page, '.boss');

  await page.getByRole('button', { name: /^Responder com / }).click();
  const titulos = [
    'Tear de Engrenagens',
    'Circuitos Lógicos',
    'Mesa de Bits',
    'Rota dos Pacotes',
    'Cofre Criptográfico',
    'Treinar o Detector',
  ];
  const aberto = page.locator('.boss__micro h2');
  await expect(aberto).toBeVisible();
  expect(titulos).toContain(((await aberto.textContent()) ?? '').trim());

  // Desistir do micro-desafio deixa o ataque passar: um coracao a menos.
  await page.getByRole('button', { name: 'Sair da missão' }).click();
  await expect(page.getByText('O Bit perdeu um coração.')).toBeVisible();
  await expect(arena.getByLabel('Corações: 2')).toBeVisible();
});

// --- som ----------------------------------------------------------------------------

test('o som comeca desligado e liga pelo menu, ficando salvo', async ({ page }) => {
  await page.goto('/');
  const botao = page.getByRole('button', { name: 'Ligar o som' });
  await expect(botao).toHaveAttribute('aria-pressed', 'false');
  await botao.click();
  await expect(page.getByRole('button', { name: 'Desligar o som' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const salvo = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  expect((JSON.parse(salvo ?? '{}').state as { settings: { muted: boolean } }).settings.muted).toBe(
    false,
  );
});

test('a musica acompanha a tela: menu, mapa e a era da fase', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (erro) => erros.push(erro.message));
  await page.goto('/');
  const app = page.locator('.app');
  await expect(app).toHaveAttribute('data-music', 'off');
  await page.getByRole('button', { name: 'Ligar o som' }).click();
  await expect(app).toHaveAttribute('data-music', 'menu');
  await page.getByRole('button', { name: 'Novo jogo' }).click();
  await expect(app).toHaveAttribute('data-music', 'map');
  await enterStage(page, '1-A');
  await expect(app).toHaveAttribute('data-music', 'mecanica');
  expect(erros).toEqual([]);
});
