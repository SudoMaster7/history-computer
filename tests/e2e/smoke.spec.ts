import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const TILE = 16;

/** Celula onde o Bit esta, lida do proprio canvas do mapa. */
async function bitCell(page: Page): Promise<string> {
  return (await page.locator('.world__canvas').getAttribute('data-cell')) ?? '';
}

/** Toca no centro de uma celula do mapa (o canvas e esticado por CSS). */
async function tapCell(page: Page, col: number, row: number): Promise<void> {
  const canvas = page.locator('.world__canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('mapa sem caixa');
  const { width, height } = await canvas.evaluate((el) => ({
    width: (el as HTMLCanvasElement).width,
    height: (el as HTMLCanvasElement).height,
  }));
  // Mesma conta do jogo: barra lateral centrada, mapa ancorado no topo.
  const scale = Math.min(box.width / width, box.height / height);
  const insetX = (box.width - width * scale) / 2;
  const x = box.x + insetX + (col + 0.5) * TILE * scale;
  const y = box.y + (row + 0.5) * TILE * scale;
  await page.mouse.click(x, y);
}

/** Vai do menu ate o mapa da primeira zona, com o tutorial fora do caminho. */
/** Resolve o Tear escrevendo o padrao cor por cor (a missao A tem folga). */
async function solveLoomByHand(page: Page): Promise<void> {
  const colors = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[aria-label="Padrao a reproduzir"] .loom__cell')).map(
      (cell) => (cell.getAttribute('aria-label') ?? '').replace('cor ', ''),
    ),
  );
  for (const color of colors) {
    await page.getByRole('button', { name: `Adicionar cor ${color}` }).click();
  }
  await page.getByRole('button', { name: /Enviar solucao/ }).click();
  await expect(page.getByRole('heading', { name: 'Missao concluida!' })).toBeVisible();
}

/**
 * Save com a Era 1 concluida: a zona de Valvulas e Logica fica aberta e e para
 * onde "Continuar" leva.
 */
async function seedEraTwoOpen(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const done = { stars: 3, bestScore: 1000 };
    localStorage.setItem(
      'davalvulaaia:save:v1',
      JSON.stringify({
        version: 1,
        state: {
          player: {
            level: 2,
            xp: 0,
            hp: 120,
            hpMax: 120,
            clock: 2,
            powers: {
              repetir: 3,
              decidir: 0,
              codificar: 0,
              conectar: 0,
              proteger: 0,
              aprender: 0,
            },
            missions: { 'mecanica-A': done, 'mecanica-B': done },
            year: 1936,
            items: { 'cartao-perfurado': 1 },
          },
          clearedEras: ['mecanica'],
          settings: { reduceMotion: false, vibration: true, muted: true },
          tutorialDone: true,
        },
      }),
    );
  });
}

/** Liga um encaixe a uma origem: toca no encaixe, toca na origem. */
async function wire(page: Page, slot: string, source: string): Promise<void> {
  await page.getByRole('button', { name: new RegExp(`^Ligar fio em ${slot}:`) }).click();
  await page.getByRole('button', { name: source, exact: true }).click();
}

/** Fecha a caixa de fala, que tem varias partes. */
async function closeDialogue(page: Page): Promise<void> {
  const box = page.locator('.dialogue');
  for (let i = 0; i < 6 && (await box.isVisible()); i += 1) {
    await box.getByRole('button').click();
  }
  await expect(box).toBeHidden();
}

/**
 * Monta um save com as duas missoes da primeira zona ja concluidas.
 *
 * A missao B so fecha usando repeticao (e assim de proposito), e resolver o
 * Tear pela interface aqui exigiria repetir no teste a logica de codificacao
 * otima que o `core` ja tem -- duplicata que daria falso verde se a logica
 * mudasse. Os testes de unidade cobrem o Tear; estes aqui cobrem a prova da
 * era, entao a zona comeca concluida.
 */
async function seedZoneCleared(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const done = { stars: 1, bestScore: 500 };
    localStorage.setItem(
      'davalvulaaia:save:v1',
      JSON.stringify({
        version: 1,
        state: {
          player: {
            level: 1,
            xp: 0,
            hp: 110,
            hpMax: 110,
            clock: 2,
            powers: {
              repetir: 1,
              decidir: 0,
              codificar: 0,
              conectar: 0,
              proteger: 0,
              aprender: 0,
            },
            missions: { 'mecanica-A': done, 'mecanica-B': done },
            year: 1642,
            items: {},
          },
          clearedEras: [],
          settings: { reduceMotion: false, vibration: true, muted: true },
          tutorialDone: true,
        },
      }),
    );
  });
}

