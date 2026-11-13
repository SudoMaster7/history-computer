import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { EraId, Evaluation, PlayerState } from '@/core/types';
import type { QuizInstance, QuizResult } from '@/core/quiz';
import { STORAGE } from '@/core/constants';
import {
  applyMissionResult,
  applyQuizResult,
  collectFragment,
  consumeItem,
  initialState,
} from '@/core/rpg';
import { ERAS, eraUnlocked } from '@/core/powers';
import { buildQuiz, gradeQuiz } from '@/core/quiz';
import { QUIZ_BANK } from '@/data/quizzes';

export interface Settings {
  reduceMotion: boolean;
  vibration: boolean;
  muted: boolean;
  /** Musica de fundo. So toca com o som ligado (`muted` falso). */
  music: boolean;
  /**
   * Modo desenvolvedor: destranca as seis zonas, as portas das provas e o
   * chefao, para dar para testar uma fase sem jogar as anteriores.
   *
   * Nao mexe no progresso salvo -- so deixa de cobrar os pre-requisitos na hora
   * de abrir a tela. O que foi concluido de verdade continua sendo o que esta em
   * `clearedEras` e em `player.missions`.
   */
  devMode: boolean;
}

interface GameStore {
  player: PlayerState;
  /** Eras ja concluidas: duas missoes feitas e prova passada. */
  clearedEras: EraId[];
  /** O BUG Day 0 ja foi corrigido ao menos uma vez. */
  bossDefeated: boolean;
  /** Melhor pontuacao no chefao. */
  bossBestScore: number;
  /** Fragmentos de memoria ja recolhidos, por id ("<zona>:<indice>"). */
  fragments: string[];
  /** Prova em andamento, se houver. Nao e salva de proposito. */
  quiz: QuizInstance | null;
  settings: Settings;
  tutorialDone: boolean;

  // --- acoes ---
  resetGame(): void;
  completeMission(missionId: string, evaluation: Evaluation): void;
  /** Recolhe um fragmento do mapa. Devolve false se ele ja tinha sido recolhido. */
  collectFragment(id: string): boolean;
  /** Grava no save o estado do jogador que o combate devolveu. */
  syncPlayer(player: PlayerState): void;
  /** Registra o fim de uma luta contra o chefao. */
  finishBoss(won: boolean, score: number): void;
  /** O chefao abre quando as seis eras estao concluidas. */
  canFaceBoss(): boolean;
  openQuiz(era: EraId): void;
  finishQuiz(answers: readonly number[]): QuizResult | null;
  closeQuiz(): void;
  spendItem(id: string): boolean;
  isEraUnlocked(era: EraId): boolean;
  isEraCleared(era: EraId): boolean;
  setSettings(patch: Partial<Settings>): void;
  finishTutorial(): void;
  hasProgress(): boolean;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      player: initialState(),
      clearedEras: [],
      bossDefeated: false,
      bossBestScore: 0,
      fragments: [],
      quiz: null,
      settings: { reduceMotion: false, vibration: true, muted: true, music: true, devMode: false },
      tutorialDone: false,

      resetGame() {
        set({
          player: initialState(),
          clearedEras: [],
          bossDefeated: false,
          bossBestScore: 0,
          fragments: [],
          quiz: null,
          tutorialDone: false,
        });
      },

      completeMission(missionId, evaluation) {
        set((s) => ({ player: applyMissionResult(s.player, missionId, evaluation) }));
      },

      collectFragment(id) {
        // `?? []`: save antigo foi gravado antes de existir esta lista.
        const result = collectFragment(get().player, get().fragments ?? [], id);
        if (result.gained) set({ player: result.player, fragments: result.collected });
        return result.gained;
      },

      syncPlayer(player) {
        set({ player });
      },

      finishBoss(won, score) {
        set((s) => ({
          bossDefeated: s.bossDefeated || won,
          bossBestScore: Math.max(s.bossBestScore, Math.max(0, Math.round(score))),
        }));
      },

      canFaceBoss() {
        if (get().settings.devMode) return true;
        return ERAS.every((era) => get().clearedEras.includes(era));
      },

      openQuiz(era) {
        set({ quiz: buildQuiz(era, `quiz-${era}-v1`, QUIZ_BANK) });
      },

      finishQuiz(answers) {
        const quiz = get().quiz;
        if (!quiz) return null;
        const result = gradeQuiz(quiz, answers);
        set((s) => ({
          player: applyQuizResult(s.player, quiz.era, result),
          clearedEras:
            result.passed && !s.clearedEras.includes(quiz.era)
              ? [...s.clearedEras, quiz.era]
              : s.clearedEras,
        }));
        return result;
      },

      closeQuiz() {
        set({ quiz: null });
      },

      spendItem(id) {
        const { player, used } = consumeItem(get().player, id);
        if (used) set({ player });
        return used;
      },

      isEraUnlocked(era) {
        if (get().settings.devMode) return true;
        return eraUnlocked(era, get().clearedEras);
      },

      isEraCleared(era) {
        return get().clearedEras.includes(era);
      },

      setSettings(patch) {
        set((s) => ({ settings: { ...s.settings, ...patch } }));
      },

      finishTutorial() {
        set({ tutorialDone: true });
      },

      hasProgress() {
        const s = get();
        return (
          s.clearedEras.length > 0 ||
          (s.fragments ?? []).length > 0 ||
          s.bossDefeated ||
          Object.keys(s.player.missions).length > 0 ||
          s.player.xp > 0 ||
          s.tutorialDone
        );
      },
    }),
    {
      name: STORAGE.KEY,
      version: STORAGE.VERSION,
      storage: createJSONStorage(() => globalThis.localStorage),
      /*
       * Campos novos (bossDefeated, bossBestScore, fragments) nao invalidam save antigo:
       * o que falta no armazenamento fica com o valor inicial, entao a versao
       * do save nao sobe e ninguem perde progresso.
       */
      partialize: (s) => ({
        player: s.player,
        clearedEras: s.clearedEras,
        bossDefeated: s.bossDefeated,
        bossBestScore: s.bossBestScore,
        fragments: s.fragments,
        settings: s.settings,
        tutorialDone: s.tutorialDone,
      }),
    },
  ),
);
