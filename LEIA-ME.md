# Team Spancerski — atualização (relatório automático, banco de vídeos, visual)

## O que mudou

**1. Relatório automático de evolução (aba "Avaliação física")**
- As fotos continuam sendo salvas imediatamente ao enviar, como já era.
- A partir da 2ª avaliação de dobras cutâneas ou da 2ª foto enviada, aparece
  automaticamente um bloco **"📊 Relatório automático de evolução"** no topo da
  aba, com:
  - IMC atual + classificação (peso normal, sobrepeso, etc.);
  - cards de Peso, % de gordura, Massa magra e Massa gorda, cada um com a seta
    (↑/↓) e o % de variação em relação à avaliação anterior;
  - gráfico de linha (peso e % de gordura ao longo do tempo);
  - as duas fotos mais recentes lado a lado ("Antes" / "Atual");
  - uma lista de "apontamentos" em texto simples (ex: "Reduziu 1.2kg de peso
    desde a última avaliação").
- Tudo isso é recalculado sozinho a cada novo envio — não precisa clicar em
  nada.

**2. Banco de vídeos de exercícios (nova aba "Banco de vídeos")**
- Catálogo global de exercícios (compartilhado entre todos os alunos), já
  vem com **mais de 60 exercícios comuns pré-cadastrados** (Peito, Costas,
  Ombro, Bíceps, Tríceps, Pernas, Glúteos, Panturrilha, Abdômen, Cardio),
  organizados por grupo muscular e com busca.
- Para cada exercício, você só precisa colar o link do YouTube (ou Vimeo) uma
  única vez — o app extrai a miniatura automaticamente.
- Dá pra adicionar novos exercícios ao catálogo a qualquer momento.
- **Importante:** os exercícios não vêm com vídeo prontos — não incluí links
  de vídeo de terceiros para evitar links quebrados ou de canais que talvez
  não autorizem incorporação. Você cola o link real (do seu canal, de um
  vídeo educativo, etc.) e ele passa a valer para todos os alunos.
- No formulário de "Adicionar exercício" do protocolo de treino, agora existe
  autocomplete: comece a digitar e os nomes do catálogo aparecem. Se o nome do
  exercício no protocolo for igual (ou bem parecido) ao nome no catálogo, o
  aluno já vê o botão **"▶ Ver vídeo do exercício"** automaticamente na tela
  dele, sem você precisar configurar nada por aluno.

**3. Visual / logo**
- Troquei todas as referências de `logo.jpeg` pela `logo-transparente.png`
  (a que você enviou, com fundo realmente transparente) — tanto no dashboard
  quanto na tela do aluno e no cabeçalho do PDF exportado. Isso resolve o
  quadrado/fundo escuro atrás da logo.
- Ajustei fontes, espaçamentos e adicionei um brilho neon sutil (glow) na
  logo e nos botões principais, deixando o visual mais parecido com a
  referência que você enviou no ZIP (mesma paleta verde-neon/lilás sobre
  fundo escuro, tipografia Space Grotesk + JetBrains Mono).
- A paleta de cores já estava bem alinhada com a referência do ZIP; o maior
  ajuste foi de acabamento (glow, hierarquia visual dos cards).

## Arquivos alterados
```
index.html        → logo trocada
aluno.html        → logo trocada (ícone)
aluno-app.js      → logo trocada + suporte a vídeo de exercício
dashboard.js      → relatório automático + aba "Banco de vídeos"
trainer.js        → cálculo de IMC/relatório + catálogo de vídeos + logo no PDF
style.css         → estilos novos (relatório, catálogo, glow, modal de vídeo)
logo-transparente.png → arquivo da logo (novo, precisa subir também)
```
`firebase-config.js` **não foi alterado** — não precisa mexer nele.

## Como instalar (passo a passo)

Você está hospedando pelo GitHub Pages (`elyonrisev1.github.io/team-spancerski`),
então o processo é: substituir os arquivos no repositório e enviar (commit/push).

### Opção A — pelo site do GitHub (mais simples, sem instalar nada)
1. Baixe o arquivo `team-spancerski-atualizado.zip` e extraia no computador.
2. Acesse o repositório do projeto em github.com (o mesmo que o GitHub Pages
   publica).
3. Para cada arquivo da lista acima (`index.html`, `aluno.html`,
   `aluno-app.js`, `dashboard.js`, `trainer.js`, `style.css`):
   - Clique no arquivo dentro do repositório → ícone de lápis (editar) →
     apague todo o conteúdo → cole o conteúdo do arquivo novo → **Commit
     changes**.
4. Envie também o `logo-transparente.png`:
   - Na página principal do repositório, clique em **Add file → Upload
     files**, arraste o `logo-transparente.png` e clique em **Commit
     changes**.
5. Espere 1–2 minutos (o GitHub Pages publica sozinho) e recarregue o site
   (Ctrl+Shift+R para forçar o navegador a não usar cache antigo).

### Opção B — usando Git na linha de comando
```bash
# dentro da pasta do repositório clonado
cp /caminho/para/team-spancerski-atualizado/*.* .
git add index.html aluno.html aluno-app.js dashboard.js trainer.js style.css logo-transparente.png
git commit -m "Relatório automático de evolução, banco de vídeos e ajustes visuais"
git push
```

## Como usar as novidades

- **Relatório automático:** vá em um aluno → aba "Avaliação física" → registre
  a 1ª avaliação de dobras (ou envie a 1ª foto). Na 2ª vez, o relatório
  aparece sozinho no topo da aba.
- **Banco de vídeos:** vá em um aluno → aba "Banco de vídeos" → cole o link do
  YouTube no exercício desejado → clique no ✓. A partir daí, qualquer aluno
  (não só esse) que tiver esse exercício no protocolo já verá o botão de
  vídeo. Se quiser adicionar um exercício que não está na lista, use o
  formulário "Novo exercício" no topo da aba.
- **Dica de nomenclatura:** para o botão de vídeo aparecer para o aluno, o
  nome do exercício cadastrado no protocolo de treino precisa ser igual (a
  comparação ignora maiúsculas/acentos, mas não erros de digitação) ao nome
  no catálogo. Use o autocomplete do campo "Exercício" para garantir que bate
  certinho.
