import { describe, expect, it } from 'vitest';
import type { GadgetData } from './gadgets';
import type { RawStage, RunEvent, RunInput, RunState, StageDef } from './stage';
import {
  botInput,
  enemyPosition,
  initialRun,
  parseStage,
  referenceRun,
  stageFragmentId,
  stepRun,
  validateStage,
} from './stage';
import { DIFFICULTY, STAGE } from './constants';

/** Monta uma fase de teste com chao embaixo de tudo. */
function stage(
  map: string[],
  gadgets: GadgetData[] = [],
  programs?: number[][],
): { raw: RawStage; def: StageDef } {
  const raw: RawStage = {
    id: 'teste-A',
    era: 'mecanica',
    missionId: 'mecanica-A',
    map,
    gadgets,
    programs,
  };
  return { raw, def: parseStage(raw) };
}

/**
 * Corre a fase segurando para a frente (e o pulo, quando pula), como quem joga;
 * `input` pode soltar a direcao (`right: false`) ou trocar de lado.
 */
function run(
  def: StageDef,
  steps: number,
  input: (s: RunState) => RunInput = () => ({}),
  start: RunState = initialRun(def),
): { state: RunState; events: RunEvent[] } {
  let s = start;
  const events: RunEvent[] = [];
  for (let i = 0; i < steps && !s.done; i += 1) {
    const out = stepRun(def, s, { right: true, jumpHeld: true, ...input(s) });
    s = out.state;
    events.push(...out.events);
  }
  return { state: s, events };
}

const FLAT = [
  '..............................',
  '..............................',
  '..............................',
  '.S.C......................G...',
  '##############################',
];

describe('fase: leitura da planta', () => {
  it('le partida, terminal, checkpoint e tamanho', () => {
    const { raw, def } = stage(FLAT);
    expect(def.cols).toBe(30);
    expect(def.rows).toBe(5);
    expect(def.spawn).toEqual({ col: 1, row: 3 });
    expect(def.goal).toEqual({ col: 26, row: 3 });
    expect(def.checkpoints).toEqual([{ col: 3, row: 3 }]);
    expect(validateStage(def, raw)).toEqual([]);
  });

  it('acusa linha torta, terminal sem chao e portao sem dispositivo', () => {
    const { raw, def } = stage(['.S....D....G', '######.#####', '###']);
    const errors = validateStage(def, raw);
    expect(errors.some((e) => e.includes('linha 2'))).toBe(true);
    expect(errors.some((e) => e.includes('dispositivos'))).toBe(true);
    expect(errors.some((e) => e.includes('checkpoint'))).toBe(true);
  });

  it('id do fragmento junta fase e indice', () => {
    expect(stageFragmentId(stage(FLAT).def, 2)).toBe('teste-A:2');
  });
});

