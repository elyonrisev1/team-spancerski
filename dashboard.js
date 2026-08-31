// ============================================
// INTERFACE DA DASHBOARD DO TREINADOR
// Liga a tela (index.html) com trainer.js
// ============================================

const DIAS_SEMANA = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

const TECNICAS_DISPONIVEIS = [
  'Bi-Set', 'Tri-Set', 'Cluster Set', 'Rest-Pause', 'Myo-Reps',
  'Drop-Set', 'Pré-Exaustão', 'Super-Set', 'Série Gigante',
  'Isometria', 'Negativa', '21s', 'Pico de Contração', 'FST-7'
];

const estado = {
  alunos: [],
  alunoSelecionadoId: null,
  aba: 'protocolo', // protocolo | financeiro | mesociclo | avaliacao
  diaAtivo: DIAS_SEMANA[0],
  protocolo: {},
  pagamentos: {},
  mesociclos: {},
  tecnicasSelecionadas: [],
  semanasMeso: [80, 60, 40],
  execucoes: [],
  avaliacoesDobras: [],
  fotos: [],
  catalogo: [],
  buscaCatalogo: '',
  grupoCatalogoAtivo: 'Todos',
  buscaImportacao: '',
  resultadosImportacao: [],
  buscaImportacaoEDB: '',
  resultadosImportacaoEDB: [],
  telaGlobal: null // null | 'videos' — quando 'videos', mostra o Banco de vídeos sem precisar de um aluno selecionado
};

function iniciarDashboard() {
  trainer.carregarAlunos().then((alunos) => {
    estado.alunos = alunos.sort((a, b) => a.nome.localeCompare(b.nome));
    renderizarRail();
    renderizarPainel();
  });

  // Catálogo de exercícios é global (compartilhado entre todos os alunos).
  // Semeia a lista inicial só na primeira vez (catálogo vazio) e mantém em cache no estado.
  trainer.semearCatalogoSeVazio().then((catalogo) => {
    estado.catalogo = catalogo;
    if (estado.aba === 'videos') renderizarConteudoAba();
  });
}

// ---------- RAIL (lista de alunos) ----------

function renderizarRail() {
  const termo = (document.getElementById('buscaAluno')?.value || '').toLowerCase();
  const filtrados = estado.alunos.filter(a => a.nome.toLowerCase().includes(termo));

  const lista = document.getElementById('listaAlunosRail');
  if (!filtrados.length) {
    lista.innerHTML = `<div class="vazio-rail">${estado.alunos.length ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado ainda'}</div>`;
    return;
  }

  lista.innerHTML = filtrados.map(a => `
    <div class="item-aluno-rail ${a.id === estado.alunoSelecionadoId && !estado.telaGlobal ? 'ativo' : ''}" onclick="selecionarAluno('${a.id}')">
      <div class="nome">${a.nome}</div>
      <div class="status-dot ${a.status === 'Ativo' ? '' : 'inativo'}"></div>
    </div>
  `).join('');

  const btnVideosNav = document.getElementById('btnBancoVideosNav');
  if (btnVideosNav) btnVideosNav.classList.toggle('ativo', estado.telaGlobal === 'videos');
}

function selecionarAluno(alunoId) {
  estado.telaGlobal = null;
  estado.alunoSelecionadoId = alunoId;
  estado.aba = 'protocolo';
  estado.diaAtivo = DIAS_SEMANA[0];
  estado.tecnicasSelecionadas = [];
  renderizarRail();
  carregarDadosDoAluno(alunoId);
}

/**
 * Abre o Banco de vídeos como tela própria, sem precisar selecionar um aluno —
 * o catálogo é global e compartilhado entre todos os alunos.
 */
function abrirBancoVideosGlobal() {
  estado.telaGlobal = 'videos';
  estado.alunoSelecionadoId = null;
  renderizarRail();
  renderizarPainel();
}

function carregarDadosDoAluno(alunoId) {
  Promise.all([
    trainer.carregarProtocolo(alunoId),
    trainer.carregarPagamentos(alunoId),
    trainer.carregarMesociclos(alunoId),
    trainer.carregarExecucoes(alunoId),
    trainer.carregarAvaliacoesDobras(alunoId),
    trainer.carregarFotos(alunoId)
  ]).then(([protocolo, pagamentos, mesociclos, execucoes, avaliacoesDobras, fotos]) => {
    estado.protocolo = protocolo || {};
    estado.pagamentos = pagamentos || {};
    estado.mesociclos = mesociclos || {};
    estado.execucoes = execucoes || [];
    estado.avaliacoesDobras = avaliacoesDobras || [];
    estado.fotos = fotos || [];
    renderizarPainel();
  });
}

// ---------- PAINEL PRINCIPAL ----------

function renderizarPainel() {
  const painel = document.getElementById('painel');

  // Tela global do Banco de vídeos (não depende de aluno selecionado)
  if (estado.telaGlobal === 'videos') {
    painel.innerHTML = `
      <div class="cabecalho-aluno">
        <div>
          <h1>Banco de vídeos</h1>
          <div class="meta-aluno"><span>Catálogo global — os vídeos cadastrados aqui valem para todos os alunos</span></div>
        </div>
      </div>
      <div id="conteudoAba">${htmlAbaVideos()}</div>
    `;
    return;
  }

  const aluno = estado.alunos.find(a => a.id === estado.alunoSelecionadoId);

  if (!aluno) {
    painel.innerHTML = htmlVisaoGeral();
    return;
  }

  painel.innerHTML = `
    <div class="cabecalho-aluno">
      <div>
        <h1>${aluno.nome}</h1>
        <div class="meta-aluno">
          ${aluno.idade ? `<span>${aluno.idade} anos</span>` : ''}
          ${aluno.objetivo ? `<span>${aluno.objetivo}</span>` : ''}
          ${aluno.peso ? `<span>${aluno.peso}kg</span>` : ''}
          ${aluno.telefone ? `<span>${aluno.telefone}</span>` : ''}
        </div>
      </div>
      <div class="acoes-aluno">
        <button class="btn-acao primario" onclick="abrirLink('${aluno.id}')">Gerar link do aluno</button>
        <button class="btn-acao" onclick="trainer.exportarDados('${aluno.id}')">Exportar dados</button>
        <button class="btn-acao perigo" onclick="excluirAluno('${aluno.id}')">Excluir aluno</button>
      </div>
    </div>

    <div id="linkGeradoContainer"></div>

    <div class="abas">
      <button class="aba ${estado.aba === 'protocolo' ? 'ativa' : ''}" onclick="trocarAba('protocolo')">Protocolo de treino</button>
      <button class="aba ${estado.aba === 'mesociclo' ? 'ativa' : ''}" onclick="trocarAba('mesociclo')">Mesociclo</button>
      <button class="aba ${estado.aba === 'avaliacao' ? 'ativa' : ''}" onclick="trocarAba('avaliacao')">Avaliação física</button>
      <button class="aba ${estado.aba === 'videos' ? 'ativa' : ''}" onclick="trocarAba('videos')">Banco de vídeos</button>
      <button class="aba ${estado.aba === 'financeiro' ? 'ativa' : ''}" onclick="trocarAba('financeiro')">Financeiro</button>
    </div>

    <div id="conteudoAba"></div>
  `;

  renderizarConteudoAba();
}