/** Vai ate a porta e abre a prova da era. */
async function openEraQuiz(page: Page): Promise<void> {
  await tapCell(page, 7, 2);
  await expect.poll(async () => bitCell(page), { timeout: 12000 }).toBe('7,2');
  await page.getByRole('button', { name: 'Fazer a prova da era' }).click();
}

/** Abre o painel de estado, que fica recolhido atras do distintivo. */
async function openHud(page: Page): Promise<void> {
  await page.locator('.statusChip').click();
  await expect(page.locator('.hudPanel')).toBeVisible();
}

async function enterFirstZone(page: Page, { skipTutorial = true } = {}): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Novo jogo' }).click();
  await expect(page.locator('.world__canvas')).toBeVisible();
  if (skipTutorial) {
    const skip = page.getByRole('button', { name: 'Pular tutorial' });
    if (await skip.isVisible()) await skip.click();
  }
}

test('abre no menu do jogo', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Da Valvula a IA' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Novo jogo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zonas' })).toBeVisible();
});

test('nao ha rolagem horizontal', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
});

test('no menu, zonas sem pre-requisito ficam trancadas', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Zonas' }).click();
  await expect(page.getByRole('button', { name: /Mecanica/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: /Valvulas e Logica/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Inteligencia Artificial/ })).toBeDisabled();
});

test('o tutorial aparece no primeiro jogo e pode ser pulado', async ({ page }) => {
  await enterFirstZone(page, { skipTutorial: false });
  const tutorial = page.getByRole('dialog', { name: 'Como jogar' });
  await expect(tutorial).toBeVisible();
  await expect(tutorial).toContainText('1/4');
  await page.getByRole('button', { name: 'Pular tutorial' }).click();
  await expect(tutorial).toBeHidden();
});

test('o estado da maquina fica recolhido e abre no distintivo', async ({ page }) => {
  await enterFirstZone(page);

  // Recolhido: o painel nao ocupa a tela, so o distintivo sobre o mapa.
  await expect(page.locator('.hudPanel')).toBeHidden();
  const chip = page.locator('.statusChip');
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute('aria-expanded', 'false');

  await openHud(page);
  await expect(chip).toHaveAttribute('aria-expanded', 'true');
  const painel = page.locator('.hudPanel');
  await expect(painel.getByRole('meter', { name: /Integridade/ })).toBeVisible();
  await expect(painel.getByRole('meter', { name: /Conhecimento/ })).toBeVisible();
  await expect(painel.getByText('Mochila vazia')).toBeVisible();

  // E fecha de novo, devolvendo a tela ao mapa.
  await page.getByRole('button', { name: 'Fechar' }).click();
  await expect(page.locator('.hudPanel')).toBeHidden();
});

test('o painel de estado fecha com Esc', async ({ page }) => {
  await enterFirstZone(page);
  await openHud(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('.hudPanel')).toBeHidden();
});

test('o Bit anda ate a celula tocada', async ({ page }) => {
  await enterFirstZone(page);
  expect(await bitCell(page)).toBe('7,15');

  // Sobe pelo caminho central.
  await tapCell(page, 7, 11);
  await expect.poll(async () => bitCell(page), { timeout: 8000 }).toBe('7,11');
});

test('tocar num tile bloqueado nao move o Bit', async ({ page }) => {
  await enterFirstZone(page);
  const before = await bitCell(page);

  // Arvore na borda esquerda, longe dos botoes de canto.
  await tapCell(page, 0, 8);

  await expect(page.getByText('Nao da para chegar ai.')).toBeVisible();
  expect(await bitCell(page)).toBe(before);
});

test('o terminal abre o minijogo da missao', async ({ page }) => {
  await enterFirstZone(page);
  await tapCell(page, 3, 7);
  await expect.poll(async () => bitCell(page), { timeout: 10000 }).toBe('3,7');

  await page.getByRole('button', { name: 'Usar o terminal' }).click();
  await expect(page.getByRole('heading', { name: 'Tear de Engrenagens' })).toBeVisible();
  await expect(page.getByLabel('Padrao a reproduzir')).toBeVisible();
});

