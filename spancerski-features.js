
/* Team Spancerski - recursos adicionais
   Fotos em lotes, importação DOCX/PDF, dieta, IA e PDF completo.
*/
(function () {
  'use strict';

  // COLOQUE A URL DO SEU CLOUDFLARE WORKER AQUI.
  const SPANCERSKI_AI_URL = window.SPANCERSKI_AI_URL || 'https:team-spancerski.edfspancerski.workers.dev';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));
  }

  function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    doc.querySelectorAll('script,iframe,object,embed,form,link,meta,style').forEach(el => el.remove());
    doc.querySelectorAll('*').forEach(el => {
      [...el.attributes].forEach(attr => {
        if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      });
      if (el.tagName === 'IMG') {
        const src = el.getAttribute('src') || '';
        if (!src.startsWith('data:image/')) el.removeAttribute('src');
      }
    });
    return doc.body.innerHTML;
  }

  function htmlToText(html) {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    return (doc.body.innerText || doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  }

  function parseDataUrl(dataUrl) {
    const m = String(dataUrl || '').match(/^data:([^;]+);base64,(.*)$/);
    if (!m) throw new Error('Imagem inválida.');
    return { mimeType: m[1], base64: m[2] };
  }

  function formatarData(iso) {
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  function normalizarDia(dia) {
    const mapa = {
      'segunda': 'Segunda-feira', 'segunda-feira': 'Segunda-feira',
      'terça': 'Terça-feira', 'terca': 'Terça-feira', 'terça-feira': 'Terça-feira', 'terca-feira': 'Terça-feira',
      'quarta': 'Quarta-feira', 'quarta-feira': 'Quarta-feira',
      'quinta': 'Quinta-feira', 'quinta-feira': 'Quinta-feira',
      'sexta': 'Sexta-feira', 'sexta-feira': 'Sexta-feira',
      'sábado': 'Sábado', 'sabado': 'Sábado', 'sábado-feira': 'Sábado',
      'domingo': 'Domingo'
    };
    const chave = String(dia || '').toLowerCase().trim();
    return mapa[chave] || dia;
  }

  async function lerArquivoTexto(arquivo) {
    const nome = arquivo.name.toLowerCase();
    const buffer = await arquivo.arrayBuffer();

    if (nome.endsWith('.docx')) {
      if (!window.mammoth) throw new Error('Leitor Word não carregado. Atualize a página.');
      const result = await window.mammoth.extractRawText({ arrayBuffer: buffer });
      return result.value.trim();
    }

    if (nome.endsWith('.pdf')) {
      if (!window.pdfjsLib) throw new Error('Leitor PDF não carregado. Atualize a página.');
      const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      const paginas = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        paginas.push(content.items.map(item => item.str || '').join(' '));
      }
      return paginas.join('\n\n').trim();
    }

    throw new Error('Formato não suportado. Use .docx ou .pdf.');
  }

  async function lerDocxHtml(arquivo) {
    if (!window.mammoth) throw new Error('Leitor Word não carregado. Atualize a página.');
    const buffer = await arquivo.arrayBuffer();
    const result = await window.mammoth.convertToHtml({ arrayBuffer: buffer });
    return sanitizeHtml(result.value);
  }

  async function chamarIA(path, body) {
    if (!SPANCERSKI_AI_URL || SPANCERSKI_AI_URL.includes('SEU-WORKER')) {
      throw new Error('Configure a URL do Cloudflare Worker em spancerski-features.js.');
    }
    const response = await fetch(SPANCERSKI_AI_URL.replace(/\/$/, '') + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `IA retornou HTTP ${response.status}.`);
    }
    return data;
  }

  // O dashboard antigo espera esta função. Agora não há chave de IA no navegador:
  // a chave real fica protegida como secret no Cloudflare Worker.
  window.obterChaveIA = function () {
    return SPANCERSKI_AI_URL && !SPANCERSKI_AI_URL.includes('SEU-WORKER')
      ? SPANCERSKI_AI_URL
      : null;
  };

  const T = (typeof trainer !== 'undefined') ? trainer : null;
  if (!T) {
    console.error('Team Spancerski: trainer não encontrado.');
    return;
  }

  // ---------- FOTOS EM LOTES ----------
  T.uploadLoteFotos = async function (alunoId, arquivos) {
    const existentes = await T.carregarLotesFotos(alunoId);
    const agora = new Date().toISOString();
    const loteId = 'lote_' + Date.now();

    const fotos = [];
    for (const [posicao, arquivo] of Object.entries(arquivos || {})) {
      const base64 = await T._redimensionarImagem(arquivo, 900, 0.70);
      fotos.push({
        id: 'foto_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        posicao,
        url: base64,
        data: agora
      });
    }

    if (!fotos.length) throw new Error('Nenhuma foto foi selecionada.');

    // Se a versão antiga do app já tinha fotos soltas, transforma-as no lote anterior.
    const refLotes = T.db.ref('avaliacoes/' + alunoId + '/lotesFotos');
    const snapLotes = await refLotes.once('value');
    const lotesAtuais = [];
    snapLotes.forEach(child => lotesAtuais.push(child.val()));

    if (!lotesAtuais.length) {
      const snapFotos = await T.db.ref('avaliacoes/' + alunoId + '/fotos').once('value');
      const fotosAntigas = [];
      snapFotos.forEach(child => {
        const f = child.val();
        fotosAntigas.push({
          id: f.id,
          posicao: f.posicao || ('Foto ' + (fotosAntigas.length + 1)),
          url: f.url,
          data: f.data
        });
      });
      if (fotosAntigas.length) {
        const primeiro = Math.min(...fotosAntigas.map(f => new Date(f.data).getTime()));
        await refLotes.child('lote_migrado_' + Date.now()).set({
          id: 'lote_migrado_' + Date.now(),
          data: new Date(primeiro).toISOString(),
          fotos: fotosAntigas,
          migrado: true
        });
      }
    }

    const registro = { id: loteId, data: agora, fotos };
    await refLotes.child(loteId).set(registro);
    return registro;
  };

  T.carregarLotesFotos = async function (alunoId) {
    const snap = await T.db.ref('avaliacoes/' + alunoId + '/lotesFotos').once('value');
    const lotes = [];
    snap.forEach(child => lotes.push(child.val()));
    if (lotes.length) {
      lotes.sort((a, b) => new Date(b.data) - new Date(a.data));
      return lotes;
    }

    // Compatibilidade com o modelo antigo de fotos individuais.
    const fotos = await T.carregarFotos(alunoId);
    if (!fotos.length) return [];
    return [{
      id: 'legacy',
      data: fotos[fotos.length - 1].data,
      fotos: fotos.map((f, i) => ({ ...f, posicao: f.posicao || ('Foto ' + (i + 1)) })),
      migrado: false
    }];
  };

  T.deletarLoteFotos = async function (alunoId, lote) {
    if (lote.id === 'legacy') {
      const fotos = lote.fotos || [];
      await Promise.all(fotos.map(f => T.deletarFoto(alunoId, f)));
      return true;
    }
    await T.db.ref('avaliacoes/' + alunoId + '/lotesFotos/' + lote.id).remove();
    return true;
  };

  // ---------- RELATÓRIO DE EVOLUÇÃO ----------
  const gerarRelatorioOriginal = T.gerarRelatorioEvolucao.bind(T);

  T.gerarRelatorioEvolucao = function (aluno, avaliacoesDobras, lotesFotos) {
    // Mantém métricas antigas e substitui somente a parte de fotos.
    const base = gerarRelatorioOriginal(aluno, avaliacoesDobras, []);
    const lotes = [...(lotesFotos || [])].sort((a, b) => new Date(b.data) - new Date(a.data));
    const loteNovo = lotes[0] || null;
    const loteAnterior = lotes[1] || null;

    let rotuloLoteNovo = 'Atual';
    if (loteAnterior) rotuloLoteNovo = 'Depois';

    return {
      ...base,
      lotes,
      loteNovo,
      loteAnterior,
      rotuloLoteNovo
    };
  };

  // ---------- IA ----------
  async function carregarImagemDataUrl(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function criarColagemComparacao(antes, depois, posicao) {
    const antesImg = antes?.url ? await carregarImagemDataUrl(antes.url) : null;
    const depoisImg = depois?.url ? await carregarImagemDataUrl(depois.url) : null;
    if (!antesImg && !depoisImg) return null;

    const largura = 900;
    const altura = 620;
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, largura, altura);

    ctx.fillStyle = '#111111';
    ctx.font = 'bold 26px Arial';
    ctx.fillText(posicao, 28, 38);

    const topo = 58;
    const larguraFoto = 420;
    const alturaFoto = 520;
    const x1 = 20;
    const x2 = 460;

    const desenharFoto = (img, x, titulo) => {
      if (!img) return;
      const escala = Math.min(larguraFoto / img.width, alturaFoto / img.height);
      const w = img.width * escala;
      const h = img.height * escala;
      const y = topo + (alturaFoto - h) / 2;
      ctx.drawImage(img, x + (larguraFoto - w) / 2, y, w, h);
      ctx.fillStyle = '#111111';
      ctx.font = 'bold 22px Arial';
      ctx.fillText(titulo, x + 12, topo + alturaFoto + 30);
    };

    desenharFoto(antesImg, x1, 'ANTES');
    desenharFoto(depoisImg, x2, antes ? 'DEPOIS' : 'ATUAL');

    return canvas.toDataURL('image/jpeg', 0.82);
  }

  T.gerarResumoEvolucaoIA = async function (alunoId, aluno, loteAnterior, loteNovo) {
    if (!loteNovo) throw new Error('Envie fotos atuais antes de usar a IA.');

    const posicoes = ['Frente', 'Costas', 'Lateral Esquerda', 'Lateral Direita'];
    const comparacoes = [];

    for (const posicao of posicoes) {
      const antes = (loteAnterior?.fotos || []).find(f => f.posicao === posicao);
      const depois = (loteNovo?.fotos || []).find(f => f.posicao === posicao);
      const imagem = await criarColagemComparacao(antes, depois, posicao);
      if (imagem) comparacoes.push({ posicao, imagem });
    }

    if (!comparacoes.length) {
      throw new Error('Não encontrei imagens válidas para análise.');
    }

    const resposta = await chamarIA('/analisar-evolucao', {
      aluno: { nome: aluno?.nome || '', objetivo: aluno?.objetivo || '' },
      loteAnterior: loteAnterior ? { data: loteAnterior.data } : null,
      loteNovo: { data: loteNovo.data },
      comparacoes
    });

    const registro = {
      geradoEm: new Date().toISOString(),
      texto: String(resposta.texto || '').trim(),
      modelo: resposta.modelo || 'Cloudflare Workers AI'
    };

    await T.db.ref('avaliacoes/' + alunoId + '/resumoIA').set(registro);
    return registro;
  };

  T.carregarResumoIA = function (alunoId) {
    return T.db.ref('avaliacoes/' + alunoId + '/resumoIA').once('value')
      .then(s => s.val() || null);
  };

  // ---------- IMPORTAÇÃO DO PROTOCOLO ----------
  T.importarProtocoloDeArquivo = async function (arquivo) {
    const texto = await lerArquivoTexto(arquivo);
    if (!texto || texto.length < 20) {
      throw new Error('Não consegui extrair texto desse arquivo. Se o PDF for escaneado como imagem, será necessário OCR.');
    }

    const resposta = await chamarIA('/parse-protocolo', {
      texto: texto.slice(0, 50000)
    });

    const resultado = {};
    for (const dia of (resposta.dias || [])) {
      const nomeDia = normalizarDia(dia.dia);
      if (!nomeDia) continue;
      resultado[nomeDia] = (dia.exercicios || []).map((ex, i) => ({
        id: 'imp_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 6),
        nome: String(ex.nome || '').trim(),
        series: Number(ex.series || 1),
        repeticoes: String(ex.repeticoes ?? ''),
        descanso: Number(ex.descanso || 60),
        carga: ex.carga === null || ex.carga === undefined || ex.carga === '' ? null : Number(ex.carga),
        tecnicas: Array.isArray(ex.tecnicas) ? ex.tecnicas : [],
        notas: String(ex.notas || ''),
        ordem: i + 1
      })).filter(ex => ex.nome);
    }

    return resultado;
  };

  T.aplicarProtocoloImportado = async function (alunoId, protocoloImportado) {
    const atual = await T.carregarProtocolo(alunoId);
    const novo = { ...(atual || {}) };

    Object.entries(protocoloImportado || {}).forEach(([dia, exercicios]) => {
      novo[dia] = { ...(novo[dia] || {}), exercicios };
    });

    await T.salvarProtocolo(alunoId, novo);
    return novo;
  };

  // ---------- DIETA ----------
  T.importarDietaDeArquivo = async function (alunoId, arquivo) {
    let html = '';
    if (arquivo.name.toLowerCase().endsWith('.docx')) {
      html = await lerDocxHtml(arquivo);
    } else if (arquivo.name.toLowerCase().endsWith('.pdf')) {
      const texto = await lerArquivoTexto(arquivo);
      html = texto.split(/\n{2,}/).map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
    } else {
      throw new Error('Use uma dieta em .docx ou .pdf.');
    }

    const registro = {
      nomeArquivo: arquivo.name,
      atualizadoEm: new Date().toISOString(),
      tipo: arquivo.type || (arquivo.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      html: sanitizeHtml(html)
    };

    await T.db.ref('dietas/' + alunoId).set(registro);
    return registro;
  };

  T.carregarDieta = function (alunoId) {
    return T.db.ref('dietas/' + alunoId).once('value').then(s => s.val() || null);
  };

  T.deletarDieta = function (alunoId) {
    return T.db.ref('dietas/' + alunoId).remove();
  };

  // ---------- PDF COMPLETO ----------
  T.exportarDados = async function (alunoId) {
    if (!window.jspdf?.jsPDF) throw new Error('jsPDF não foi carregado.');

    const [aluno, protocolo, mesociclos, pagamentos, avaliacoes, lotes, resumoIA, dieta] = await Promise.all([
      T.buscarAluno(alunoId),
      T.carregarProtocolo(alunoId),
      T.carregarMesociclos(alunoId),
      T.carregarPagamentos(alunoId),
      T.carregarAvaliacoesDobras(alunoId),
      T.carregarLotesFotos(alunoId),
      T.carregarResumoIA(alunoId),
      T.carregarDieta(alunoId)
    ]);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 36;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const contentW = pageW - margin * 2;
    let y = 42;

    const newPage = () => { doc.addPage(); y = 42; };
    const ensure = (h = 18) => { if (y + h > pageH - 42) newPage(); };
    const title = (txt) => {
      ensure(30); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(txt, margin, y); y += 22;
    };
    const subtitle = (txt) => {
      ensure(22); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(txt, margin, y); y += 15;
    };
    const text = (txt, size = 9) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(size);
      const lines = doc.splitTextToSize(String(txt || ''), contentW);
      lines.forEach(line => { ensure(13); doc.text(line, margin, y); y += 12; });
      y += 3;
    };
    const footer = () => {
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.text(`Team Spancerski — Página ${i}/${pages}`, margin, pageH - 18);
      }
    };

    title('TEAM SPANCERSKI');
    text(`Relatório completo — ${aluno?.nome || 'Aluno'}`);
    text(`Gerado em ${new Date().toLocaleString('pt-BR')}`);
    y += 8;

    title('Protocolo de treino');
    for (const [dia, dados] of Object.entries(protocolo || {})) {
      if (!dados?.exercicios?.length) continue;
      subtitle(dia);
      dados.exercicios.forEach((ex, i) => {
        text(`${i + 1}. ${ex.nome} — ${ex.series} séries × ${ex.repeticoes} — descanso ${ex.descanso || 60}s${ex.carga ? ` — ${ex.carga}kg` : ''}${ex.tecnicas?.length ? ` — ${ex.tecnicas.join(', ')}` : ''}`);
        if (ex.notas) text(`Observação: ${ex.notas}`, 8);
      });
    }

    title('Avaliação física');
    if (avaliacoes?.length) {
      avaliacoes.slice().reverse().forEach(a => {
        text(`${formatarData(a.data)} — Peso ${a.entradas?.peso ?? '-'}kg — Gordura ${a.resultado?.percentualGordura ?? '-'}% — Massa magra ${a.resultado?.massaMagra ?? '-'}kg — Massa gorda ${a.resultado?.massaGorda ?? '-'}kg`);
      });
    } else text('Nenhuma avaliação registrada.');

    title('Fotos de evolução');
    if (lotes?.length) {
      const r = T.gerarRelatorioEvolucao(aluno, avaliacoes, lotes);
      const pares = [
        ['Frente', r.loteAnterior?.fotos || [], r.loteNovo?.fotos || []],
        ['Costas', r.loteAnterior?.fotos || [], r.loteNovo?.fotos || []],
        ['Lateral Esquerda', r.loteAnterior?.fotos || [], r.loteNovo?.fotos || []],
        ['Lateral Direita', r.loteAnterior?.fotos || [], r.loteNovo?.fotos || []]
      ];
      for (const [pos, antesFotos, depoisFotos] of pares) {
        const antes = antesFotos.find(f => f.posicao === pos);
        const depois = depoisFotos.find(f => f.posicao === pos);
        const itens = [];
        if (antes) itens.push({ label: `Antes — ${formatarData(r.loteAnterior.data)}`, foto: antes });
        if (depois) itens.push({ label: `${r.rotuloLoteNovo} — ${formatarData(r.loteNovo.data)}`, foto: depois });
        if (!itens.length) continue;

        subtitle(pos);
        let x = margin;
        let rowH = 0;
        for (const item of itens) {
          ensure(180);
          try {
            doc.addImage(item.foto.url, 'JPEG', x, y, 150, 150);
            doc.setFontSize(8); doc.text(item.label, x, y + 162);
          } catch (_) {}
          x += 170; rowH = 178;
        }
        y += rowH;
      }
    } else text('Nenhuma foto de evolução.');

    title('Resumo visual por grupamento muscular — IA');
    if (resumoIA?.texto) text(resumoIA.texto);
    else text('Nenhum resumo de IA gerado ainda.');

    title('Dieta completa');
    if (dieta?.html) {
      text(`Arquivo: ${dieta.nomeArquivo || '-'}`);
      text(`Atualizado em: ${formatarData(dieta.atualizadoEm)}`);
      text(htmlToText(dieta.html), 9);
    } else text('Nenhuma dieta cadastrada.');

    title('Mesociclos');
    const ms = Object.values(mesociclos || {});
    if (ms.length) {
      ms.forEach(m => {
        subtitle(m.nome || 'Mesociclo');
        (m.semanas || []).forEach(s => text(`Semana ${s.numero}: ${s.percentual}%`));
      });
    } else text('Nenhum mesociclo registrado.');

    title('Financeiro');
    const pays = Object.values(pagamentos || {});
    if (pays.length) pays.forEach(p => text(`${p.data || '-'} — R$ ${p.valor || '0'} — ${p.status || '-'}`));
    else text('Nenhum pagamento registrado.');

    footer();
    doc.save('team-spancerski-' + String(aluno?.nome || 'aluno').replace(/\s+/g, '_') + '.pdf');
    return true;
  };


  // Depois que dashboard.js carregar, a primeira nova sessão de fotos dispara
  // a análise automaticamente (o botão manual continua disponível).
  setTimeout(() => {
    const originalEnviarLoteFotos = window.enviarLoteFotos;
    if (typeof originalEnviarLoteFotos !== 'function' || window.__spancerskiAutoIA) return;
    window.__spancerskiAutoIA = true;

    window.enviarLoteFotos = function () {
      const retorno = originalEnviarLoteFotos.apply(this, arguments);
      setTimeout(async () => {
        try {
          if (!window.obterChaveIA || !window.obterChaveIA()) return;
          if (typeof window.gerarResumoIABtn === 'function') {
            window.gerarResumoIABtn();
          }
        } catch (e) {
          console.warn('IA automática de evolução:', e);
        }
      }, 2500);
      return retorno;
    };
  }, 0);

  console.log('✅ Team Spancerski: recursos adicionais carregados.');
})();
