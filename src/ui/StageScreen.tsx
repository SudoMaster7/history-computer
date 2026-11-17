import { useCallback, useEffect, useRef, useState } from 'react';
import type { GadgetState } from '@/core/gadgets';
import type { RunEvent, RunInput, RunState, StageDef } from '@/core/stage';
import { botInput, initialRun, stepRun } from '@/core/stage';
import { abilitiesOf } from '@/core/campaign';
import { ERAS, POWER_OF_ERA } from '@/core/powers';
import { STAGE } from '@/core/constants';
import { getStage, stageText } from '@/data/stages';
import { briefOfEra } from '@/data/minigameBriefs';
import { fragmentFact } from '@/data/fragments';
import { play } from '@/fx';
import type { SoundName } from '@/fx';
import { difficultyOf, useGameStore } from '@/store';
import GatePanel, { Examples } from './GatePanel';
import type { StageArt } from './stageArt';
import { VIEW_H, VIEW_W, drawStage } from './stageArt';
import {
  IconBolt,
  IconFragment,
  IconHeart,
  IconJump,
  IconLeft,
  IconPause,
  IconPower,
  IconRight,
} from './icons';
import ui from '@/data/ui.pt-BR.json';

interface Props {
  stageId: string;
  /** A fase acabou no terminal: indices dos fragmentos recolhidos. */
  onClear(collected: number[]): void;
  onExit(): void;
}

type Phase = 'intro' | 'play' | 'clear';

const STEP_MS = 1000 / STAGE.STEPS_PER_SECOND;
/** Maior intervalo entre quadros que o laco recupera (aba que voltou do fundo). */
const MAX_FRAME_MS = 100;
/** Quanto tempo o aviso curto fica na tela. */
const TOAST_MS = 2600;
/** Quanto tempo o balao da placa fica sobre a fase. */
const BUBBLE_MS = 5500;
/** O balao com os exemplos carimbados da Era 6: mais tempo para comparar, e some. */
const EXAMPLES_BUBBLE_MS = 8000;
/** Uma placa a ate esta distancia (em colunas) de um portao e a placa dele. */
const GATE_SIGN_COLS = 12;

const SOUND_OF: Partial<Record<RunEvent['type'], SoundName>> = {
  jump: 'step',
  shoot: 'tap',
  kill: 'hit',
  hit: 'hurt',
  fall: 'hurt',
  shield: 'block',
  fragment: 'fragment',
  checkpoint: 'ok',
  gate: 'talk',
  gateOpen: 'door',
  goal: 'win',
  restart: 'lose',
  ammo: 'place',
  empty: 'fail',
  spring: 'levelUp',
  crumble: 'erase',
  stomp: 'hit',
  wrongTarget: 'fail',
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`nao carregou ${src}`));
    image.src = src;
  });
}

/** O portao que a placa `index` explica, se ela estiver logo antes de um. */
function gateOfSign(def: StageDef, index: number): number | null {
  const sign = def.signs[index];
  if (!sign) return null;
  const next = def.signs[index + 1];
  const gate = def.gates.findIndex((g) => g.col > sign.col);
  const g = def.gates[gate];
  if (!g || (next && next.col < g.col)) return null;
  return g.col - sign.col <= GATE_SIGN_COLS ? gate : null;
}

/** Placa que explica o portao `gate` (a ultima antes dele). */
function signOfGate(def: StageDef, gate: number): number | null {
  const g = def.gates[gate];
  if (!g) return null;
  let found = -1;
  for (let i = 0; i < def.signs.length; i += 1) if (def.signs[i]!.col < g.col) found = i;
  return found >= 0 ? found : null;
}

interface Hud {
  hearts: number;
  collected: number;
  ammo: number;
  atGate: number | null;
  gate: GadgetState | null;
}

function hudOf(s: RunState): Hud {
  return {
    hearts: s.hearts,
    collected: s.collected.filter(Boolean).length,
    ammo: s.ammo,
    atGate: s.atGate,
    gate: s.atGate === null ? null : (s.gates[s.atGate] ?? null),
  };
}

