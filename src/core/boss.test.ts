import { describe, expect, it } from 'vitest';
import {
  ATTACKS,
  answerTo,
  armAuto,
  armBonus,
  armShield,
  attackById,
  attackFor,
  autoEvaluation,
  canLaunchPatch,
  endTurn,
  eraOfAttack,
  eraToPlay,
  initialBoss,
  neutralizes,
  patchEra,
  patchStep,
  spendAuto,
  startPatch,
  strike,
  strikeDamage,
  turnDone,
  turnsTaken,
} from './boss';
import type { BossState } from './boss';
import { BOSS, RPG } from './constants';
import { ERAS, POWER_IDS, POWER_OF_ERA } from './powers';
import { initialState, takeDamage } from './rpg';
import { bossScore } from './scoring';

const perfeito = { ok: true, efficiency: 1 };
const fraco = { ok: true, efficiency: 0.2 };
const errado = { ok: false, efficiency: 0 };

/** Jogador com os seis poderes no nivel maximo, que e quem chega no chefao. */
function veterano() {
  const player = initialState();
  return {
    ...player,
    powers: Object.fromEntries(POWER_IDS.map((id) => [id, 3])) as typeof player.powers,
  };
}

describe('BUG Day 0: os ataques', () => {
  it('ha um ataque por era, cada um com o poder que o neutraliza', () => {
    expect(ATTACKS).toHaveLength(ERAS.length);
    const poderes = ATTACKS.map((a) => a.neutralizedBy).sort();
    expect(poderes).toEqual([...POWER_IDS].sort());
  });

  it('todo ataque aponta para a era do poder que o neutraliza', () => {
    for (const attack of ATTACKS) {
      expect(POWER_OF_ERA[eraOfAttack(attack)]).toBe(attack.neutralizedBy);
    }
  });

  it('acha o ataque pelo id, e reclama de id inventado', () => {
    expect(attackById('clonagem').neutralizedBy).toBe('repetir');
    expect(() => attackById('nao-existe' as never)).toThrow();
  });

  it('o ataque do turno e deterministico: a mesma seed, a mesma luta', () => {
    expect(attackFor('luta', 1)).toEqual(attackFor('luta', 1));
    const seis = Array.from({ length: 40 }, (_, turn) => attackFor('luta', turn + 1).id);
    // Com 40 turnos, mais de um ataque diferente tem de aparecer.
    expect(new Set(seis).size).toBeGreaterThan(1);
  });
});

describe('BUG Day 0: comeco da luta', () => {
  const state = initialBoss('luta', veterano());

  it('o chefao comeca com a vida cheia e um ataque anunciado', () => {
    expect(state.hp).toBe(BOSS.HP);
    expect(state.turn).toBe(1);
    expect(ATTACKS.map((a) => a.id)).toContain(state.announced.id);
  });

  it('as acoes do turno vem do clock da maquina', () => {
    expect(state.actionsLeft).toBe(veterano().clock);
    expect(state.clock).toBe(RPG.CLOCK_BASE);
  });

  it('a tela sabe qual poder responde e qual micro-desafio jogar', () => {
    expect(answerTo(state)).toBe(state.announced.neutralizedBy);
    expect(POWER_OF_ERA[eraToPlay(state)]).toBe(answerTo(state));
  });
});

describe('BUG Day 0: neutralizar o ataque', () => {
  const state = initialBoss('luta', veterano());
  const certo = answerTo(state);
  const outro = POWER_IDS.find((p) => p !== certo)!;

  it('o poder certo bem jogado neutraliza', () => {
    expect(neutralizes(state, certo, perfeito)).toBe(true);
  });

  it('o poder certo mal jogado nao neutraliza', () => {
    expect(neutralizes(state, certo, { ok: true, efficiency: 0.1 })).toBe(false);
    expect(neutralizes(state, certo, errado)).toBe(false);
  });

  it('o poder errado nunca neutraliza, nem jogado perfeitamente', () => {
    expect(neutralizes(state, outro, perfeito)).toBe(false);
  });

  it('o limite de eficiencia para neutralizar e o da constante', () => {
    const naLinha = { ok: true, efficiency: BOSS.BLOCK_MIN_EFFICIENCY };
    expect(neutralizes(state, certo, naLinha)).toBe(true);
  });
});

