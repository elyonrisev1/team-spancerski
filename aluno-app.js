// ============================================
// APP DO ALUNO - Treino em Tempo Real
// ============================================

class AppAluno {
  constructor() {
    this.db = firebase.database();
    this.alunoId = this.obterAlunoIdDaURL();
    this.aluno = null;
    this.protocolo = null;
    this.diaAtual = this.obterDiaSemana();
    this.exercicioAtual = 0;
    this.tempoRestante = 0;
    this.intervaloTempo = null;
    this.catalogoVideos = [];

    console.log('✅ App do Aluno carregado!');
    console.log('👤 Aluno ID:', this.alunoId);
    console.log('📅 Dia:', this.diaAtual);

    this.inicializar();
  }

  obterAlunoIdDaURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('aluno') || null;
  }

  obterDiaSemana() {
    const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const hoje = new Date().getDay();
    return dias[hoje];
  }

  inicializar() {
    if (!this.alunoId) {
      this.mostrarErro('❌ Link inválido! ID do aluno não encontrado.');
      return;
    }
    this.carregarDados();
  }

  carregarDados() {
    console.log('📥 Carregando dados...');

    this.db.ref('alunos/' + this.alunoId).once('value', (snapshot) => {
      this.aluno = snapshot.val();

      if (!this.aluno) {
        this.mostrarErro('❌ Aluno não encontrado! Verifique o link.');
        return;
      }

      console.log('✅ Aluno encontrado:', this.aluno.nome);

      this.db.ref('protocolos/' + this.alunoId).once('value', (snapshot) => {
        this.protocolo = snapshot.val() || {};
        console.log('✅ Protocolo carregado');

        this.db.ref('catalogoExercicios').once('value', (snapshotCatalogo) => {
          const catalogo = [];
          snapshotCatalogo.forEach((child) => catalogo.push(child.val()));
          this.catalogoVideos = catalogo;
          this.renderizarInterface();
        });
      });
    });
  }

  /**
   * Procura no catálogo global um exercício com nome igual (ignorando maiúsculas/
   * acentos/espaços extras) ao exercício do protocolo, e devolve o item completo
   * do catálogo (com videoUrl e/ou imagens de referência), se houver.
   */
  buscarItemCatalogo(nomeExercicio) {
    const normalizar = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const alvo = normalizar(nomeExercicio);
    return this.catalogoVideos.find(c => normalizar(c.nome) === alvo) || null;
  }

  buscarVideoDoExercicio(nomeExercicio) {
    const item = this.buscarItemCatalogo(nomeExercicio);
    return (item && item.videoUrl) ? item.videoUrl : null;
  }

  /**
   * Mostra, abaixo do nome do exercício, o botão de vídeo (se o treinador já colou
   * um link) e/ou as fotos de referência do movimento (importadas do free-exercise-db),
   * para o aluno sempre ter algum apoio visual, mesmo antes de existir um vídeo.
   */
  renderizarReferenciaExercicio(nomeExercicio) {
    const item = this.buscarItemCatalogo(nomeExercicio);
    if (!item) return '';

    let html = '';
    if (item.videoUrl) {
      html += `<button class="btn-ver-video" onclick="appAluno.abrirVideoExercicio('${nomeExercicio.replace(/'/g, "\\'")}')">▶ Ver vídeo do exercício</button>`;
    } else if (item.gifUrl) {
      html += `<div class="referencia-imagens"><img src="${item.gifUrl}" alt="Referência: ${nomeExercicio}" loading="lazy" /></div>`;
    } else if (item.imagens && item.imagens.length) {
      html += `<div class="referencia-imagens">${item.imagens.slice(0, 2).map(src => `<img src="${src}" alt="Referência: ${nomeExercicio}" />`).join('')}</div>`;
    }
    return html;
  }

  urlEmbedVideo(url) {
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
  }

  abrirVideoExercicio(nomeExercicio) {
    const url = this.buscarVideoDoExercicio(nomeExercicio);
    if (!url) return;
    const embed = this.urlEmbedVideo(url);

    const html = `
      <div class="overlay-modal" id="overlayVideoAluno" onclick="if(event.target===this) appAluno.fecharVideoExercicio()">
        <div class="modal modal-video">
          <h2>${nomeExercicio}</h2>
          <div class="video-wrapper">
            <iframe src="${embed}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
          <div class="modal-acoes">
            <button type="button" class="btn-cancelar" onclick="appAluno.fecharVideoExercicio()">Fechar</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  fecharVideoExercicio() {
    document.getElementById('overlayVideoAluno')?.remove();
  }

  renderizarInterface() {
    const html = `
      <div class="app-aluno">
        <div class="header-aluno">
          <img src="logo-transparente.png" alt="Spancerski Team" class="logo-aluno" />
          <div class="saudacao">
            <h1>Olá, <span class="nome-aluno">${this.aluno.nome}</span></h1>
            <p class="data-hoje">${this.formatarData()}</p>
          </div>
        </div>

        <div class="container-treino">
          <div class="titulo-dia">
            <h2>${this.diaAtual}</h2>
          </div>

          <div class="exercicio-ativo" id="exercicioContainer">
            ${this.renderizarExercicio()}
          </div>

          <div class="lista-exercicios">
            <h3>Exercícios do dia</h3>
            <div id="listaExercicios" class="lista">
              ${this.renderizarLista()}
            </div>
          </div>

          <div class="controles">
            <button id="btnAnterior" class="btn-controle" onclick="appAluno.anterior()">← Anterior</button>
            <button id="btnProximo" class="btn-controle" onclick="appAluno.proximo()">Próximo →</button>
            <button id="btnCronometro" class="btn-cronometro" onclick="appAluno.ativarCronometro()">⏱ Cronômetro</button>
            <button id="btnFeito" class="btn-feito" onclick="appAluno.marcarFeito()">✓ Série feita</button>
          </div>

          <div id="cronometro" class="cronometro oculto">
            <div class="tempo-display">
              <span id="tempoDisplay">00:00</span>
            </div>
            <div class="controles-cronometro">
              <button onclick="appAluno.iniciarCronometro()">▶ Iniciar</button>
              <button onclick="appAluno.pausarCronometro()">⏸ Pausar</button>
              <button onclick="appAluno.reiniciarCronometro()">↺ Reiniciar</button>
              <button onclick="appAluno.fecharCronometro()">✕ Fechar</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const appDiv = document.getElementById('app') || document.querySelector('body');
    appDiv.innerHTML = html;

    this.atualizarControles();
  }

  renderizarExercicio() {
    const exercicios = this.obterExerciciosDoDia();

    if (!exercicios || exercicios.length === 0) {
      return '<div class="sem-treino">Sem treino programado para hoje. Aproveite para descansar.</div>';
    }

    if (this.exercicioAtual >= exercicios.length) {
      this.exercicioAtual = exercicios.length - 1;
    }

    const ex = exercicios[this.exercicioAtual];

    return `
      <div class="card-exercicio">
        <div class="numero-exercicio">
          Exercício ${this.exercicioAtual + 1} de ${exercicios.length}
        </div>

        <div class="nome-exercicio">
          <h2>${ex.nome}</h2>
          ${this.renderizarReferenciaExercicio(ex.nome)}
        </div>

        <div class="detalhes-exercicio">
          <div class="detalhe">
            <p class="label">Séries</p>
            <p class="valor">${ex.series}</p>
          </div>
          <div class="detalhe">
            <p class="label">Repetições</p>
            <p class="valor">${ex.repeticoes}</p>
          </div>
          <div class="detalhe">
            <p class="label">Descanso</p>
            <p class="valor">${ex.descanso}s</p>
          </div>
          ${ex.carga ? `
          <div class="detalhe">
            <p class="label">Carga</p>
            <p class="valor">${ex.carga}kg</p>
          </div>
          ` : ''}
        </div>

        ${ex.notas ? `
        <div class="notas-exercicio">
          <p><strong>Dica:</strong> ${ex.notas}</p>
        </div>
        ` : ''}

        ${ex.tecnicas && ex.tecnicas.length > 0 ? `
        <div class="tecnicas">
          <div class="lista-tecnicas">
            ${ex.tecnicas.map(t => `<span class="tag-tecnica">${t}</span>`).join('')}
          </div>
        </div>
        ` : ''}

        <div class="progresso-series">
          <div class="label-progresso">Progresso: <span id="seriesConcluidas">${ex.seriesConcluidas || 0}</span>/${ex.series} séries</div>
          <div class="barra-progresso">
            <div class="preenchimento" style="width: ${((ex.seriesConcluidas || 0) / ex.series) * 100}%;" id="barraProgresso"></div>
          </div>
        </div>
      </div>
    `;
  }

  renderizarLista() {
    const exercicios = this.obterExerciciosDoDia();

    if (!exercicios || exercicios.length === 0) {
      return '<p class="lista-vazia">Sem exercícios hoje.</p>';
    }

    return exercicios.map((ex, index) => `
      <div class="item-lista ${index === this.exercicioAtual ? 'ativo' : ''}" onclick="appAluno.selecionarExercicio(${index})">
        <div class="numero">${index + 1}</div>
        <div class="nome">${ex.nome}</div>
        <div class="info-rapida">${ex.series}x${ex.repeticoes}</div>
      </div>
    `).join('');
  }

  obterExerciciosDoDia() {
    if (!this.protocolo || !this.protocolo[this.diaAtual]) {
      return [];
    }
    return this.protocolo[this.diaAtual].exercicios || [];
  }

  selecionarExercicio(index) {
    this.exercicioAtual = index;
    this.renderizarInterface();
  }

  anterior() {
    if (this.exercicioAtual > 0) {
      this.exercicioAtual--;
      this.renderizarInterface();
    }
  }

  proximo() {
    const exercicios = this.obterExerciciosDoDia();
    if (this.exercicioAtual < exercicios.length - 1) {
      this.exercicioAtual++;
      this.renderizarInterface();
    }
  }

  marcarFeito() {
    const exercicios = this.obterExerciciosDoDia();
    const ex = exercicios[this.exercicioAtual];

    if (!ex.seriesConcluidas) ex.seriesConcluidas = 0;

    if (ex.seriesConcluidas < ex.series) {
      ex.seriesConcluidas++;

      const barra = document.getElementById('barraProgresso');
      const concluidas = document.getElementById('seriesConcluidas');

      if (barra && concluidas) {
        const percentual = (ex.seriesConcluidas / ex.series) * 100;
        barra.style.width = percentual + '%';
        concluidas.textContent = ex.seriesConcluidas;
      }

      if (navigator.vibrate) navigator.vibrate(100);
    }
  }

  ativarCronometro() {
    const cronometro = document.getElementById('cronometro');
    const btnCronometro = document.getElementById('btnCronometro');

    if (cronometro.classList.contains('oculto')) {
      cronometro.classList.remove('oculto');
      btnCronometro.textContent = '✕ Fechar cronômetro';

      const exercicios = this.obterExerciciosDoDia();
      const ex = exercicios[this.exercicioAtual];
      this.tempoRestante = ex.descanso || 60;
      this.atualizarDisplayTempo();
    } else {
      this.fecharCronometro();
    }
  }

  iniciarCronometro() {
    if (!this.intervaloTempo) {
      this.intervaloTempo = setInterval(() => {
        if (this.tempoRestante > 0) {
          this.tempoRestante--;
          this.atualizarDisplayTempo();
          if (this.tempoRestante === 0) this.tocarSom();
        }
      }, 1000);
    }
  }

  pausarCronometro() {
    if (this.intervaloTempo) {
      clearInterval(this.intervaloTempo);
      this.intervaloTempo = null;
    }
  }

  reiniciarCronometro() {
    this.pausarCronometro();
    const exercicios = this.obterExerciciosDoDia();
    const ex = exercicios[this.exercicioAtual];
    this.tempoRestante = ex.descanso || 60;
    this.atualizarDisplayTempo();
  }

  fecharCronometro() {
    this.pausarCronometro();
    const cronometro = document.getElementById('cronometro');
    const btnCronometro = document.getElementById('btnCronometro');
    cronometro.classList.add('oculto');
    btnCronometro.textContent = '⏱ Cronômetro';
  }

  atualizarDisplayTempo() {
    const display = document.getElementById('tempoDisplay');
    if (display) {
      const minutos = Math.floor(this.tempoRestante / 60);
      const segundos = this.tempoRestante % 60;
      display.textContent = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
    }
  }

  tocarSom() {
    if (window.AudioContext || window.webkitAudioContext) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    }
  }

  atualizarControles() {
    const btnAnterior = document.getElementById('btnAnterior');
    const btnProximo = document.getElementById('btnProximo');
    const exercicios = this.obterExerciciosDoDia();

    if (btnAnterior) btnAnterior.disabled = this.exercicioAtual === 0;
    if (btnProximo) btnProximo.disabled = this.exercicioAtual >= exercicios.length - 1;
  }

  formatarData() {
    const opcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('pt-BR', opcoes);
  }

  mostrarErro(mensagem) {
    const appDiv = document.getElementById('app') || document.querySelector('body');
    appDiv.innerHTML = `
      <div class="tela-erro">
        <p class="erro-mensagem">${mensagem}</p>
        <button class="btn-voltar" onclick="window.history.back()">← Voltar</button>
      </div>
    `;
  }
}

let appAluno;
window.addEventListener('load', () => {
  appAluno = new AppAluno();
});

console.log('✅ Sistema do Aluno ativado!');
