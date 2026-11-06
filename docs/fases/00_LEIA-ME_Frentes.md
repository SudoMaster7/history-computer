# LEIA-ME: prompts por frente (Da Válvula à IA)

Cada arquivo é um **prompt completo** para colar no Claude Code (ou ler como briefing). Todos trazem o **mesmo contexto comum** (contratos, regras RPG, requisitos mobile) mais a parte **específica da frente**.

| Arquivo                      | Frente | O que entrega                                                                                          |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| `F1_Core_e_Servidor.md`      | F1     | Projeto base, `core/` (RPG, poderes, chefão, pontuação, seed, portão), serviços, Supabase, CI e deploy |
| `F2_3D_Hub_Chefao_Bit.md`    | F2     | Hub 3D evolutivo, arena do chefão, Bit com peças por poder, desempenho e fallback de WebGL             |
| `F3_Interface_e_Eras_1-2.md` | F3     | HUD, árvore de poderes, portão, combate, ranking; minijogos Tear de Engrenagens e Circuitos Lógicos    |
| `F4_Eras_3-4.md`             | F4     | Minijogos Mesa de Bits e Rota dos Pacotes                                                              |
| `F5_Eras_5-6_e_Conteudo.md`  | F5     | Minijogos Cofre Criptográfico e Treinar o Detector; cartas, diálogos; pesquisa e validação             |

## Ordem e dependências

1. **Dia 1–2:** a **F1 publica os tipos** (`core/types.ts`, `registry.ts`, `constants.ts`, assinaturas). Todo mundo depende disso.
2. **S1:** as demais frentes trabalham contra os tipos e usam _stubs_ do que ainda não existe.
3. **Pontos de integração:**
   - F3 ⇄ F1: `rpg`, `powers`, `timeline`, `boss`, `Api`.
   - F3 ⇄ F2: `<HubScene/>`, `<Bit/>`, `<BossArena/>` (props definidas no arquivo da F2).
   - F3 ⇄ F4/F5: `MinigameModule` (o `Screen` é chamado pela tela de missão e, com `mode='micro'`, pelo combate).
   - F5 → F1: `cards.json` (S2) e resumo de calibragem (S3).
4. **S3:** versões `micro` de todos os minijogos + combate. **Congelamento de escopo** na quinta da S3.

## Contratos que valem para todos

- `core/` e `logic.ts` dos minijogos: **puros e determinísticos**, sem React/Three/DOM/rede.
- Referência calculada por `reference(instance)`; `missions.json` guarda só `{ id, era, letter, difficulty, seed }`.
- Tudo **jogável por toque**, alvos ≥ 44 px, retrato primeiro.
- Mudança de contrato: avisar a F1 e registrar em `DECISIONS.md`.
