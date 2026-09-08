/* Team Spancerski — Portal do aluno */
(function(){
  'use strict';
  const qs=new URLSearchParams(location.search);
  const id=qs.get('aluno');
  const token=qs.get('token');
  const POS=['Frente','Costas','Lateral Esquerda','Lateral Direita'];
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const date=v=>v?new Date(v).toLocaleDateString('pt-BR'):'-';
  function erro(msg){$('app').innerHTML=`<div class="tela-erro"><p class="erro-mensagem">${esc(msg)}</p><a class="btn-voltar" href="index.html">Voltar</a></div>`;}
  async function init(){
    if(!id&&!token)return erro('Link do aluno inválido.');
    try{
      // Compatibilidade com o link atual (?aluno=ID). Token pode ser adicionado depois com regras Firebase.
      const aluno=await trainer.buscarAluno(id);
      if(!aluno)return erro('Aluno não encontrado.');
      const [protocolo,lotes,resumo,dieta,avals,mesos,catalogo]=await Promise.all([
        trainer.carregarProtocolo(id),trainer.carregarLotesFotos(id),trainer.carregarResumoIA(id),trainer.carregarDieta(id),trainer.carregarAvaliacoesDobras(id),trainer.carregarMesociclos(id),trainer.carregarCatalogoExercicios()
      ]);
      render(aluno,protocolo,lotes,resumo,dieta,avals,mesos,catalogo);
    }catch(e){erro('Não foi possível carregar seu acompanhamento. '+e.message);}
  }
  function render(aluno,p,lotes,resumo,dieta,avals,mesos,catalogo){
    const wa=aluno.telefone?`https://wa.me/${String(aluno.telefone).replace(/\D/g,'').replace(/^([^5])/,'55$1')}`:'';
    const inst=window.APP_CONFIG?.PERSONAL_INSTAGRAM||'';
    $('app').innerHTML=`<div class="app-aluno sp-student-app"><header class="header-aluno"><div class="sp-brand-line"><img src="logo-transparente.png" alt="Team Spancerski"><div><div class="sp-kicker">TEAM SPANCERSKI</div><h1>Olá, <span class="nome-aluno">${esc(aluno.nome)}</span></h1><p class="data-hoje">${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</p></div></div><div class="sp-student-meta"><span>${esc(aluno.objetivo||'Objetivo')}</span>${aluno.peso?`<span>${esc(aluno.peso)} kg</span>`:''}${aluno.altura?`<span>${esc(aluno.altura)} cm</span>`:''}</div></header><nav class="sp-student-nav"><button class="ativa" data-tab="treino">Treino</button><button data-tab="dieta">Dieta</button><button data-tab="evolucao">Evolução</button><button data-tab="avaliacoes">Avaliações</button></nav><main class="container-treino" id="studentContent"></main><footer class="sp-student-footer">${wa?`<a class="btn-acao primario" href="${wa}" target="_blank" rel="noopener">💬 Falar com meu Personal</a>`:''}${inst?`<a class="btn-acao" href="${esc(inst)}" target="_blank" rel="noopener">Instagram</a>`:''}</footer></div>`;
    const state={aluno,p,lotes,resumo,dieta,avals,mesos,catalogo};
    document.querySelectorAll('.sp-student-nav button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.sp-student-nav button').forEach(x=>x.classList.remove('ativa'));b.classList.add('ativa');renderTab(b.dataset.tab,state);}));
    renderTab('treino',state);
  }
  function renderTab(tab,s){const c=$('studentContent');if(tab==='treino')renderTreino(c,s);if(tab==='dieta')renderDieta(c,s);if(tab==='evolucao')renderEvolucao(c,s);if(tab==='avaliacoes')renderAval(c,s);}
  function renderTreino(c,s){const dias=Object.keys(s.p||{}).filter(k=>k!=='dataAtualizacao');c.innerHTML=`<div class="sp-student-section"><div class="sp-section-head"><div><div class="sp-kicker">PLANO ATUAL</div><h2>Seu treino</h2></div></div>${dias.map(d=>`<section class="sp-day-card"><h3>${esc(d)}</h3>${(s.p[d]?.exercicios||[]).map((ex,i)=>{const cat=s.catalogo.find(x=>x.nome===ex.nome);return `<article class="card-exercicio"><div class="numero-exercicio">${String(i+1).padStart(2,'0')}</div><div class="nome-exercicio"><h2>${esc(ex.nome)}</h2></div><div class="detalhes-exercicio"><div><b>${esc(ex.series)}</b><small>Séries</small></div><div><b>${esc(ex.repeticoes)}</b><small>Reps</small></div><div><b>${esc(ex.descanso||60)}s</b><small>Descanso</small></div>${ex.carga?`<div><b>${esc(ex.carga)}kg</b><small>Carga</small></div>`:''}</div>${ex.tecnicas?.length?`<div class="tags-ex-linha">${ex.tecnicas.map(t=>`<span class="tag-mini">${esc(t)}</span>`).join('')}</div>`:''}${ex.notas?`<p class="sp-note">${esc(ex.notas)}</p>`:''}${cat?.gifUrl?`<img class="sp-ex-gif" src="${esc(cat.gifUrl)}" alt="Demonstração de ${esc(ex.nome)}">`:''}</article>`}).join('')||'<div class="sem-treino">Nenhum exercício cadastrado.</div>'}</section>`).join('')||'<div class="sem-treino">Seu protocolo ainda não foi publicado.</div>'}</div>`;}
  function renderDieta(c,s){c.innerHTML=`<div class="sp-student-section"><div class="sp-kicker">NUTRIÇÃO</div><h2>Sua dieta</h2>${s.dieta?.html?`<article class="sp-student-doc"><div class="sp-doc-head"><strong>${esc(s.dieta.nomeArquivo||'Plano alimentar')}</strong><span>Atualizado em ${date(s.dieta.atualizadoEm)}</span></div><div class="dieta-conteudo">${s.dieta.html}</div></article>`:'<div class="sem-treino">Sua dieta ainda não foi publicada.</div>'}</div>`;}
  function renderEvolucao(c,s){const novo=s.lotes?.[0],ant=s.lotes?.[1];c.innerHTML=`<div class="sp-student-section"><div class="sp-kicker">CHECK-IN</div><h2>${ant?'Antes × Depois':'Foto atual'}</h2><p class="sp-muted">${ant?'Comparação dos dois check-ins mais recentes.':'Seu primeiro check-in é mostrado como ATUAL.'}</p><div class="sp-photo-comparison">${POS.map(pos=>{const a=ant?.fotos?.find(f=>f.posicao===pos),d=novo?.fotos?.find(f=>f.posicao===pos);return `<div class="sp-compare-card"><div class="sp-compare-title">${esc(pos)}</div><div class="sp-compare-grid">${a?`<div><img src="${a.url}" alt="${esc(pos)} antes"><small>ANTES · ${date(ant.data)}</small></div>`:''}${d?`<div><img src="${d.url}" alt="${esc(pos)} depois"><small class="destaque">${ant?'DEPOIS':'ATUAL'} · ${date(novo.data)}</small></div>`:''}</div></div>`}).join('')||'<div class="sem-treino">Nenhuma foto.</div>'}</div>${s.resumo?.texto?`<div class="sp-ai-box"><strong>Resumo da evolução</strong><div class="sp-ai-text">${esc(s.resumo.texto).replace(/\n/g,'<br>')}</div></div>`:''}</div>`;}
  function renderAval(c,s){const ult=s.avals?.[0];c.innerHTML=`<div class="sp-student-section"><div class="sp-kicker">AVALIAÇÃO</div><h2>Histórico físico</h2>${ult?`<div class="metricas-evolucao"><div class="metrica-card"><div class="metrica-label">Gordura</div><div class="metrica-valor">${esc(ult.resultado.percentualGordura)}<span class="unidade">%</span></div></div><div class="metrica-card"><div class="metrica-label">Massa magra</div><div class="metrica-valor">${esc(ult.resultado.massaMagra??'-')}<span class="unidade">kg</span></div></div><div class="metrica-card"><div class="metrica-label">Peso</div><div class="metrica-valor">${esc(ult.entradas.peso??'-')}<span class="unidade">kg</span></div></div></div>`:''}<div class="sp-history-list">${(s.avals||[]).map(a=>`<div class="sp-history"><strong>${date(a.data)}</strong><span>${esc(a.resultado.percentualGordura)}% gordura · ${esc(a.resultado.massaMagra??'-')}kg massa magra</span></div>`).join('')||'<div class="sem-treino">Nenhuma avaliação publicada.</div>'}</div></div>`;}
  init();
})();
