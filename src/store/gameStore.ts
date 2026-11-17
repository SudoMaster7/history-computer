import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Evaluation, GameDifficulty, PlayerState } from '@/core/types';
import { STORAGE } from '@/core/constants';
import { applyMissionResult, initialState } from '@/core/progress';
import { BOSS_STAGE, stageUnlocked } from '@/core/campaign';

export interface Settings {
  vibration: boolean;
  muted: boolean;
  /** Musica de fundo. So toca com o som ligado (`muted` falso). */
  music: boolean;
  /**
   * Modo desenvolvedor (D53): abre todas as fases e o chefao, e na fase mostra
   * "Ir ao terminal", para dar para testar uma fase sem jogar as anteriores.
   * Nao mexe no progresso salvo.
   */
  devMode: boolean;
  /** Dificuldade das fases e do chefao (D82). Save antigo nao tem: vale 'normal'. */
  difficulty: GameDifficulty;
}

/** A dificuldade escolhida, com reserva para save gravado antes dela existir. */
export function difficultyOf(settings: Partial<Settings> | undefined): GameDifficulty {
  const d = settings?.difficulty;
  return d === 'facil' || d === 'dificil' ? d : 'normal';
}

interface GameStore {
  /** Estrelas e melhor pontuacao de cada fase. E tudo o que o progresso guarda. */
  player: PlayerState;
  /** O BUG Day 0 ja foi corrigido ao menos uma vez. */
  bossDefeated: boolean;
  /** Melhor pontuacao no chefao. */
  bossBestScore: number;
  /** Fragmentos de memoria ja recolhidos, por id ("<fase>:<indice>"). */
  fragments: string[];
  settings: Settings;

  // --- acoes ---
  resetGame(): void;
  completeMission(missionId: string, evaluation: Evaluation): void;
  /** Recolhe um fragmento. Devolve false se ele ja tinha sido recolhido. */
  collectFragment(id: string): boolean;
  /** Registra o fim de uma luta contra o chefao. */
  finishBoss(won: boolean, score: number): void;
  /** O chefao abre com as 12 fases concluidas (ou no modo desenvolvedor). */
  canFaceBoss(): boolean;
  setSettings(patch: Partial<Settings>): void;
  hasProgress(): boolean;
}

/**
 * Save antigo (versao 1, do RPG): guarda as estrelas das missoes -- cada
 * missao virou o minijogo do fim de uma fase com o mesmo id -- e os ajustes. O
 * resto (XP, vida, itens, eras pela prova, fragmentos da zona) nao tem lugar no
 * jogo de fases e fica para tras (D78).
 */
export function migrateSave(persisted: unknown, version: number): Partial<GameStore> {
  const old = (persisted ?? {}) as {
    player?: { missions?: PlayerState['missions'] };
    settings?: Partial<Settings>;
    bossDefeated?: boolean;
    bossBestScore?: number;
    fragments?: string[];
  };
  if (version >= STORAGE.VERSION) return old as Partial<GameStore>;
  return {
    player: { missions: { ...(old.player?.missions ?? {}) } },
    bossDefeated: false,
    bossBestScore: 0,
    fragments: [],
    ...(old.settings
      ? {
          settings: {
            vibration: old.settings.vibration !== false,
            muted: old.settings.muted !== false,
            music: old.settings.music !== false,
            devMode: old.settings.devMode === true,
            difficulty: 'normal',
          },
        }
      : {}),
  };
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      player: initialState(),
      bossDefeated: false,
      bossBestScore: 0,
      fragments: [],
      settings: {
        vibration: true,
        muted: true,
        music: true,
        devMode: false,
        difficulty: 'normal',
      },

      resetGame() {
        set({ player: initialState(), bossDefeated: false, bossBestScore: 0, fragments: [] });
      },

      completeMission(missionId, evaluation) {
        set((s) => ({ player: applyMissionResult(s.player, missionId, evaluation) }));
      },

      collectFragment(id) {
        const found = get().fragments ?? [];
        if (found.includes(id)) return false;
        set({ fragments: [...found, id] });
        return true;
      },

      finishBoss(won, score) {
        set((s) => ({
          bossDefeated: s.bossDefeated || won,
          bossBestScore: Math.max(s.bossBestScore, Math.max(0, Math.round(score))),
        }));
      },

      canFaceBoss() {
        return stageUnlocked(BOSS_STAGE, get().player.missions, get().settings.devMode === true);
      },

      setSettings(patch) {
        set((s) => ({ settings: { ...s.settings, ...patch } }));
      },

      hasProgress() {
        const s = get();
        return (
          (s.fragments ?? []).length > 0 ||
          s.bossDefeated ||
          Object.keys(s.player.missions).length > 0
        );
      },
    }),
    {
      name: STORAGE.KEY,
      version: STORAGE.VERSION,
      storage: createJSONStorage(() => globalThis.localStorage),
      migrate: (persisted, version) => migrateSave(persisted, version) as GameStore,
      partialize: (s) => ({
        player: s.player,
        bossDefeated: s.bossDefeated,
        bossBestScore: s.bossBestScore,
        fragments: s.fragments,
        settings: s.settings,
      }),
    },
  ),
);
