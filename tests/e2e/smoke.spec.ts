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
  const { width, height, cols } = await canvas.evaluate((el) => ({
    width: (el as HTMLCanvasElement).width,
    height: (el as HTMLCanvasElement).height,
    cols: Number((el as HTMLCanvasElement).dataset.cols),
  }));
  // Mesma conta do jogo: barra lateral centrada, mapa ancorado no topo. O canvas
  // tem varios pixels por pixel do mapa, entao o lado do tile sai das colunas.
  const scale = Math.min(box.width / width, box.height / height);
  const tile = width / cols;
  expect(tile % TILE).toBe(0);
  const insetX = (box.width - width * scale) / 2;
  const x = box.x + insetX + (col + 0.5) * tile * scale;
  const y = box.y + (row + 0.5) * tile * scale;
  await page.mouse.click(x, y);
}

/**
 * Toca num terminal e espera o Bit chegar. O Bit nao sobe em cima do terminal:
 * para na celula livre ao lado, e e ai que o botao do terminal aparece.
 */
async function goToStation(page: Page, col: number, row: number): Promise<void> {
  await tapCell(page, col, row);
  await expect(page.getByRole('button', { name: 'Usar o terminal' })).toBeVisible({
    timeout: 12000,
  });
  expect(await bitCell(page)).not.toBe(col + ',' + row);
}

/** Toca num personagem e espera a fala abrir (o Bit para ao lado dele). */
async function goToNpc(page: Page, col: number, row: number): Promise<void> {
  await tapCell(page, col, row);
  await expect(page.locator('.dialogue')).toBeVisible({ timeout: 12000 });
  expect(await bitCell(page)).not.toBe(col + ',' + row);
}

/** Vai do menu ate o mapa da primeira zona, com o tutorial fora do caminho. */
/** Resolve o Tear escrevendo o padrao cor por cor (a missao A tem folga). */
async function solveLoomByHand(page: Page): Promise<void> {
  const colors = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[aria-label="Padrão a reproduzir"] .loom__cell')).map(
      (cell) => (cell.getAttribute('aria-label') ?? '').replace('cor ', ''),
    ),
  );
  for (const color of colors) {
    await page.getByRole('button', { name: `Adicionar cor ${color}` }).click();
  }
  await page.getByRole('button', { name: /Enviar solução/ }).click();
  await expect(page.getByRole('heading', { name: 'Missão concluída!' })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'Da Válvula à IA' })).toBeVisible();
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
  await expect(page.getByRole('button', { name: /Mecânica/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: /Válvulas e Lógica/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Inteligência Artificial/ })).toBeDisabled();
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

  await expect(page.getByText('Não dá para chegar aí.')).toBeVisible();
  expect(await bitCell(page)).toBe(before);
});

test('o terminal abre o minijogo da missao', async ({ page }) => {
  await enterFirstZone(page);
  await goToStation(page, 3, 7);

  await page.getByRole('button', { name: 'Usar o terminal' }).click();
  await expect(page.getByRole('heading', { name: 'Tear de Engrenagens' })).toBeVisible();
  await expect(page.getByLabel('Padrão a reproduzir')).toBeVisible();
});

test('o minijogo e jogavel por toque e da estrelas', async ({ page }) => {
  await enterFirstZone(page);
  await goToStation(page, 3, 7);
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
  await goToStation(page, 2, 7);
  await page.getByRole('button', { name: 'Usar o terminal' }).click();
  await expect(page.getByRole('heading', { name: 'Circuitos Lógicos' })).toBeVisible();

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
  await page.getByRole('button', { name: 'Adicionar porta NÃO' }).click();
  await wire(page, 'porta 2, encaixe 1', 'porta 1');
  await wire(page, 'Saída', 'porta 2');

  await expect(page.getByText('A tabela inteira bate. Pode enviar.')).toBeVisible();
  await page.getByRole('button', { name: /Enviar solução/ }).click();

  // Duas portas, o mesmo da referencia: eficiencia 1, tres estrelas.
  await expect(page.getByRole('heading', { name: 'Missão concluída!' })).toBeVisible();
  await expect(page.getByLabel('3 estrelas')).toBeVisible();
});