/**
 * Fase de plataforma (D73-D75). O Bit corre sozinho; o jogador toca em Pular
 * e Atirar e, parado diante de um portao, nas pecas do painel. A regra toda e
 * `stepRun` (passo fixo); esta tela so junta os toques, chama o passo no ritmo
 * do relogio, toca o som dos eventos e desenha.
 */
export default function StageScreen({ stageId, onClear, onExit }: Props) {
  const def = getStage(stageId);
  const text = stageText(stageId);
  const missions = useGameStore((s) => s.player.missions);
  const devMode = useGameStore((s) => s.settings.devMode === true);
  // A dificuldade vale como estava ao entrar na fase (D82).
  const [difficulty] = useState(() => difficultyOf(useGameStore.getState().settings));
  // As habilidades valem como estavam ao entrar: concluir a fase nao muda a corrida.
  const [abilities] = useState(() => abilitiesOf(missions));

  const [phase, setPhase] = useState<Phase>('intro');
  const [paused, setPaused] = useState(false);
  /**
   * Placa lida por ultimo, mostrada num balao sobre a fase SEM pausar (D83). A do
   * detector da Era 6 fica ate o portao abrir, porque traz os exemplos.
   */
  const [sign, setSign] = useState<{ index: number; sticky: number | null } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);
  const [autopilotOn, setAutopilotOn] = useState(false);
  const autopilot = useRef(false);
  const [art, setArt] = useState<StageArt | null>(null);
  const [hud, setHud] = useState<Hud>(() =>
    def
      ? hudOf(initialRun(def, abilities, difficulty))
      : { hearts: 0, collected: 0, ammo: 0, atGate: null, gate: null },
  );

  const run = useRef<RunState | null>(def ? initialRun(def, abilities, difficulty) : null);
  const input = useRef<RunInput>({});
  /** Botoes segurados agora (toque e teclado): valem a cada passo enquanto apertados (D81). */
  const held = useRef({ left: false, right: false, jump: false });
  const [pressed, setPressed] = useState({ left: false, right: false, jump: false });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!def) return;
    let alive = true;
    Promise.all([loadImage(`/sprites/tiles-${def.era}.png`), loadImage('/sprites/bit.png')])
      .then(([tiles, bit]) => {
        if (alive) setArt({ tiles, bit });
      })
      .catch(() => {
        if (alive) setToast(ui.app.renderFail);
      });
    return () => {
      alive = false;
    };
  }, [def]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(id);
  }, [toast]);

  // O balao sempre some sozinho (D86); o do detector, com os exemplos, fica um
  // pouco mais. Depois os exemplos seguem no painel do portao do detector.
  useEffect(() => {
    if (!sign) return;
    const ms = sign.sticky !== null ? EXAMPLES_BUBBLE_MS : BUBBLE_MS;
    const id = window.setTimeout(() => setSign(null), ms);
    return () => window.clearTimeout(id);
  }, [sign]);

  useEffect(() => {
    if (!wrong) return;
    const id = window.setTimeout(() => setWrong(false), TOAST_MS);
    return () => window.clearTimeout(id);
  }, [wrong]);

  const draw = useCallback(
    (now: number): void => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !def || !art || !run.current) return;
      ctx.imageSmoothingEnabled = false;
      drawStage(ctx, def, run.current, art, now);
      // Onde o Bit esta, em colunas: so leitura, para o teste de ponta a ponta.
      canvas!.dataset.col = String(Math.floor(run.current.x / STAGE.TILE));
      canvas!.dataset.grounded = String(run.current.grounded);
    },
    [def, art],
  );

  const handle = useCallback(
    (events: RunEvent[]): void => {
      if (!def) return;
      let changed = false;
      for (const e of events) {
        const sound = e.type === 'press' ? (e.mistake ? 'erase' : 'place') : SOUND_OF[e.type];
        if (sound) play(sound);
        switch (e.type) {
          case 'sign': {
            // A placa colada no portao aparece no painel dele; as outras, no balao.
            if (gateOfSign(def, e.index) !== null) break;
            const next = def.gates.findIndex((g) => g.col > def.signs[e.index]!.col);
            // Exemplos so na ultima placa antes do detector -- a que traz a regra
            // daquele grupo --, e nao repetidos em toda placa do caminho (D86).
            const gate = def.gates[next];
            const nextSign = def.signs[e.index + 1];
            const lastBeforeGate = !nextSign || (gate !== undefined && nextSign.col > gate.col);
            const classify = gate?.data.kind === 'classify' && lastBeforeGate;
            setSign({ index: e.index, sticky: classify ? next : null });
            break;
          }
          case 'fragment': {
            // Aviso curto, sem pausa: a curiosidade se le no fim da fase (D83).
            const got = run.current?.collected.filter(Boolean).length ?? 0;
            setToast(`${ui.stage.fragmentFound} ${got}/${def.fragments.length}`);
            changed = true;
            break;
          }
          case 'press':
            if (e.mistake) setWrong(true);
            changed = true;
            break;
          case 'gateOpen':
            setSign((current) => (current?.sticky === e.gate ? null : current));
            setWrong(false);
            setToast(ui.stage.gateOpen);
            changed = true;
            break;
          case 'restart':
            setToast(ui.stage.restart);
            changed = true;
            break;
          case 'empty':
            setToast(ui.stage.empty);
            break;
          case 'ammo':
          case 'shoot':
          case 'stomp':
            changed = true;
            break;
          case 'wrongTarget':
            setToast(ui.stage.wrongTarget);
            break;
          case 'goal':
            setPhase('clear');
            changed = true;
            break;
          case 'hit':
          case 'fall':
          case 'gate':
            changed = true;
            break;
          default:
            break;
        }
      }
      if (changed && run.current) setHud(hudOf(run.current));
    },
    [def],
  );

  // O laco: passo fixo, alimentado pelo relogio da tela.
  // O fragmento pausa como a placa (D80): ninguem le correndo.
  // So o jogador para o jogo (pausa); placa e fragmento nao param mais (D83).
  const running = phase === 'play' && !paused && art !== null;
  useEffect(() => {
    if (!running || !def) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const frame = (now: number): void => {
      acc += Math.min(now - last, MAX_FRAME_MS);
      last = now;
      while (acc >= STEP_MS && run.current && !run.current.done) {
        // Piloto automatico (modo desenvolvedor): o robo de referencia pula e
        // atira; o painel do portao continua com quem esta jogando.
        const bot: RunInput = autopilot.current ? botInput(def, run.current) : {};
        const out = stepRun(def, run.current, {
          ...input.current,
          left: held.current.left || bot.left,
          right: held.current.right || bot.right,
          jumpHeld: held.current.jump || bot.jumpHeld,
          jump: input.current.jump || bot.jump,
          shoot: input.current.shoot || bot.shoot,
        });
        input.current = {};
        run.current = out.state;
        acc -= STEP_MS;
        if (out.events.length > 0) handle(out.events);
      }
      draw(now);
      raf = window.requestAnimationFrame(frame);
    };
    raf = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(raf);
  }, [running, def, draw, handle]);

  // Parado (pausa, placa, cartao): desenha um quadro so.
  useEffect(() => {
    if (!running) draw(performance.now());
  }, [running, draw, phase]);

  const press = useCallback((patch: RunInput): void => {
    input.current = { ...input.current, ...patch };
  }, []);

  /** Aperta ou solta um botao de segurar. Pular tambem conta o toque, no passo seguinte. */
  const hold = useCallback(
    (key: 'left' | 'right' | 'jump', down: boolean): void => {
      if (held.current[key] === down) return;
      held.current = { ...held.current, [key]: down };
      setPressed(held.current);
      if (key === 'jump' && down) press({ jump: true });
    },
    [press],
  );

  // Parou (pausa, placa, fragmento, fim): solta tudo, para o Bit nao sair andando sozinho.
  useEffect(() => {
    if (running) return;
    held.current = { left: false, right: false, jump: false };
    setPressed(held.current);
  }, [running]);

  // Teclado no computador: opcional, o jogo e todo por toque.
  useEffect(() => {
    if (!running) return;
    const keyOf = (code: string): 'left' | 'right' | 'jump' | null =>
      code === 'ArrowRight' || code === 'KeyD'
        ? 'right'
        : code === 'ArrowLeft' || code === 'KeyA'
          ? 'left'
          : code === 'Space' || code === 'ArrowUp' || code === 'KeyW'
            ? 'jump'
            : null;
    const onDown = (event: KeyboardEvent): void => {
      if (event.repeat) return;
      const key = keyOf(event.code);
      if (key) {
        event.preventDefault();
        hold(key, true);
      } else if (event.code === 'KeyX' || event.code === 'KeyJ') {
        press({ shoot: true });
      }
    };
    const onUp = (event: KeyboardEvent): void => {
      const key = keyOf(event.code);
      if (key) hold(key, false);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [running, press, hold]);

  const restart = useCallback((): void => {
    if (!def) return;
    run.current = initialRun(def, abilities, difficulty);
    input.current = {};
    setHud(hudOf(run.current));
    setPaused(false);
    setSign(null);
    setPhase('play');
  }, [def, abilities, difficulty]);

  const collectedIndexes = (): number[] =>
    (run.current?.collected ?? []).flatMap((got, i) => (got ? [i] : []));

  if (!def || !text) {
    return (
      <section className="game-surface pad">
        <p>{ui.app.renderFail}</p>
        <button type="button" onClick={onExit}>
          {ui.app.back}
        </button>
      </section>
    );
  }

  const eraNumber = ERAS.indexOf(def.era) + 1;
  const letter = def.id.endsWith('-B') ? 'B' : 'A';
  const factOffset = letter === 'B' ? def.fragments.length : 0;
  const brief = briefOfEra(def.era);
  const atGate = hud.atGate !== null ? def.gates[hud.atGate] : undefined;
  const gateSign = hud.atGate !== null ? signOfGate(def, hud.atGate) : null;
  const signGate = sign !== null ? def.gates[sign.sticky ?? -1] : undefined;
  // Os tres fragmentos da fase, na ordem: a curiosidade de quem foi recolhido, e null
  // no lugar de quem ficou para tras.
  const fragmentSlots = def.fragments.map((_, i) =>
    run.current?.collected[i] ? fragmentFact(def.era, factOffset + i) : null,
  );
  const power = POWER_OF_ERA[def.era];

  return (
    <section className={`stageScreen stageScreen--${def.era} game-surface`} aria-label={text.title}>
      <header className="stageScreen__hud">
        <button
          type="button"
          className="stageScreen__pause"
          aria-label={ui.stage.pause}
          onClick={() => setPaused(true)}
          disabled={phase !== 'play'}
        >
          <IconPause size={18} />
        </button>
        <p className="stageScreen__title">
          {eraNumber}-{letter} · {text.title}
        </p>
        <p className="stageScreen__hearts" aria-label={`${ui.stage.hearts}: ${hud.hearts}`}>
          {Array.from({ length: run.current?.heartsMax ?? hud.hearts }, (_, i) => (
            <span
              key={i}
              className="stageScreen__heart"
              data-full={i < hud.hearts}
              aria-hidden="true"
            >
              <IconHeart size={16} />
            </span>
          ))}
        </p>
        <p
          className="stageScreen__frags"
          aria-label={`${ui.stage.fragments}: ${hud.collected} / ${def.fragments.length}`}
        >
          <IconFragment size={14} />
          {hud.collected}/{def.fragments.length}
        </p>
        <p
          className="stageScreen__ammo"
          data-empty={hud.ammo === 0}
          aria-label={`${ui.stage.ammo}: ${hud.ammo}`}
        >
          <IconBolt size={14} />
          {hud.ammo}
        </p>
      </header>

      <div className="stageScreen__view">
        <canvas
          ref={canvasRef}
          className="stageScreen__canvas"
          width={VIEW_W}
          height={VIEW_H}
          aria-hidden="true"
        />
        {sign !== null && phase === 'play' ? (
          <div className="stageScreen__bubble" role="status">
            <p>{text.signs[sign.index]}</p>
            {signGate?.data.kind === 'classify' ? <Examples data={signGate.data} /> : null}
          </div>
        ) : null}
        {toast ? (
          <p className="stageScreen__toast" role="status">
            {toast}
          </p>
        ) : null}
      </div>

      {phase === 'play' && atGate && hud.gate ? (
        <GatePanel
          data={atGate.data}
          state={hud.gate}
          sign={gateSign !== null ? text.signs[gateSign] : undefined}
          wrong={wrong}
          onPress={(i) => press({ target: i })}
        />
      ) : phase === 'play' ? (
        <div className="stageScreen__controls">
          {/* Controle de Mega Man e Mario (D81): a direcao vale enquanto o dedo segura. */}
          <div className="stageScreen__dpad" role="group" aria-label={ui.stage.directions}>
            <HoldButton
              className="stageScreen__dir"
              label={ui.stage.back}
              glyph={<IconLeft size={34} />}
              down={pressed.left}
              onHold={(down) => hold('left', down)}
            />
            <HoldButton
              className="stageScreen__dir"
              label={ui.stage.forward}
              glyph={<IconRight size={34} />}
              down={pressed.right}
              onHold={(down) => hold('right', down)}
            />
          </div>
          <div className="stageScreen__actions">
            <button
              type="button"
              className="stageScreen__btn stageScreen__btn--shoot"
              data-sfx="none"
              onPointerDown={(e) => {
                e.preventDefault();
                press({ shoot: true });
              }}
              onClick={(e) => {
                // Teclado/leitor de tela: o clique sem ponteiro tambem atira.
                if (e.detail === 0) press({ shoot: true });
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              <IconBolt size={26} />
              <span>{ui.stage.shoot}</span>
            </button>
            <HoldButton
              className="stageScreen__btn stageScreen__btn--jump"
              label={ui.stage.jump}
              glyph={
                <>
                  <IconJump size={26} />
                  <span>{ui.stage.jump}</span>
                </>
              }
              down={pressed.jump}
              onHold={(down) => hold('jump', down)}
            />
          </div>
          {devMode ? (
            <div className="stageScreen__dev">
              <button
                type="button"
                className="stageScreen__skip"
                aria-pressed={autopilotOn}
                onClick={() => {
                  autopilot.current = !autopilot.current;
                  setAutopilotOn(autopilot.current);
                }}
              >
                {ui.stage.autopilot}
              </button>
              <button type="button" className="stageScreen__skip" onClick={() => setPhase('clear')}>
                {ui.stage.skip}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {phase === 'intro' ? (
        <div className="stageCard stageCard--intro" role="dialog" aria-label={text.title}>
          <p className="label">
            {ui.stage.eraLabel} {eraNumber} · {ui.stage.stageLabel} {letter}
          </p>
          <h2>{text.title}</h2>
          <p>{text.intro}</p>
          <p className="stageCard__small">{ui.stage.controlsHelp}</p>
          <p className="stageCard__small">
            {ui.difficulty.title}: <strong>{ui.difficulty[difficulty]}</strong> —{' '}
            {ui.difficulty[`${difficulty}Text`]}
          </p>
          {abilities.length > 0 ? (
            <ul className="stageCard__abilities" aria-label={ui.map.abilities}>
              {abilities.map((p) => (
                <li key={p}>
                  <strong>{ui.abilities[p].name}</strong> {ui.abilities[p].text}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="controls">
            <button type="button" className="stageCard__primary" onClick={() => setPhase('play')}>
              {ui.stage.start}
            </button>
            <button type="button" onClick={onExit}>
              {ui.stage.toMap}
            </button>
          </div>
        </div>
      ) : null}

      {paused ? (
        <div className="stageCard stageCard--pause" role="dialog" aria-label={ui.stage.paused}>
          <h2>{ui.stage.paused}</h2>
          <div className="controls stageCard__stack">
            <button type="button" className="stageCard__primary" onClick={() => setPaused(false)}>
              {ui.stage.resume}
            </button>
            <button type="button" onClick={restart}>
              {ui.stage.retry}
            </button>
            <button type="button" onClick={onExit}>
              {ui.stage.toMap}
            </button>
          </div>
        </div>
      ) : null}

      {phase === 'clear' ? (
        <div
          className={`stageCard stageCard--clear clearCard clearCard--${def.era}`}
          role="dialog"
          aria-label={ui.stage.clearTitle}
        >
          <header className="clearCard__head">
            <p className="label">
              {eraNumber}-{letter} · {text.title}
            </p>
            <h2>{ui.stage.clearTitle}</h2>
            <ul className="clearCard__chips">
              <li aria-label={`${ui.stage.fragments}: ${hud.collected} / ${def.fragments.length}`}>
                <IconFragment size={14} /> {hud.collected}/{def.fragments.length}
              </li>
              <li aria-label={`${ui.stage.hearts}: ${hud.hearts}`}>
                <IconHeart size={14} /> {hud.hearts}
              </li>
              <li aria-label={`${ui.stage.ammo}: ${hud.ammo}`}>
                <IconBolt size={14} /> {hud.ammo}
              </li>
            </ul>
          </header>

          {/* 1. Fragmentos: um cartao por curiosidade; o que faltou fica marcado. */}
          <section className="clearCard__block" aria-label={ui.stage.factsTitle}>
            <h3 className="clearCard__title">
              <IconFragment size={16} /> {ui.stage.factsTitle}
            </h3>
            <ol className="clearCard__facts">
              {fragmentSlots.map((fact, i) => (
                <li key={i} className="clearCard__fact" data-found={fact !== null}>
                  <span className="clearCard__num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <p>{fact ?? ui.stage.factMissing}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* 2. O que a fase ensinou, com a ideia da era em destaque. */}
          <section className="clearCard__block clearCard__block--lesson">
            <h3 className="clearCard__title">
              <IconPower size={16} /> {ui.stage.summaryTitle}
            </h3>
            <p className="clearCard__badge">{ui.powers[power]}</p>
            <p className="clearCard__lead">{text.summary}</p>
            {brief ? <p className="clearCard__note">{brief.power}</p> : null}
          </section>

          {/* 3. O minijogo que espera no terminal. */}
          <section className="clearCard__block clearCard__block--terminal">
            <h3 className="clearCard__title">{ui.stage.minigameTitle}</h3>
            <p className="clearCard__game">{ui.minigames[def.era]}</p>
            {brief ? <p className="clearCard__machine">{brief.machine}</p> : null}
            <button
              type="button"
              className="stageCard__primary clearCard__go"
              onClick={() => onClear(collectedIndexes())}
            >
              {ui.stage.openTerminal} ▶
            </button>
          </section>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Botao de segurar: vale do toque ate o dedo sair. A captura do ponteiro faz o
 * botao receber o "soltou" mesmo se o dedo escorregar para fora, e cada botao
 * tem o proprio ponteiro -- da para segurar ▶ e tocar em Pular ao mesmo tempo.
 */
function HoldButton({
  className,
  label,
  glyph,
  down,
  onHold,
}: {
  className: string;
  label: string;
  glyph: React.ReactNode;
  down: boolean;
  onHold(down: boolean): void;
}) {
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      aria-pressed={down}
      data-sfx="none"
      onPointerDown={(e) => {
        e.preventDefault();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Evento sem ponteiro de verdade (teste): segue sem captura.
        }
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      onLostPointerCapture={() => onHold(false)}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onHold(true);
      }}
      onKeyUp={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onHold(false);
      }}
    >
      <span className="holdButton__face" aria-hidden="true">
        {glyph}
      </span>
    </button>
  );
}
