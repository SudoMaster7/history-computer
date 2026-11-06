import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { EraId, Evaluation, PlayerState } from '@/core/types';
import type { QuizInstance, QuizResult } from '@/core/quiz';
import { STORAGE } from '@/core/constants';
import { applyMissionResult, applyQuizResult, consumeItem, initialState } from '@/core/rpg';
import { eraUnlocked } from '@/core/powers';
import { buildQuiz, gradeQuiz } from '@/core/quiz';
import { QUIZ_BANK } from '@/data/quizzes';

export interface Settings {
  reduceMotion: boolean;
  vibration: boolean;
  muted: boolean;
}

interface GameStore {
  player: PlayerState;
  /** Eras ja concluidas: duas missoes feitas e prova passada. */
  clearedEras: EraId[];
  /** Prova em andamento, se houver. Nao e salva de proposito. */
  quiz: QuizInstance | null;
  settings: Settings;
  tutorialDone: boolean;

  // --- acoes ---
  resetGame(): void;
  completeMission(missionId: string, evaluation: Evaluation): void;
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
      quiz: null,
      settings: { reduceMotion: false, vibration: true, muted: true },
      tutorialDone: false,

      resetGame() {
        set({ player: initialState(), clearedEras: [], quiz: null, tutorialDone: false });
      },

      completeMission(missionId, evaluation) {
        set((s) => ({ player: applyMissionResult(s.player, missionId, evaluation) }));
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
      partialize: (s) => ({
        player: s.player,
        clearedEras: s.clearedEras,
        settings: s.settings,
        tutorialDone: s.tutorialDone,
      }),
    },
  ),
);