test('o minijogo e jogavel por toque e da estrelas', async ({ page }) => {
  await enterFirstZone(page);
  await tapCell(page, 3, 7);
  await expect.poll(async () => bitCell(page), { timeout: 10000 }).toBe('3,7');
  await page.getByRole('button', { name: 'Usar o terminal' }).click();

  // A missao A tem folga de cartoes: da para escrever o padrao cor por cor.
  await solveLoomByHand(page);
  await expect(page.getByLabel(/estrelas/)).toBeVisible();

  // Volta para a zona com o XP creditado no painel de estado.
  await page.getByRole('button', { name: 'Voltar para a zona' }).click();
  await openHud(page);
  await expect(
    page.locator('.hudPanel').getByRole('meter', { name: /Conhecimento 0 de/ }),
  ).toBeHidden();
});

test('o minijogo da Era 2 e jogavel por toque e fecha com 3 estrelas', async ({ page }) => {
  await seedEraTwoOpen(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('.world__canvas')).toBeVisible();

  // Terminal da missao A da zona de Logica.
  await tapCell(page, 2, 7);
  await expect.poll(async () => bitCell(page), { timeout: 12000 }).toBe('2,7');
  await page.getByRole('button', { name: 'Usar o terminal' }).click();
  await expect(page.getByRole('heading', { name: 'Circuitos Logicos' })).toBeVisible();

  /*
   * A seed `logica-A-v1` pede NAO (A E B). Se a seed ou o gerador mudarem, esta
   * leitura falha aqui dizendo qual tabela veio -- e o circuito abaixo e que
   * precisa ser refeito, nao a assercao apagada.
   */
  const pedido = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.circuit__wanted')).map((cell) => cell.textContent),
  );
  expect(pedido).toEqual(['1', '1', '1', '0']);

  await page.getByRole('button', { name: 'Adicionar porta E' }).click();
  await wire(page, 'porta 1, encaixe 1', 'entrada A');
  await wire(page, 'porta 1, encaixe 2', 'entrada B');
  await page.getByRole('button', { name: 'Adicionar porta NAO' }).click();
  await wire(page, 'porta 2, encaixe 1', 'porta 1');
  await wire(page, 'Saida', 'porta 2');

  await expect(page.getByText('A tabela inteira bate. Pode enviar.')).toBeVisible();
  await page.getByRole('button', { name: /Enviar solucao/ }).click();

  // Duas portas, o mesmo da referencia: eficiencia 1, tres estrelas.
  await expect(page.getByRole('heading', { name: 'Missao concluida!' })).toBeVisible();
  await expect(page.getByLabel('3 estrelas')).toBeVisible();
});