describe('fase: andar e pular (D81)', () => {
  it('sem segurar nada o Bit fica parado', () => {
    const { def } = stage(FLAT);
    let s = initialRun(def);
    for (let i = 0; i < 60; i += 1) s = stepRun(def, s, {}).state;
    const x = s.x;
    for (let i = 0; i < 60; i += 1) s = stepRun(def, s, {}).state;
    expect(s.x).toBe(x);
    expect(s.dir).toBe(0);
  });

  it('segurando para a frente o Bit chega ao terminal', () => {
    const { def } = stage(FLAT);
    const { state, events } = run(def, 2000);
    expect(state.done).toBe(true);
    expect(state.hearts).toBe(DIFFICULTY.normal.HEARTS);
    expect(events.some((e) => e.type === 'goal')).toBe(true);
    expect(events.some((e) => e.type === 'checkpoint')).toBe(true);
  });

  it('e deterministica: a mesma entrada da o mesmo estado', () => {
    const { def } = stage(FLAT);
    const input = (s: RunState): RunInput => ({
      jump: s.tick % 37 === 0,
      shoot: s.tick % 11 === 0,
    });
    expect(run(def, 300, input).state).toEqual(run(def, 300, input).state);
  });

  it('o pulo so sai do chao (sem Decidir nao ha pulo duplo)', () => {
    const { def } = stage(FLAT);
    const grounded = run(def, 30).state;
    const first = stepRun(def, grounded, { jump: true });
    expect(first.events).toContainEqual({ type: 'jump' });
    const air = run(def, 10, () => ({}), first.state).state;
    expect(stepRun(def, air, { jump: true }).events).not.toContainEqual({ type: 'jump' });
  });

  it('cair no buraco tira um coracao e volta ao checkpoint', () => {
    const { def } = stage([
      '..................',
      '..................',
      '.S.C..............',
      '#######...#######G',
      '#######...########',
    ]);
    let s = initialRun(def);
    let fell = false;
    while (!fell && s.tick < 400) {
      const out = stepRun(def, s, { right: true });
      s = out.state;
      fell = out.events.some((e) => e.type === 'fall');
    }
    expect(fell).toBe(true);
    expect(s.hearts).toBe(DIFFICULTY.normal.HEARTS - 1);
    expect(s.x).toBeLessThan(def.checkpoints[0]!.col * STAGE.TILE + STAGE.TILE);
  });

  it('sem coracao, a fase recomeca do zero', () => {
    const { def } = stage(['.S.C..............', '#######...########']);
    const { state, events } = run(def, 3000);
    expect(events).toContainEqual({ type: 'restart' });
    expect(state.restarts).toBeGreaterThan(0);
  });

  it('o robo de referencia pula buraco, parede e espinho', () => {
    const { raw, def } = stage([
      '...........................................',
      '...........................................',
      '...........................................',
      '........................=..................',
      '.S.C..............F.....=.......^^.......G.',
      '#######...######################=#####.####',
      '#######...#############################.###',
    ]);
    expect(validateStage(def, raw)).toEqual([]);
    const report = referenceRun(def);
    expect(report).toMatchObject({ done: true, restarts: 0, hits: 0 });
  });
});

describe('fase: inimigos', () => {
  it('o robo atira no inimigo que anda, no que voa e na torre', () => {
    const { def } = stage([
      '..............................................',
      '..............................................',
      '..............................................',
      '..................f...........................',
      '.S.C.......w....................t...........G.',
      '##############################################',
    ]);
    const report = referenceRun(def);
    expect(report.done).toBe(true);
    expect(report.restarts).toBe(0);
  });

  it('encostar num inimigo tira coracao, e ha tempo de invulnerabilidade', () => {
    const { def } = stage(['.S.C......w..........G', '######################']);
    const { state, events } = run(def, 400);
    expect(events.filter((e) => e.type === 'hit').length).toBe(1);
    expect(state.hearts).toBe(DIFFICULTY.normal.HEARTS - 1);
  });
});

const PATTERN: GadgetData = {
  kind: 'pattern',
  unit: ['a', 'b'],
  shown: 4,
  hidden: 2,
  colors: ['a', 'b', 'c'],
};

