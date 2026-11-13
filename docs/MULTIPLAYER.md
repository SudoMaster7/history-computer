# Multiplayer, ranking e batalhas de tecnologia — proposta

> **Estado: só documentado. Nada disto está implementado.**
> Este arquivo é o desenho para o grupo implementar depois. Ele parte do que o
> jogo já tem hoje e diz o que falta, em que ordem, e onde cada decisão cara
> precisa ser tomada antes de alguém escrever código.

## 1. O que se quer

Três coisas, da mais barata para a mais cara:

1. **Ranking** — ver a própria pontuação ao lado da dos outros, por missão e no
   BUG Day 0.
2. **Duelo assíncrono** — desafiar alguém para o mesmo desafio, cada um jogando
   na sua hora, e comparar o resultado.
3. **Batalha de tecnologias em tempo real** — dois jogadores, um contra o outro,
   usando os poderes das eras.

O briefing original (`PROMPT_MVP_Da_Valvula_a_IA.md`, seções 1 e 11) pedia
competição **assíncrona** e deixava multiplayer em tempo real **fora do
escopo**. Os itens 1 e 2 cabem no briefing. O item 3 é uma mudança de escopo, e
por isso está separado, por último, com o custo escrito.

## 2. O que o jogo já tem a favor

O motivo de isto ser viável é uma decisão antiga: **toda regra de jogo é função
pura e determinística** (`CLAUDE.md`, seção 3).

| Já existe                                            | Para que serve aqui                                   |
| ---------------------------------------------------- | ----------------------------------------------------- |
| `generate(seed, dificuldade)` em todo minijogo       | A mesma seed dá o mesmo desafio para os dois jogadores |
| `evaluate(instância, solução)` puro                  | O servidor reavalia a solução sem confiar no cliente  |
| `core/boss.ts` puro (`strike`, `endTurn`, `patchStep`) | Um combate inteiro pode ser refeito a partir das ações |
| `dailySeed()` no fuso `America/Sao_Paulo`            | Desafio do dia igual para todo mundo                  |
| `services/api.ts` (interface) + `localApi.ts`        | Ponto único para trocar o ranking simulado pelo real  |
| `RunSubmission` em `core/types.ts`                   | Formato de envio que **não** carrega pontuação        |
| `missionScore` e `bossScore` em `core/scoring.ts`    | A pontuação é sempre recalculada, nunca recebida      |

A regra que sustenta tudo: **o cliente nunca envia pontuação**. Envia a seed e a
solução; quem calcula é o servidor, com o mesmo `core`.

## 3. Fase 1 — Ranking (a Fase 6 do briefing)

É o que já estava planejado e nunca foi feito. Sem isto, as fases 2 e 3 não têm
onde guardar resultado.

### 3.1 Servidor

Supabase, como o briefing fixou: Auth anônimo, Postgres e Edge Functions.

```
players   (id uuid pk, name text, created_at)
runs      (id, player_id fk, mode text, mission_id text null, seed text,
           solution jsonb, score int, verified bool, created_at)
daily     (day date pk, seed text)
view leaderboard  -- melhor score verificado por (player, mode, mission_id)
```

- **RLS ligado em tudo.** Leitura pública só da view `leaderboard`. Nenhum
  cliente escreve em `runs` direto.
- **Edge Function `validate-run`**: recebe `{ mode, missionId, seed, solution }`,
  importa o `core` e os `logic.ts`, roda `generate` + `evaluate`, calcula a
  pontuação e grava `verified = true`. Solução malformada ou que não fecha é
  rejeitada.
- Limite de taxa por jogador e limite de tamanho do corpo.

### 3.2 Cliente

- `services/supabaseApi.ts` implementando a interface `Api` que já existe,
  escolhida por variável de ambiente. Sem a variável, continua o `localApi` —
  o jogo tem de abrir sem chave nenhuma.
- Tela de ranking por missão e do chefão; "ver como o recordista resolveu"
  depois de concluir a missão (a solução já fica guardada em `runs.solution`).
- Sem conexão: aviso, e o jogo local segue normal (já há o aviso em `App.tsx`).

### 3.3 Pré-requisito técnico

A Edge Function roda em Deno e precisa importar `src/core/**` e
`src/minigames/*/logic.ts`. Hoje esses arquivos usam o alias `@/`. Antes de
começar: ou um passo de build que empacota o núcleo para a função, ou trocar os
imports do núcleo por caminhos relativos. **Decidir isto primeiro** — é o que
mais pode atrasar a fase.

### 3.4 Aceite

- Solução adulterada é rejeitada.
- A mesma solução enviada duas vezes dá a mesma pontuação.
- O jogo abre e é jogável sem variável de ambiente e sem rede.

## 4. Fase 2 — Duelo assíncrono

Reaproveita tudo da fase 1. É "o mesmo desafio, cada um na sua hora".

### 4.1 Como funciona

1. A desafia B escolhendo uma era. O servidor cria o duelo com uma **seed nova**
   e a dificuldade.
2. Cada um joga o desafio daquela seed quando quiser, dentro de um prazo.
3. Cada envio passa pelo `validate-run` (nada novo aqui).
4. Com os dois envios, o servidor compara as pontuações e fecha o duelo.

```
duels (id, seed text, era text, difficulty int, challenger fk, opponent fk,
       challenger_run fk null, opponent_run fk null,
       status text,           -- aberto | aguardando | fechado | expirado
       expires_at, created_at)
```

### 4.2 Variações que cabem na mesma tabela