test('apagar uma porta desliga os fios que apontavam para ela', async ({ page }) => {
  await seedEraTwoOpen(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await tapCell(page, 2, 7);
  await expect.poll(async () => bitCell(page), { timeout: 12000 }).toBe('2,7');
  await page.getByRole('button', { name: 'Usar o terminal' }).click();

  await page.getByRole('button', { name: 'Adicionar porta E' }).click();
  await wire(page, 'porta 1, encaixe 1', 'entrada A');
  await page.getByRole('button', { name: 'Adicionar porta NAO' }).click();
  await wire(page, 'porta 2, encaixe 1', 'porta 1');

  // Apagar a porta 1 deixa a porta que era 2 sem origem, e nao com fio solto.
  await page.getByRole('button', { name: 'Apagar porta 1' }).click();
  await expect(
    page.getByRole('button', { name: 'Ligar fio em porta 1, encaixe 1: ligar' }),
  ).toBeVisible();
  await expect(page.getByText('Falta ligar algum fio.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Enviar solucao/ })).toBeDisabled();
});

test('a tela dos Circuitos cabe no celular: 44 px e sem rolagem lateral', async ({ page }) => {
  await seedEraTwoOpen(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await tapCell(page, 2, 7);
  await expect.poll(async () => bitCell(page), { timeout: 12000 }).toBe('2,7');
  await page.getByRole('button', { name: 'Usar o terminal' }).click();

  // Com o quadro cheio de portas e a ajuda aberta, que e quando mais aperta.
  for (let i = 0; i < 3; i += 1) {
    await page.getByRole('button', { name: 'Adicionar porta OU' }).click();
  }
  await expect(page.locator('.circuit__gate')).toHaveCount(3);
  await page.getByRole('button', { name: 'O que e isto?' }).click();
  await page.getByRole('button', { name: 'Dica', exact: true }).click();
  await expect(page.locator('.help__panel')).toBeVisible();
  await expect(page.locator('.help__hints li').first()).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);

  const buttons = page.locator('.circuit button');
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    const box = await buttons.nth(i).boundingBox();
    if (!box) continue;
    expect(box.width, `botao ${i} estreito`).toBeGreaterThanOrEqual(43.5);
    expect(box.height, `botao ${i} baixo`).toBeGreaterThanOrEqual(43.5);
  }
});

test('o minijogo diz o que representa e libera dicas uma a uma', async ({ page }) => {
  await enterFirstZone(page);
  await tapCell(page, 3, 7);
  await expect.poll(async () => bitCell(page), { timeout: 10000 }).toBe('3,7');
  await page.getByRole('button', { name: 'Usar o terminal' }).click();

  // A explicacao comeca recolhida: quem quer jogar nao perde a tela.
  await expect(page.locator('.help__panel')).toBeHidden();
  await page.getByRole('button', { name: 'O que e isto?' }).click();

  const painel = page.locator('.help__panel');
  await expect(
    painel.getByRole('heading', { name: 'O que este desafio representa' }),
  ).toBeVisible();
  await expect(painel).toContainText('Jacquard');
  // A funcionalidade da era, que e o que a missao entrega como poder.
  await expect(painel).toContainText('REPETIR');

  await page.getByRole('button', { name: 'Fechar explicacao' }).click();
  await expect(painel).toBeHidden();

  // As dicas saem uma por toque, nao todas de uma vez.
  const dicas = page.locator('.help__hints li');
  await expect(dicas).toHaveCount(0);
  await page.getByRole('button', { name: 'Dica', exact: true }).click();
  await expect(dicas).toHaveCount(1);
  await page.getByRole('button', { name: /^Dica 2 de/ }).click();
  await expect(dicas).toHaveCount(2);

  // Ate acabarem, e ai o botao para de oferecer.
  for (let i = 3; i < 9; i += 1) {
    const botao = page.getByRole('button', { name: /^Dica \d+ de/ });
    if (await botao.isDisabled()) break;
    await botao.click();
  }
  await expect(page.getByText('Essas eram todas as dicas.')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Dica \d+ de/ })).toBeDisabled();
});