describe('fase: portoes de conceito', () => {
  const gated = (gadget: GadgetData): ReturnType<typeof stage> =>
    stage(
      [
        '..........D.........',
        '..........D.........',
        '.S.C......D.......G.',
        '####################',
      ],
      [gadget],
    );

  it('o Bit para sozinho diante do portao fechado', () => {
    const { def } = gated(PATTERN);
    const { state, events } = run(def, 600);
    expect(state.done).toBe(false);
    expect(state.atGate).toBe(0);
    expect(events).toContainEqual({ type: 'gate', gate: 0 });
  });

  it('nao da para pular o portao', () => {
    const { def } = gated(PATTERN);
    const { state } = run(def, 600, (s) => ({ jump: s.tick % 20 === 0 }));
    expect(state.done).toBe(false);
  });

  it('padrao: a cor errada conta erro, as certas abrem o portao', () => {
    const { def } = gated(PATTERN);
    let s = run(def, 600).state;
    s = stepRun(def, s, { target: 2 }).state; // c: errado
    expect(s.gates[0]!.mistakes).toBe(1);
    s = stepRun(def, s, { target: 0 }).state; // a
    const out = stepRun(def, s, { target: 1 }); // b
    expect(out.events).toContainEqual({ type: 'gateOpen', gate: 0, perfect: false });
    expect(run(def, 600, () => ({}), out.state).state.done).toBe(true);
  });

  const kinds: GadgetData[] = [
    PATTERN,
    { kind: 'circuit', neg: [false, true], gates: ['AND'] },
    { kind: 'bits', width: 4, value: 11 },
    {
      kind: 'route',
      first: [5, 1],
      links: [
        [
          [1, 9],
          [9, 9],
        ],
      ],
      last: [1, 1],
    },
    {
      kind: 'cipher',
      word: 'CHAVE',
      shift: 3,
      choices: [
        ['C', 'D', 'E'],
        ['G', 'H', 'I'],
        ['A', 'B', 'Z'],
        ['V', 'W', 'X'],
        ['E', 'F', 'D'],
      ],
    },
  ];

  for (const gadget of kinds) {
    it(`o robo abre o portao "${gadget.kind}" sem erro`, () => {
      const { raw, def } = gated(gadget);
      expect(validateStage(def, raw)).toEqual([]);
      const report = referenceRun(def);
      expect(report).toMatchObject({ done: true, restarts: 0, perfectGates: 1 });
    });
  }
});

describe('fase: detector (Era 6)', () => {
  const MAP = [
    '...................................',
    '...................................',
    '.S.C...........p.....p.....p..D..G.',
    '###################################',
  ];
  const RULE: GadgetData = { kind: 'classify', attr: 0, value: 1 };
  // virus, seguro, virus
  const PROGRAMS = [
    [1, 0],
    [2, 0],
    [1, 2],
  ];

  it('o robo derruba os virus, deixa o seguro passar, e o portao abre', () => {
    const { raw, def } = stage(MAP, [RULE], PROGRAMS);
    expect(validateStage(def, raw)).toEqual([]);
    const report = referenceRun(def);
    expect(report).toMatchObject({ done: true, restarts: 0, hits: 0 });
  });

  it('tiro no programa seguro so avisa: nao derruba nem tira coracao (D87)', () => {
    const { def } = stage(
      MAP,
      [RULE],
      [
        [2, 0],
        [2, 0],
        [2, 0],
      ],
    );
    const { state, events } = run(def, 900, (s) => ({ shoot: s.cooldown <= 0 }));
    expect(events.some((e) => e.type === 'wrongTarget')).toBe(true);
    expect(events.some((e) => e.type === 'hit')).toBe(false);
    expect(state.enemies.every((e) => e.alive)).toBe(true);
  });

  it('a rajada que passa do virus e pega o seguro de tras nao pune quem mirou certo', () => {
    // virus na frente, seguro logo atras: o caso da Era 6 com Repetir.
    const { def } = stage(
      [
        '...................................',
        '.S.C...........p...p...........D..G.',
        '###################################',
      ],
      [RULE],
      [
        [1, 0],
        [2, 0],
      ],
    );
    const { state, events } = run(
      def,
      600,
      (s) => ({ shoot: s.cooldown <= 0 && s.x < 9 * 16 }),
      initialRun(def, ['repetir']),
    );
    expect(events.some((e) => e.type === 'kill')).toBe(true);
    expect(events.some((e) => e.type === 'hit' || e.type === 'restart')).toBe(false);
    expect(state.gates[0]!.solved).toBe(true);
  });

  it('virus que fica para tras da meia-volta e vem atras; nada recomeca (D87)', () => {
    const { def } = stage(
      MAP,
      [RULE],
      [
        [1, 0],
        [1, 0],
        [1, 0],
      ],
    );
    // Pula por cima de tudo sem atirar, ate passar do primeiro virus.
    let s = initialRun(def);
    const events: RunEvent[] = [];
    const clearlyBehind = (st: RunState) =>
      st.enemies.find((e) => e.alive && e.x + STAGE.ENEMY_SIZE < st.x - 4);
    for (let i = 0; i < 600 && !clearlyBehind(s); i += 1) {
      const out = stepRun(def, s, { right: true, jump: s.grounded, jumpHeld: true });
      s = out.state;
      events.push(...out.events);
    }
    expect(clearlyBehind(s)).toBeDefined();
    s = run(def, 2, () => ({ right: false }), s).state;
    expect(clearlyBehind(s)!.vx).toBeGreaterThan(0);
    expect(events.some((e) => e.type === 'restart' || e.type === 'fall')).toBe(false);
    expect(s.gates[0]!.solved).toBe(false);
  });
});

