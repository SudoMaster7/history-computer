import { registerMinigame } from '@/core/registry';
import mecanicaModule from './mecanica';
import logicaModule from './logica';
import codigoModule from './codigo';
import redesModule from './redes';
import segurancaModule from './seguranca';
import iaModule from './ia';

/**
 * Registra os minijogos das seis eras. Importado uma vez pelo App.
 *
 * O registry e o que liga a era ao minijogo: era que nao esta aqui cai no aviso
 * de terminal em construcao da tela da fase. Desde a entrega dos minijogos das
 * eras 3 a 6, as seis estao registradas.
 */
let done = false;

export function registerMinigames(): void {
  if (done) return;
  registerMinigame(mecanicaModule);
  registerMinigame(logicaModule);
  registerMinigame(codigoModule);
  registerMinigame(redesModule);
  registerMinigame(segurancaModule);
  registerMinigame(iaModule);
  done = true;
}
