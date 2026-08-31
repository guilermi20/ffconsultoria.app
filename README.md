# FF Training — Módulo 1: Check-in semanal

Painel de gestão da FF Consultoria. O Módulo 1 entrega o ciclo completo do
check-in semanal: cadastro dos alunos, formulário configurável, link pessoal de
cada aluno, disparo semanal por WhatsApp, painel do coach e gráficos de evolução
— por aluno e da turma.

Identidade **All Black**: fundo preto, tipografia Inter, vermelho como único
acento. Wordmark `TEAM FF · Consultoria`.

---

## Rodando local

Precisa de Node 20+ e um Postgres 13+. Se não tiver Postgres na máquina, o
projeto sobe um efêmero (PGlite) sem Docker e sem instalar nada.

```bash
npm install
cp .env.local.example .env.local     # ajuste DATABASE_URL e AUTH_SECRET

# terminal 1 — Postgres de desenvolvimento (opcional, se já tiver um, pule)
node scripts/dev-db.mjs

# terminal 2 — schema + coach + perguntas padrão + base de demonstração
npm run db:demo

# terminal 3
npm run dev
```

Abra http://localhost:3000 e entre com as credenciais que o `db:demo` imprime
(por padrão `fabio@ffconsultoria.com` / `ff2026` — defina `COACH_EMAIL` e
`COACH_PASSWORD` no `.env.local` para trocar).

> Usando o Postgres de desenvolvimento, mantenha `DB_POOL_MAX=1` no
> `.env.local`: o PGlite aceita uma conexão por vez. Com um Postgres de verdade,
> remova a variável.

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe a aplicação em modo de desenvolvimento |
| `npm run build` / `npm start` | Build e execução em produção |
| `npm run db:setup` | Aplica o schema, cria o coach e as perguntas padrão |
| `npm run db:demo` | O mesmo, mais uma base de demonstração (8 alunos, 14 semanas) |
| `npm run db:dev` | Postgres efêmero local (PGlite), sem Docker |
| `npm run check:sql` | Valida schema e consultas contra um Postgres real |
| `npm run check:e2e` | Verificação ponta a ponta com a aplicação rodando |

`db:setup` é **não-destrutivo** e pode rodar quantas vezes precisar. Para zerar
os dados, use `node scripts/setup-db.mjs --demo --reset`.

---

## O que o Módulo 1 entrega

**Coach**

- **Painel da semana** — quem já respondeu e quem falta, taxa de resposta por
  semana e a média da turma em cada métrica acompanhada.
- **Check-ins** — todas as respostas da base, filtráveis por semana e por aluno,
  com a resposta completa e espaço para a anotação do coach.
- **Alunos** — cadastro dos alunos ativos, sequência de semanas respondidas e o
  link pessoal de cada um.
- **Perfil do aluno** — um gráfico de evolução por métrica e o histórico completo
  de check-ins.
- **Disparos de WhatsApp** — fila semanal com a mensagem já montada e o link
  pessoal embutido.
- **Perguntas do check-in** — o formulário é montado pelo coach: tipo, ordem,
  obrigatoriedade e quais perguntas viram gráfico.
- **Importar histórico** — CSV do Google Forms, com mapeamento de colunas.

**Aluno** (sem senha, pelo link pessoal)

- `/checkin/<token>` — responde o check-in. É o mesmo link todas as semanas.
- `/aluno/<token>` — vê a própria evolução em gráficos e todas as respostas que
  já enviou, desde que entrou na consultoria, com o retorno do coach.

---

## Perguntas do check-in

As perguntas ficam no banco, não no código. O formulário do aluno, os gráficos e
o importador são todos gerados a partir de `checkin_questions`.

| Tipo | Uso | Vira gráfico? |
|---|---|---|
| `escala` | nota de 0 a 10 | sim |
| `numero` | peso, número de treinos, medidas | sim |
| `sim_nao` | dor, uso de suplemento | sim |
| `escolha` | múltipla escolha | não |
| `texto` / `texto_longo` | relato livre | não |

Marcar uma pergunta como *acompanhar em gráfico* só é possível nos tipos
numéricos — é o que alimenta as séries de evolução.

Perguntas que já têm respostas não são apagadas, apenas arquivadas: o histórico
que sustenta os gráficos fica preservado.

---

## WhatsApp

O envio fica atrás de uma interface (`src/server/whatsapp.ts`). Trocar de
provedor é trocar `WHATSAPP_PROVIDER`, sem mexer no resto da aplicação.

| Valor | Comportamento |
|---|---|
| `manual` (padrão) | Monta a fila e gera o link `wa.me`; o coach clica e envia |
| `evolution` | Evolution API / Z-API — exige `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN`, `WHATSAPP_INSTANCE` |
| `cloud` | WhatsApp Cloud API (Meta) — exige conta business e template aprovado |

A mensagem aceita `{nome}`, `{nome_completo}`, `{link}` e `{painel}`.

Montar a fila também cria a semana como *pendente* no painel do coach, então
quem não respondeu aparece na lista de cobrança mesmo sem nenhum envio.

---

## Importação do Google Forms

No Forms: **Respostas → Vincular ao Sheets → Arquivo → Download → CSV**. Em
*Importar histórico*, o app lê o cabeçalho, adivinha a coluna de data e a que
identifica o aluno, e casa automaticamente as colunas que já correspondem a
perguntas existentes. As demais podem virar perguntas novas ou ser ignoradas.

- Datas aceitas: `DD/MM/AAAA [HH:MM]`, `AAAA-MM-DD` e ISO. Cada resposta cai na
  semana (segunda-feira) da sua data.
- Números aceitam vírgula decimal (`60,6` → `60.6`).
- Alunos que ainda não existem podem ser criados na importação.
- Reimportar a mesma planilha atualiza as respostas, não duplica check-ins.

---

## Produção

1. Provisione um Postgres (Neon, Supabase, Railway) e aponte `DATABASE_URL`.
   Não é preciso extensão: `gen_random_uuid()` é nativo do Postgres 13+.
2. Defina um `AUTH_SECRET` longo e aleatório — ele assina o cookie de sessão.
3. `NEXT_PUBLIC_APP_URL` precisa ser a URL pública, senão os links enviados aos
   alunos apontam para `localhost`.
4. Rode `npm run db:setup` uma vez (sem `--demo`) com `COACH_EMAIL` e
   `COACH_PASSWORD` definidos.
5. Remova `DB_POOL_MAX` do ambiente.

O token do aluno é um segredo de URL: quem tem o link responde o check-in e vê o
painel daquele aluno. Dá para invalidar e gerar outro pelo perfil do aluno.

---

## Estrutura

```
db/schema.sql            schema não-destrutivo
scripts/setup-db.mjs     schema + coach + perguntas padrão + demo
scripts/dev-db.mjs       Postgres efêmero local (PGlite)
scripts/check-sql.mjs    valida schema e consultas
scripts/check-e2e.mjs    verificação ponta a ponta
src/server/              banco, sessão, consultas, CSV, WhatsApp
src/components/          UI, gráficos SVG, formulários
src/app/coach/           painel do coach (protegido)
src/app/checkin/[token]  formulário do aluno
src/app/aluno/[token]    painel do aluno
```

Os gráficos são SVG inline, sem biblioteca. A paleta de dados foi validada para
contraste e para daltonismo sobre a superfície preta.

---

## Próximos módulos

- **Módulo 2** — aplicativo móvel (iOS/Android), treinos do aluno e criação de
  treinos pelo coach, integração com Strava e wearables.
- **Módulo 3** — geração de treinos por IA via conector exclusivo.