/**
 * Tela inicial (nenhum aluno selecionado): visão geral do negócio, com KPIs
 * rápidos e os últimos alunos cadastrados — substitui o antigo aviso
 * genérico "Selecione um aluno" por algo útil ao abrir o dashboard.
 */
function htmlVisaoGeral() {
  const total = estado.alunos.length;
  const ativos = estado.alunos.filter(a => a.status === 'Ativo').length;
  const inativos = total - ativos;
  const receitaPrevista = estado.alunos
    .filter(a => a.status === 'Ativo')
    .reduce((soma, a) => soma + (parseFloat(a.mensalidade) || 0), 0);

  const recentes = [...estado.alunos]
    .sort((a, b) => new Date(b.dataCadastro || 0) - new Date(a.dataCadastro || 0))
    .slice(0, 5);

  return `
    <div class="visao-geral">
      <div class="boas-vindas">
        <h1>Visão geral</h1>
        <p>Selecione um aluno na lista ao lado para montar o treino, ou comece por aqui.</p>
      </div>

      <div class="grid-kpis">
        <div class="stat-card">
          <div class="label">Alunos ativos</div>
          <div class="valor">${ativos}</div>
        </div>
        <div class="stat-card">
          <div class="label">Alunos inativos</div>
          <div class="valor">${inativos}</div>
        </div>
        <div class="stat-card pago">
          <div class="label">Receita mensal prevista</div>
          <div class="valor">R$ ${receitaPrevista.toFixed(2)}</div>
        </div>
        <div class="stat-card">
          <div class="label">Total de alunos</div>
          <div class="valor">${total}</div>
        </div>
      </div>

      <div class="acesso-rapido">
        <button class="btn-acao primario" onclick="abrirModalNovoAluno()">+ Novo aluno</button>
        <button class="btn-acao" onclick="abrirBancoVideosGlobal()">🎬 Banco de vídeos</button>
      </div>

      ${recentes.length ? `
      <div class="secao-recentes">
        <h3>Últimos alunos cadastrados</h3>
        <div class="lista-recentes">
          ${recentes.map(a => `
            <div class="item-recente" onclick="selecionarAluno('${a.id}')">
              <div class="avatar-inicial">${(a.nome || '?').trim().charAt(0).toUpperCase()}</div>
              <div class="info-recente">
                <div class="nome">${a.nome}</div>
                <div class="sub">${a.objetivo || 'Sem objetivo definido'}</div>
              </div>
              <div class="status-dot ${a.status === 'Ativo' ? '' : 'inativo'}"></div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : `
      <div class="painel-vazio" style="height:auto; padding:48px 0 0;">
        <h2>Nenhum aluno cadastrado ainda</h2>
        <p>Clique em "+ Novo aluno" para começar.</p>
      </div>
      `}
    </div>
  `;
}

function trocarAba(aba) {
  estado.aba = aba;
  estado.tecnicasSelecionadas = [];
  renderizarPainel();
}

function renderizarConteudoAba() {
  const container = document.getElementById('conteudoAba');
  if (estado.aba === 'protocolo') container.innerHTML = htmlAbaProtocolo();
  else if (estado.aba === 'mesociclo') container.innerHTML = htmlAbaMesociclo();
  else if (estado.aba === 'avaliacao') container.innerHTML = htmlAbaAvaliacao();
  else if (estado.aba === 'videos') container.innerHTML = htmlAbaVideos();
  else container.innerHTML = htmlAbaFinanceiro();

  if (estado.aba === 'avaliacao') {
    document.getElementById('inputFotos')?.addEventListener('change', onSelecionarFotos);
    renderizarRelatorioEvolucao();
  }
}

// ---------- ABA PROTOCOLO ----------

function htmlAbaProtocolo() {
  const pills = DIAS_SEMANA.map(dia => {
    const qtd = (estado.protocolo[dia]?.exercicios || []).length;
    return `
      <button class="dia-pill ${dia === estado.diaAtivo ? 'ativo' : ''}" onclick="selecionarDia('${dia}')">
        ${dia.replace('-feira', '')}${qtd ? `<span class="contagem">${qtd}</span>` : ''}
      </button>
    `;
  }).join('');

  const exercicios = (estado.protocolo[estado.diaAtivo]?.exercicios || []);

  const linhas = exercicios.length
    ? exercicios.map((ex, i) => `
      <div class="linha-exercicio com-extras">
        <div class="linha-topo">
          <div class="ordem">${i + 1}</div>
          <div class="nome-ex">${ex.nome}</div>
          <div class="detalhe-mini">${ex.series}x${ex.repeticoes}</div>
          <div class="detalhe-mini">${ex.descanso}s desc.</div>
          <div class="detalhe-mini">${ex.carga ? ex.carga + 'kg' : '—'}</div>
          <button class="remover" onclick="removerExercicio('${ex.id}')" title="Remover">✕</button>
        </div>
        ${ex.tecnicas && ex.tecnicas.length ? `
        <div class="tags-ex-linha">${ex.tecnicas.map(t => `<span class="tag-mini">${t}</span>`).join('')}</div>
        ` : ''}
        ${ex.notas ? `<div class="obs-linha">${ex.notas}</div>` : ''}
      </div>
    `).join('')
    : `<p style="color:var(--text-muted); font-size:13px;">Nenhum exercício cadastrado para ${estado.diaAtivo}.</p>`;

  const chips = TECNICAS_DISPONIVEIS.map(t => `
    <button type="button" class="chip-tecnica ${estado.tecnicasSelecionadas.includes(t) ? 'selecionada' : ''}" onclick="toggleTecnica('${t}')">${t}</button>
  `).join('');

  return `
    <div class="dias-semana">${pills}</div>

    <div class="acoes-dia">
      <button class="btn-iniciar-sessao" onclick="abrirModalExecucao()" ${exercicios.length ? '' : 'disabled'}>▶ Iniciar sessão (registrar peso usado)</button>
    </div>

    <div class="bloco-exercicios">${linhas}</div>

    <form class="form-exercicio" onsubmit="return adicionarExercicioForm(event)">
      <div class="campo">
        <label>Exercício</label>
        <input type="text" id="fNome" list="listaCatalogoExercicios" placeholder="Ex: Agachamento livre" required />
        <datalist id="listaCatalogoExercicios">
          ${estado.catalogo.map(c => `<option value="${c.nome}"></option>`).join('')}
        </datalist>
      </div>
      <div class="campo">
        <label>Séries</label>
        <input type="number" id="fSeries" placeholder="4" min="1" required />
      </div>
      <div class="campo">
        <label>Repetições</label>
        <input type="text" id="fReps" placeholder="12" required />
      </div>
      <div class="campo">
        <label>Descanso (s)</label>
        <input type="number" id="fDescanso" placeholder="60" min="0" />
      </div>
      <div class="campo">
        <label>Carga (kg)</label>
        <input type="number" id="fCarga" placeholder="opcional" min="0" />
      </div>
      <button type="submit" class="btn-add-ex">+ Adicionar</button>

      <div class="campo-tecnicas" style="grid-column: 1 / -1;">
        <label>Técnicas de intensidade (opcional)</label>
        <div class="chips-tecnicas">${chips}</div>
      </div>

      <div class="quadrante-obs" style="grid-column: 1 / -1;">
        <label>Observações</label>
        <textarea id="fNotas" placeholder="Ex: cuidado com a lombar, priorizar amplitude total, executar devagar na fase excêntrica..."></textarea>
      </div>
    </form>

    <div class="historico-sessoes">
      <h3>Histórico de sessões executadas</h3>
      ${htmlHistoricoSessoes()}
    </div>
  `;
}

function htmlHistoricoSessoes() {
  const sessoes = (estado.execucoes || []).slice(0, 8);
  if (!sessoes.length) {
    return `<p style="color:var(--text-muted); font-size:13px;">Nenhuma sessão registrada ainda.</p>`;
  }
  return sessoes.map(s => `
    <div class="sessao-historico">
      <div class="sessao-cabecalho">
        <span>${s.dia}</span>
        <span>${formatarDataHoraBR(s.data)}</span>
      </div>
      <div class="sessao-ex">${s.exercicios.map(e => `${e.nome}: ${e.pesoUtilizado || '—'}kg`).join(' · ')}</div>
    </div>
  `).join('');
}

function formatarDataHoraBR(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function selecionarDia(dia) {
  estado.diaAtivo = dia;
  estado.tecnicasSelecionadas = [];
  renderizarConteudoAba();
}

function toggleTecnica(tecnica) {
  const i = estado.tecnicasSelecionadas.indexOf(tecnica);
  if (i === -1) estado.tecnicasSelecionadas.push(tecnica);
  else estado.tecnicasSelecionadas.splice(i, 1);
  renderizarConteudoAba();
}

function adicionarExercicioForm(event) {
  event.preventDefault();
  const alunoId = estado.alunoSelecionadoId;

  const exercicio = {
    nome: document.getElementById('fNome').value.trim(),
    series: parseInt(document.getElementById('fSeries').value, 10),
    repeticoes: document.getElementById('fReps').value.trim(),
    descanso: parseInt(document.getElementById('fDescanso').value || '60', 10),
    carga: document.getElementById('fCarga').value ? parseFloat(document.getElementById('fCarga').value) : null,
    tecnicas: [...estado.tecnicasSelecionadas],
    notas: document.getElementById('fNotas').value.trim()
  };

  trainer.adicionarExercicio(alunoId, estado.diaAtivo, exercicio).then(() => {
    estado.tecnicasSelecionadas = [];
    carregarDadosDoAluno(alunoId);
  });

  return false;
}

function removerExercicio(exercicioId) {
  trainer.deletarExercicio(estado.alunoSelecionadoId, estado.diaAtivo, exercicioId).then(() => {
    carregarDadosDoAluno(estado.alunoSelecionadoId);
  });
}

// ---------- EXECUÇÃO DE TREINO (peso realizado, em sequência) ----------

function abrirModalExecucao() {
  const exercicios = estado.protocolo[estado.diaAtivo]?.exercicios || [];
  if (!exercicios.length) return;

  const html = `
    <div class="overlay-modal" id="overlayExecucao">
      <div class="modal modal-execucao">
        <h2>${estado.diaAtivo} — sessão de hoje</h2>
        <p style="color:var(--text-muted); font-size:13px; margin-top:-12px;">Percorra os exercícios na ordem e registre o peso realmente utilizado em cada um.</p>

        <div class="exec-lista">
          ${exercicios.map((ex, i) => `
            <div class="exec-item">
              <div class="exec-nome">${i + 1}. ${ex.nome}</div>
              <div class="exec-planejado">Planejado: ${ex.series}x${ex.repeticoes}${ex.carga ? ` · ${ex.carga}kg` : ''}${ex.tecnicas && ex.tecnicas.length ? ` · ${ex.tecnicas.join(', ')}` : ''}</div>
              <input type="number" step="0.5" min="0" placeholder="Peso utilizado (kg)" id="execPeso_${ex.id}" value="${ex.carga || ''}" />
            </div>
          `).join('')}
        </div>

        <div class="modal-acoes">
          <button type="button" class="btn-cancelar" onclick="fecharModalExecucao()">Cancelar</button>
          <button type="button" class="btn-confirmar" onclick="salvarExecucaoSessao()">Salvar sessão</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

function fecharModalExecucao() {
  document.getElementById('overlayExecucao')?.remove();
}

function salvarExecucaoSessao() {
  const exercicios = estado.protocolo[estado.diaAtivo]?.exercicios || [];
  const registros = exercicios.map(ex => ({
    exercicioId: ex.id,
    nome: ex.nome,
    pesoUtilizado: parseFloat(document.getElementById('execPeso_' + ex.id).value) || null
  }));

  trainer.salvarExecucao(estado.alunoSelecionadoId, estado.diaAtivo, registros).then(() => {
    fecharModalExecucao();
    carregarDadosDoAluno(estado.alunoSelecionadoId);
  });
}

// ---------- ABA MESOCICLO (periodização ondulatória) ----------

function htmlAbaMesociclo() {
  const semanasHtml = estado.semanasMeso.map((pct, i) => `
    <div class="semana-config">
      <div class="rotulo">Semana ${i + 1}</div>
      <select onchange="atualizarPercentualSemana(${i}, this.value)">
        ${[100, 90, 80, 70, 60, 50, 40, 30].map(v => `<option value="${v}" ${v === pct ? 'selected' : ''}>${v}%</option>`).join('')}
      </select>
    </div>
  `).join('');

  const mesociclosSalvos = Object.values(estado.mesociclos || {}).sort((a, b) => new Date(b.dataInicio) - new Date(a.dataInicio));

  const listaMesociclos = mesociclosSalvos.length
    ? mesociclosSalvos.map(m => htmlCardMesociclo(m)).join('')
    : `<p style="color:var(--text-muted); font-size:13px;">Nenhum mesociclo criado ainda.</p>`;

  return `
    <div class="gerador-mesociclo">
      <h3 style="font-family:var(--font-display); font-size:15px; margin:0 0 4px;">Gerar periodização ondulatória</h3>
      <p style="color:var(--text-muted); font-size:12px; margin:0 0 14px;">Calcula automaticamente as cargas-alvo de cada semana a partir da carga atual cadastrada no protocolo de treino.</p>

      <div class="botoes-preset">
        <button type="button" class="btn-preset" onclick="aplicarPresetOndulatorio([80,60,40])">Padrão 80 / 60 / 40%</button>
        <button type="button" class="btn-preset" onclick="aplicarPresetOndulatorio([90,70,50])">Leve 90 / 70 / 50%</button>
        <button type="button" class="btn-preset" onclick="adicionarSemanaMeso()">+ Adicionar semana</button>
        <button type="button" class="btn-preset" onclick="removerSemanaMeso()">− Remover semana</button>
      </div>

      <div class="linha-semanas">${semanasHtml}</div>

      <div class="campo" style="max-width:320px; margin-bottom:14px;">
        <label>Nome do mesociclo</label>
        <input type="text" id="mesoNome" placeholder="Ex: Mesociclo 1 — Hipertrofia" />
      </div>

      <button type="button" class="btn-confirmar" onclick="gerarMesociclo()">Gerar mesociclo</button>
    </div>

    <div class="lista-mesociclos">${listaMesociclos}</div>
  `;
}

function atualizarPercentualSemana(indice, valor) {
  estado.semanasMeso[indice] = parseInt(valor, 10);
}

function aplicarPresetOndulatorio(valores) {
  estado.semanasMeso = [...valores];
  renderizarConteudoAba();
}

function adicionarSemanaMeso() {
  estado.semanasMeso.push(40);
  renderizarConteudoAba();
}

function removerSemanaMeso() {
  if (estado.semanasMeso.length > 1) estado.semanasMeso.pop();
  renderizarConteudoAba();
}

function gerarMesociclo() {
  const nome = document.getElementById('mesoNome').value.trim() || 'Mesociclo ondulatório';
  const temCarga = Object.values(estado.protocolo || {}).some(d => (d.exercicios || []).some(ex => ex.carga));

  if (!temCarga) {
    alert('Cadastre a carga (kg) em pelo menos um exercício do protocolo antes de gerar o mesociclo.');
    return;
  }

  trainer.criarMesocicloOndulatorio(estado.alunoSelecionadoId, nome, estado.semanasMeso, estado.protocolo).then(() => {
    carregarDadosDoAluno(estado.alunoSelecionadoId);
  });
}

function htmlCardMesociclo(meso) {
  const diasComCarga = [...new Set(
    meso.semanas.flatMap(s => Object.keys(s.dias).filter(d => s.dias[d].length))
  )];

  const linhas = diasComCarga.flatMap(dia => {
    const exerciciosDoDia = meso.semanas[0].dias[dia] || [];
    return exerciciosDoDia.map(ex => `
      <tr>
        <td>${dia.replace('-feira', '')}</td>
        <td>${ex.nome}</td>
        <td>${ex.cargaBase}kg</td>
        ${meso.semanas.map(s => {
          const alvo = (s.dias[dia] || []).find(e => e.exercicioId === ex.exercicioId);
          return `<td class="col-semana">${alvo ? alvo.cargaAlvo + 'kg' : '—'}</td>`;
        }).join('')}
      </tr>
    `);
  });

  return `
    <div class="mesociclo-card">
      <div class="meso-titulo">
        <h3>${meso.nome}</h3>
        <button class="btn-acao perigo" onclick="excluirMesociclo('${meso.id}')">Excluir</button>
      </div>
      <table class="tabela-meso">
        <thead>
          <tr>
            <th>Dia</th><th>Exercício</th><th>Base</th>
            ${meso.semanas.map(s => `<th>Sem. ${s.numero} (${s.percentual}%)</th>`).join('')}
          </tr>
        </thead>
        <tbody>${linhas.join('') || `<tr><td colspan="${3 + meso.semanas.length}" style="color:var(--text-muted);">Sem exercícios com carga cadastrada.</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function excluirMesociclo(mesoId) {
  if (!confirm('Excluir este mesociclo?')) return;
  trainer.deletarMesociclo(estado.alunoSelecionadoId, mesoId).then(() => {
    carregarDadosDoAluno(estado.alunoSelecionadoId);
  });
}

// ---------- ABA AVALIAÇÃO FÍSICA (dobras + fotos) ----------

function htmlAbaAvaliacao() {
  return `
    <div id="relatorioEvolucaoContainer"></div>

    <div class="grid-avaliacao">
      <div>
        <div class="form-dobras">
          <h3>Avaliação de dobras cutâneas (Protocolo Pollock — 7 dobras)</h3>
          <p class="explicacao">Preencha as 7 dobras em milímetros. O % de gordura, densidade corporal e massa magra são calculados automaticamente.</p>

          <form onsubmit="return calcularESalvarDobras(event)">
            <div class="grid-dobras">
              <div class="campo"><label>Peitoral (mm)</label><input type="number" step="0.1" id="dPeitoral" required /></div>
              <div class="campo"><label>Axilar média (mm)</label><input type="number" step="0.1" id="dAxilar" required /></div>
              <div class="campo"><label>Tríceps (mm)</label><input type="number" step="0.1" id="dTriceps" required /></div>
              <div class="campo"><label>Subescapular (mm)</label><input type="number" step="0.1" id="dSubescapular" required /></div>
              <div class="campo"><label>Abdominal (mm)</label><input type="number" step="0.1" id="dAbdominal" required /></div>
              <div class="campo"><label>Supra-ilíaca (mm)</label><input type="number" step="0.1" id="dSuprailiaca" required /></div>
              <div class="campo"><label>Coxa (mm)</label><input type="number" step="0.1" id="dCoxa" required /></div>
              <div class="campo"><label>Sexo</label>
                <select id="dSexo"><option value="M">Masculino</option><option value="F">Feminino</option></select>
              </div>
              <div class="campo"><label>Idade</label><input type="number" id="dIdade" required /></div>
              <div class="campo"><label>Peso corporal (kg)</label><input type="number" step="0.1" id="dPeso" required /></div>
            </div>
            <button type="submit" class="btn-confirmar" style="margin-top:14px; width:100%;">Calcular e salvar avaliação</button>
          </form>

          <div id="resultadoDobras"></div>
        </div>

        <div class="historico-avaliacoes">
          <h3>Histórico de avaliações</h3>
          ${htmlHistoricoDobras()}
        </div>
      </div>

      <div class="painel-fotos">
        <h3>Fotos de evolução</h3>
        <p class="explicacao">Envie quantas fotos quiser, sem limite — cada uma fica salva com a data do upload, lado a lado com as avaliações de dobras para acompanhar a evolução visual.</p>

        <label class="input-fotos" for="inputFotos">Clique para enviar fotos (pode selecionar várias de uma vez)</label>
        <input type="file" id="inputFotos" accept="image/*" multiple style="display:none;" />

        <div class="grid-fotos" id="gridFotos">${htmlGridFotos()}</div>
      </div>
    </div>
  `;
}

// ---------- RELATÓRIO AUTOMÁTICO DE EVOLUÇÃO ----------
// Gerado sempre que há avaliações de dobras e/ou fotos suficientes para comparar
// "atual vs. anterior". Roda de novo a cada nova avaliação ou novo envio de foto.

function renderizarRelatorioEvolucao() {
  const container = document.getElementById('relatorioEvolucaoContainer');
  if (!container) return;

  const aluno = estado.alunos.find(a => a.id === estado.alunoSelecionadoId);
  if (!aluno) { container.innerHTML = ''; return; }

  const relatorio = trainer.gerarRelatorioEvolucao(aluno, estado.avaliacoesDobras, estado.fotos);
  container.innerHTML = htmlRelatorioEvolucao(relatorio);
}

function htmlRelatorioEvolucao(r) {
  if (!estado.avaliacoesDobras.length && estado.fotos.length < 2) {
    return ''; // nada relevante para mostrar ainda
  }

  const cardsMetricas = Object.values(r.metricas).filter(Boolean).map(m => htmlCardMetrica(m)).join('');

  const cardImc = r.imc ? `
    <div class="metrica-card">
      <div class="metrica-label">IMC</div>
      <div class="metrica-valor">${r.imc.valor}</div>
      <div class="metrica-delta estavel">${r.imc.classificacao}</div>
    </div>
  ` : '';

  const grafico = r.serie.length >= 2 ? svgGraficoEvolucao(r.serie) : `
    <div class="grafico-vazio">Registre ao menos 2 avaliações de dobras cutâneas para ver o gráfico de evolução de peso e % de gordura.</div>
  `;

  const fotosComparacao = (r.fotoAtual && r.fotoAnterior) ? `
    <div class="comparacao-fotos">
      <div class="foto-comparacao">
        <img src="${r.fotoAnterior.url}" alt="Foto anterior" />
        <span>Antes — ${new Date(r.fotoAnterior.data).toLocaleDateString('pt-BR')}</span>
      </div>
      <div class="foto-comparacao">
        <img src="${r.fotoAtual.url}" alt="Foto atual" />
        <span class="atual">Atual — ${new Date(r.fotoAtual.data).toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  ` : '';

  return `
    <div class="relatorio-evolucao">
      <div class="relatorio-cabecalho">
        <h3>📊 Relatório automático de evolução</h3>
        <p class="explicacao">Gerado automaticamente comparando a avaliação/fotos mais recentes com as anteriores.</p>
      </div>

      <div class="metricas-evolucao">
        ${cardImc}
        ${cardsMetricas}
      </div>

      <div class="grafico-evolucao">${grafico}</div>

      ${fotosComparacao}

      <div class="insights-evolucao">
        ${r.insights.map(txt => `<div class="insight-item">✓ ${txt}</div>`).join('')}
      </div>
    </div>
  `;
}

function htmlCardMetrica(m) {
  const setaMap = { subiu: '↑', desceu: '↓', estavel: '—' };
  const seta = m.diferenca !== null ? setaMap[m.direcao] : '';
  const corClasse = m.rotulo === '% de gordura' || m.rotulo === 'Peso' || m.rotulo === 'Massa gorda'
    ? (m.direcao === 'desceu' ? 'positivo' : m.direcao === 'subiu' ? 'negativo' : 'estavel')
    : (m.direcao === 'subiu' ? 'positivo' : m.direcao === 'desceu' ? 'negativo' : 'estavel');

  return `
    <div class="metrica-card">
      <div class="metrica-label">${m.rotulo}</div>
      <div class="metrica-valor">${m.atual}<span class="unidade">${m.unidade}</span></div>
      ${m.diferenca !== null ? `<div class="metrica-delta ${corClasse}">${seta} ${Math.abs(m.diferenca)}${m.unidade}${m.percentual !== null ? ` (${Math.abs(m.percentual)}%)` : ''}</div>` : '<div class="metrica-delta estavel">Primeira medição</div>'}
    </div>
  `;
}

/**
 * Gera um gráfico de linha simples em SVG puro (sem dependências) plotando
 * peso (kg) e % de gordura ao longo das avaliações registradas.
 */
function svgGraficoEvolucao(serie) {
  const largura = 640, altura = 220, padding = 36;
  const pesos = serie.map(p => p.peso).filter(v => v !== undefined && v !== null);
  const gorduras = serie.map(p => p.percentualGordura).filter(v => v !== undefined && v !== null);

  const minPeso = Math.min(...pesos), maxPeso = Math.max(...pesos);
  const minGord = Math.min(...gorduras), maxGord = Math.max(...gorduras);

  const escalaX = (i) => padding + (i / (serie.length - 1)) * (largura - padding * 2);
  const escalaY = (v, min, max) => {
    if (max === min) return altura / 2;
    return altura - padding - ((v - min) / (max - min)) * (altura - padding * 2);
  };

  const pontosPeso = serie.map((p, i) => `${escalaX(i)},${escalaY(p.peso, minPeso, maxPeso)}`).join(' ');
  const pontosGord = serie.map((p, i) => `${escalaX(i)},${escalaY(p.percentualGordura, minGord, maxGord)}`).join(' ');

  const circulosPeso = serie.map((p, i) => `<circle cx="${escalaX(i)}" cy="${escalaY(p.peso, minPeso, maxPeso)}" r="3.5" fill="var(--accent)" />`).join('');
  const circulosGord = serie.map((p, i) => `<circle cx="${escalaX(i)}" cy="${escalaY(p.percentualGordura, minGord, maxGord)}" r="3.5" fill="var(--accent-2)" />`).join('');

  const labelsX = serie.map((p, i) => `<text x="${escalaX(i)}" y="${altura - 8}" font-size="9" fill="var(--text-muted)" text-anchor="middle">${new Date(p.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</text>`).join('');

  return `
    <svg viewBox="0 0 ${largura} ${altura}" class="svg-grafico-evolucao" preserveAspectRatio="xMidYMid meet">
      <polyline points="${pontosPeso}" fill="none" stroke="var(--accent)" stroke-width="2.5" />
      ${circulosPeso}
      <polyline points="${pontosGord}" fill="none" stroke="var(--accent-2)" stroke-width="2.5" stroke-dasharray="5,4" />
      ${circulosGord}
      ${labelsX}
    </svg>
    <div class="legenda-grafico">
      <span><i style="background:var(--accent)"></i> Peso (kg)</span>
      <span><i style="background:var(--accent-2)"></i> % Gordura</span>
    </div>
  `;
}

function htmlHistoricoDobras() {
  if (!estado.avaliacoesDobras.length) {
    return `<p style="color:var(--text-muted); font-size:13px;">Nenhuma avaliação registrada ainda.</p>`;
  }
  return estado.avaliacoesDobras.map(a => `
    <div class="avaliacao-hist-item">
      <span>${formatarDataHoraBR(a.data)}</span>
      <span class="pct">${a.resultado.percentualGordura}% gordura</span>
    </div>
  `).join('');
}

function htmlGridFotos() {
  if (!estado.fotos.length) {
    return `<p style="color:var(--text-muted); font-size:13px; grid-column:1/-1;">Nenhuma foto enviada ainda.</p>`;
  }
  return estado.fotos.map(f => `
    <div class="foto-card">
      <img src="${f.url}" alt="Foto de evolução" />
      <button class="foto-remover" onclick="removerFoto('${f.id}')" title="Remover">✕</button>
      <div class="foto-data">${new Date(f.data).toLocaleDateString('pt-BR')}</div>
    </div>
  `).join('');
}

function calcularESalvarDobras(event) {
  event.preventDefault();

  const dados = {
    peitoral: parseFloat(document.getElementById('dPeitoral').value),
    axilarMedia: parseFloat(document.getElementById('dAxilar').value),
    triceps: parseFloat(document.getElementById('dTriceps').value),
    subescapular: parseFloat(document.getElementById('dSubescapular').value),
    abdominal: parseFloat(document.getElementById('dAbdominal').value),
    suprailiaca: parseFloat(document.getElementById('dSuprailiaca').value),
    coxa: parseFloat(document.getElementById('dCoxa').value),
    sexo: document.getElementById('dSexo').value,
    idade: parseInt(document.getElementById('dIdade').value, 10),
    peso: parseFloat(document.getElementById('dPeso').value)
  };

  trainer.salvarAvaliacaoDobras(estado.alunoSelecionadoId, dados).then((avaliacao) => {
    const r = avaliacao.resultado;
    document.getElementById('resultadoDobras').innerHTML = `
      <div class="resultado-dobras">
        <div class="titulo-resultado">Resultado automático</div>
        <div class="stats-resultado">
          <div class="item-stat"><div class="num">${r.percentualGordura}%</div><div class="lbl">Gordura corporal</div></div>
          <div class="item-stat"><div class="num">${r.densidadeCorporal}</div><div class="lbl">Densidade corporal</div></div>
          <div class="item-stat"><div class="num">${r.massaGorda}kg</div><div class="lbl">Massa gorda</div></div>
          <div class="item-stat"><div class="num">${r.massaMagra}kg</div><div class="lbl">Massa magra</div></div>
        </div>
      </div>
    `;
    estado.avaliacoesDobras.unshift(avaliacao);
    document.querySelector('.historico-avaliacoes').innerHTML = `<h3>Histórico de avaliações</h3>${htmlHistoricoDobras()}`;
    renderizarRelatorioEvolucao();
  });

  return false;
}

function onSelecionarFotos(event) {
  const arquivos = Array.from(event.target.files || []);
  if (!arquivos.length) return;

  Promise.all(arquivos.map(arquivo => trainer.uploadFoto(estado.alunoSelecionadoId, arquivo)))
    .then((novasFotos) => {
      estado.fotos = [...novasFotos, ...estado.fotos];
      document.getElementById('gridFotos').innerHTML = htmlGridFotos();
      event.target.value = '';
      // A(s) foto(s) atual(is) já ficam salvas imediatamente. A partir da 2ª foto
      // no total, o relatório automático de evolução é gerado/atualizado sozinho.
      renderizarRelatorioEvolucao();
    })
    .catch(() => {
      alert('Não foi possível enviar a(s) foto(s). Tente uma imagem menor ou verifique sua conexão.');
    });
}

function removerFoto(fotoId) {
  const foto = estado.fotos.find(f => f.id === fotoId);
  if (!foto || !confirm('Remover esta foto?')) return;

  trainer.deletarFoto(estado.alunoSelecionadoId, foto).then(() => {
    estado.fotos = estado.fotos.filter(f => f.id !== fotoId);
    document.getElementById('gridFotos').innerHTML = htmlGridFotos();
    renderizarRelatorioEvolucao();
  });
}

// ---------- ABA BANCO DE VÍDEOS (catálogo global de exercícios) ----------

function htmlAbaVideos() {
  const grupos = ['Todos', ...new Set(estado.catalogo.map(c => c.grupoMuscular))];
  const termo = estado.buscaCatalogo.toLowerCase();

  const filtrados = estado.catalogo.filter(c => {
    const bateGrupo = estado.grupoCatalogoAtivo === 'Todos' || c.grupoMuscular === estado.grupoCatalogoAtivo;
    const bateBusca = !termo || c.nome.toLowerCase().includes(termo);
    return bateGrupo && bateBusca;
  });

  const pillsGrupo = grupos.map(g => `
    <button class="dia-pill ${g === estado.grupoCatalogoAtivo ? 'ativo' : ''}" onclick="filtrarGrupoCatalogo('${g.replace(/'/g, "\\'")}')">${g}</button>
  `).join('');

  const cards = filtrados.length
    ? filtrados.map(c => htmlCardCatalogo(c)).join('')
    : `<p style="color:var(--text-muted); font-size:13px;">Nenhum exercício encontrado.</p>`;

  return `
    <div class="cabecalho-videos">
      <p class="explicacao">Cole o link do YouTube (ou Vimeo) de cada exercício uma única vez. A partir daí, todo aluno que tiver esse exercício no protocolo já verá o botão "Ver vídeo" automaticamente — o nome do exercício no protocolo precisa ser igual (ou bem parecido) ao nome cadastrado aqui. Sem link salvo ainda, use o botão "Buscar vídeo pronto no YouTube" em cada card para achar um vídeo rapidamente.</p>
    </div>

    <div class="painel-importacao">
      <h3>Importar exercícios prontos (free-exercise-db — grátis, sem cadastro)</h3>
      <p class="explicacao">Banco público com 800+ exercícios e fotos de referência do movimento (em inglês). Importe os que quiser — o vídeo continua ficando por sua conta, mas o aluno já vê a foto de referência mesmo antes disso.</p>
      <div class="linha-importacao">
        <input type="text" class="busca-aluno" placeholder="Buscar em inglês (ex: squat, bench press, curl...)" value="${estado.buscaImportacao}" oninput="buscarImportacaoFreeDB(this.value)" />
      </div>
      <div class="resultados-importacao">${htmlResultadosImportacao()}</div>
    </div>

    <div class="painel-importacao">
      <h3>Importar do ExerciseDB grátis (GIF animado do movimento, sem cadastro)</h3>
      <p class="explicacao">Camada gratuita e sem chave de API do banco ExerciseDB (1.500 exercícios, em inglês). Diferente do banco acima, aqui cada exercício já vem com um <strong>GIF animado</strong> mostrando o movimento — o mais perto de um vídeo pronto que existe hoje sem pagar. É um serviço de terceiros: se um dia sair do ar, os exercícios já importados continuam salvos normalmente.</p>
      <div class="linha-importacao">
        <input type="text" class="busca-aluno" placeholder="Buscar em inglês (ex: squat, bench press, curl...)" value="${estado.buscaImportacaoEDB}" oninput="buscarImportacaoEDB(this.value)" />
      </div>
      <div class="resultados-importacao-edb">${htmlResultadosImportacaoEDB()}</div>
    </div>

    <input type="text" class="busca-aluno" style="margin-bottom:14px; width:100%; max-width:360px;" placeholder="Buscar exercício no catálogo..." value="${estado.buscaCatalogo}" oninput="buscarCatalogo(this.value)" />

    <div class="dias-semana">${pillsGrupo}</div>

    <form class="form-exercicio" style="grid-template-columns: 1.5fr 1fr auto;" onsubmit="return adicionarExercicioCatalogoForm(event)">
      <div class="campo">
        <label>Novo exercício</label>
        <input type="text" id="catNome" placeholder="Ex: Supino Reto" required />
      </div>
      <div class="campo">
        <label>Grupo muscular</label>
        <input type="text" id="catGrupo" placeholder="Ex: Peito" required />
      </div>
      <button type="submit" class="btn-add-ex">+ Adicionar ao catálogo</button>
    </form>

    <div class="grid-catalogo">${cards}</div>
  `;
}

function htmlResultadosImportacao() {
  if (!estado.resultadosImportacao.length) {
    return estado.buscaImportacao
      ? `<p style="color:var(--text-muted); font-size:12px;">Nenhum resultado. Tente em inglês (squat, curl, press, row...).</p>`
      : '';
  }
  return `<div class="grid-importacao">${estado.resultadosImportacao.map((item, i) => `
    <div class="card-importacao">
      ${item.imagens[0] ? `<img src="${item.imagens[0]}" alt="${item.nome}" />` : '<div class="thumb-vazia">Sem foto</div>'}
      <div class="info-importacao">
        <div class="grupo-catalogo">${item.grupoMuscular}</div>
        <div class="nome-catalogo">${item.nome}</div>
        <button class="btn-add-ex" style="width:100%;" onclick="importarExercicioFreeDB(${i})">+ Importar</button>
      </div>
    </div>
  `).join('')}</div>`;
}

let _debounceImportacao = null;
function buscarImportacaoFreeDB(valor) {
  estado.buscaImportacao = valor;
  clearTimeout(_debounceImportacao);
  _debounceImportacao = setTimeout(() => {
    trainer.buscarFreeExerciseDB(valor).then((resultados) => {
      estado.resultadosImportacao = resultados;
      const container = document.querySelector('.resultados-importacao');
      if (container) container.innerHTML = htmlResultadosImportacao();
    }).catch(() => {
      const container = document.querySelector('.resultados-importacao');
      if (container) container.innerHTML = `<p style="color:var(--danger); font-size:12px;">Não foi possível buscar agora. Verifique sua conexão.</p>`;
    });
  }, 400);
}

function importarExercicioFreeDB(indice) {
  const item = estado.resultadosImportacao[indice];
  if (!item) return;

  trainer.importarExercicioFreeDB(item).then((registro) => {
    estado.catalogo.push(registro);
    estado.catalogo.sort((a, b) => (a.grupoMuscular || '').localeCompare(b.grupoMuscular || '') || a.nome.localeCompare(b.nome));
    renderizarConteudoAba();
  });
}

// ---------- Importação do ExerciseDB grátis (GIF animado) ----------

function htmlResultadosImportacaoEDB() {
  if (!estado.resultadosImportacaoEDB.length) {
    return estado.buscaImportacaoEDB
      ? `<p style="color:var(--text-muted); font-size:12px;">Nenhum resultado. Tente em inglês (squat, curl, press, row...).</p>`
      : '';
  }
  return `<div class="grid-importacao">${estado.resultadosImportacaoEDB.map((item, i) => `
    <div class="card-importacao">
      ${item.gifUrl ? `<img src="${item.gifUrl}" alt="${item.nome}" loading="lazy" />` : '<div class="thumb-vazia">Sem GIF</div>'}
      <div class="info-importacao">
        <div class="grupo-catalogo">${item.grupoMuscular}</div>
        <div class="nome-catalogo">${item.nome}</div>
        <button class="btn-add-ex" style="width:100%;" onclick="importarExercicioEDB(${i})">+ Importar</button>
      </div>
    </div>
  `).join('')}</div>`;
}

let _debounceImportacaoEDB = null;
function buscarImportacaoEDB(valor) {
  estado.buscaImportacaoEDB = valor;
  clearTimeout(_debounceImportacaoEDB);
  _debounceImportacaoEDB = setTimeout(() => {
    trainer.buscarExerciseDBGratis(valor).then((resultados) => {
      estado.resultadosImportacaoEDB = resultados;
      const container = document.querySelector('.resultados-importacao-edb');
      if (container) container.innerHTML = htmlResultadosImportacaoEDB();
    }).catch(() => {
      const container = document.querySelector('.resultados-importacao-edb');
      if (container) container.innerHTML = `<p style="color:var(--danger); font-size:12px;">Não foi possível buscar agora (o serviço gratuito pode estar fora do ar). Tente de novo em instantes.</p>`;
    });
  }, 400);
}

function importarExercicioEDB(indice) {
  const item = estado.resultadosImportacaoEDB[indice];
  if (!item) return;

  trainer.importarExercicioExerciseDBGratis(item).then((registro) => {
    estado.catalogo.push(registro);
    estado.catalogo.sort((a, b) => (a.grupoMuscular || '').localeCompare(b.grupoMuscular || '') || a.nome.localeCompare(b.nome));
    renderizarConteudoAba();
  });
}

function htmlCardCatalogo(item) {
  const idYoutube = trainer.extrairIdYoutube(item.videoUrl);
  const thumbVideo = idYoutube ? `https://img.youtube.com/vi/${idYoutube}/mqdefault.jpg` : null;
  const thumbGif = (!thumbVideo && item.gifUrl) ? item.gifUrl : null;
  const thumbImagem = (!thumbVideo && !thumbGif && item.imagens && item.imagens[0]) ? item.imagens[0] : null;
  const temPreview = !!(item.videoUrl || thumbGif || thumbImagem);

  return `
    <div class="card-catalogo">
      <div class="thumb-catalogo" ${temPreview ? `onclick="abrirPreviewVideo('${item.id}')" style="cursor:pointer;"` : ''}>
        ${thumbVideo
          ? `<img src="${thumbVideo}" alt="${item.nome}" />`
          : thumbGif
            ? `<img src="${thumbGif}" alt="${item.nome}" loading="lazy" />`
            : thumbImagem
              ? `<img src="${thumbImagem}" alt="${item.nome}" />`
              : `<div class="thumb-vazia">Sem vídeo</div>`
        }
        ${item.videoUrl ? '<div class="play-overlay">▶</div>' : ''}
      </div>
      <div class="info-catalogo">
        <div class="grupo-catalogo">${item.grupoMuscular}</div>
        <div class="nome-catalogo">${item.nome}</div>
        <form class="form-video-catalogo" onsubmit="return salvarVideoExercicio(event, '${item.id}')">
          <input type="text" name="videoUrl" placeholder="Colar link do vídeo (YouTube/Vimeo)" value="${item.videoUrl || ''}" />
          <button type="submit" title="Salvar link">✓</button>
        </form>
        <a class="link-buscar-youtube" href="https://www.youtube.com/results?search_query=${encodeURIComponent(item.nome + ' execução técnica')}" target="_blank" rel="noopener">🔎 Buscar vídeo pronto no YouTube</a>
      </div>
      <button class="remover-catalogo" onclick="removerExercicioCatalogo('${item.id}')" title="Remover exercício">✕</button>
    </div>
  `;
}

function buscarCatalogo(valor) {
  estado.buscaCatalogo = valor;
  renderizarConteudoAba();
}

function filtrarGrupoCatalogo(grupo) {
  estado.grupoCatalogoAtivo = grupo;
  renderizarConteudoAba();
}

function adicionarExercicioCatalogoForm(event) {
  event.preventDefault();
  const nome = document.getElementById('catNome').value.trim();
  const grupoMuscular = document.getElementById('catGrupo').value.trim();
  if (!nome) return false;

  trainer.adicionarExercicioCatalogo({ nome, grupoMuscular }).then((item) => {
    estado.catalogo.push(item);
    estado.catalogo.sort((a, b) => (a.grupoMuscular || '').localeCompare(b.grupoMuscular || '') || a.nome.localeCompare(b.nome));
    renderizarConteudoAba();
  });

  return false;
}

function salvarVideoExercicio(event, id) {
  event.preventDefault();
  const form = event.target;
  const videoUrl = form.videoUrl.value.trim();

  trainer.atualizarVideoExercicio(id, videoUrl).then(() => {
    const item = estado.catalogo.find(c => c.id === id);
    if (item) item.videoUrl = videoUrl;
    renderizarConteudoAba();
  });

  return false;
}

function removerExercicioCatalogo(id) {
  if (!confirm('Remover este exercício do catálogo de vídeos?')) return;
  trainer.deletarExercicioCatalogo(id).then(() => {
    estado.catalogo = estado.catalogo.filter(c => c.id !== id);
    renderizarConteudoAba();
  });
}

function abrirPreviewVideo(id) {
  const item = estado.catalogo.find(c => c.id === id);
  if (!item) return;

  let conteudo;
  if (item.videoUrl) {
    const embed = trainer.urlEmbedVideo(item.videoUrl);
    conteudo = `<div class="video-wrapper"><iframe src="${embed}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
  } else if (item.gifUrl) {
    conteudo = `<div class="galeria-imagens-exercicio"><img src="${item.gifUrl}" alt="${item.nome}" /></div>`;
  } else if (item.imagens && item.imagens.length) {
    conteudo = `<div class="galeria-imagens-exercicio">${item.imagens.map(src => `<img src="${src}" alt="${item.nome}" />`).join('')}</div>`;
  } else {
    return;
  }

  const html = `
    <div class="overlay-modal" id="overlayPreviewVideo" onclick="if(event.target===this) fecharPreviewVideo()">
      <div class="modal modal-video">
        <h2>${item.nome}</h2>
        ${conteudo}
        <div class="modal-acoes">
          <button type="button" class="btn-cancelar" onclick="fecharPreviewVideo()">Fechar</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

function fecharPreviewVideo() {
  document.getElementById('overlayPreviewVideo')?.remove();
}

// ---------- ABA FINANCEIRO ----------

function htmlAbaFinanceiro() {
  const pagamentos = estado.pagamentos || {};
  const totalPago = trainer.totalMensal(pagamentos);
  const totalPendente = trainer.totalPendente(pagamentos);

  const linhas = Object.values(pagamentos)
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .map(p => `
      <tr>
        <td>${formatarDataBR(p.data)}</td>
        <td>${p.descricao || 'Mensalidade'}</td>
        <td>R$ ${parseFloat(p.valor).toFixed(2)}</td>
        <td><span class="pill-status ${p.status === 'Pago' ? 'pago' : 'pendente'}">${p.status}</span></td>
      </tr>
    `).join('');

  return `
    <div class="resumo-financeiro">
      <div class="stat-card pago">
        <div class="label">Total recebido</div>
        <div class="valor">R$ ${totalPago.toFixed(2)}</div>
      </div>
      <div class="stat-card pendente">
        <div class="label">Pendente</div>
        <div class="valor">R$ ${totalPendente.toFixed(2)}</div>
      </div>
    </div>

    <table class="tabela-pagamentos">
      <thead>
        <tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${linhas || '<tr><td colspan="4" style="color:var(--text-muted);">Nenhum pagamento registrado.</td></tr>'}
      </tbody>
    </table>

    <form class="form-exercicio" style="grid-template-columns: 1fr 1fr 1fr 1fr; margin-top:20px;" onsubmit="return registrarPagamentoForm(event)">
      <div class="campo">
        <label>Data</label>
        <input type="date" id="pData" required />
      </div>
      <div class="campo">
        <label>Valor (R$)</label>
        <input type="number" id="pValor" step="0.01" min="0" required />
      </div>
      <div class="campo">
        <label>Status</label>
        <select id="pStatus">
          <option value="Pago">Pago</option>
          <option value="Pendente">Pendente</option>
        </select>
      </div>
      <button type="submit" class="btn-add-ex">+ Registrar</button>
    </form>
  `;
}

function registrarPagamentoForm(event) {
  event.preventDefault();
  const alunoId = estado.alunoSelecionadoId;

  const pagamento = {
    data: document.getElementById('pData').value,
    valor: parseFloat(document.getElementById('pValor').value),
    status: document.getElementById('pStatus').value
  };

  trainer.registrarPagamento(alunoId, pagamento).then(() => {
    carregarDadosDoAluno(alunoId);
  });

  return false;
}

function formatarDataBR(dataISO) {
  if (!dataISO) return '—';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

// ---------- LINK DO ALUNO ----------

function abrirLink(alunoId) {
  const link = trainer.gerarLinkAluno(alunoId);
  navigator.clipboard.writeText(link).catch(() => {});
  document.getElementById('linkGeradoContainer').innerHTML = `
    <div class="link-gerado">Link copiado! Envie para o aluno:<br>${link}</div>
  `;
}

// ---------- EXCLUIR ALUNO ----------

function excluirAluno(alunoId) {
  const aluno = estado.alunos.find(a => a.id === alunoId);
  if (!confirm(`Excluir ${aluno.nome}? Isso apaga protocolo, mesociclos e financeiro dele.`)) return;

  trainer.deletarAluno(alunoId).then(() => {
    estado.alunos = estado.alunos.filter(a => a.id !== alunoId);
    if (estado.alunoSelecionadoId === alunoId) estado.alunoSelecionadoId = null;
    renderizarRail();
    renderizarPainel();
  });
}

// ---------- MODAL NOVO ALUNO ----------

function abrirModalNovoAluno() {
  document.getElementById('overlayModal').classList.remove('oculto');
  document.getElementById('mNome').focus();
}

function fecharModalNovoAluno() {
  document.getElementById('overlayModal').classList.add('oculto');
  document.getElementById('formNovoAluno').reset();
}

function criarAlunoForm(event) {
  event.preventDefault();

  const dados = {
    nome: document.getElementById('mNome').value.trim(),
    idade: document.getElementById('mIdade').value ? parseInt(document.getElementById('mIdade').value, 10) : null,
    objetivo: document.getElementById('mObjetivo').value.trim() || null,
    peso: document.getElementById('mPeso').value ? parseFloat(document.getElementById('mPeso').value) : null,
    altura: document.getElementById('mAltura').value ? parseFloat(document.getElementById('mAltura').value) : null,
    telefone: document.getElementById('mTelefone').value.trim() || null,
    mensalidade: document.getElementById('mMensalidade').value ? parseFloat(document.getElementById('mMensalidade').value) : null
  };

  trainer.adicionarAluno(dados).then((aluno) => {
    estado.alunos.push(aluno);
    estado.alunos.sort((a, b) => a.nome.localeCompare(b.nome));
    fecharModalNovoAluno();
    renderizarRail();
    selecionarAluno(aluno.id);
  });

  return false;
}

window.addEventListener('load', iniciarDashboard);
