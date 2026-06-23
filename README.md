# TEAM FF | CONSULTORIA — Demo MVP v1

> **Performance. Estética. Disciplina.** — Plataforma de consultoria de treino (Hybrid Training).
> Head Coach: **Fábio Filho** · [@teamff.consultoria](https://instagram.com/teamff.consultoria)

App **full-stack** seguindo o documento _Arquitetura Geral V2_, já populado com
**dados de exemplo** e **otimizado para deploy na Vercel** (deploy único).

- **App único Next.js 14** (App Router) — UI + **API em `/api`** via Route Handlers.
- **Tailwind CSS** — tema _All Black_ estrito.
- **PostgreSQL serverless** (Neon / Vercel Postgres / Supabase) via `DATABASE_URL`.
- **Storage:** stub de _Presigned URL_ (R2/S3) — contrato pronto, sem upload real no demo.

> A API roda na **mesma origem** do front (sem CORS, sem URL para configurar).
> Não há servidor separado: tudo sobe como **funções serverless** na Vercel.

---

## ▲ Deploy na Vercel (passo a passo)

### 1. Crie um PostgreSQL serverless
Use **[Neon](https://neon.tech)** (grátis) ou **Vercel Postgres** (Storage → Create → Postgres).
Copie a **connection string com pooler** (no Neon, o host contém `-pooler`), algo como:

```
postgres://USER:SENHA@ep-xxxx-pooler.sa-east-1.aws.neon.tech/teamff?sslmode=require
```

### 2. Importe o repositório na Vercel
- **New Project → Import** este repositório.
- **Framework:** Next.js (detectado automaticamente — o app está na **raiz**).
- **Root Directory:** deixe no padrão (`./`). Não precisa de `vercel.json`.

> ✅ O repositório é um **único app Next.js na raiz** (sem subpastas de serviço), então
> a Vercel reconhece um projeto só. Se o seletor de _Application Preset_ aparecer,
> escolha **Next.js** (não “Services”).

### 3. Configure a variável de ambiente
Em **Settings → Environment Variables**, adicione:

| Nome                    | Valor                                             |
| ----------------------- | ------------------------------------------------- |
| `DATABASE_URL`          | a connection string do passo 1                    |
| `PUBLIC_MEDIA_BASE_URL` | `https://media.teamff.dev` _(opcional, stub)_     |

> Não defina `NEXT_PUBLIC_API_URL` — a API é servida em `/api` na mesma origem.

### 4. Deploy
Clique em **Deploy**. Ao final você terá a URL pública (ex.: `https://teamff.vercel.app`).

### 5. Carregue os dados de exemplo (uma vez)
Duas opções:

**a) Via SQL editor do Neon/Supabase** — cole e rode o conteúdo de
[`db/schema.sql`](db/schema.sql) e depois [`db/seed.sql`](db/seed.sql).

**b) Pelo terminal** (a partir da máquina local, apontando para o banco cloud):

```bash
# Windows PowerShell:  $env:DATABASE_URL="postgres://...sslmode=require"
# bash:                export DATABASE_URL="postgres://...sslmode=require"
npm install
npm run db:setup
```

Pronto. Acesse a URL da Vercel e comece pela home. ✅

> Verifique a saúde em `https://SEU-APP.vercel.app/api/health` → deve responder `"db":"up"`.

---

## 🐳 Rodar localmente com Docker (espelha a Vercel)

Pré-requisito: **Docker Desktop**.

```bash
docker compose up --build      # depois abra http://localhost:3000
```

Sobe **PostgreSQL** (auto-semeado com schema + seed) + **Next.js** (UI + API).
Resetar o banco: `docker compose down -v && docker compose up --build`.

## 🛠️ Rodar localmente sem Docker

Requer **Node 20+** e um **PostgreSQL** local.

