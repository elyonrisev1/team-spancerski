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
  fotos: []
};

function iniciarDashboard() {
  trainer.carregarAlunos().then((alunos) => {
    estado.alunos = alunos.sort((a, b) => a.nome.localeCompare(b.nome));
    renderizarRail();
    renderizarPainel();
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
    <div class="item-aluno-rail ${a.id === estado.alunoSelecionadoId ? 'ativo' : ''}" onclick="selecionarAluno('${a.id}')">
      <div class="nome">${a.nome}</div>
      <div class="status-dot ${a.status === 'Ativo' ? '' : 'inativo'}"></div>
    </div>
  `).join('');
}

function selecionarAluno(alunoId) {
  estado.alunoSelecionadoId = alunoId;
  estado.aba = 'protocolo';
  estado.diaAtivo = DIAS_SEMANA[0];
  estado.tecnicasSelecionadas = [];
  renderizarRail();
  carregarDadosDoAluno(alunoId);
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
  const aluno = estado.alunos.find(a => a.id === estado.alunoSelecionadoId);

  if (!aluno) {
    painel.innerHTML = `
      <div class="painel-vazio">
        <h2>Selecione um aluno</h2>
        <p>Ou cadastre um novo aluno para começar a montar o treino.</p>
      </div>
    `;
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
      <button class="aba ${estado.aba === 'financeiro' ? 'ativa' : ''}" onclick="trocarAba('financeiro')">Financeiro</button>
    </div>

    <div id="conteudoAba"></div>
  `;

  renderizarConteudoAba();
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
  else container.innerHTML = htmlAbaFinanceiro();

  if (estado.aba === 'avaliacao') {
    document.getElementById('inputFotos')?.addEventListener('change', onSelecionarFotos);
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
        <input type="text" id="fNome" placeholder="Ex: Agachamento livre" required />
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
  });
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