describe('BUG Day 0: dano ao chefao', () => {
  it('cresce com o nivel do poder e com a eficiencia', () => {
    expect(strikeDamage(1, 1)).toBe(BOSS.BASE_DAMAGE);
    expect(strikeDamage(3, 1)).toBeGreaterThan(strikeDamage(1, 1));
    expect(strikeDamage(3, 0.5)).toBeLessThan(strikeDamage(3, 1));
  });

  it('poder nao adquirido nao machuca', () => {
    expect(strikeDamage(0, 1)).toBe(0);
  });

  it('o bonus de item aumenta o golpe', () => {
    expect(strikeDamage(1, 1, 0.5)).toBe(Math.round(BOSS.BASE_DAMAGE * 1.5));
  });

  it('a acao gasta o turno, tira vida do chefao e conta a carga de patch', () => {
    const state = initialBoss('luta', veterano());
    const resultado = strike(state, answerTo(state), 3, perfeito);
    expect(resultado.blocked).toBe(true);
    expect(resultado.damage).toBeGreaterThan(0);
    expect(resultado.state.hp).toBe(BOSS.HP - resultado.damage);
    expect(resultado.state.actionsLeft).toBe(state.actionsLeft - 1);
    expect(resultado.state.patch).toBe(1);
  });

  it('errar o micro-desafio gasta a acao e nao machuca ninguem', () => {
    const state = initialBoss('luta', veterano());
    const resultado = strike(state, answerTo(state), 3, errado);
    expect(resultado.damage).toBe(0);
    expect(resultado.state.hp).toBe(BOSS.HP);
    expect(resultado.state.actionsLeft).toBe(state.actionsLeft - 1);
  });

  it('zerar a vida do chefao ganha a luta', () => {
    const quaseMorto: BossState = { ...initialBoss('luta', veterano()), hp: 1 };
    const resultado = strike(quaseMorto, answerTo(quaseMorto), 3, perfeito);
    expect(resultado.state.hp).toBe(0);
    expect(resultado.state.over).toBe('win');
  });

  it('sem acao sobrando, a acao nao acontece', () => {
    const semAcao: BossState = { ...initialBoss('luta', veterano()), actionsLeft: 0 };
    expect(strike(semAcao, answerTo(semAcao), 3, perfeito).state).toEqual(semAcao);
    expect(turnDone(semAcao)).toBe(true);
  });
});

describe('BUG Day 0: fim do turno', () => {
  const player = veterano();

  it('ataque neutralizado nao tira vida da maquina', () => {
    const state = initialBoss('luta', player);
    const depois = strike(state, answerTo(state), 3, perfeito).state;
    const fim = endTurn(depois, player);
    expect(fim.damage).toBe(0);
    expect(fim.player.hp).toBe(player.hp);
  });

  it('ataque nao neutralizado tira vida', () => {
    const state = initialBoss('luta', player);
    const fim = endTurn(state, player);
    expect(fim.damage).toBe(state.announced.damage);
    expect(fim.player.hp).toBe(player.hp - state.announced.damage);
  });

  it('o escudo de item bloqueia o ataque sem gastar acao', () => {
    const state = armShield(initialBoss('luta', player));
    const fim = endTurn(state, player);
    expect(fim.damage).toBe(0);
    // E vale por um turno so.
    expect(fim.state.shield).toBe(false);
  });

  it('o turno seguinte anuncia o proximo ataque e devolve as acoes', () => {
    const state = initialBoss('luta', player);
    const gasto = strike(state, answerTo(state), 3, fraco).state;
    const fim = endTurn(gasto, player);
    expect(fim.state.turn).toBe(2);
    expect(fim.state.announced).toEqual(attackFor('luta', 2));
    expect(fim.state.actionsLeft).toBe(state.clock);
    expect(fim.state.blocked).toBe(false);
  });

  it('a luta e perdida quando o ataque reiniciaria a maquina', () => {
    const quaseMorto = takeDamage(player, player.hp - 1);
    const state = initialBoss('luta', quaseMorto);
    const fim = endTurn(state, quaseMorto);
    expect(fim.state.over).toBe('lose');
    // O reinicio em si e a regra do RPG: a maquina volta com metade da vida.
    expect(fim.player.hp).toBe(Math.round(quaseMorto.hpMax * RPG.REBOOT_HP_RATIO));
  });

  it('depois do fim, nada mais acontece', () => {
    const ganho: BossState = { ...initialBoss('luta', player), over: 'win' };
    expect(endTurn(ganho, player)).toEqual({ state: ganho, player, damage: 0 });
    expect(strike(ganho, answerTo(ganho), 3, perfeito).damage).toBe(0);
  });
});

