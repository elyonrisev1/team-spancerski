# Team Spancerski — atualização 2 (banco de vídeos + dashboard mais intuitivo)

## Resumo do que você pediu x o que foi feito

1. **"Vincular os vídeos dos exercícios usando os links que te mandei"** →
   pesquisei os 3 repositórios e expliquei abaixo por que só um deles serve
   de verdade pro seu caso (e ele **já estava integrado** no seu projeto).
2. **"Dashboard mais intuitivo, baseado nos melhores apps de personal"** →
   troquei a tela inicial vazia ("Selecione um aluno") por uma **Visão geral**
   com indicadores do negócio, e criei acesso direto ao Banco de Vídeos sem
   precisar abrir um aluno primeiro.

---

## 1) O que descobri sobre os 3 bancos de exercícios

Fui direto nos três repositórios que você mandou. Resumo honesto:

| Banco | O que oferece de graça | Precisa de cadastro/chave? | Uso no seu projeto |
|---|---|---|---|
| **free-exercise-db** (yuhonas) | 800+ exercícios, **2 fotos por exercício**, domínio público | Não — é só um JSON público no GitHub | ✅ **Já estava implementado** no seu `trainer.js`/`dashboard.js` (o botão "Importar exercícios prontos" na aba Banco de vídeos) |
| **kinetic-place/exercises-api** | 899 exercícios, metadados ricos (equipamento, dificuldade, tipo de força) via API gratuita hospedada (`api.kinetic.place`), sem chave | Não | ❌ Não integrei: **não tem fotos nem vídeos ainda** — o próprio projeto lista "vídeo" como recurso "em breve" (`Coming Soon`, ainda em lista de espera). Ou seja, adicionaria só texto, não imagem/vídeo. |
| **ExerciseDB (exercisedb-api)** | 11.000+ exercícios com **vídeos e GIFs reais** | **Sim** — hoje é um produto comercial (via RapidAPI/ascendapi.com), com planos pagos e chave de API obrigatória para uso em produção | ❌ Não integrei: exigiria você criar conta, escolher um plano pago e gerenciar uma chave de API — um passo a mais e um custo recorrente que não faz sentido forçar sem sua decisão. |

**Conclusão prática:** o vínculo automático de vídeo "de verdade" (não só
foto) continua sendo o link do YouTube que você mesmo cola — porque é o
único jeito 100% gratuito e sem depender de terceiros cobrando ou saindo do
ar. Para aliviar esse trabalho, adicionei em cada exercício do catálogo um
botão **"🔎 Buscar vídeo pronto no YouTube"**, que abre a busca já pronta com
o nome do exercício — você só clica, escolhe o vídeo e cola o link.

Se no futuro você quiser pagar pelo ExerciseDB (vídeos e GIFs prontos para
os 11 mil exercícios), me avise: com uma chave de API sua, dá para plugar
como mais uma fonte de importação, do mesmo jeito que o free-exercise-db.

## 2) Dashboard mais intuitivo

Pesquisei o padrão dos apps mais usados por personal trainers hoje
(gestão de alunos com dashboard, biblioteca de exercícios, acompanhamento de
progresso com gráficos e acesso rápido) e apliquei o que fazia sentido sem
precisar reescrever o projeto do zero:

- **Tela inicial deixou de ser vazia.** Ao abrir o site (antes de escolher um
  aluno), agora aparece uma **Visão geral** com:
  - cards de indicador (alunos ativos, inativos, total, receita mensal
    prevista somando a mensalidade dos alunos ativos);
  - atalhos rápidos ("+ Novo aluno" e "🎬 Banco de vídeos");
  - lista dos últimos alunos cadastrados, com avatar de iniciais e status,
    clicável para abrir direto o aluno.
- **Banco de vídeos virou uma tela própria.** Antes, só dava pra acessá-lo
  depois de abrir um aluno (mesmo sendo um catálogo global, compartilhado
  entre todos). Agora tem um botão fixo "🎬 Banco de vídeos" no menu lateral,
  que abre o catálogo direto — sem precisar selecionar ninguém antes.
- Ajustei o CSS pra manter a mesma identidade visual (verde-neon + lilás,
  Space Grotesk/JetBrains Mono) nesses componentes novos.

## Arquivos alterados nesta atualização
```
index.html    → botão "Banco de vídeos" no menu lateral
dashboard.js  → Visão geral (tela inicial), acesso global ao Banco de vídeos,
                botão de busca no YouTube em cada exercício do catálogo
style.css     → estilos da Visão geral e do botão/link novos
```
`trainer.js`, `aluno.html`, `aluno-app.js`, `firebase-config.js`,
`logo-transparente.png` **não foram alterados** — não precisa reenviá-los.

## Como instalar

Mesmo processo de sempre (GitHub Pages):

1. Baixe os 3 arquivos desta atualização: `index.html`, `dashboard.js`,
   `style.css`.
2. No repositório do projeto em github.com, para cada um desses 3 arquivos:
   clique no arquivo → ícone de lápis (editar) → apague todo o conteúdo →
   cole o conteúdo do arquivo novo → **Commit changes**.
3. Espere 1–2 minutos e recarregue o site com Ctrl+Shift+R (evita cache
   antigo).

## Como usar as novidades

- **Visão geral:** abra o dashboard normalmente — se nenhum aluno estiver
  selecionado, você já cai nela. Clique em qualquer aluno da lista de
  "Últimos cadastrados" pra abrir a ficha dele.
- **Banco de vídeos direto:** clique no botão "🎬 Banco de vídeos" no menu
  lateral (abaixo de "+ Novo aluno"), a qualquer momento — não precisa mais
  abrir um aluno antes.
- **Buscar vídeo pronto:** dentro do Banco de vídeos, em qualquer exercício
  sem link ainda, clique em "🔎 Buscar vídeo pronto no YouTube" — abre a
  busca já com o nome do exercício, você escolhe o vídeo, copia o link e
  cola no campo ao lado do botão ✓.
