/* Team Spancerski — Dashboard do Personal
   Arquivo completo para substituir o dashboard.js ausente no projeto original.
*/
(function () {
  'use strict';

  const DIAS = ['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];
  const POSICOES = ['Frente','Costas','Lateral Esquerda','Lateral Direita'];
  let alunos = [];
  let alunoAtual = null;
  let abaAtual = 'resumo';
  let diaAtual = DIAS[0];
  let protocoloCache = {};
  let lotesCache = [];
  let resumoIACache = null;
  let dietaCache = null;
  let avaliacoesCache = [];
  let mesociclosCache = {};
  let pagamentosCache = {};
  let fotosSelecionadas = {};

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const moeda = (v) => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const data = (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '-';
  const hora = (v) => v ? new Date(v).toLocaleString('pt-BR') : '-';
  const inicial = (nome) => String(nome||'?').trim().charAt(0).toUpperCase();
  const toast = (msg, erro=false) => {
    let el = $('spToast');
    if (!el) { el=document.createElement('div'); el.id='spToast'; el.className='sp-toast'; document.body.appendChild(el); }
    el.textContent=msg; el.classList.toggle('erro',erro); el.classList.add('visivel');
    clearTimeout(window.__spToast); window.__spToast=setTimeout(()=>el.classList.remove('visivel'),3200);
  };
  const loading = (msg='Processando...') => { let el=$('spLoading'); if(!el){el=document.createElement('div');el.id='spLoading';el.className='sp-loading';document.body.appendChild(el);} el.innerHTML=`<div class="sp-loading-card"><div class="sp-spinner"></div><strong>${esc(msg)}</strong></div>`;el.classList.add('visivel'); };
  const stopLoading = ()=> $('spLoading')?.classList.remove('visivel');

  function renderizarRail() {
    const alvo = ($('buscaAluno')?.value || '').toLowerCase().trim();
    const lista = alunos.filter(a => !alvo || String(a.nome||'').toLowerCase().includes(alvo));
    $('listaAlunosRail').innerHTML = lista.length ? lista.map(a => `
      <div class="item-aluno-rail ${alunoAtual?.id===a.id?'ativo':''}" onclick="selecionarAluno('${esc(a.id)}')">
        <div style="display:flex;align-items:center;gap:9px;min-width:0"><span class="sp-avatar-mini">${esc(inicial(a.nome))}</span><span class="nome" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.nome)}</span></div>
        <span class="status-dot ${a.status==='Ativo'?'':'inativo'}"></span>
      </div>`).join('') : '<div class="vazio-rail">Nenhum aluno encontrado.</div>';
  }

  async function carregar() {
    try {
      alunos = await trainer.carregarAlunos();
      alunos.sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR'));
      renderizarRail();
      if (alunoAtual) await selecionarAluno(alunoAtual.id, true); else renderHome();
    } catch(e) { toast('Não foi possível carregar os alunos: '+e.message,true); renderHome(true); }
  }

  function renderHome(erro=false) {
    const ativos=alunos.filter(a=>a.status!=='Inativo').length;
    $('painel').innerHTML=`<div class="visao-geral">
      <div class="boas-vindas"><p class="sp-kicker">TEAM SPANCERSKI / CONTROL CENTER</p><h1>Seu centro de comando.</h1><p>${erro?'Verifique a configuração do Firebase.':'Gerencie alunos, treinos, avaliações, dieta e evolução em um só lugar.'}</p></div>
      <div class="grid-kpis">
        <div class="stat-card"><div class="label">Alunos</div><div class="valor">${alunos.length}</div></div>
        <div class="stat-card pago"><div class="label">Ativos</div><div class="valor">${ativos}</div></div>
        <div class="stat-card"><div class="label">Avaliações</div><div class="valor">${alunos.length ? '—' : '0'}</div></div>
      </div>
      <div class="acesso-rapido"><button class="btn-acao primario" onclick="abrirModalNovoAluno()">+ Novo aluno</button><button class="btn-acao" onclick="abrirBancoVideosGlobal()">🎬 Banco de vídeos</button></div>
      <div class="secao-recentes"><h3>Alunos recentes</h3><div class="lista-recentes">${alunos.slice(0,8).map(a=>`<div class="item-recente" onclick="selecionarAluno('${esc(a.id)}')"><div class="avatar-inicial">${esc(inicial(a.nome))}</div><div class="info-recente"><div class="nome">${esc(a.nome)}</div><div class="sub">${esc(a.objetivo||'Objetivo não informado')} · ${data(a.dataCadastro)}</div></div><span>→</span></div>`).join('') || '<div class="sem-treino">Cadastre seu primeiro aluno.</div>'}</div></div>
    </div>`;
  }

  window.selecionarAluno = async function(id, silencioso=false) {
    try {
      alunoAtual = await trainer.buscarAluno(id);
      if(!alunoAtual) throw new Error('Aluno não encontrado.');
      trainer.alunoAtual=alunoAtual;
      abaAtual='resumo';
      await carregarDadosAluno();
      renderizarRail(); renderAluno();
    } catch(e){ if(!silencioso) toast(e.message,true); }
  };

  async function carregarDadosAluno() {
    const [protocolo,lotes,resumo,dieta,avals,mesos,pags] = await Promise.all([
      trainer.carregarProtocolo(alunoAtual.id), trainer.carregarLotesFotos(alunoAtual.id), trainer.carregarResumoIA(alunoAtual.id),
      trainer.carregarDieta(alunoAtual.id), trainer.carregarAvaliacoesDobras(alunoAtual.id), trainer.carregarMesociclos(alunoAtual.id), trainer.carregarPagamentos(alunoAtual.id)
    ]);
    protocoloCache=protocolo||{}; lotesCache=lotes||[]; resumoIACache=resumo||null; dietaCache=dieta||null; avaliacoesCache=avals||[]; mesociclosCache=mesos||{}; pagamentosCache=pags||{};
  }

  function tabs() {
    return ['resumo','treino','avaliacao','dieta','mesociclos','financeiro'].map(t=>`<button class="aba ${abaAtual===t?'ativa':''}" onclick="trocarAba('${t}')">${({resumo:'Resumo',treino:'Treino',avaliacao:'Avaliação',dieta:'Dieta',mesociclos:'Mesociclos',financeiro:'Financeiro'})[t]}</button>`).join('');
  }

  function renderAluno() {
    $('painel').innerHTML=`<div class="cabecalho-aluno">
      <div><div class="sp-kicker">ALUNO / ${esc(alunoAtual.status||'Ativo')}</div><h1>${esc(alunoAtual.nome)}</h1><div class="meta-aluno"><span>${esc(alunoAtual.objetivo||'Objetivo não informado')}</span><span>${alunoAtual.idade?esc(alunoAtual.idade)+' anos':''}</span><span>${alunoAtual.peso?esc(alunoAtual.peso)+' kg':''}</span><span>${alunoAtual.altura?esc(alunoAtual.altura)+' cm':''}</span></div></div>
      <div class="acoes-aluno"><button class="btn-acao" onclick="abrirEdicaoAluno()">Editar</button><button class="btn-acao" onclick="compartilharAluno()">🔗 Compartilhar</button><button class="btn-acao primario" onclick="exportarAlunoPDF()">PDF completo</button></div>
    </div><div class="abas">${tabs()}</div><div id="conteudoAba"></div>`;
    renderAba();
  }
  window.trocarAba = async function(t){abaAtual=t; renderAluno();};

  function renderAba(){
    const c=$('conteudoAba'); if(!c)return;
    if(abaAtual==='resumo') renderResumo(c); if(abaAtual==='treino') renderTreino(c); if(abaAtual==='avaliacao') renderAvaliacao(c); if(abaAtual==='dieta') renderDieta(c); if(abaAtual==='mesociclos') renderMesociclos(c); if(abaAtual==='financeiro') renderFinanceiro(c);
  }

  function renderResumo(c){
    const r=trainer.gerarRelatorioEvolucao(alunoAtual,avaliacoesCache,lotesCache); const ult=lotesCache[0];
    c.innerHTML=`<div class="grid-kpis"><div class="stat-card"><div class="label">Último lote</div><div class="valor" style="font-size:18px">${ult?data(ult.data):'—'}</div></div><div class="stat-card"><div class="label">Avaliações físicas</div><div class="valor">${avaliacoesCache.length}</div></div><div class="stat-card"><div class="label">Mesociclos</div><div class="valor">${Object.keys(mesociclosCache).length}</div></div></div>
    <div class="relatorio-evolucao"><div class="relatorio-cabecalho"><h3>Evolução</h3><p class="explicacao">${r.loteAnterior?'Comparação entre os dois lotes mais recentes.':'Primeiro lote registrado: linha de base ATUAL.'}</p></div>${renderComparacao(r)}<div class="bloco-resumo-ia">${renderResumoIA()}</div></div>
    <div class="sp-grid-2"><section class="sp-panel"><h3>Contato</h3><p>${alunoAtual.telefone?esc(alunoAtual.telefone):'WhatsApp não cadastrado.'}</p><button class="btn-acao primario" onclick="abrirWhatsAppAluno()">WhatsApp</button></section><section class="sp-panel"><h3>Compartilhar</h3><p>Envie um link com treino, dieta, fotos e evolução.</p><button class="btn-acao" onclick="compartilharAluno()">Gerar / copiar link</button></section></div>`;
  }

  function renderComparacao(r){
    if(!r.loteNovo) return '<div class="sem-treino">Nenhuma foto de evolução enviada.</div>';
    const novo=r.loteNovo, ant=r.loteAnterior;
    return `<div class="sp-photo-comparison">${POSICOES.map(pos=>{const a=ant?.fotos?.find(f=>f.posicao===pos),d=novo.fotos?.find(f=>f.posicao===pos);return `<div class="sp-compare-card"><div class="sp-compare-title">${esc(pos)}</div><div class="sp-compare-grid">${a?`<div><img src="${a.url}" alt="${esc(pos)} antes"><small>ANTES · ${data(ant.data)}</small></div>`:''}<div><img src="${d?.url||''}" alt="${esc(pos)} depois"><small class="destaque">${ant?'DEPOIS':'ATUAL'} · ${data(novo.data)}</small></div></div></div>`}).join('')}</div>`;
  }

  function renderResumoIA(){
    if(!resumoIACache?.texto) return `<div class="sp-ai-box"><div><strong>IA de evolução</strong><p>A análise aparece aqui após o segundo lote de fotos.</p></div><button class="btn-acao" onclick="gerarResumoIABtn()">Analisar agora</button></div>`;
    return `<div class="sp-ai-box"><div><strong>Resumo da IA</strong><span class="sp-ai-date">${hora(resumoIACache.geradoEm)}</span></div><div class="sp-ai-text">${esc(resumoIACache.texto).replace(/\n/g,'<br>')}</div><button class="btn-acao" onclick="gerarResumoIABtn()">Atualizar análise</button></div>`;
  }
  window.gerarResumoIABtn=async function(){
    if(!lotesCache[0]) return toast('Envie as fotos atuais primeiro.',true);
    if(!lotesCache[1]) return toast('A IA precisa de pelo menos dois lotes para comparar.',true);
    try{loading('Analisando evolução com IA...'); resumoIACache=await trainer.gerarResumoEvolucaoIA(alunoAtual.id,alunoAtual,lotesCache[1],lotesCache[0]); renderAluno(); toast('Análise concluída.');}catch(e){toast(e.message,true);}finally{stopLoading();}
  };

  function renderTreino(c){
    const dias=Object.keys(protocoloCache).filter(k=>k!=='dataAtualizacao'); if(!diaAtual || !protocoloCache[diaAtual]) diaAtual=dias[0]||DIAS[0];
    c.innerHTML=`<div class="sp-toolbar"><div><h2 class="sp-title">Protocolo de treino</h2><p class="sp-muted">Importe Word/PDF ou edite manualmente.</p></div><div class="sp-toolbar-actions"><label class="btn-acao primario sp-file-btn">📄 Importar Word/PDF<input type="file" accept=".docx,.pdf" onchange="importarProtocolo(this.files[0])" hidden></label><button class="btn-acao" onclick="abrirModalExercicio()">+ Exercício</button></div></div>
    <div class="sp-import-note">A importação gera uma prévia antes de salvar. Campos ausentes não são inventados.</div>
    <div class="dias-semana">${(dias.length?dias:DIAS).map(d=>`<button class="dia-pill ${diaAtual===d?'ativo':''}" onclick="selecionarDia('${esc(d)}')">${esc(d)} <span class="contagem">${(protocoloCache[d]?.exercicios||[]).length}</span></button>`).join('')}</div>
    <div class="bloco-exercicios">${(protocoloCache[diaAtual]?.exercicios||[]).map((ex,i)=>`<div class="linha-exercicio"><div class="ordem">${i+1}</div><div><div class="nome-ex">${esc(ex.nome)}</div><div class="sp-muted">${esc(ex.notas||'')}</div></div><div class="detalhe-mini">${esc(ex.series)} × ${esc(ex.repeticoes)}</div><div class="detalhe-mini">${esc(ex.descanso||60)}s</div><div class="detalhe-mini">${ex.carga?esc(ex.carga)+'kg':'—'}</div><button class="remover" onclick="deletarEx('${esc(diaAtual)}','${esc(ex.id)}')">×</button></div>`).join('') || '<div class="sem-treino">Nenhum exercício neste dia.</div>'}</div>`;
  }
  window.selecionarDia=(d)=>{diaAtual=d;renderAluno();};
  window.deletarEx=async(d,id)=>{if(!confirm('Excluir este exercício?'))return;try{loading('Salvando...');await trainer.deletarExercicio(alunoAtual.id,d,id);await carregarDadosAluno();renderAluno();toast('Exercício excluído.');}catch(e){toast(e.message,true)}finally{stopLoading();}};

  window.abrirModalExercicio=function(){
    const modal=document.createElement('div'); modal.className='overlay-modal'; modal.id='modalEx'; modal.innerHTML=`<div class="modal"><h2>Novo exercício</h2><form onsubmit="salvarExercicioForm(event)"><div class="campo"><label>Dia</label><select id="exDia">${DIAS.map(d=>`<option ${diaAtual===d?'selected':''}>${d}</option>`).join('')}</select></div><div class="campo"><label>Exercício *</label><input id="exNome" required></div><div class="sp-grid-3"><div class="campo"><label>Séries</label><input id="exSeries" type="number" min="1" value="3"></div><div class="campo"><label>Repetições</label><input id="exReps" value="8-12"></div><div class="campo"><label>Descanso (s)</label><input id="exDesc" type="number" value="60"></div></div><div class="sp-grid-2"><div class="campo"><label>Carga (kg)</label><input id="exCarga" type="number" step="0.1"></div><div class="campo"><label>Técnicas</label><input id="exTecnicas" placeholder="drop set, rest-pause"></div></div><div class="campo"><label>Observações</label><textarea id="exNotas"></textarea></div><div class="modal-acoes"><button type="button" class="btn-cancelar" onclick="document.getElementById('modalEx').remove()">Cancelar</button><button class="btn-confirmar">Salvar</button></div></form></div>`;document.body.appendChild(modal);
  };
  window.salvarExercicioForm=async(e)=>{e.preventDefault();try{loading('Salvando exercício...');await trainer.adicionarExercicio(alunoAtual.id,$('exDia').value,{nome:$('exNome').value,series:Number($('exSeries').value),repeticoes:$('exReps').value,descanso:Number($('exDesc').value),carga:$('exCarga').value?Number($('exCarga').value):null,tecnicas:$('exTecnicas').value.split(',').map(x=>x.trim()).filter(Boolean),notas:$('exNotas').value});$('modalEx').remove();await carregarDadosAluno();diaAtual=$('exDia')?.value||diaAtual;renderAluno();toast('Exercício salvo.');}catch(e){toast(e.message,true)}finally{stopLoading();}};

  window.importarProtocolo=async function(arquivo){if(!arquivo)return;try{loading('Lendo protocolo e estruturando com IA...');const p=await trainer.importarProtocoloDeArquivo(arquivo);renderPreviewProtocolo(p);}catch(e){toast(e.message,true)}finally{stopLoading();}};
  function renderPreviewProtocolo(p){
    const dias=Object.entries(p); const modal=document.createElement('div');modal.className='overlay-modal';modal.id='modalPreviewProtocolo';modal.innerHTML=`<div class="modal sp-modal-wide"><h2>Prévia do protocolo identificado</h2><p class="sp-muted">Revise antes de salvar no aluno.</p>${dias.map(([dia,exs])=>`<section class="sp-preview-day"><h3>${esc(dia)}</h3>${exs.map((ex,i)=>`<div class="sp-preview-row"><span>${i+1}</span><strong>${esc(ex.nome)}</strong><input data-dia="${esc(dia)}" data-id="${esc(ex.id)}" data-k="series" value="${esc(ex.series)}"><input data-dia="${esc(dia)}" data-id="${esc(ex.id)}" data-k="repeticoes" value="${esc(ex.repeticoes)}"><input data-dia="${esc(dia)}" data-id="${esc(ex.id)}" data-k="descanso" value="${esc(ex.descanso)}"><input data-dia="${esc(dia)}" data-id="${esc(ex.id)}" data-k="carga" value="${ex.carga??''}" placeholder="kg"></div>`).join('')}</section>`).join('')}<div class="modal-acoes"><button class="btn-cancelar" onclick="this.closest('.overlay-modal').remove()">Cancelar</button><button class="btn-confirmar" onclick="confirmarProtocoloImportado()">Confirmar e salvar</button></div></div>`;document.body.appendChild(modal);window.__protocoloPreview=p;
  }
  window.confirmarProtocoloImportado=async()=>{try{loading('Salvando protocolo...');const p=JSON.parse(JSON.stringify(window.__protocoloPreview||{}));document.querySelectorAll('#modalPreviewProtocolo input[data-id]').forEach(i=>{const ex=Object.values(p).flat().find(x=>x.id===i.dataset.id);if(!ex)return;const k=i.dataset.k;ex[k]=(k==='series'||k==='descanso')?Number(i.value||0):(k==='carga'?(i.value===''?null:Number(i.value)):i.value);});await trainer.aplicarProtocoloImportado(alunoAtual.id,p);await carregarDadosAluno();document.getElementById('modalPreviewProtocolo').remove();renderAluno();toast('Protocolo importado com sucesso.');}catch(e){toast(e.message,true)}finally{stopLoading();}};

  function renderAvaliacao(c){
    const ultima=avaliacoesCache[0];
    c.innerHTML=`<div class="grid-avaliacao"><section class="form-dobras"><h3>Avaliação física — 7 dobras</h3><p class="explicacao">Informe as medidas em milímetros.</p><form onsubmit="salvarAvaliacao(event)"><div class="sp-grid-2">${[['peitoral','Peitoral'],['axilarMedia','Axilar média'],['triceps','Tríceps'],['subescapular','Subescapular'],['abdominal','Abdominal'],['suprailiaca','Suprailíaca'],['coxa','Coxa']].map(([k,l])=>`<div class="campo"><label>${l}</label><input name="${k}" type="number" step="0.1" min="0" required></div>`).join('')}</div><div class="sp-grid-2"><div class="campo"><label>Sexo</label><select name="sexo"><option value="M">Masculino</option><option value="F">Feminino</option></select></div><div class="campo"><label>Idade</label><input name="idade" type="number" value="${esc(alunoAtual.idade||'')}" required></div></div><div class="campo"><label>Peso (kg)</label><input name="peso" type="number" step="0.1" value="${esc(alunoAtual.peso||'')}" required></div><button class="btn-confirmar">Salvar avaliação</button></form>${ultima?`<div class="resultado-dobras"><div class="titulo-resultado">ÚLTIMA AVALIAÇÃO · ${data(ultima.data)}</div><div class="stats-resultado"><div class="item-stat"><div class="num">${esc(ultima.resultado.percentualGordura)}%</div><div class="lbl">Gordura</div></div><div class="item-stat"><div class="num">${esc(ultima.resultado.massaMagra??'-')}kg</div><div class="lbl">Massa magra</div></div></div></div>`:''}</section><section class="painel-fotos"><h3>Evolução fotográfica</h3><p class="explicacao">Envie até 4 fotos. O primeiro lote fica como <b>ATUAL</b>; o próximo vira <b>ANTES</b> e o novo vira <b>DEPOIS</b>.</p><div class="grid-slots-fotos">${POSICOES.map(pos=>`<label class="slot-foto"><input type="file" accept="image/*" data-pos="${esc(pos)}" onchange="selecionarFotoPosicao(this)" hidden><span class="slot-icone">＋</span><span class="slot-legenda">${esc(pos)}</span></label>`).join('')}</div><div class="sp-selected-photos" id="spSelectedPhotos"></div><button class="btn-acao primario" style="margin-top:14px;width:100%" onclick="enviarLoteFotos()">Enviar lote de fotos</button><div style="margin-top:18px">${renderHistoricoFotos()}</div></section></div>`;
  }
  function renderHistoricoFotos(){return `<h3 style="margin-top:20px">Histórico</h3>${lotesCache.map((l,i)=>`<div class="sp-history"><div><strong>${i===0?(lotesCache[1]?'DEPOIS':'ATUAL'):'ANTES'}</strong><span>${data(l.data)}</span></div><button class="btn-acao perigo" onclick="excluirLote('${esc(l.id)}')">Excluir</button></div>`).join('')||'<p class="sp-muted">Nenhum lote.</p>'}`;}
  window.selecionarFotoPosicao=function(input){const f=input.files?.[0];if(!f)return;fotosSelecionadas[input.dataset.pos]=f;$('spSelectedPhotos').innerHTML=Object.entries(fotosSelecionadas).map(([p,f])=>`<span class="sp-file-chip">${esc(p)} · ${esc(f.name)}</span>`).join('');};
  window.enviarLoteFotos=async function(){try{const qtd=Object.keys(fotosSelecionadas).length;if(!qtd)return toast('Selecione pelo menos uma foto.',true);if(qtd>4)return toast('O lote aceita no máximo 4 fotos.',true);loading('Processando fotos...');await trainer.uploadLoteFotos(alunoAtual.id,fotosSelecionadas);fotosSelecionadas={};await carregarDadosAluno();renderAluno();toast('Fotos enviadas.');if(lotesCache.length>1) setTimeout(()=>window.gerarResumoIABtn(),400);}catch(e){toast(e.message,true)}finally{stopLoading();}};
  window.excluirLote=async(id)=>{if(!confirm('Excluir este lote de fotos?'))return;try{loading('Excluindo...');const l=lotesCache.find(x=>x.id===id);if(l)await trainer.deletarLoteFotos(alunoAtual.id,l);await carregarDadosAluno();renderAluno();toast('Lote excluído.');}catch(e){toast(e.message,true)}finally{stopLoading();}};
  window.salvarAvaliacao=async function(e){e.preventDefault();const fd=new FormData(e.target);const d=Object.fromEntries(fd.entries());Object.keys(d).forEach(k=>{if(['sexo'].includes(k))return;d[k]=Number(d[k]);});try{loading('Calculando avaliação...');await trainer.salvarAvaliacaoDobras(alunoAtual.id,d);await carregarDadosAluno();renderAluno();toast('Avaliação salva.');}catch(e){toast(e.message,true)}finally{stopLoading();}};

  function renderDieta(c){
    c.innerHTML=`<div class="sp-toolbar"><div><h2 class="sp-title">Dieta do aluno</h2><p class="sp-muted">Envie Word ou PDF. O conteúdo fica disponível no portal do aluno.</p></div><label class="btn-acao primario sp-file-btn">📄 Enviar dieta<input type="file" accept=".docx,.pdf" onchange="importarDieta(this.files[0])" hidden></label></div>${dietaCache?`<section class="sp-panel"><div class="sp-file-head"><div><strong>${esc(dietaCache.nomeArquivo)}</strong><span>Atualizada em ${hora(dietaCache.atualizadoEm)}</span></div><button class="btn-acao perigo" onclick="removerDieta()">Remover</button></div><div class="dieta-conteudo">${dietaCache.html||'<p>Arquivo sem conteúdo legível.</p>'}</div></section>`:'<div class="sem-treino">Nenhuma dieta cadastrada.</div>'}`;
  }
  window.importarDieta=async function(f){if(!f)return;try{loading('Lendo dieta...');dietaCache=await trainer.importarDietaDeArquivo(alunoAtual.id,f);renderAluno();toast('Dieta importada.');}catch(e){toast(e.message,true)}finally{stopLoading();}};
  window.removerDieta=async()=>{if(!confirm('Remover a dieta deste aluno?'))return;try{loading('Removendo...');await trainer.deletarDieta(alunoAtual.id);dietaCache=null;renderAluno();toast('Dieta removida.');}catch(e){toast(e.message,true)}finally{stopLoading();}};

  function renderMesociclos(c){const ms=Object.values(mesociclosCache);c.innerHTML=`<div class="sp-toolbar"><div><h2 class="sp-title">Mesociclos</h2><p class="sp-muted">Periodização ondulatória baseada nas cargas cadastradas.</p></div><button class="btn-acao primario" onclick="criarMesoPrompt()">+ Criar mesociclo</button></div>${ms.map(m=>`<section class="sp-panel"><div class="sp-file-head"><div><strong>${esc(m.nome)}</strong><span>${esc(m.tipo||'')}</span></div><button class="btn-acao perigo" onclick="deletarMeso('${esc(m.id)}')">Excluir</button></div>${(m.semanas||[]).map(s=>`<div class="sp-week"><strong>Semana ${s.numero}</strong><span>${s.percentual}%</span></div>`).join('')}</section>`).join('')||'<div class="sem-treino">Nenhum mesociclo.</div>'}`;}
  window.criarMesoPrompt=async()=>{const nome=prompt('Nome do mesociclo:','Mesociclo 1');if(!nome)return;const raw=prompt('Percentuais por semana separados por vírgula:','80,70,60,50');if(!raw)return;const p=raw.split(',').map(Number).filter(n=>n>0);if(!p.length)return toast('Percentuais inválidos.',true);try{loading('Criando mesociclo...');await trainer.criarMesocicloOndulatorio(alunoAtual.id,nome,p,protocoloCache);await carregarDadosAluno();renderAluno();toast('Mesociclo criado.');}catch(e){toast(e.message,true)}finally{stopLoading();}};
  window.deletarMeso=async id=>{if(!confirm('Excluir mesociclo?'))return;try{await trainer.deletarMesociclo(alunoAtual.id,id);await carregarDadosAluno();renderAluno();}catch(e){toast(e.message,true)}};

  function renderFinanceiro(c){const ps=Object.values(pagamentosCache);c.innerHTML=`<div class="resumo-financeiro"><div class="stat-card pago"><div class="label">Pago</div><div class="valor">${moeda(trainer.totalMensal(pagamentosCache))}</div></div><div class="stat-card pendente"><div class="label">Pendente</div><div class="valor">${moeda(trainer.totalPendente(pagamentosCache))}</div></div></div><div class="sp-panel"><div class="sp-toolbar"><div><h2 class="sp-title">Pagamentos</h2></div><button class="btn-acao primario" onclick="registrarPagamentoPrompt()">+ Registrar</button></div><table class="tabela-pagamentos"><thead><tr><th>Data</th><th>Valor</th><th>Status</th><th>Descrição</th></tr></thead><tbody>${ps.map(p=>`<tr><td>${esc(p.data||'-')}</td><td>${moeda(p.valor)}</td><td><span class="pill-status ${p.status==='Pago'?'pago':'pendente'}">${esc(p.status)}</span></td><td>${esc(p.descricao||'-')}</td></tr>`).join('')||'<tr><td colspan="4">Nenhum pagamento.</td></tr>'}</tbody></table></div>`;}
  window.registrarPagamentoPrompt=async()=>{const valor=prompt('Valor (R$):',alunoAtual.mensalidade||'');if(!valor)return;const status=prompt('Status: Pago ou Pendente','Pago');const desc=prompt('Descrição:','Mensalidade');try{await trainer.registrarPagamento(alunoAtual.id,{valor:Number(valor),status:status==='Pendente'?'Pendente':'Pago',descricao:desc,data:new Date().toISOString()});await carregarDadosAluno();renderAluno();toast('Pagamento registrado.');}catch(e){toast(e.message,true)}};

  window.abrirModalNovoAluno=function(){const m=$('overlayModal');m.classList.remove('oculto');$('mNome').focus();};
  window.fecharModalNovoAluno=function(){$('overlayModal').classList.add('oculto');$('formNovoAluno').reset();};
  window.criarAlunoForm=async function(e){e.preventDefault();try{loading('Cadastrando aluno...');const a=await trainer.adicionarAluno({nome:$('mNome').value.trim(),idade:Number($('mIdade').value)||null,objetivo:$('mObjetivo').value.trim(),peso:Number($('mPeso').value)||null,altura:Number($('mAltura').value)||null,telefone:$('mTelefone').value.trim(),mensalidade:Number($('mMensalidade').value)||null});fecharModalNovoAluno();alunos.push(a);alunos.sort((x,y)=>x.nome.localeCompare(y.nome,'pt-BR'));renderizarRail();await selecionarAluno(a.id);toast('Aluno cadastrado.');}catch(e){toast(e.message,true)}finally{stopLoading();}return false;};

  window.abrirEdicaoAluno=function(){const m=document.createElement('div');m.className='overlay-modal';m.id='modalEditAluno';m.innerHTML=`<div class="modal"><h2>Editar aluno</h2><form onsubmit="salvarEdicaoAluno(event)"><div class="campo"><label>Nome *</label><input id="edNome" required value="${esc(alunoAtual.nome)}"></div><div class="sp-grid-2"><div class="campo"><label>Idade</label><input id="edIdade" type="number" value="${esc(alunoAtual.idade||'')}"></div><div class="campo"><label>Objetivo</label><input id="edObj" value="${esc(alunoAtual.objetivo||'')}"></div></div><div class="sp-grid-2"><div class="campo"><label>Peso</label><input id="edPeso" type="number" step="0.1" value="${esc(alunoAtual.peso||'')}"></div><div class="campo"><label>Altura</label><input id="edAltura" type="number" value="${esc(alunoAtual.altura||'')}"></div></div><div class="campo"><label>WhatsApp</label><input id="edTel" value="${esc(alunoAtual.telefone||'')}"></div><div class="modal-acoes"><button type="button" class="btn-cancelar" onclick="this.closest('.overlay-modal').remove()">Cancelar</button><button class="btn-confirmar">Salvar</button></div></form></div>`;document.body.appendChild(m);};
  window.salvarEdicaoAluno=async e=>{e.preventDefault();try{loading('Salvando...');await trainer.atualizarAluno(alunoAtual.id,{nome:$('edNome').value.trim(),idade:Number($('edIdade').value)||null,objetivo:$('edObj').value.trim(),peso:Number($('edPeso').value)||null,altura:Number($('edAltura').value)||null,telefone:$('edTel').value.trim()});document.getElementById('modalEditAluno').remove();await carregar();await selecionarAluno(alunoAtual.id);toast('Dados atualizados.');}catch(e){toast(e.message,true)}finally{stopLoading();}};

  window.compartilharAluno=async()=>{const link=trainer.gerarLinkAluno(alunoAtual.id);try{await navigator.clipboard.writeText(link);toast('Link copiado: '+link);}catch(_){prompt('Copie o link do aluno:',link)}};
  window.abrirWhatsAppAluno=()=>{if(!alunoAtual.telefone)return toast('Cadastre o WhatsApp do aluno.',true);const n=String(alunoAtual.telefone).replace(/\D/g,'');window.open(`https://wa.me/${n.startsWith('55')?n:'55'+n}`,'_blank','noopener');};
  window.exportarAlunoPDF=async()=>{try{loading('Gerando PDF completo...');await trainer.exportarDados(alunoAtual.id);toast('PDF gerado.');}catch(e){toast(e.message,true)}finally{stopLoading();}};
  window.abrirBancoVideosGlobal=async function(){
    const m=document.createElement('div');m.className='overlay-modal';m.id='modalVideosGlobal';m.innerHTML=`<div class="modal sp-modal-wide"><h2>Banco de vídeos</h2><p class="sp-muted">Pesquise exercícios e importe referências para o catálogo.</p><div class="sp-grid-2"><div class="painel-importacao"><h3>ExerciseDB grátis</h3><div class="linha-importacao"><input id="edbBusca" class="busca-aluno" placeholder="ex: squat, bench press"><button class="btn-acao primario" onclick="buscarEDB()">Buscar</button></div><div id="edbResultados" class="grid-importacao"></div></div><div class="painel-importacao"><h3>Catálogo salvo</h3><div id="catalogoSalvo" class="grid-importacao"></div></div></div><div class="modal-acoes"><button class="btn-cancelar" onclick="this.closest('.overlay-modal').remove()">Fechar</button></div></div>`;document.body.appendChild(m);renderCatalogo();};
  window.buscarEDB=async()=>{const box=$('edbResultados');box.innerHTML='<p class="sp-muted">Buscando...</p>';try{const rs=await trainer.buscarExerciseDBGratis($('edbBusca').value);box.innerHTML=rs.map((x,i)=>`<div class="card-importacao"><img src="${esc(x.gifUrl)}" alt="${esc(x.nome)}"><div class="info-importacao"><strong>${esc(x.nome)}</strong><p class="sp-muted">${esc(x.grupoMuscular)}</p><button class="btn-acao primario" onclick='importarEDB(${JSON.stringify(x).replace(/'/g,"&#39;")})'>+ Importar</button></div></div>`).join('')||'<p class="sp-muted">Nenhum resultado.</p>';}catch(e){box.innerHTML='<p class="sp-muted">'+esc(e.message)+'</p>';}};
  window.importarEDB=async x=>{try{await trainer.importarExercicioExerciseDBGratis(x);toast('Exercício importado.');renderCatalogo();}catch(e){toast(e.message,true)}};
  async function renderCatalogo(){const box=$('catalogoSalvo');if(!box)return;try{const xs=await trainer.carregarCatalogoExercicios();box.innerHTML=xs.slice(0,24).map(x=>`<div class="card-importacao"><div class="info-importacao"><strong>${esc(x.nome)}</strong><p class="sp-muted">${esc(x.grupoMuscular||'')}</p>${x.gifUrl?`<img src="${esc(x.gifUrl)}" alt="">`:''}</div></div>`).join('')||'<p class="sp-muted">Catálogo vazio.</p>';}catch(e){box.innerHTML='<p class="sp-muted">'+esc(e.message)+'</p>';}}

  document.addEventListener('DOMContentLoaded',()=>{carregar();});
})();
