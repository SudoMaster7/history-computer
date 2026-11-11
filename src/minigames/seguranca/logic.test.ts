import { describe, expect, it } from 'vitest';
import {
  entry,
  evaluate,
  generate,
  isWellFormed,
  openPath,
  reachable,
  reference,
  referenceCost,
  vault,
  vaultExposed,
} from './logic';
import type { VaultInstance } from './logic';
import { SCORING, VAULT } from '@/core/constants';
import { MISSIONS } from '@/data/missions';
import type { Difficulty } from '@/core/types';

const DIFFICULTIES: Difficulty[] = ['micro', 1, 2, 3];

/**
 * Rede escrita a mao. A entrada (0) abre em tres maquinas, mas as tres passam
 * pelo mesmo gargalo (3) antes do cofre (4):
 *
 *   0 -> 1 -> 3 -> 4
 *   0 -> 2 -> 3
 *
 * Cortar na entrada custa 2 firewalls; cortar o gargalo 3 -> 4 custa 1.
 */
const gargalo: VaultInstance = {
  nodes: 5,
  links: [
    { from: 0, to: 1 },
    { from: 0, to: 2 },
    { from: 1, to: 3 },
    { from: 2, to: 3 },
    { from: 3, to: 4 },
  ],
  maxFirewalls: 3,
};

/** Duas trilhas independentes: o corte minimo tem de ser 2. */
const duasTrilhas: VaultInstance = {
  nodes: 6,
  links: [
    { from: 0, to: 1 },
    { from: 1, to: 2 },
    { from: 2, to: 5 },
    { from: 0, to: 3 },
    { from: 3, to: 4 },
    { from: 4, to: 5 },
  ],
  maxFirewalls: 4,
};

describe('cofre criptografico: a rede', () => {
  it('a entrada e a primeira maquina e o cofre e a ultima', () => {
    expect(entry()).toBe(0);
    expect(vault(gargalo)).toBe(4);
  });

  it('sem firewall o invasor alcanca tudo', () => {
    expect([...reachable(gargalo, [])].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
    expect(vaultExposed(gargalo, [])).toBe(true);
  });

  it('o firewall no gargalo ja isola o cofre', () => {
    expect(vaultExposed(gargalo, [4])).toBe(false);
  });

  it('fechar so parte dos caminhos nao protege nada', () => {
    expect(vaultExposed(duasTrilhas, [0])).toBe(true);
    expect(vaultExposed(duasTrilhas, [0, 3])).toBe(false);
  });

  it('mostra um caminho ainda aberto, e nenhum quando esta fechado', () => {
    expect(openPath(gargalo, [])).toEqual([0, 1, 3, 4]);
    expect(openPath(gargalo, [4])).toBeNull();
  });
});

describe('cofre criptografico: forma da solucao', () => {
  it('aceita indices de ligacao que existem, sem repetir', () => {
    expect(isWellFormed(gargalo, [0, 1])).toBe(true);
    expect(isWellFormed(gargalo, [])).toBe(true);
  });

  it('recusa indice que nao existe e indice repetido', () => {
    expect(isWellFormed(gargalo, [9])).toBe(false);
    expect(isWellFormed(gargalo, [1, 1])).toBe(false);
    expect(isWellFormed(gargalo, [-1])).toBe(false);
  });
});

describe('cofre criptografico: corte minimo', () => {
  it('corta no gargalo, nao na entrada', () => {
    expect(reference(gargalo)).toEqual([4]);
    expect(referenceCost(gargalo)).toBe(1);
  });

  it('com trilhas independentes, corta uma de cada', () => {
    expect(referenceCost(duasTrilhas)).toBe(2);
    expect(vaultExposed(duasTrilhas, reference(duasTrilhas))).toBe(false);
  });

  it('o corte de referencia sempre fecha o cofre', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 20; i += 1) {
        const instance = generate(`fecha-${i}`, difficulty);
        expect({
          difficulty,
          i,
          exposto: vaultExposed(instance, reference(instance)),
        }).toEqual({ difficulty, i, exposto: false });
      }
    }
  });

  it('nenhum conjunto menor de firewalls fecha o cofre', () => {
    // Forca bruta: todos os conjuntos de tamanho (minimo - 1) deixam rota aberta.
    for (let i = 0; i < 8; i += 1) {
      const instance = generate(`minimo-${i}`, 1);
      const minimo = referenceCost(instance);
      const total = instance.links.length;
      const combinar = (inicio: number, atual: number[]): void => {
        if (atual.length === minimo - 1) {
          expect(vaultExposed(instance, atual)).toBe(true);
          return;
        }
        for (let index = inicio; index < total; index += 1) combinar(index + 1, [...atual, index]);
      };
      combinar(0, []);
    }
  });
});