test('apagar uma porta desliga os fios que apontavam para ela', async ({ page }) => {
  await seedEraTwoOpen(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await goToStation(page, 2, 7);
  await page.getByRole('button', { name: 'Usar o terminal' }).click();

  await page.getByRole('button', { name: 'Adicionar porta E' }).click();
  await wire(page, 'porta 1, encaixe 1', 'entrada A');
  await page.getByRole('button', { name: 'Adicionar porta NÃO' }).click();
  await wire(page, 'porta 2, encaixe 1', 'porta 1');

  // Apagar a porta 1 deixa a porta que era 2 sem origem, e nao com fio solto.
  await page.getByRole('button', { name: 'Apagar porta 1' }).click();
  await expect(
    page.getByRole('button', { name: 'Ligar fio em porta 1, encaixe 1: ligar' }),
  ).toBeVisible();
  await expect(page.getByText('Falta ligar algum fio.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Enviar solução/ })).toBeDisabled();
});

test('a tela dos Circuitos cabe no celular: 44 px e sem rolagem lateral', async ({ page }) => {
  await seedEraTwoOpen(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await goToStation(page, 2, 7);
  await page.getByRole('button', { name: 'Usar o terminal' }).click();

  // Com o quadro cheio de portas e a ajuda aberta, que e quando mais aperta.
  for (let i = 0; i < 3; i += 1) {
    await page.getByRole('button', { name: 'Adicionar porta OU' }).click();
  }
  await expect(page.locator('.circuit__gate')).toHaveCount(3);
  await page.getByRole('button', { name: 'O que é isto?' }).click();
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
  await goToStation(page, 3, 7);
  await page.getByRole('button', { name: 'Usar o terminal' }).click();

  // A explicacao comeca recolhida: quem quer jogar nao perde a tela.
  await expect(page.locator('.help__panel')).toBeHidden();
  await page.getByRole('button', { name: 'O que é isto?' }).click();

  const painel = page.locator('.help__panel');
  await expect(
    painel.getByRole('heading', { name: 'O que este desafio representa' }),
  ).toBeVisible();
  await expect(painel).toContainText('Jacquard');
  // A funcionalidade da era, que e o que a missao entrega como poder.
  await expect(painel).toContainText('REPETIR');

  await page.getByRole('button', { name: 'Fechar explicação' }).click();
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
  await goToStation(page, 2, 7);
  await page.getByRole('button', { name: 'Usar o terminal' }).click();

  await page.getByRole('button', { name: 'O que é isto?' }).click();
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
  await goToNpc(page, 8, 8);

  await expect(page.getByText('Joseph-Marie Jacquard')).toBeVisible();
  await expect(page.getByText('Tear de cartões perfurados (1804)')).toBeVisible();
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
    await goToNpc(page, col, row);
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

  await expect(page.getByText('Aprovado! O poder desta era é seu.')).toBeVisible();
  await expect(page.getByText(/Item recebido:\s*Cartão Perfurado/)).toBeVisible();
  await page.getByRole('button', { name: 'Seguir para a próxima era' }).click();

  // Entrou na zona seguinte, e o item aparece na mochila.
  await expect(page.locator('.world__canvas')).toBeVisible();
  await openHud(page);
  await expect(page.getByText('Cartão Perfurado')).toBeVisible();
});

test('a zona seguinte so abre depois da prova', async ({ page }) => {
  await enterFirstZone(page);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Zonas' }).click();
  await expect(page.getByRole('button', { name: /Válvulas e Lógica/ })).toBeDisabled();
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

/* ------------------------------------------------------------------ *
 * Eras 3 a 6 e o chefao.
 *
 * As quatro zonas do meio ficam longe do inicio da campanha, entao o save e
 * montado pronto -- do mesmo jeito que a Era 2 ja fazia. O que estes testes
 * cobrem e a tela: o terminal abre o minijogo certo, o jogo responde ao toque e
 * o estado aparece escrito. A regra de cada minijogo e coberta pelos testes de
 * unidade, que a rodam centenas de vezes.
 * ------------------------------------------------------------------ */

const ERA_ORDER = ['mecanica', 'logica', 'codigo', 'redes', 'seguranca', 'ia'] as const;

const POWER_OF: Record<string, string> = {
  mecanica: 'repetir',
  logica: 'decidir',
  codigo: 'codificar',
  redes: 'conectar',
  seguranca: 'proteger',
  ia: 'aprender',
};

const ITEM_OF: Record<string, string> = {
  mecanica: 'cartao-perfurado',
  logica: 'valvula-reserva',
  codigo: 'fita-magnetica',
  redes: 'pacote-roteado',
  seguranca: 'chave-publica',
  ia: 'modelo-treinado',
};

/** Save com as eras informadas concluidas com 3 estrelas, poder e item. */
async function seedCleared(page: Page, cleared: readonly string[]): Promise<void> {
  await page.addInitScript(
    ([lista, poderDe, itemDe]: [string[], Record<string, string>, Record<string, string>]) => {
      const done = { stars: 3, bestScore: 1000 };
      const powers: Record<string, number> = {
        repetir: 0,
        decidir: 0,
        codificar: 0,
        conectar: 0,
        proteger: 0,
        aprender: 0,
      };
      const missions: Record<string, typeof done> = {};
      const items: Record<string, number> = {};
      for (const era of lista) {
        powers[poderDe[era] as string] = 3;
        missions[era + '-A'] = done;
        missions[era + '-B'] = done;
        items[itemDe[era] as string] = 1;
      }
      localStorage.setItem(
        'davalvulaaia:save:v1',
        JSON.stringify({
          version: 1,
          state: {
            player: {
              level: 6,
              xp: 0,
              hp: 160,
              hpMax: 160,
              clock: 2,
              powers,
              missions,
              year: 2012,
              items,
            },
            clearedEras: lista,
            bossDefeated: false,
            bossBestScore: 0,
            settings: { reduceMotion: false, vibration: true, muted: true },
            tutorialDone: true,
          },
        }),
      );
    },
    [[...cleared], POWER_OF, ITEM_OF] as [string[], Record<string, string>, Record<string, string>],
  );
}

/** Abre o terminal da missao A de uma era, com o save montado para ela. */
async function openStationOf(
  page: Page,
  era: (typeof ERA_ORDER)[number],
  col: number,
  row: number,
): Promise<void> {
  const index = ERA_ORDER.indexOf(era);
  await seedCleared(page, ERA_ORDER.slice(0, index));
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('.world__canvas')).toBeVisible();
  await goToStation(page, col, row);
  await page.getByRole('button', { name: 'Usar o terminal' }).click();
}

test('o minijogo da Era 3 fecha a missao com codigo de tamanho fixo', async ({ page }) => {
  await openStationOf(page, 'codigo', 1, 7);
  await expect(page.getByRole('heading', { name: 'Mesa de Bits' })).toBeVisible();

  /*
   * A missao A cabe com codigo de tamanho fixo (A=00, B=01, C=10), que e a
   * primeira ideia de qualquer um -- passa, mas com eficiencia baixa. O codigo
   * de Huffman e o que rende as tres estrelas, e e isso que a era ensina.
   */
  const rows = page.locator('.bits__row');
  const total = await rows.count();
  expect(total).toBeGreaterThan(1);

  const bits = Math.max(1, Math.ceil(Math.log2(total)));
  for (let i = 0; i < total; i += 1) {
    const code = i.toString(2).padStart(bits, '0');
    for (const bit of code) {
      await rows
        .nth(i)
        .getByRole('button', { name: new RegExp('^Acrescentar bit ' + bit + ' ao código de') })
        .click();
    }
  }

  await expect(page.getByText('Cabe na fita e a leitura é única.')).toBeVisible();
  await page.getByRole('button', { name: /Enviar solução/ }).click();
  await expect(page.getByRole('heading', { name: 'Missão concluída!' })).toBeVisible();
  await expect(page.getByLabel(/estrelas/)).toBeVisible();
});

test('a Era 3 acusa codigo ambiguo antes de enviar', async ({ page }) => {
  await openStationOf(page, 'codigo', 1, 7);
  const rows = page.locator('.bits__row');
  const total = await rows.count();

  // Todo mundo com o mesmo codigo: a fita fica ilegivel, e a tela diz isso.
  for (let i = 0; i < total; i += 1) {
    await rows
      .nth(i)
      .getByRole('button', { name: /^Acrescentar bit 0 ao código de/ })
      .click();
  }
  await expect(page.getByText(/Código ambíguo/)).toBeVisible();
});

test('a Era 4 leva o pacote de vizinho em vizinho, e da para voltar', async ({ page }) => {
  await openStationOf(page, 'redes', 2, 8);
  await expect(page.getByRole('heading', { name: 'Rota dos Pacotes' })).toBeVisible();

  // O pacote comeca na origem e so ve os vizinhos dela.
  await expect(page.getByLabel('Rota do pacote até agora')).toContainText('Origem');
  const voltar = page.getByRole('button', { name: 'Voltar um salto' });
  await expect(voltar).toBeDisabled();

  const opcoes = page.locator('.route__option');
  await expect(opcoes.first()).toBeVisible();
  const primeiro = (
    (await opcoes.first().locator('.route__optionName').textContent()) ?? ''
  ).trim();
  await opcoes.first().click();

  await expect(page.getByLabel('Rota do pacote até agora')).toContainText(primeiro);
  await expect(voltar).toBeEnabled();
  await voltar.click();
  await expect(page.getByLabel('Rota do pacote até agora')).not.toContainText(primeiro);
});

test('a Era 5 so considera o cofre fechado quando nao sobra caminho', async ({ page }) => {
  await openStationOf(page, 'seguranca', 1, 7);
  await expect(page.getByRole('heading', { name: 'Cofre Criptográfico' })).toBeVisible();

  // Com a rede aberta, a tela diz que o cofre esta exposto.
  await expect(page.getByText('Nenhum firewall instalado: o cofre está aberto.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Enviar solução/ })).toBeDisabled();

  // Bloquear tudo fecha o cofre (gasta firewall demais, mas fecha).
  const links = page.locator('.vault__link');
  const total = await links.count();
  expect(total).toBeGreaterThan(1);
  for (let i = 0; i < total; i += 1) await links.nth(i).click();

  await expect(page.getByText('Nenhum caminho chega ao cofre.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Enviar solução/ })).toBeEnabled();
});

test('a Era 6 esconde os exemplos guardados e conta os acertos do treino', async ({ page }) => {
  await openStationOf(page, 'ia', 1, 7);
  await expect(page.getByRole('heading', { name: 'Treinar o Detector' })).toBeVisible();

  await expect(page.getByText('Escolha pelo menos um sinal.')).toBeVisible();
  await expect(page.getByText(/Os exemplos guardados só são conferidos/)).toBeVisible();

  await page.getByRole('button', { name: 'Passar a observar o sinal 1' }).click();
  await expect(page.getByRole('button', { name: /Enviar solução/ })).toBeEnabled();
  await expect(page.locator('.model__example').first()).toBeVisible();
});

test('o chefao abre no menu com as seis eras concluidas', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /BUG Day 0/ })).toBeHidden();

  await seedCleared(page, ERA_ORDER);
  await page.goto('/');
  await page.getByRole('button', { name: 'Enfrentar o BUG Day 0' }).click();

  await expect(page.getByRole('heading', { name: 'BUG Day 0' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ataque anunciado' })).toBeVisible();
  await expect(page.getByRole('meter', { name: /Integridade do BUG/ })).toBeVisible();

  // Os seis poderes viram resposta possivel, e a mochila entra no combate.
  await expect(page.locator('.boss__power')).toHaveCount(6);
  await expect(page.locator('.boss__items button').first()).toBeVisible();
});

test('a arena do chefao mostra o Bit, o BUG e as duas integridades', async ({ page }) => {
  await seedCleared(page, ERA_ORDER);
  await page.goto('/');
  await page.getByRole('button', { name: 'Enfrentar o BUG Day 0' }).click();

  const arena = page.locator('.bossStage');
  await expect(arena).toBeVisible();
  await expect(arena.locator('.bossStage__bug')).toBeVisible();
  await expect(arena.locator('.bossStage__bit')).toBeVisible();

  // As duas barras da cena: a sua e a do BUG.
  await expect(arena.getByRole('meter', { name: /Sua integridade/ })).toBeVisible();
  await expect(arena.getByRole('meter', { name: /Integridade do BUG/ })).toBeVisible();

  // Os sprites sao os mesmos PNG do mapa, e o quadro vem de uma variavel CSS.
  const art = await arena.locator('.bossStage__bug').evaluate((el) => ({
    image: getComputedStyle(el).backgroundImage,
    frame: getComputedStyle(el).getPropertyValue('--frame').trim(),
  }));
  expect(art.image).toContain('/sprites/bug.png');
  expect(art.frame).toBe('0');

  // Parado, a arena so encara.
  await expect(arena).toHaveClass(/bossStage--idle/);
  await expect(page.getByText('O BUG encara você e prepara o ataque.')).toBeVisible();
});

test('responder ao chefao abre o micro-desafio da era do poder escolhido', async ({ page }) => {
  await seedCleared(page, ERA_ORDER);
  await page.goto('/');
  await page.getByRole('button', { name: 'Enfrentar o BUG Day 0' }).click();

  // O poder que neutraliza o ataque esta escrito na tela.
  const resposta = (await page.locator('.boss__answer').textContent()) ?? '';
  expect(resposta.length).toBeGreaterThan(0);
  await page.locator('.boss__power--right').click();

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

  // Sair do micro-desafio devolve o turno, sem gastar acao.
  await page.getByRole('button', { name: 'Sair da missão' }).click();
  await expect(page.getByRole('heading', { name: 'Ataque anunciado' })).toBeVisible();
  await expect(page.locator('.boss__stats')).toContainText('Ações neste turno: 2/2');
});

test('o item de escudo e usado no combate e fica armado para o turno', async ({ page }) => {
  await seedCleared(page, ERA_ORDER);
  await page.goto('/');
  await page.getByRole('button', { name: 'Enfrentar o BUG Day 0' }).click();

  await page.getByRole('button', { name: 'Usar Pacote Roteado' }).click();
  await expect(
    page.getByText('Escudo armado: o ataque deste turno não acerta a máquina.'),
  ).toBeVisible();
  // O item sai da mochila ao ser usado.
  await expect(page.getByRole('button', { name: 'Usar Pacote Roteado' })).toBeHidden();
});

test('a tela do chefao cabe no celular: 44 px e sem rolagem lateral', async ({ page }) => {
  await seedCleared(page, ERA_ORDER);
  await page.goto('/');
  await page.getByRole('button', { name: 'Enfrentar o BUG Day 0' }).click();
  await expect(page.getByRole('heading', { name: 'Ataque anunciado' })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);

  const buttons = page.locator('.boss button');
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    const box = await buttons.nth(i).boundingBox();
    if (!box) continue;
    expect(box.width, 'botao ' + i + ' estreito').toBeGreaterThanOrEqual(43.5);
    expect(box.height, 'botao ' + i + ' baixo').toBeGreaterThanOrEqual(43.5);
  }
});

/*
 * Um teste por era, e nao um laco com as quatro: no iPhone 12 emulado as quatro
 * zonas numa so chamada chegaram perto do limite de 30 s e falharam por tempo,
 * sem nada de errado na tela. Separados, cada um sobra tempo.
 */
for (const tela of [
  { era: 'codigo', col: 1, row: 7, raiz: '.bits' },
  { era: 'redes', col: 2, row: 8, raiz: '.route' },
  { era: 'seguranca', col: 1, row: 7, raiz: '.vault' },
  { era: 'ia', col: 1, row: 7, raiz: '.model' },
] as const) {
  test(`a tela da era ${tela.era} cabe no celular: 44 px e sem rolagem lateral`, async ({
    page,
  }) => {
    await openStationOf(page, tela.era, tela.col, tela.row);
    await page.getByRole('button', { name: 'O que é isto?' }).click();
    await expect(page.locator('.help__panel')).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow, tela.era + ' rola de lado').toBe(false);

    const buttons = page.locator(tela.raiz + ' button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const box = await buttons.nth(i).boundingBox();
      if (!box) continue;
      expect(box.width, tela.era + ': botao ' + i + ' estreito').toBeGreaterThanOrEqual(43.5);
      expect(box.height, tela.era + ': botao ' + i + ' baixo').toBeGreaterThanOrEqual(43.5);
    }
  });
}

/* ------------------------------------------------------------------ *
 * Modo desenvolvedor.
 *
 * E atalho de teste, nao progresso: ele destranca as telas e nao mexe no save.
 * Estes testes cobram as duas metades disso -- destrancar de verdade, e nao
 * inventar progresso que o jogador nao fez.
 * ------------------------------------------------------------------ */

/** Liga o modo desenvolvedor pelo menu de ajustes e volta ao menu. */
async function enableDevMode(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Ajustes' }).click();
  const toggle = page.getByRole('button', { name: 'Modo desenvolvedor' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Voltar' }).click();
}

test('o modo desenvolvedor abre as seis zonas e o chefao', async ({ page }) => {
  await page.goto('/');

  // Antes: so a primeira zona, e nenhum chefao.
  await page.getByRole('button', { name: 'Zonas' }).click();
  await expect(page.getByRole('button', { name: /Inteligência Artificial/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(page.getByRole('button', { name: /BUG Day 0/ })).toBeHidden();

  await enableDevMode(page);

  // Depois: todas as zonas tocaveis, e o BUG Day 0 no menu.
  await expect(page.getByRole('button', { name: 'Enfrentar o BUG Day 0' })).toBeVisible();
  await page.getByRole('button', { name: 'Zonas' }).click();
  for (const zona of [
    'Mecânica',
    'Válvulas e Lógica',
    'Transistor e Linguagens',
    'Redes',
    'Web, Nuvem e Segurança',
    'Inteligência Artificial',
  ]) {
    await expect(page.getByRole('button', { name: new RegExp(zona) })).toBeEnabled();
  }
});

test('no modo desenvolvedor a zona abre direto e a porta da prova nao cobra missao', async ({
  page,
}) => {
  await page.goto('/');
  await enableDevMode(page);

  // Era 6 sem ter jogado nenhuma das anteriores.
  await page.getByRole('button', { name: 'Zonas' }).click();
  await page.getByRole('button', { name: /Inteligência Artificial/ }).click();
  await expect(page.locator('.world__canvas')).toBeVisible();
  const pular = page.getByRole('button', { name: 'Pular tutorial' });
  if (await pular.isVisible()) await pular.click();

  // O terminal da era abre o minijogo dela.
  await goToStation(page, 1, 7);
  await page.getByRole('button', { name: 'Usar o terminal' }).click();
  await expect(page.getByRole('heading', { name: 'Treinar o Detector' })).toBeVisible();
  await page.getByRole('button', { name: 'Sair da missão' }).click();

  // E a porta leva a prova mesmo com as duas missoes em aberto.
  await tapCell(page, 7, 2);
  await expect.poll(async () => bitCell(page), { timeout: 12000 }).toBe('7,2');
  await page.getByRole('button', { name: 'Fazer a prova da era' }).click();
  await expect(page.getByRole('region', { name: 'Prova da era' })).toBeVisible();
});

test('o modo desenvolvedor da os seis poderes no chefao, sem mexer no save', async ({ page }) => {
  await page.goto('/');
  await enableDevMode(page);
  await page.getByRole('button', { name: 'Enfrentar o BUG Day 0' }).click();

  // Os seis poderes respondem, num save que nao tem poder nenhum.
  await expect(page.locator('.boss__power')).toHaveCount(6);
  await expect(page.locator('.boss__items button')).toHaveCount(0);

  // O progresso continua zerado: o modo abre telas, nao concede progresso.
  const salvo = await page.evaluate(() => localStorage.getItem('davalvulaaia:save:v1'));
  const estado = JSON.parse(salvo ?? '{}').state as {
    clearedEras: string[];
    player: { powers: Record<string, number>; missions: Record<string, unknown> };
    settings: { devMode: boolean };
  };
  expect(estado.clearedEras).toEqual([]);
  expect(Object.values(estado.player.powers)).toEqual([0, 0, 0, 0, 0, 0]);
  expect(Object.keys(estado.player.missions)).toEqual([]);
  expect(estado.settings.devMode).toBe(true);
});

/* ------------------------------------------------------------------ *
 * Acabamento: fragmentos, objetivos da zona, resultado e som.
 * ------------------------------------------------------------------ */

test('o Bit para ao lado do terminal, nao em cima dele', async ({ page }) => {
  await enterFirstZone(page);
  await goToStation(page, 3, 7);
  // Ao lado quer dizer a uma celula de distancia, na horizontal ou na vertical.
  const [col, row] = (await bitCell(page)).split(',').map(Number) as [number, number];
  expect(Math.abs(col - 3) + Math.abs(row - 7)).toBe(1);
});

test('recolher um fragmento mostra a curiosidade, rende conhecimento e fica salvo', async ({
  page,
}) => {
  await enterFirstZone(page);
  const objetivos = page.getByLabel('Objetivos da zona');
  await expect(objetivos.getByLabel('Fragmentos: 0 de 3')).toBeVisible();

  // Um dos tres fragmentos da primeira zona (os lugares saem da seed da zona).
  await tapCell(page, 8, 12);
  await expect.poll(async () => bitCell(page), { timeout: 10000 }).toBe('8,12');

  await expect(page.getByText('Fragmento de memória recuperado')).toBeVisible();
  await expect(page.locator('.fragmentToast__text')).not.toBeEmpty();
  await expect(objetivos.getByLabel('Fragmentos: 1 de 3')).toBeVisible();

  const salvo = await page.evaluate(() => localStorage.getItem('davalvulaaia:save:v1'));
  const estado = JSON.parse(salvo ?? '{}').state as {
    fragments: string[];
    player: { xp: number };
  };
  expect(estado.fragments).toHaveLength(1);
  expect(estado.fragments[0]).toMatch(/^world-mecanica:\d$/);
  expect(estado.player.xp).toBeGreaterThan(0);

  // Passar de novo pela mesma celula nao rende outra vez.
  await tapCell(page, 8, 13);
  await expect.poll(async () => bitCell(page), { timeout: 10000 }).toBe('8,13');
  await tapCell(page, 8, 12);
  await expect.poll(async () => bitCell(page), { timeout: 10000 }).toBe('8,12');
  await expect(objetivos.getByLabel('Fragmentos: 1 de 3')).toBeVisible();
});

test('os objetivos da zona acompanham as missoes e a prova', async ({ page }) => {
  await enterFirstZone(page);
  const objetivos = page.getByLabel('Objetivos da zona');
  await expect(objetivos.getByLabel('Missão A: 0 estrelas')).toBeVisible();
  await expect(objetivos.getByLabel('Prova: trancada')).toBeVisible();

  await goToStation(page, 3, 7);
  await page.getByRole('button', { name: 'Usar o terminal' }).click();
  await solveLoomByHand(page);
  await page.getByRole('button', { name: 'Voltar para a zona' }).click();

  await expect(
    page.getByLabel('Objetivos da zona').getByLabel(/Missão A: [123] estrelas/),
  ).toBeVisible();
});

test('o resultado da missao diz o que ela rendeu', async ({ page }) => {
  await enterFirstZone(page);
  await goToStation(page, 3, 7);
  await page.getByRole('button', { name: 'Usar o terminal' }).click();
  await solveLoomByHand(page);

  const resultado = page.getByRole('region', { name: 'Resultado da missão' });
  await expect(resultado.getByText(/\+\d+ de conhecimento/)).toBeVisible();
  await expect(resultado.getByText('Eficiência', { exact: true })).toBeVisible();
  await expect(resultado.getByText('Recorde', { exact: true })).toBeVisible();
});

test('o som comeca desligado e liga pelo menu, ficando salvo', async ({ page }) => {
  await page.goto('/');
  const botao = page.getByRole('button', { name: 'Ligar o som' });
  await expect(botao).toHaveAttribute('aria-pressed', 'false');
  await botao.click();
  await expect(page.getByRole('button', { name: 'Desligar o som' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  const salvo = await page.evaluate(() => localStorage.getItem('davalvulaaia:save:v1'));
  expect((JSON.parse(salvo ?? '{}').state as { settings: { muted: boolean } }).settings.muted).toBe(
    false,
  );

  // O mesmo ajuste aparece na tela de ajustes.
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await expect(page.getByRole('button', { name: 'Som', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('com "Reduzir animações" o mapa continua jogavel e a fala aparece inteira', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.getByRole('button', { name: 'Reduzir animações' }).click();
  await page.getByRole('button', { name: 'Voltar' }).click();
  await page.getByRole('button', { name: 'Novo jogo' }).click();
  await expect(page.locator('.world__canvas')).toBeVisible();
  const pular = page.getByRole('button', { name: 'Pular tutorial' });
  if (await pular.isVisible()) await pular.click();

  await goToNpc(page, 8, 8);
  // Sem animacao nao ha texto "por digitar": nada fica escondido na fala.
  await expect(page.locator('.dialogue__rest')).toBeEmpty();
});

test('a musica acompanha a tela e obedece aos dois ajustes', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (erro) => erros.push(erro.message));

  await page.goto('/');
  const app = page.locator('.app');
  // Som desligado por padrao: nenhuma faixa.
  await expect(app).toHaveAttribute('data-music', 'off');

  await page.getByRole('button', { name: 'Ligar o som' }).click();
  await expect(app).toHaveAttribute('data-music', 'menu');

  // Na zona toca a faixa da era.
  await page.getByRole('button', { name: 'Novo jogo' }).click();
  await expect(page.locator('.world__canvas')).toBeVisible();
  await expect(app).toHaveAttribute('data-music', 'mecanica');

  // O ajuste "Música de fundo" desliga so a musica; os efeitos continuam.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Ajustes' }).click();
  const musica = page.getByRole('button', { name: 'Música de fundo' });
  await expect(musica).toHaveAttribute('aria-pressed', 'true');
  await musica.click();
  await expect(musica).toHaveAttribute('aria-pressed', 'false');
  await expect(app).toHaveAttribute('data-music', 'off');
  await expect(page.getByRole('button', { name: 'Som', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // O sequenciador rodou esse tempo todo sem derrubar a pagina.
  expect(erros).toEqual([]);
});