describe('fase: habilidades', () => {
  it('Repetir solta uma rajada', () => {
    const { def } = stage(FLAT);
    const s = run(def, 30, () => ({}), initialRun(def, ['repetir'])).state;
    expect(stepRun(def, s, { shoot: true }).state.shots.length).toBe(3);
  });

  it('Decidir da o pulo duplo', () => {
    const { def } = stage(FLAT);
    let s = run(def, 30, () => ({}), initialRun(def, ['decidir'])).state;
    s = stepRun(def, s, { jump: true }).state;
    s = run(def, 10, () => ({}), s).state;
    expect(stepRun(def, s, { jump: true }).events).toContainEqual({ type: 'jump' });
  });

  it('Proteger segura o primeiro golpe', () => {
    const { def } = stage(['.S.C......w..........G', '######################']);
    const { state, events } = run(def, 400, () => ({}), initialRun(def, ['proteger']));
    expect(events).toContainEqual({ type: 'shield' });
    expect(state.hearts).toBe(DIFFICULTY.normal.HEARTS);
  });

  it('o robo tambem joga a fase com todas as habilidades', () => {
    const { def } = stage([
      '..............................................',
      '..............................................',
      '..................f...........................',
      '.S.C.......w..........^.........t...........G.',
      '##############################################',
    ]);
    const all = ['repetir', 'decidir', 'codificar', 'conectar', 'proteger', 'aprender'] as const;
    expect(referenceRun(def, all).done).toBe(true);
  });

  it('botInput nao toca em painel fora de portao', () => {
    const { def } = stage(FLAT);
    expect(botInput(def, initialRun(def)).target).toBeUndefined();
  });
});

describe('fase: direcao segurada, como em Mega Man e Mario (D81)', () => {
  it('a fase comeca parada, olhando para a frente', () => {
    const { def } = stage(FLAT);
    expect(initialRun(def)).toMatchObject({ dir: 0, facing: 1 });
  });

  it('anda enquanto segura, para quando solta, e volta segurando para tras', () => {
    const { def } = stage(FLAT);
    let s = run(def, 60).state;
    s = run(def, 30, () => ({ right: false }), s).state;
    const parado = s.x;
    expect(s.dir).toBe(0);
    s = run(def, 20, () => ({ right: false, left: true }), s).state;
    expect(s.x).toBeLessThan(parado);
    expect(s.facing).toBe(-1);
  });

  it('segurar os dois lados ao mesmo tempo nao anda', () => {
    const { def } = stage(FLAT);
    const s = run(def, 60).state;
    const depois = run(def, 30, () => ({ left: true }), s).state;
    expect(depois.x).toBe(s.x);
  });

  it('soltar Pular cedo da um pulo mais baixo', () => {
    const { def } = stage(FLAT);
    const chao = run(def, 30).state;
    const topo = (held: boolean): number => {
      let s = stepRun(def, chao, { jump: true, jumpHeld: true }).state;
      let min = s.y;
      for (let i = 0; i < 60; i += 1) {
        s = stepRun(def, s, { jumpHeld: held && i < 3 ? true : held }).state;
        min = Math.min(min, s.y);
      }
      return chao.y - min;
    };
    expect(topo(false)).toBeLessThan(topo(true));
  });

  it('o tiro sai para o lado em que o Bit olha', () => {
    const { def } = stage(FLAT);
    let s = run(def, 30).state;
    s = stepRun(def, s, { left: true }).state;
    expect(stepRun(def, s, { shoot: true }).state.shots[0]!.vx).toBeLessThan(0);
  });

  it('nao passa da borda esquerda da fase', () => {
    const { def } = stage(FLAT);
    const s = run(def, 300, () => ({ right: false, left: true })).state;
    expect(s.x).toBeGreaterThanOrEqual(0);
  });
});

