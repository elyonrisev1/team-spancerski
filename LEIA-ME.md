# Team Spancerski — atualização 3 (achei um "ExerciseDB grátis" de verdade)

## O que você pediu
Fiz uma busca mais a fundo atrás de alternativas gratuitas ao ExerciseDB
pago (o que tem vídeo/GIF de verdade, não só foto).

## O que encontrei

Testei ao vivo (não só li a descrição) vários "concorrentes"/alternativas que
apareceram na busca — a maioria é isca de marketing (sites como WorkoutX,
YMove, FitExerciseDB anunciam "grátis" mas pedem cadastro + chave de API
assim que você tenta usar de verdade, e cobram depois de um limite baixo).
Um repositório que parecia perfeito (`free-exercise-db-with-videos`, 317
exercícios com vídeo real) **não existe mais** — o link do GitHub está
retornando "página não encontrada", então não dá pra confiar nele.

Mas achei uma opção real, gratuita, sem cadastro e **testei o endpoint ao
vivo agora** — funcionando de verdade:

> **`https://oss.exercisedb.dev`** — é a camada gratuita e open-source
> mantida pela própria equipe por trás do ExerciseDB pago (AscendAPI). Dá
> acesso a **1.500 exercícios**, cada um já com um **GIF animado real**
> mostrando o movimento completo, nome, músculos e passo a passo — tudo em
> inglês, sem precisar de cadastro nem chave de API.

**O porém, pra você saber exatamente onde está pisando:** é a versão
gratuita de um produto comercial. A empresa pode decidir limitar ou
descontinuar esse acesso gratuito no futuro (foi exatamente o que aconteceu
com a versão antiga do ExerciseDB, que virou paga). Não é sob seu controle.
Por isso, integrei como **mais uma opção de importação**, do lado da que já
existia (free-exercise-db) — os exercícios que você já importou continuam
salvos no seu Firebase mesmo se esse serviço gratuito sair do ar amanhã;
só a importação de novos exercícios pararia de funcionar.

## O que mudou no projeto

Na aba **"Banco de vídeos"**, agora tem dois painéis de importação lado a
lado:

1. **free-exercise-db** (já existia) — fotos estáticas, 800+ exercícios.
2. **ExerciseDB grátis** (novo) — **GIF animado** do movimento, 1.500
   exercícios. Busque em inglês (ex: `squat`, `bench press`, `curl`) e
   clique em "+ Importar".

O aluno passa a ver o GIF animado automaticamente na tela dele (mesmo
comportamento de antes: se você colar um link de vídeo depois, o vídeo tem
prioridade sobre o GIF).

## Arquivos alterados nesta atualização
```
trainer.js     → funções de busca/importação do ExerciseDB grátis (com GIF)
dashboard.js   → segundo painel de importação na aba "Banco de vídeos" +
                 miniatura com GIF no catálogo
aluno-app.js   → aluno vê o GIF como referência quando não há vídeo colado
```
`index.html`, `style.css`, `firebase-config.js`, `aluno.html` e
`logo-transparente.png` **não foram alterados** nesta atualização — não
precisa reenviá-los.

## Como instalar
Mesmo processo de sempre: para cada um dos 3 arquivos acima, abra no
repositório do GitHub → lápis (editar) → apague tudo → cole o conteúdo novo
→ **Commit changes**. Espere 1-2 min e recarregue com Ctrl+Shift+R.
