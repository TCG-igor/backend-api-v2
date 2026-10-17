# Átria TCG Backend API

Backend em Node.js + TypeScript para autenticação, verificação de e-mail, recuperação de senha, criação de empresa/loja e aprovação administrativa.

## Stack

- Node.js 20+
- TypeScript
- Express (runtime local)
- PostgreSQL + Hyperdrive (produção/Cloudflare)
- Cloudflare Worker entrypoint
- JWT
- bcryptjs
- Jest + Supertest

## Requisitos

- Node.js 20+
- npm
- PostgreSQL local ou Hyperdrive configurado para produção

## Instalação

```bash
npm install
cp .env.example .env
```

## Variáveis de ambiente

```env
PORT=3333
JWT_SECRET=replace-with-a-long-random-secret
BREVO_API_KEY=
BREVO_SENDER_EMAIL=no-reply@example.com
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DATABASE?sslmode=disable
HYPERDRIVE_CONNECTION_STRING=postgres://USER:PASSWORD@HOST:5432/DATABASE?sslmode=disable
```

Em produção, o runtime Cloudflare Worker lê o binding `HYPERDRIVE.connectionString` e o Node local usa `DATABASE_URL` quando configurado. Sem banco configurado, a API cai em modo fallback em memória para desenvolvimento e testes locais.

## Health check

- `GET /health`

Resposta esperada:

```json
{ "status": "ok", "service": "atria-tcg-backend", "database": "configured" }
```

## Como executar

Desenvolvimento local:

```bash
npm run dev
```

Produção local (Node):

```bash
npm run build
npm start
```

Deploy em Cloudflare Worker:

```bash
npx wrangler deploy
```

## PostgreSQL / Hyperdrive

A pasta `src/db` contém a preparação de conexão e o schema inicial para as tabelas principais:

- users
- verification_tokens
- recovery_tokens
- companies
- shops
- shop_drafts
- shop_history
- user_draft_index
- submitted_drafts

O objetivo é manter os contratos HTTP atuais e trocar apenas a camada de persistência. A migration SQL está definida em `src/db/postgres.ts` e pode ser usada para criar a base em ambiente real.

## Endpoints principais

### Autenticação

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/verify`
- `POST /api/auth/recovery/request`
- `POST /api/auth/recovery/perform`
- `POST /api/auth/promote`

### Loja

- `POST /api/auth/shop/draft/start`
- `POST /api/auth/shop/draft/update`
- `POST /api/auth/shop/draft/submit`
- `GET /api/auth/shop/draft/me`
- `POST /api/auth/shop/draft/resend`
- `GET /api/auth/shop/:id`
- `GET /api/auth/shop/admin/submitted`
- `POST /api/auth/shop/admin/decide`
- `GET /api/auth/shop/admin/history`
- `POST /api/auth/shop/admin/correct`

## Observações

- A API mantém os endpoints e respostas esperados do MVP.
- A autorização administrativa segue por `isAdmin` no usuário autenticado.
- O envio de e-mail usa Brevo quando a chave está configurada; sem chave, entra em modo mock para ambiente local.
- O runtime de worker evita `app.listen()` em ambientes serverless.

## Testes

```bash
npm test --silent
```