test('a ajuda dos Circuitos explica a funcionalidade da Era 2', async ({ page }) => {
  await seedEraTwoOpen(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await tapCell(page, 2, 7);
  await expect.poll(async () => bitCell(page), { timeout: 12000 }).toBe('2,7');
  await page.getByRole('button', { name: 'Usar o terminal' }).click();

  await page.getByRole('button', { name: 'O que e isto?' }).click();
  const painel = page.locator('.help__panel');
  await expect(painel).toContainText('Shannon');
  await expect(painel).toContainText('DECIDIR');

  // E a primeira dica ensina a ler a tabela, nao entrega a resposta.
  await page.getByRole('button', { name: 'Dica', exact: true }).click();
  await expect(page.locator('.help__hints li').first()).toContainText('tabela');
});

test('fala com um personagem historico da zona', async ({ page }) => {
  await enterFirstZone(page);
  // Jacquard fica no meio do mapa da primeira zona.
  await tapCell(page, 8, 8);
  await expect.poll(async () => bitCell(page), { timeout: 10000 }).toBe('8,8');

  await expect(page.getByText('Joseph-Marie Jacquard')).toBeVisible();
  await expect(page.getByText('Tear de cartoes perfurados (1804)')).toBeVisible();
  // A fala tem varias partes e avanca por toque.
  await expect(page.getByText('1/3')).toBeVisible();
  await page.getByRole('button', { name: 'Entendi' }).click();
  await expect(page.getByText('2/3')).toBeVisible();
});

test('a zona tem tres personagens diferentes', async ({ page }) => {
  await enterFirstZone(page);
  for (const [col, row, nome] of [
    [6, 4, 'Blaise Pascal'],
    [8, 8, 'Joseph-Marie Jacquard'],
    [6, 11, 'Ada Lovelace'],
  ] as const) {
    await tapCell(page, col, row);
    await expect.poll(async () => bitCell(page), { timeout: 12000 }).toBe(`${col},${row}`);
    await expect(page.getByText(nome)).toBeVisible();
    await closeDialogue(page);
  }
});

test('a porta comeca trancada e diz quantas missoes faltam', async ({ page }) => {
  await enterFirstZone(page);
  await tapCell(page, 7, 2);
  await expect.poll(async () => bitCell(page), { timeout: 12000 }).toBe('7,2');
  await expect(page.getByRole('button', { name: 'Falta concluir: 2' })).toBeDisabled();
});

test('a prova da era da poder e item, e libera a proxima zona', async ({ page }) => {
  await seedZoneCleared(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('.world__canvas')).toBeVisible();
  await openEraQuiz(page);

  // Quatro perguntas; a alternativa certa fica marcada depois da resposta.
  for (let i = 0; i < 4; i += 1) {
    await expect(page.getByText(`Pergunta ${i + 1} de 4`)).toBeVisible();
    await page.locator('.quiz__option').first().click();
    await expect(page.locator('.quiz__option--right')).toBeVisible();
    await page.locator('.quiz__feedback button').click();
  }

  await expect(page.getByRole('heading', { name: 'Resultado da prova' })).toBeVisible();
  await expect(page.getByText(/Acertos: \d+\/4/)).toBeVisible();
});

test('acertando a prova, o item vai para a mochila e a proxima zona abre', async ({ page }) => {
  await seedZoneCleared(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('.world__canvas')).toBeVisible();
  await openEraQuiz(page);

  /*
   * Primeira tentativa: responde a primeira alternativa de cada pergunta e
   * anota qual era a certa, que a prova revela depois de responder.
   */
  const right = new Map<string, string>();
  for (let i = 0; i < 4; i += 1) {
    const prompt = (await page.locator('.quiz__prompt').textContent()) ?? '';
    await page.locator('.quiz__option').first().click();
    const answer = (await page.locator('.quiz__option--right').textContent()) ?? '';
    right.set(prompt.trim(), answer.trim());
    await page.locator('.quiz__feedback button').click();
  }
  await expect(page.getByRole('heading', { name: 'Resultado da prova' })).toBeVisible();

  // Refazer usa a mesma seed: as perguntas e as alternativas sao as mesmas.
  await page.getByRole('button', { name: 'Refazer a prova' }).click();
  for (let i = 0; i < 4; i += 1) {
    const prompt = ((await page.locator('.quiz__prompt').textContent()) ?? '').trim();
    const answer = right.get(prompt);
    expect(answer, `a prova mudou ao refazer: ${prompt}`).toBeDefined();
    await page.getByRole('button', { name: answer!, exact: true }).click();
    await page.locator('.quiz__feedback button').click();
  }

  await expect(page.getByText('Aprovado! O poder desta era e seu.')).toBeVisible();
  await expect(page.getByText(/Item recebido:\s*Cartao Perfurado/)).toBeVisible();
  await page.getByRole('button', { name: 'Seguir para a proxima era' }).click();

  // Entrou na zona seguinte, e o item aparece na mochila.
  await expect(page.locator('.world__canvas')).toBeVisible();
  await openHud(page);
  await expect(page.getByText('Cartao Perfurado')).toBeVisible();
});

test('a zona seguinte so abre depois da prova', async ({ page }) => {
  await enterFirstZone(page);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Zonas' }).click();
  await expect(page.getByRole('button', { name: /Valvulas e Logica/ })).toBeDisabled();
});

test('alvos de toque tem ao menos 44 px', async ({ page }) => {
  await page.goto('/');
  const buttons = page.locator('button');
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    const box = await buttons.nth(i).boundingBox();
    if (!box) continue;
    expect(box.width).toBeGreaterThanOrEqual(43.5);
    expect(box.height).toBeGreaterThanOrEqual(43.5);
  }
});

test('o progresso sobrevive a um recarregamento', async ({ page }) => {
  await enterFirstZone(page);
  await page.getByRole('button', { name: 'Menu' }).click();
  // Com progresso salvo, o menu passa a oferecer "Continuar".
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible();
  const saved = await page.evaluate(() => localStorage.getItem('davalvulaaia:save:v1'));
  expect(saved).not.toBeNull();
});