- **Duelo de era**: uma seed, um minijogo.
- **Maratona**: seis seeds, uma por era; ganha quem somar mais.
- **Chefão do dia entre amigos**: o BUG Day 0 com a seed do dia; ganha a melhor
  pontuação de `bossScore`.

### 4.3 Convite

Link com o id do duelo (o jogo já é uma página, então é só uma rota). Não exige
lista de amigos nem conta com e-mail — continua valendo o Auth anônimo.

### 4.4 O que decidir antes

- **Nome do jogador.** Hoje não existe. Precisa de um apelido, com filtro de
  palavrão e limite de tamanho. É dado pessoal mínimo, mas é dado: avisar na
  tela e não pedir mais nada.
- **O que o perdedor vê.** Sugestão: a pontuação do outro sempre, a solução do
  outro só depois que os dois enviaram.

## 5. Fase 3 — Batalha de tecnologias em tempo real

Aqui o jogo deixa de ser assíncrono. É a parte cara, e a única que contraria o
briefing.

### 5.1 A ideia

Um combate de dois jogadores com a gramática do BUG Day 0, que os dois já
conhecem quando chegam aqui:

- Cada jogador tem a sua máquina (integridade) e os seus poderes, no nível que
  conquistou.
- No turno, um jogador **lança um ataque de uma era** — por exemplo "Pacotes
  perdidos", da era de Redes.
- O outro **responde com um poder**, resolvendo o micro-desafio daquela era
  (o mesmo `generate(seed, 'micro')` que o chefão usa).
- A eficiência da resposta decide: neutraliza, reduz ou leva o dano inteiro.
- Depois trocam os papéis.

O nome "batalha de tecnologias" vem daí: cada golpe é uma tecnologia de uma era,
e a defesa é saber usar a tecnologia que a responde. Não entra regra de combate
nova — entra um segundo jogador no lugar do BUG.

### 5.2 Por que cabe no que já existe

`core/boss.ts` já é uma máquina de estados pura: estado + ação → estado novo. A
batalha entre jogadores seria um irmão dele, `core/versus.ts`, com as mesmas
peças (`strikeDamage`, `neutralizes`, `damageMultiplier`). Os micro-desafios não
mudam nada.

### 5.3 O que é novo, e é muito

| Peça                     | Por que é cara                                                    |
| ------------------------ | ----------------------------------------------------------------- |
| Canal em tempo real      | Supabase Realtime (ou WebSocket próprio); conexão cai no celular  |
| Servidor como árbitro    | O estado do combate mora no servidor; o cliente só manda ação     |
| Relógio de turno         | Sem limite de tempo, um jogador segura o outro para sempre        |
| Reconexão e abandono     | Decidir o que acontece quando alguém fecha a aba no meio          |
| Pareamento               | Fila, ou só "sala com código" (muito mais simples — começar por aí) |
| Equilíbrio               | Poder nível 3 contra nível 1 não é batalha; precisa de faixa      |

### 5.4 Regras que evitam trapaça

- O cliente manda **ação e solução**, nunca dano nem resultado.
- A seed de cada micro-desafio é **sorteada pelo servidor** e só chega ao
  cliente na hora do turno — senão dá para resolver antes.
- O servidor roda `evaluate` em cada resposta, com o mesmo `core`.
- O relógio que vale é o do servidor.

### 5.5 Um meio-termo que vale considerar

Antes de tempo real de verdade, uma **batalha por turnos assíncrona**: cada
jogador faz a sua jogada quando abre o jogo, como xadrez por correspondência.
Usa a mesma tabela de duelos com uma lista de turnos, não precisa de canal em
tempo real nem de reconexão, e entrega a mesma fantasia de "minha tecnologia
contra a sua". Recomendação: fazer esta antes, e só partir para o tempo real se
ela mostrar que as pessoas querem jogar ao mesmo tempo.

## 6. Ordem sugerida e o que cada fase destrava

| Fase | Entrega                         | Depende de | Tamanho  |
| ---- | ------------------------------- | ---------- | -------- |
| 1    | Ranking validado no servidor    | —          | médio    |
| 2    | Duelo assíncrono por link       | 1          | pequeno  |
| 2b   | Batalha por turnos assíncrona   | 2          | médio    |
| 3    | Batalha em tempo real           | 2b         | grande   |

A fase 1 é a única obrigatória para o critério de aceite 8 do briefing
("ranking validado no servidor"). As outras são acréscimo.

## 7. O que não muda, em nenhuma fase

- **O jogo continua abrindo offline e sem conta.** Multiplayer é modo a mais,
  nunca pré-requisito da campanha.
- **O núcleo continua puro.** `core/versus.ts`, se existir, segue as regras de
  `tests/contract/architecture.test.ts` como qualquer outro arquivo do núcleo.
- **Todo número de balanceamento em `core/constants.ts`.**
- **100% por toque**, alvo de 44 px, sem arrastar.
- **Sem dado pessoal além do apelido.** Público adolescente: nada de chat livre
  entre jogadores. Se houver comunicação, que seja por frases prontas.

## 8. Perguntas em aberto para o grupo

1. O tempo real (fase 3) entra no TCC ou fica como trabalho futuro no texto?
2. O ranking é geral, por turma, ou os dois? "Por turma" pede um código de sala.
3. O nível de poder vale na batalha entre jogadores, ou todo mundo luta com os
   poderes no mesmo nível para ficar justo?
4. Quem mantém o projeto do Supabase depois da defesa?