describe('BUG Day 0: Patch Day 0', () => {
  const player = veterano();

  /** Acumula as cargas de patch neutralizando ataque atras de ataque. */
  function comCargas(): BossState {
    let state = initialBoss('patch', player);
    while (state.patch < BOSS.PATCH_REQUIRED) {
      state = strike(state, answerTo(state), 3, perfeito).state;
      if (turnDone(state)) state = endTurn(state, player).state;
    }
    return state;
  }

  it('o patch so pode ser lancado com as cargas cheias', () => {
    expect(canLaunchPatch(initialBoss('patch', player))).toBe(false);
    expect(canLaunchPatch(comCargas())).toBe(true);
  });

  it('a sequencia tem o numero de micro-desafios da constante', () => {
    let state = startPatch(comCargas());
    expect(state.patchRun).toBe(0);
    for (let step = 1; step < BOSS.PATCH_CHALLENGES; step += 1) {
      const resultado = patchStep(state, perfeito);
      expect(resultado.done).toBe(false);
      state = resultado.state;
    }
    const ultimo = patchStep(state, perfeito);
    expect(ultimo.done).toBe(true);
    expect(ultimo.damage).toBe(BOSS.PATCH_DAMAGE);
    expect(ultimo.state.patch).toBe(0);
  });

  it('errar no meio interrompe e devolve as cargas a zero', () => {
    const state = startPatch(comCargas());
    const resultado = patchStep(state, errado);
    expect(resultado.done).toBe(true);
    expect(resultado.damage).toBe(0);
    expect(resultado.state.patch).toBe(0);
    expect(resultado.state.patchRun).toBeNull();
  });

  it('o patch pode ganhar a luta', () => {
    const fraco: BossState = { ...startPatch(comCargas()), hp: 10 };
    let state = fraco;
    for (let step = 1; step < BOSS.PATCH_CHALLENGES; step += 1) {
      state = patchStep(state, perfeito).state;
    }
    expect(patchStep(state, perfeito).state.over).toBe('win');
  });

  it('cada passo do patch pede o micro-desafio de uma era que existe', () => {
    const state = startPatch(comCargas());
    for (let step = 0; step < BOSS.PATCH_CHALLENGES; step += 1) {
      expect(ERAS).toContain(patchEra(state, step));
    }
  });
});

describe('BUG Day 0: itens de combate', () => {
  const player = veterano();

  it('o dano extra vale para um golpe so', () => {
    const state = armBonus(initialBoss('itens', player), 0.5);
    expect(state.bonus).toBe(0.5);
    const depois = strike(state, answerTo(state), 1, perfeito);
    expect(depois.damage).toBe(Math.round(BOSS.BASE_DAMAGE * 1.5));
    expect(depois.state.bonus).toBe(0);
  });

  it('a resposta pronta sai com eficiencia 1 e vale uma vez', () => {
    const state = armAuto(initialBoss('itens', player));
    expect(state.auto).toBe(true);
    expect(autoEvaluation()).toEqual({ ok: true, efficiency: 1 });
    const gasto = spendAuto(state);
    expect(gasto.auto).toBe(false);
    const depois = strike(gasto, answerTo(gasto), 3, autoEvaluation());
    expect(depois.blocked).toBe(true);
  });

  it('jogar o micro-desafio na mao nao gasta a resposta pronta guardada', () => {
    const state = armAuto(initialBoss('itens', player));
    const depois = strike(state, answerTo(state), 3, perfeito);
    expect(depois.state.auto).toBe(true);
    expect(spendAuto(spendAuto(state)).auto).toBe(false);
  });

  it('item nenhum tem efeito depois do fim da luta', () => {
    const fim: BossState = { ...initialBoss('itens', player), over: 'lose' };
    expect(armShield(fim)).toEqual(fim);
    expect(armBonus(fim, 1)).toEqual(fim);
    expect(armAuto(fim)).toEqual(fim);
  });

  it('bonus invalido e ignorado', () => {
    const state = initialBoss('itens', player);
    expect(armBonus(state, 0)).toEqual(state);
    expect(armBonus(state, Number.NaN)).toEqual(state);
  });
});

describe('BUG Day 0: a luta e ganhavel', () => {
  it('um veterano respondendo sempre certo derruba o chefao', () => {
    const player = veterano();
    let state = initialBoss('zerar', player);
    let atual = player;
    let voltas = 0;

    while (!state.over && voltas < 100) {
      voltas += 1;
      if (canLaunchPatch(state)) {
        state = startPatch(state);
        while (state.patchRun !== null) state = patchStep(state, perfeito).state;
        continue;
      }
      state = strike(state, answerTo(state), 3, perfeito).state;
      if (turnDone(state) && !state.over) {
        const fim = endTurn(state, atual);
        state = fim.state;
        atual = fim.player;
      }
    }

    expect(state.over).toBe('win');
    expect(atual.hp).toBe(player.hp);
    expect(bossScore(atual.hp, turnsTaken(state))).toBeGreaterThan(0);
  });

  it('quem nao responde nada acaba perdendo', () => {
    const player = veterano();
    let state = initialBoss('perder', player);
    let atual = player;
    let voltas = 0;

    while (!state.over && voltas < 100) {
      voltas += 1;
      state = { ...state, actionsLeft: 0 };
      const fim = endTurn(state, atual);
      state = fim.state;
      atual = fim.player;
    }

    expect(state.over).toBe('lose');
  });
});
