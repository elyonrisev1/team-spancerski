// ============================================
// INTERFACE DA DASHBOARD DO TREINADOR
// Liga a tela (index.html) com trainer.js
// ============================================

const DIAS_SEMANA = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

const estado = {
  alunos: [],
  alunoSelecionadoId: null,
  aba: 'protocolo', // protocolo | financeiro | dados
  diaAtivo: DIAS_SEMANA[0],
  protocolo: {},
  pagamentos: {}
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
  renderizarRail();
  carregarDadosDoAluno(alunoId);
}

function carregarDadosDoAluno(alunoId) {
  Promise.all([
    trainer.carregarProtocolo(alunoId),
    trainer.carregarPagamentos(alunoId)
  ]).then(([protocolo, pagamentos]) => {
    estado.protocolo = protocolo || {};
    estado.pagamentos = pagamentos || {};
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
      <button class="aba ${estado.aba === 'financeiro' ? 'ativa' : ''}" onclick="trocarAba('financeiro')">Financeiro</button>
    </div>

    <div id="conteudoAba"></div>
  `;

  renderizarConteudoAba();
}

function trocarAba(aba) {
  estado.aba = aba;
  renderizarPainel();
}

function renderizarConteudoAba() {
  const container = document.getElementById('conteudoAba');
  if (estado.aba === 'protocolo') {
    container.innerHTML = htmlAbaProtocolo();
  } else {
    container.innerHTML = htmlAbaFinanceiro();
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
      <div class="linha-exercicio">
        <div class="ordem">${i + 1}</div>
        <div class="nome-ex">${ex.nome}</div>
        <div class="detalhe-mini">${ex.series}x${ex.repeticoes}</div>
        <div class="detalhe-mini">${ex.descanso}s desc.</div>
        <div class="detalhe-mini">${ex.carga ? ex.carga + 'kg' : '—'}</div>
        <button class="remover" onclick="removerExercicio('${ex.id}')" title="Remover">✕</button>
      </div>
    `).join('')
    : `<p style="color:var(--text-muted); font-size:13px;">Nenhum exercício cadastrado para ${estado.diaAtivo}.</p>`;

  return `
    <div class="dias-semana">${pills}</div>
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
    </form>
  `;
}

function selecionarDia(dia) {
  estado.diaAtivo = dia;
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
    carga: document.getElementById('fCarga').value ? parseFloat(document.getElementById('fCarga').value) : null
  };

  trainer.adicionarExercicio(alunoId, estado.diaAtivo, exercicio).then(() => {
    carregarDadosDoAluno(alunoId);
  });

  return false;
}

function removerExercicio(exercicioId) {
  trainer.deletarExercicio(estado.alunoSelecionadoId, estado.diaAtivo, exercicioId).then(() => {
    carregarDadosDoAluno(estado.alunoSelecionadoId);
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