describe('fase: inimigos novos', () => {
  it('o blindado aguenta um tiro e cai no segundo', () => {
    const { def } = stage(['.S.C.......a.........G', '######################']);
    let s = run(def, 20).state;
    let kills = 0;
    let hits = 0;
    for (let i = 0; i < 200; i += 1) {
      const out = stepRun(def, s, { shoot: s.cooldown <= 0 && !s.shots.length });
      s = out.state;
      kills += out.events.filter((e) => e.type === 'kill').length;
      if (s.enemies[0]!.hp === 1) hits += 1;
    }
    expect(hits).toBeGreaterThan(0);
    expect(kills).toBe(1);
  });

  it('o saltador sobe e desce', () => {
    const { def } = stage(['.S.C.......h.........G', '######################']);
    const ys = new Set<number>();
    let s = initialRun(def);
    for (let i = 0; i < 60; i += 1) {
      s = stepRun(def, s, {}).state;
      ys.add(Math.round(enemyPosition(def, s, 0).y));
    }
    expect(ys.size).toBeGreaterThan(3);
  });

  it('o pingo so cai quando o Bit chega perto, e para no chao', () => {
    const { def } = stage([
      '......................',
      '...........v..........',
      '......................',
      '......................',
      '.S.C.................G',
      '######################',
    ]);
    const altura = initialRun(def).enemies[0]!.y;
    let s = run(def, 5, () => ({ right: false })).state;
    expect(s.enemies[0]!.y).toBe(altura);
    s = run(def, 200, () => ({}), s).state;
    expect(s.enemies[0]!.y).toBeGreaterThan(altura);
  });

  it('o robo atravessa uma fase com os sete tipos de inimigo', () => {
    const { def } = stage([
      '.........................................................................',
      '..........................................v..............................',
      '.........................................................................',
      '.........................................................................',
      '...................f.....................................................',
      '.S.C.......w.................t.............a...........h...............G.',
      '#########################################################################',
    ]);
    expect(referenceRun(def)).toMatchObject({ done: true, restarts: 0 });
  });
});