```bash
# 1) crie o banco e carregue os dados
createdb teamff
cp .env.local.example .env.local   # ajuste DATABASE_URL
npm install
npm run db:setup                   # roda schema.sql + seed.sql

# 2) suba o app (UI + API)
npm run dev                                         # http://localhost:3000
```

---

## 🎬 Roteiro de demonstração (para o cliente)

1. **Home** (`/`) — identidade _All Black_ e os dois quadrantes.
2. **Painel do Consultor** (`/coach`) — KPIs, lista de alunos e **fila de vídeos**.
3. **Detalhe do aluno** (_Lucas Andrade_ ou _Bruno Tavares_) — plano ativo, abra um treino
   registrado e **escreva um feedback de execução** num vídeo pendente → vira **✓ Revisado**.
4. **Área do Aluno** (`/aluno`) — "entre" como aluno, veja o treino do dia, **registre cargas/RPE**
   e **anexe um vídeo** (simulado).
5. **Card de Stories** — ao concluir, gere o **PNG estilo Strava com fundo transparente**.

> 💡 Melhores alunos para a revisão de vídeos: **Lucas Andrade** e **Bruno Tavares**.

---

## 👥 Dados de exemplo (seed)

- **1 coach** (Fábio Filho) · **6 alunos** com objetivos distintos.
- **7 planos** (1 arquivado) · **18 treinos** · **90 exercícios**.
- **9 sessões registradas** com RPE e relato · **45 feedbacks**.
- **Vídeos:** 5 revisados (com comentário do coach) + 8 pendentes (fila de revisão).

Senha fictícia (não há tela de login no demo): `teamff123` · coach: `coach@teamff.consultoria`.

---

## 🔌 Endpoints da API (`/api`, mesma origem)

| Método  | Rota                              | Descrição                                  |
| ------- | --------------------------------- | ------------------------------------------ |
| `GET`   | `/api/health`                     | Status do serviço + conexão com o banco    |
| `GET`   | `/api/coach/overview`             | KPIs + fila de vídeos + atividade recente  |
| `GET`   | `/api/students`                   | Lista de alunos (resumo)                   |
| `GET`   | `/api/students/:id`               | Aluno + plano ativo + treinos + logs       |
| `GET`   | `/api/workouts/:id`               | Treino + exercícios                        |
| `GET`   | `/api/logs/:id`                   | Detalhe do log (alimenta o ShareableCard)  |
| `POST`  | `/api/logs`                       | Registrar um treino (aluno)                |
| `PATCH` | `/api/logs/:id`                   | Feedback geral do coach na sessão          |
| `PATCH` | `/api/feedbacks/:id/review`       | Coach revisa um vídeo de execução          |
| `POST`  | `/api/uploads/presign`            | Presigned URL (stub R2/S3)                 |

---

## 📁 Estrutura

App **único Next.js na raiz** (deploy direto na Vercel, sem configuração extra):

```
.
├── package.json                # app Next.js (raiz = root do projeto na Vercel)
├── next.config.js
├── db/
│   ├── schema.sql              # modelagem PostgreSQL (do documento)
│   └── seed.sql                # dados de exemplo
├── scripts/setup-db.mjs        # carrega schema + seed no DATABASE_URL
├── src/
│   ├── app/                    # páginas + app/api/* (Route Handlers = a API)
│   ├── server/                 # db.ts (pool serverless) + queries.ts
│   ├── components/             # ShareableCard, Brand
│   └── lib/                    # api client (fetch relativo) + format
└── docker-compose.yml          # db + app (espelha a Vercel localmente)
```

> ℹ️ A versão inicial tinha um backend Fastify separado em `backend/`. Ele foi
> **removido** (a API agora roda integrada no Next.js em `app/api/*`) para a Vercel
> reconhecer um único serviço. O código continua no histórico do git, se precisar.

> ⚠️ Ambiente de **demonstração**: autenticação, processamento de mídia real e
> hardening de produção foram simplificados para foco na visualização do produto.
