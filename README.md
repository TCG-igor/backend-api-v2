# Átria TCG Backend API

Backend MVP em Node.js + TypeScript para autenticação, verificação de e-mail, recuperação de senha, criação de empresa/loja e aprovação administrativa.

## Stack

- Node.js 20+
- TypeScript
- Express
- JWT
- bcryptjs
- Jest + Supertest

## Requisitos

- Node.js 20+
- npm

## Instalação

```bash
npm install
```

Crie um arquivo `.env` baseado em `.env.example`:

```bash
cp .env.example .env
```

## Variáveis de ambiente

```env
PORT=3333
JWT_SECRET=troque-esta-chave
BREVO_API_KEY=
```

Quando `BREVO_API_KEY` estiver vazia, o serviço de e-mail entra em modo mock e registra logs no console em vez de enviar mensagens reais.

## Como executar

Desenvolvimento:

```bash
npm run dev
```

Produção:

```bash
npm run build
npm start
```

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

- A implementação atual usa armazenamento em memória, adequado para MVP e testes.
- A autorização administrativa é feita via `isAdmin` no usuário autenticado.
- O fluxo de e-mail usa Brevo quando a chave está configurada; sem chave, segue em modo mock para ambiente local.

## Testes

```bash
npm test --silent
```