describe('cofre criptografico: geracao', () => {
  it('a mesma seed produz sempre a mesma rede', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(generate('igual', difficulty)).toEqual(generate('igual', difficulty));
    }
  });

  it('seeds diferentes produzem redes diferentes', () => {
    expect(generate('seed-a', 2)).not.toEqual(generate('seed-b', 2));
  });

  it('o cofre comeca sempre exposto', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 20; i += 1) {
        expect(vaultExposed(generate(`exposto-${i}`, difficulty), [])).toBe(true);
      }
    }
  });

  it('o corte minimo nunca e de um firewall so', () => {
    // Senao a licao da era ("fechar TODOS os caminhos") nao aparece.
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 30; i += 1) {
        const instance = generate(`dois-${i}`, difficulty);
        expect({
          difficulty,
          i,
          corte: referenceCost(instance),
        }).toEqual({ difficulty, i, corte: referenceCost(instance) });
        expect(referenceCost(instance)).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('o corte minimo sempre cabe no limite de firewalls', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 30; i += 1) {
        const instance = generate(`cabe-${i}`, difficulty);
        expect(referenceCost(instance)).toBeLessThanOrEqual(instance.maxFirewalls);
      }
    }
  });

  it('a rede tem o numero de camadas da dificuldade', () => {
    for (const difficulty of DIFFICULTIES) {
      const key = String(difficulty);
      const esperado = 1 + (VAULT.LAYERS[key] as number) * (VAULT.WIDTH[key] as number) + 1;
      expect(generate('camadas', difficulty).nodes).toBe(esperado);
    }
  });
});

describe('cofre criptografico: avaliacao', () => {
  it('o corte minimo fecha com eficiencia 1', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 20; i += 1) {
        const instance = generate(`eval-${i}`, difficulty);
        expect(evaluate(instance, reference(instance))).toEqual({ ok: true, efficiency: 1 });
      }
    }
  });

  it('deixar uma rota aberta reprova, mesmo gastando firewall', () => {
    expect(evaluate(duasTrilhas, [0])).toEqual({ ok: false, efficiency: 0 });
  });

  it('nao gastar firewall nenhum reprova', () => {
    expect(evaluate(duasTrilhas, [])).toEqual({ ok: false, efficiency: 0 });
  });

  it('passar do limite de firewalls reprova', () => {
    const apertado: VaultInstance = { ...duasTrilhas, maxFirewalls: 2 };
    expect(evaluate(apertado, [0, 1, 3])).toEqual({ ok: false, efficiency: 0 });
  });

  it('cortar na entrada protege, mas com eficiencia menor', () => {
    // 0 -> 1 e 0 -> 2 fecham o cofre com 2 firewalls; o gargalo faria com 1.
    const resultado = evaluate(gargalo, [0, 1]);
    expect(resultado.ok).toBe(true);
    expect(resultado.efficiency).toBeCloseTo(0.5);
  });

  it('a eficiencia nunca passa do teto', () => {
    expect(evaluate(gargalo, [4]).efficiency).toBeLessThanOrEqual(SCORING.EFFICIENCY_MAX);
  });
});

describe('cofre criptografico: as missoes da era 5 sao jogaveis', () => {
  const missoes = MISSIONS.filter((m) => m.era === 'seguranca');

  it('ha duas missoes declaradas', () => {
    expect(missoes).toHaveLength(2);
  });

  it.each(missoes.map((m) => m.id))('a missao %s fecha com a referencia', (id) => {
    const missao = missoes.find((m) => m.id === id)!;
    const instance = generate(missao.seed, missao.difficulty);
    expect(evaluate(instance, reference(instance)).ok).toBe(true);
  });
});
