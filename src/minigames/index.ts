import { registerMinigame } from '@/core/registry';
import mecanicaModule from './mecanica';
import logicaModule from './logica';

/**
 * Registra os minijogos implementados. Importado uma vez pelo App.
 * As eras ainda sem minijogo simplesmente nao aparecem no registry
 * e a tela da fase avisa que o terminal esta em construcao.
 */
let done = false;

export function registerMinigames(): void {
  if (done) return;
  registerMinigame(mecanicaModule);
  registerMinigame(logicaModule);
  done = true;
}