describe('fase: municao, terreno e dificuldade (D82)', () => {
  it('cada tiro gasta uma carga, e sem carga nao sai tiro', () => {
    const { def } = stage(FLAT);
    let s = { ...run(def, 30).state, ammo: 1 };
    s = stepRun(def, s, { shoot: true }).state;
    expect(s.ammo).toBe(0);
    s = run(def, STAGE.SHOT_COOLDOWN + 1, () => ({ right: false }), s).state;
    const out = stepRun(def, s, { shoot: true });
    expect(out.events).toContainEqual({ type: 'empty' });
    expect(out.events).not.toContainEqual({ type: 'shoot' });
  });

  it('a bateria recarrega pela dificuldade, sem passar do teto', () => {
    const { def } = stage(['.S.C...m..........G', '###################']);
    const { state, events } = run(def, 200, () => ({}), {
      ...initialRun(def, [], 'dificil'),
      ammo: 0,
    });
    expect(events).toContainEqual({ type: 'ammo', index: 0 });
    expect(state.ammo).toBe(DIFFICULTY.dificil.AMMO_PICKUP);
  });

  it('volta do checkpoint com o minimo de municao, para nunca travar', () => {
    const { def } = stage(['.S.C..............', '#######...########']);
    let s = { ...initialRun(def), ammo: 0 };
    let fell = false;
    while (!fell && s.tick < 400) {
      const out = stepRun(def, s, { right: true });
      s = out.state;
      fell = out.events.some((e) => e.type === 'fall');
    }
    expect(s.ammo).toBe(STAGE.AMMO_RESPAWN_MIN);
  });

  it('a dificuldade muda coracoes e municao do comeco', () => {
    const { def } = stage(FLAT);
    expect(initialRun(def, [], 'facil')).toMatchObject({
      hearts: DIFFICULTY.facil.HEARTS,
      ammo: DIFFICULTY.facil.AMMO,
    });
    expect(initialRun(def, [], 'dificil').hearts).toBe(DIFFICULTY.dificil.HEARTS);
    expect(initialRun(def).difficulty).toBe('normal');
  });

  it('o chao que cai racha ao ser pisado, cai, e depois volta', () => {
    const { def } = stage(['.S.C..........G', '#####xx########', '#####..########']);
    let s = initialRun(def);
    // Anda ate ficar em cima do chao rachado e para ali.
    while (s.x < 5 * STAGE.TILE + 2) s = stepRun(def, s, { right: true }).state;
    const idx = def.cols + 5;
    expect(s.crumble[idx]).toBeGreaterThan(0);
    let fell = false;
    for (let i = 0; i < STAGE.CRUMBLE_STEPS + 40 && !fell; i += 1) {
      const out = stepRun(def, s, {});
      s = out.state;
      fell = out.events.some((e) => e.type === 'fall');
    }
    expect(fell).toBe(true);
    s = run(def, STAGE.CRUMBLE_FALLEN_STEPS + 5, () => ({ right: false }), s).state;
    expect(s.crumble[idx]).toBeUndefined();
  });

  it('cair na mola lanca o Bit bem mais alto que o pulo', () => {
    const { def } = stage(['......', '......', '......', '......', '.S....', '##j###']);
    let s = initialRun(def);
    let launched = false;
    let min = s.y;
    for (let i = 0; i < 120; i += 1) {
      const out = stepRun(def, s, {
        right: s.x < 2 * STAGE.TILE + 3,
        jump: i === 0,
        jumpHeld: true,
      });
      s = out.state;
      launched = launched || out.events.some((e) => e.type === 'spring');
      min = Math.min(min, s.y);
    }
    expect(launched).toBe(true);
    const jumpPeak = STAGE.JUMP_SPEED ** 2 / (2 * STAGE.GRAVITY);
    expect(initialRun(def).y - min).toBeGreaterThan(jumpPeak);
  });

  it('pisao: cair em cima do inimigo derruba sem gastar tiro; no blindado machuca', () => {
    for (const [ch, stomps] of [
      ['w', true],
      ['a', false],
    ] as const) {
      const { def } = stage([
        '............',
        '............',
        '.S.C...' + ch + '....',
        '############',
      ]);
      const start = initialRun(def);
      const enemy = start.enemies[0]!;
      // O Bit caindo bem em cima do inimigo.
      let s = { ...start, x: enemy.x + 1, y: enemy.y - 24, vy: 2, grounded: false };
      const events: RunEvent[] = [];
      for (
        let i = 0;
        i < 40 && !events.some((e) => e.type === 'stomp' || e.type === 'hit');
        i += 1
      ) {
        const out = stepRun(def, s, {});
        s = out.state;
        events.push(...out.events);
      }
      expect({ ch, pisao: events.some((e) => e.type === 'stomp') }).toEqual({ ch, pisao: stomps });
      expect({ ch, machucou: events.some((e) => e.type === 'hit') }).toEqual({
        ch,
        machucou: !stomps,
      });
      expect(s.ammo).toBe(DIFFICULTY.normal.AMMO);
    }
  });
});
