# Deploy Team Spancerski — Cloudflare

## Worker

```bash
cd cloudflare-worker
npm install
npx wrangler login
npx wrangler dev
npx wrangler deploy
```

O projeto deste pacote usa `worker.js` e `wrangler.toml` na raiz. Se você estiver usando uma pasta separada, mova os dois arquivos para ela.

Teste:

```text
https://SEU-WORKER.workers.dev/health
```

## Frontend no Cloudflare Pages

Workers & Pages → Create → Pages → Connect to Git → selecione `team-spancerski`.

Se não houver build:

```text
Build command: exit 0
Output directory: /
```

## Configuração

Abra `config.js`:

```js
window.APP_CONFIG = {
  AI_WORKER_URL: 'https://SEU-WORKER.workers.dev',
  PERSONAL_NAME: 'Team Spancerski',
  PERSONAL_WHATSAPP: '55DDDNUMERO',
  PERSONAL_INSTAGRAM: 'https://instagram.com/SEU_INSTAGRAM',
  APP_BASE_URL: '',
  MAX_PHOTOS_PER_EVALUATION: 4
};
```

## Git

```bash
git add .
git commit -m "feat: Team Spancerski complete app"
git push origin main
```

## Atenção

- Não coloque secrets privados no frontend.
- Configure Firebase Rules para produção.
- O link atual do aluno usa `?aluno=ID` por compatibilidade. Para produção com dados pessoais, implemente autenticação/token antes de liberar publicamente.
- A IA visual deve ser tratada como apoio de acompanhamento, não como diagnóstico médico.
