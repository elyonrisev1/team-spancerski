# Atualização Team Spancerski

## O que esta atualização adiciona

1. Fotos de evolução em lotes de até 4 posições:
   - primeiro envio = Atual;
   - segundo envio = Antes + Depois;
   - terceiro envio = Antes + Depois para a comparação mais recente;
   - históricos antigos continuam disponíveis por data.

2. IA visual:
   - compara as fotos da mesma posição;
   - resume evolução visível;
   - aponta pontos de melhoria;
   - salva o resumo no Firebase;
   - aparece no dashboard, no link do aluno e no PDF.

3. Importação de protocolo:
   - Word (.docx) ou PDF;
   - extrai o texto;
   - IA organiza dias, exercícios, séries, repetições, descanso, carga, técnicas e observações;
   - abre uma prévia para você confirmar antes de salvar.

4. Dieta:
   - Word preserva a estrutura HTML possível do documento;
   - PDF é convertido para texto completo;
   - fica visível no dashboard e no link do aluno;
   - entra também no PDF exportado.

5. PDF completo:
   - treino;
   - avaliações;
   - fotos;
   - resumo da IA;
   - dieta;
   - mesociclos;
   - financeiro.

## Arquivos

- `spancerski-features.js` -> lógica nova.
- `spancerski-features.css` -> visual complementar.
- `worker.js` -> IA no Cloudflare Workers AI.
- `wrangler.toml` -> configuração do Worker.
- `index.html` e `aluno.html` -> versões já com os scripts novos.

## Importante

A conexão GitHub disponível para esta conversa permite leitura, mas não escrita no seu repositório. Por isso, estes arquivos precisam ser enviados/colados por você no GitHub.

A IA usa Cloudflare Workers AI, evitando colocar uma chave de API no JavaScript público do GitHub Pages.

Depois de criar o Worker, altere no topo de `spancerski-features.js`:

const SPANCERSKI_AI_URL = 'https://SEU-WORKER.workers.dev';

para a URL real do seu Worker.

## Cloudflare

No Cloudflare:
1. Crie um Worker.
2. Use o conteúdo de `worker.js`.
3. Ative Workers AI e adicione o binding `AI`.
4. Faça o deploy.
5. A primeira utilização do modelo `@cf/meta/llama-3.2-11b-vision-instruct` exige aceite da licença/uso da Meta.
6. Copie a URL `https://...workers.dev`.
7. Coloque essa URL no `spancerski-features.js`.

O Workers Free tem uma franquia diária de Workers AI; a quantidade exata pode mudar conforme a política do serviço.

## Ordem dos scripts

No dashboard:
firebase -> trainer -> spancerski-features -> dashboard

No aluno:
firebase -> trainer -> spancerski-features -> aluno-app
