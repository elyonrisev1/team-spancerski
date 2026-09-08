# Team Spancerski — versão pronta para GitHub + Cloudflare

Esta versão recompõe os arquivos ausentes `dashboard.js` e `aluno-app.js`, corrige a URL do Worker e organiza a configuração em `config.js`.

## Funcionalidades

- Dashboard do personal
- Cadastro/edição de alunos
- WhatsApp
- Link do portal do aluno
- Protocolo de treino
- Importação de DOCX/PDF com IA + prévia
- Dieta em DOCX/PDF
- 4 fotos por lote: primeiro = ATUAL; segundo = ANTES/DEPOIS
- Histórico de lotes
- Resumo de evolução com Workers AI
- Avaliação de 7 dobras
- Mesociclos
- Financeiro
- Banco de vídeos / ExerciseDB
- Portal do aluno
- Exportação PDF

## Configuração rápida

1. Edite `config.js` e preencha WhatsApp/Instagram.
2. Confirme a URL real do Worker.
3. Faça deploy do Worker com Wrangler.
4. Publique o frontend no Cloudflare Pages ou GitHub Pages.
5. Configure regras do Firebase antes de uso real com alunos.

> A configuração Firebase existente foi preservada. Chaves públicas de configuração do Firebase não substituem as regras de segurança do banco/storage.
