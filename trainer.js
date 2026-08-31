// ============================================
// SISTEMA PARA O TREINADOR
// Gerenciar alunos, protocolos, etc
// ============================================

class GerenciadorTreinador {
  constructor() {
    this.db = firebase.database();
    this.alunoAtual = null;
    this.protocoloAtual = null;

    console.log('✅ Gerenciador do Treinador carregado!');
  }

  // ========== ALUNOS ==========

  adicionarAluno(dados) {
    return new Promise((resolve, reject) => {
      try {
        const id = 'aluno_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        const aluno = {
          id,
          nome: dados.nome,
          idade: dados.idade || null,
          objetivo: dados.objetivo || null,
          peso: dados.peso || null,
          altura: dados.altura || null,
          telefone: dados.telefone || null,
          mensalidade: dados.mensalidade || null,
          status: dados.status || 'Ativo',
          dataCadastro: new Date().toISOString()
        };

        this.db.ref('alunos/' + id).set(aluno)
          .then(() => {
            console.log('✅ Aluno adicionado:', aluno.nome);
            resolve(aluno);
          })
          .catch(error => {
            console.error('❌ Erro ao adicionar aluno:', error);
            reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  carregarAlunos() {
    return new Promise((resolve, reject) => {
      this.db.ref('alunos').on('value', function (snapshot) {
        const alunos = [];
        snapshot.forEach(function (childSnapshot) {
          alunos.push(childSnapshot.val());
        });
        console.log('📥 Alunos carregados:', alunos.length);
        resolve(alunos);
      }, function (error) {
        console.error('❌ Erro ao carregar alunos:', error);
        reject(error);
      });
    });
  }

  atualizarAluno(alunoId, dados) {
    return new Promise((resolve, reject) => {
      this.db.ref('alunos/' + alunoId).update(dados)
        .then(() => {
          console.log('✅ Aluno atualizado:', alunoId);
          resolve(true);
        })
        .catch(error => {
          console.error('❌ Erro ao atualizar aluno:', error);
          reject(error);
        });
    });
  }

  deletarAluno(alunoId) {
    return new Promise((resolve, reject) => {
      try {
        this.db.ref('alunos/' + alunoId).remove();
        this.db.ref('protocolos/' + alunoId).remove();
        this.db.ref('mesociclos/' + alunoId).remove();
        this.db.ref('financeiro/' + alunoId).remove();

        console.log('✅ Aluno deletado:', alunoId);
        resolve(true);
      } catch (error) {
        console.error('❌ Erro ao deletar aluno:', error);
        reject(error);
      }
    });
  }

  buscarAluno(alunoId) {
    return new Promise((resolve, reject) => {
      this.db.ref('alunos/' + alunoId).once('value', function (snapshot) {
        const aluno = snapshot.val();
        resolve(aluno || null);
      }).catch(error => reject(error));
    });
  }

  // ========== PROTOCOLOS DE TREINO ==========

  salvarProtocolo(alunoId, protocolo) {
    return new Promise((resolve, reject) => {
      protocolo.dataAtualizacao = new Date().toISOString();

      this.db.ref('protocolos/' + alunoId).set(protocolo)
        .then(() => {
          console.log('✅ Protocolo salvo:', alunoId);
          resolve(true);
        })
        .catch(error => {
          console.error('❌ Erro ao salvar protocolo:', error);
          reject(error);
        });
    });
  }

  carregarProtocolo(alunoId) {
    return new Promise((resolve, reject) => {
      this.db.ref('protocolos/' + alunoId).once('value', function (snapshot) {
        const protocolo = snapshot.val() || {};
        console.log('📥 Protocolo carregado:', alunoId);
        resolve(protocolo);
      }).catch(error => reject(error));
    });
  }

  adicionarExercicio(alunoId, dia, exercicio) {
    return new Promise((resolve, reject) => {
      this.carregarProtocolo(alunoId).then(protocolo => {
        if (!protocolo[dia]) {
          protocolo[dia] = { exercicios: [] };
        }
        if (!protocolo[dia].exercicios) {
          protocolo[dia].exercicios = [];
        }

        const novoExercicio = {
          id: 'ex_' + Date.now(),
          nome: exercicio.nome,
          series: exercicio.series,
          repeticoes: exercicio.repeticoes,
          carga: exercicio.carga || null,
          descanso: exercicio.descanso || 60,
          tecnicas: exercicio.tecnicas || [],
          notas: exercicio.notas || '',
          ordem: protocolo[dia].exercicios.length + 1
        };

        protocolo[dia].exercicios.push(novoExercicio);

        this.salvarProtocolo(alunoId, protocolo)
          .then(() => {
            console.log('✅ Exercício adicionado:', exercicio.nome);
            resolve(novoExercicio);
          })
          .catch(error => reject(error));
      }).catch(error => reject(error));
    });
  }

  deletarExercicio(alunoId, dia, exercicioId) {
    return new Promise((resolve, reject) => {
      this.carregarProtocolo(alunoId).then(protocolo => {
        if (protocolo[dia] && protocolo[dia].exercicios) {
          protocolo[dia].exercicios = protocolo[dia].exercicios.filter(ex => ex.id !== exercicioId);

          this.salvarProtocolo(alunoId, protocolo)
            .then(() => {
              console.log('✅ Exercício deletado:', exercicioId);
              resolve(true);
            })
            .catch(error => reject(error));
        } else {
          resolve(true);
        }
      }).catch(error => reject(error));
    });
  }

  editarExercicio(alunoId, dia, exercicioId, novosDados) {
    return new Promise((resolve, reject) => {
      this.carregarProtocolo(alunoId).then(protocolo => {
        if (protocolo[dia] && protocolo[dia].exercicios) {
          const indice = protocolo[dia].exercicios.findIndex(ex => ex.id === exercicioId);
          if (indice !== -1) {
            protocolo[dia].exercicios[indice] = {
              ...protocolo[dia].exercicios[indice],
              ...novosDados
            };

            this.salvarProtocolo(alunoId, protocolo)
              .then(() => {
                console.log('✅ Exercício editado:', exercicioId);
                resolve(true);
              })
              .catch(error => reject(error));
            return;
          }
        }
        resolve(false);
      }).catch(error => reject(error));
    });
  }

  // ========== MESOCICLOS ==========

  criarMesociclo(alunoId, mesociclo) {
    return new Promise((resolve, reject) => {
      const id = 'meso_' + Date.now();

      const novo = {
        id,
        nome: mesociclo.nome,
        duracao: mesociclo.duracao,
        dataInicio: new Date().toISOString(),
        fases: mesociclo.fases || {},
        status: 'Ativo'
      };

      this.db.ref('mesociclos/' + alunoId + '/' + id).set(novo)
        .then(() => {
          console.log('✅ Mesociclo criado:', mesociclo.nome);
          resolve(novo);
        })
        .catch(error => reject(error));
    });
  }

  carregarMesociclos(alunoId) {
    return new Promise((resolve, reject) => {
      this.db.ref('mesociclos/' + alunoId).once('value', function (snapshot) {
        const mesociclos = snapshot.val() || {};
        console.log('📥 Mesociclos carregados:', Object.keys(mesociclos).length);
        resolve(mesociclos);
      }).catch(error => reject(error));
    });
  }

  // ========== FINANCEIRO ==========

  registrarPagamento(alunoId, pagamento) {
    return new Promise((resolve, reject) => {
      const id = 'pag_' + Date.now();

      const novo = {
        id,
        data: pagamento.data,
        valor: pagamento.valor,
        status: pagamento.status || 'Pago',
        descricao: pagamento.descricao || '',
        dataRegistro: new Date().toISOString()
      };

      this.db.ref('financeiro/' + alunoId + '/pagamentos/' + id).set(novo)
        .then(() => {
          console.log('✅ Pagamento registrado:', pagamento.valor);
          resolve(novo);
        })
        .catch(error => reject(error));
    });
  }

  carregarPagamentos(alunoId) {
    return new Promise((resolve, reject) => {
      this.db.ref('financeiro/' + alunoId + '/pagamentos').once('value', function (snapshot) {
        const pagamentos = snapshot.val() || {};
        console.log('📥 Pagamentos carregados:', Object.keys(pagamentos).length);
        resolve(pagamentos);
      }).catch(error => reject(error));
    });
  }

  totalMensal(pagamentos) {
    let total = 0;
    for (let id in pagamentos) {
      if (pagamentos[id].status === 'Pago') {
        total += parseFloat(pagamentos[id].valor || 0);
      }
    }
    return total;
  }

  totalPendente(pagamentos) {
    let total = 0;
    for (let id in pagamentos) {
      if (pagamentos[id].status === 'Pendente') {
        total += parseFloat(pagamentos[id].valor || 0);
      }
    }
    return total;
  }

  // ========== LINK PARA ALUNO ==========

  gerarLinkAluno(alunoId) {
    const baseURL = window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/');
    const link = baseURL + '/aluno.html?aluno=' + alunoId;
    console.log('🔗 Link gerado:', link);
    return link;
  }

  copiarLink(alunoId) {
    const link = this.gerarLinkAluno(alunoId);
    navigator.clipboard.writeText(link).then(() => {
      console.log('✅ Link copiado para clipboard!');
    });
    return link;
  }

  // ========== UTILITÁRIOS ==========

  exportarDados(alunoId) {
    return new Promise((resolve, reject) => {
      try {
        Promise.all([
          this.buscarAluno(alunoId),
          this.carregarProtocolo(alunoId),
          this.carregarMesociclos(alunoId),
          this.carregarPagamentos(alunoId),
          this.carregarAvaliacoesDobras(alunoId),
          this.carregarFotos(alunoId),
          this._carregarLogoBase64()
        ]).then(([aluno, protocolo, mesociclos, pagamentos, avaliacoes, fotos, logoBase64]) => {
          this._gerarPDFCompleto(aluno, protocolo, mesociclos, pagamentos, avaliacoes, fotos, logoBase64);
          console.log('✅ PDF exportado!');
          resolve(true);
        }).catch(error => reject(error));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Carrega logo-transparente.png e converte para Base64, para embutir no cabeçalho do PDF.
   * Se falhar (ex: arquivo não encontrado), resolve com null e o PDF segue sem a imagem.
   */
  _carregarLogoBase64() {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
        img.src = 'logo-transparente.png';
      } catch (e) {
        resolve(null);
      }
    });
  }

  /**
   * Monta o PDF completo do aluno usando jsPDF (biblioteca carregada via CDN no index.html).
   * Inclui: dados cadastrais, protocolo de treino, mesociclos, financeiro,
   * histórico de avaliações físicas e fotos de evolução.
   * Paleta: cabeçalho preto, títulos e linhas em dourado — combinando com a identidade visual.
   */
  _gerarPDFCompleto(aluno, protocolo, mesociclos, pagamentos, avaliacoes, fotos, logoBase64) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margem = 40;
    const larguraUtil = doc.internal.pageSize.getWidth() - margem * 2;
    const larguraPagina = doc.internal.pageSize.getWidth();
    const alturaPagina = doc.internal.pageSize.getHeight();
    let y = margem;

    // Paleta do relatório (mesma identidade do dashboard: preto + dourado)
    const PRETO = [11, 10, 8];
    const DOURADO = [199, 164, 74];
    const DOURADO_ESCURO = [122, 97, 38]; // versão com mais contraste para texto sobre fundo branco
    const CINZA_TEXTO = [40, 38, 34];
    const CINZA_MUTED = [120, 113, 100];

    const novaLinha = (altura = 16) => {
      y += altura;
      if (y > alturaPagina - margem) {
        doc.addPage();
        desenharRodape();
        y = margem;
      }
    };
    const tituloSecao = (texto) => {
      novaLinha(28);
      doc.setDrawColor(...DOURADO);
      doc.setLineWidth(0.7);
      doc.line(margem, y - 12, margem + larguraUtil, y - 12);
      doc.setFont('times', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...DOURADO_ESCURO);
      doc.text(texto, margem, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...CINZA_TEXTO);
    };
    const linha = (texto) => {
      const partes = doc.splitTextToSize(texto, larguraUtil);
      partes.forEach(p => {
        novaLinha(14);
        doc.text(p, margem, y);
      });
    };
    const desenharRodape = () => {
      doc.setDrawColor(...DOURADO);
      doc.setLineWidth(0.5);
      doc.line(margem, alturaPagina - 26, larguraPagina - margem, alturaPagina - 26);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...CINZA_MUTED);
      doc.text('Team Spancerski', margem, alturaPagina - 16);
      doc.text('Página ' + doc.internal.getNumberOfPages(), larguraPagina - margem - 40, alturaPagina - 16);
      doc.setTextColor(...CINZA_TEXTO);
    };

    // Cabeçalho — faixa preta com logo e nome em dourado
    const alturaFaixa = 70;
    doc.setFillColor(...PRETO);
    doc.rect(0, 0, larguraPagina, alturaFaixa, 'F');
    doc.setDrawColor(...DOURADO);
    doc.setLineWidth(1.2);
    doc.line(0, alturaFaixa, larguraPagina, alturaFaixa);

    if (logoBase64) {
      try { doc.addImage(logoBase64, 'PNG', margem, 12, 46, 46); } catch (e) { /* segue sem logo */ }
    }
    const xTextoTitulo = logoBase64 ? margem + 58 : margem;
    doc.setFont('times', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...DOURADO);
    doc.text('Team Spancerski', xTextoTitulo, 36);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(230, 220, 195);
    doc.text('Relatório completo do aluno — gerado em ' + new Date().toLocaleString('pt-BR'), xTextoTitulo, 52);

    doc.setTextColor(...CINZA_TEXTO);
    y = alturaFaixa + 30;

    // Dados do aluno
    tituloSecao('Dados do aluno');
    linha('Nome: ' + (aluno.nome || '-'));
    linha('Idade: ' + (aluno.idade || '-') + '   Objetivo: ' + (aluno.objetivo || '-'));
    linha('Peso: ' + (aluno.peso || '-') + ' kg   Altura: ' + (aluno.altura || '-') + ' cm');
    linha('Telefone: ' + (aluno.telefone || '-') + '   Mensalidade: R$ ' + (aluno.mensalidade || '-'));

    // Protocolo de treino
    tituloSecao('Protocolo de treino');
    const diasProtocolo = protocolo ? Object.keys(protocolo).filter(k => k !== 'dataAtualizacao') : [];
    if (diasProtocolo.length) {
      diasProtocolo.forEach(dia => {
        linha('• ' + dia + ':');
        const exercicios = (protocolo[dia] && protocolo[dia].exercicios) || [];
        exercicios.forEach(ex => {
          const tecnicas = ex.tecnicas && ex.tecnicas.length ? ' [' + ex.tecnicas.join(', ') + ']' : '';
          linha('   - ' + (ex.nome || '') + ' | ' + (ex.series || '-') + 'x' + (ex.repeticoes || '-') + ' | carga: ' + (ex.carga || '-') + 'kg' + tecnicas);
          if (ex.notas) linha('     Obs: ' + ex.notas);
        });
      });
    } else {
      linha('Nenhum protocolo cadastrado.');
    }

    // Mesociclos
    tituloSecao('Mesociclos');
    if (mesociclos && Object.keys(mesociclos).length) {
      Object.values(mesociclos).forEach(m => {
        linha('• ' + (m.nome || 'Mesociclo') + ' (' + (m.status || '-') + ')');
        (m.semanas || []).forEach(semana => {
          linha('   Semana ' + semana.numero + ' (' + semana.percentual + '%):');
          Object.entries(semana.dias || {}).forEach(([dia, exs]) => {
            if (!exs.length) return;
            const resumo = exs.map(e => e.nome + '=' + e.cargaAlvo + 'kg').join(', ');
            linha('     ' + dia + ': ' + resumo);
          });
        });
      });
    } else {
      linha('Nenhum mesociclo gerado.');
    }

    // Financeiro
    tituloSecao('Financeiro');
    if (pagamentos && Object.keys(pagamentos).length) {
      Object.values(pagamentos).forEach(p => {
        linha('• ' + (p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '-') + ' — R$ ' + (p.valor || '0') + ' — ' + (p.status || '-') + (p.descricao ? ' (' + p.descricao + ')' : ''));
      });
    } else {
      linha('Nenhum pagamento registrado.');
    }

    // Avaliações físicas
    tituloSecao('Histórico de avaliações físicas');
    if (avaliacoes && avaliacoes.length) {
      avaliacoes.forEach(a => {
        linha('• ' + new Date(a.data).toLocaleDateString('pt-BR') + ' — ' + a.resultado.percentualGordura + '% gordura, massa magra: ' + a.resultado.massaMagra + 'kg');
      });
    } else {
      linha('Nenhuma avaliação registrada.');
    }

    // Fotos de evolução
    tituloSecao('Fotos de evolução');
    if (fotos && fotos.length) {
      let xFoto = margem;
      const larguraFoto = 130, alturaFoto = 130, espaco = 10;
      novaLinha(alturaFoto + 20);
      fotos.forEach((f, i) => {
        if (xFoto + larguraFoto > margem + larguraUtil) {
          xFoto = margem;
          novaLinha(alturaFoto + 20);
        }
        try {
          doc.setDrawColor(...DOURADO);
          doc.setLineWidth(0.8);
          doc.rect(xFoto - 1, y - alturaFoto - 1, larguraFoto + 2, alturaFoto + 2);
          doc.addImage(f.url, 'JPEG', xFoto, y - alturaFoto, larguraFoto, alturaFoto);
          doc.setFontSize(8);
          doc.setTextColor(...CINZA_MUTED);
          doc.text(new Date(f.data).toLocaleDateString('pt-BR'), xFoto, y + 10);
          doc.setFontSize(10);
          doc.setTextColor(...CINZA_TEXTO);
        } catch (e) { /* ignora foto corrompida */ }
        xFoto += larguraFoto + espaco;
      });
    } else {
      linha('Nenhuma foto enviada.');
    }

    desenharRodape();
    doc.save('aluno_' + (aluno.nome || 'sememnome').replace(/ /g, '_') + '.pdf');
  }

  limparTudo() {
    if (confirm('⚠️ ATENÇÃO! Isso vai deletar TODOS os dados! Tem certeza?')) {
      this.db.ref('alunos').remove();
      this.db.ref('protocolos').remove();
      this.db.ref('mesociclos').remove();
      this.db.ref('financeiro').remove();
      console.log('🗑️ TODOS os dados foram apagados!');
      return true;
    }
    return false;
  }

  // ========== FOTOS DE EVOLUÇÃO (Base64 no Realtime Database — sem Storage) ==========

  /**
   * Redimensiona e comprime a imagem no navegador antes de converter em Base64,
   * para não estourar o limite gratuito do Realtime Database (1GB total).
   * Largura máxima 900px, qualidade JPEG 70%.
   */
  _redimensionarImagem(arquivo, larguraMax = 900, qualidade = 0.7) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const escala = Math.min(1, larguraMax / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = img.width * escala;
          canvas.height = img.height * escala;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', qualidade));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      leitor.onerror = reject;
      leitor.readAsDataURL(arquivo);
    });
  }

  uploadFoto(alunoId, arquivo) {
    return new Promise((resolve, reject) => {
      this._redimensionarImagem(arquivo).then((base64) => {
        const id = 'foto_' + Date.now();
        const registro = {
          id,
          url: base64,
          data: new Date().toISOString()
        };
        return this.db.ref('avaliacoes/' + alunoId + '/fotos/' + id).set(registro).then(() => registro);
      }).then((registro) => {
        console.log('✅ Foto salva no Realtime Database');
        resolve(registro);
      }).catch(error => {
        console.error('❌ Erro ao salvar foto:', error);
        reject(error);
      });
    });
  }

  carregarFotos(alunoId) {
    return new Promise((resolve, reject) => {
      this.db.ref('avaliacoes/' + alunoId + '/fotos').once('value', function (snapshot) {
        const fotos = [];
        snapshot.forEach(function (child) { fotos.push(child.val()); });
        fotos.sort((a, b) => new Date(b.data) - new Date(a.data));
        resolve(fotos);
      }).catch(error => reject(error));
    });
  }

  deletarFoto(alunoId, foto) {
    return new Promise((resolve, reject) => {
      this.db.ref('avaliacoes/' + alunoId + '/fotos/' + foto.id).remove()
        .then(() => resolve(true))
        .catch(error => reject(error));
    });
  }

  // ========== AVALIAÇÃO FÍSICA — DOBRAS CUTÂNEAS (Protocolo Pollock 7 dobras) ==========

  /**
   * Calcula % de gordura automaticamente a partir das 7 dobras (mm), idade e sexo.
   * Fórmula: Jackson & Pollock (1978) 7 dobras + equação de Siri para % de gordura.
   */
  calcularDobras7(dados) {
    const soma = dados.peitoral + dados.axilarMedia + dados.triceps +
      dados.subescapular + dados.abdominal + dados.suprailiaca + dados.coxa;

    let densidade;
    if (dados.sexo === 'M') {
      densidade = 1.112 - (0.00043499 * soma) + (0.00000055 * soma * soma) - (0.00028826 * dados.idade);
    } else {
      densidade = 1.097 - (0.00046971 * soma) + (0.00000056 * soma * soma) - (0.00012828 * dados.idade);
    }

    const percentualGordura = ((495 / densidade) - 450);
    const massaGorda = dados.peso ? (dados.peso * percentualGordura / 100) : null;
    const massaMagra = dados.peso ? (dados.peso - massaGorda) : null;

    return {
      soma7Dobras: soma,
      densidadeCorporal: parseFloat(densidade.toFixed(5)),
      percentualGordura: parseFloat(percentualGordura.toFixed(2)),
      massaGorda: massaGorda !== null ? parseFloat(massaGorda.toFixed(2)) : null,
      massaMagra: massaMagra !== null ? parseFloat(massaMagra.toFixed(2)) : null
    };
  }

  salvarAvaliacaoDobras(alunoId, dados) {
    return new Promise((resolve, reject) => {
      const resultado = this.calcularDobras7(dados);
      const id = 'aval_' + Date.now();

      const avaliacao = {
        id,
        data: new Date().toISOString(),
        entradas: dados,
        resultado
      };

      this.db.ref('avaliacoes/' + alunoId + '/dobras/' + id).set(avaliacao)
        .then(() => {
          console.log('✅ Avaliação de dobras salva. % Gordura:', resultado.percentualGordura);
          resolve(avaliacao);
        })
        .catch(error => reject(error));
    });
  }

  carregarAvaliacoesDobras(alunoId) {
    return new Promise((resolve, reject) => {
      this.db.ref('avaliacoes/' + alunoId + '/dobras').once('value', function (snapshot) {
        const avaliacoes = [];
        snapshot.forEach(function (child) { avaliacoes.push(child.val()); });
        avaliacoes.sort((a, b) => new Date(b.data) - new Date(a.data));
        resolve(avaliacoes);
      }).catch(error => reject(error));
    });
  }

  // ========== MESOCICLO ONDULATÓRIO (% de carga por semana) ==========

  /**
   * Gera um mesociclo ondulatório aplicando percentuais de carga (ex: 80/60/40%)
   * sobre a carga atual cadastrada em cada exercício do protocolo.
   */
  criarMesocicloOndulatorio(alunoId, nome, percentuaisPorSemana, protocolo) {
    return new Promise((resolve, reject) => {
      const id = 'meso_' + Date.now();

      const semanas = percentuaisPorSemana.map((percentual, indice) => {
        const dias = {};
        Object.keys(protocolo || {}).forEach(dia => {
          const exercicios = (protocolo[dia] && protocolo[dia].exercicios) || [];
          dias[dia] = exercicios
            .filter(ex => ex.carga)
            .map(ex => ({
              exercicioId: ex.id,
              nome: ex.nome,
              cargaBase: ex.carga,
              cargaAlvo: parseFloat((ex.carga * percentual / 100).toFixed(1))
            }));
        });

        return {
          numero: indice + 1,
          percentual,
          dias
        };
      });

      const mesociclo = {
        id,
        nome,
        tipo: 'ondulatorio',
        dataInicio: new Date().toISOString(),
        semanas,
        status: 'Ativo'
      };

      this.db.ref('mesociclos/' + alunoId + '/' + id).set(mesociclo)
        .then(() => {
          console.log('✅ Mesociclo ondulatório criado:', nome);
          resolve(mesociclo);
        })
        .catch(error => reject(error));
    });
  }

  deletarMesociclo(alunoId, mesoId) {
    return this.db.ref('mesociclos/' + alunoId + '/' + mesoId).remove();
  }

  // ========== EXECUÇÃO DE TREINO (peso realizado por sessão) ==========

  salvarExecucao(alunoId, dia, exerciciosExecutados) {
    return new Promise((resolve, reject) => {
      const dataISO = new Date().toISOString();
      const id = 'sessao_' + Date.now();

      const sessao = {
        id,
        dia,
        data: dataISO,
        exercicios: exerciciosExecutados
      };

      this.db.ref('execucoes/' + alunoId + '/' + id).set(sessao)
        .then(() => {
          console.log('✅ Sessão de treino registrada:', dia);
          resolve(sessao);
        })
        .catch(error => reject(error));
    });
  }

  carregarExecucoes(alunoId) {
    return new Promise((resolve, reject) => {
      this.db.ref('execucoes/' + alunoId).once('value', function (snapshot) {
        const sessoes = [];
        snapshot.forEach(function (child) { sessoes.push(child.val()); });
        sessoes.sort((a, b) => new Date(b.data) - new Date(a.data));
        resolve(sessoes);
      }).catch(error => reject(error));
    });
  }

  // ========== IMC + RELATÓRIO AUTOMÁTICO DE EVOLUÇÃO ==========

  /**
   * Calcula o IMC (kg / m²) e devolve também a classificação padrão da OMS.
   */
  calcularIMC(pesoKg, alturaCm) {
    if (!pesoKg || !alturaCm) return null;
    const alturaM = alturaCm / 100;
    const imc = pesoKg / (alturaM * alturaM);
    let classificacao;
    if (imc < 18.5) classificacao = 'Abaixo do peso';
    else if (imc < 25) classificacao = 'Peso normal';
    else if (imc < 30) classificacao = 'Sobrepeso';
    else if (imc < 35) classificacao = 'Obesidade grau I';
    else if (imc < 40) classificacao = 'Obesidade grau II';
    else classificacao = 'Obesidade grau III';
    return { valor: parseFloat(imc.toFixed(1)), classificacao };
  }

  /**
   * Monta o relatório automático de evolução do aluno, cruzando:
   * - histórico de avaliações de dobras cutâneas (peso, % gordura, massa magra/gorda)
   * - IMC atual (peso mais recente + altura cadastrada do aluno)
   * - as duas fotos de evolução mais recentes (para comparação lado a lado)
   *
   * É recalculado a cada novo envio de foto ou nova avaliação de dobras,
   * então sempre reflete a comparação "atual vs. anterior" mais recente.
   */
  gerarRelatorioEvolucao(aluno, avaliacoesDobras, fotos) {
    const avals = [...(avaliacoesDobras || [])].sort((a, b) => new Date(a.data) - new Date(b.data));
    const atual = avals[avals.length - 1] || null;
    const anterior = avals.length > 1 ? avals[avals.length - 2] : null;

    const pesoAtual = (atual && atual.entradas.peso) || aluno.peso || null;
    const alturaAluno = aluno.altura || null;
    const imc = this.calcularIMC(pesoAtual, alturaAluno);

    const metrica = (chave, unidade, rotulo) => {
      if (!atual) return null;
      const valorAtual = chave === 'peso' ? atual.entradas.peso : atual.resultado[chave];
      if (valorAtual === undefined || valorAtual === null) return null;
      let diferenca = null, percentual = null, direcao = 'estavel';
      if (anterior) {
        const valorAnterior = chave === 'peso' ? anterior.entradas.peso : anterior.resultado[chave];
        if (valorAnterior !== undefined && valorAnterior !== null) {
          diferenca = parseFloat((valorAtual - valorAnterior).toFixed(2));
          percentual = valorAnterior !== 0 ? parseFloat(((diferenca / valorAnterior) * 100).toFixed(1)) : null;
          direcao = diferenca > 0 ? 'subiu' : diferenca < 0 ? 'desceu' : 'estavel';
        }
      }
      return { rotulo, unidade, atual: valorAtual, diferenca, percentual, direcao };
    };

    const metricas = {
      peso: metrica('peso', 'kg', 'Peso'),
      percentualGordura: metrica('percentualGordura', '%', '% de gordura'),
      massaMagra: metrica('massaMagra', 'kg', 'Massa magra'),
      massaGorda: metrica('massaGorda', 'kg', 'Massa gorda')
    };

    // Série histórica para o gráfico (peso e % gordura ao longo do tempo)
    const serie = avals.map(a => ({
      data: a.data,
      peso: a.entradas.peso,
      percentualGordura: a.resultado.percentualGordura
    }));

    // Insights automáticos em linguagem natural
    const insights = [];
    if (metricas.peso && metricas.peso.diferenca !== null) {
      if (metricas.peso.diferenca < 0) insights.push(`Reduziu ${Math.abs(metricas.peso.diferenca)}kg de peso desde a última avaliação.`);
      else if (metricas.peso.diferenca > 0) insights.push(`Ganhou ${metricas.peso.diferenca}kg de peso desde a última avaliação.`);
    }
    if (metricas.percentualGordura && metricas.percentualGordura.diferenca !== null) {
      if (metricas.percentualGordura.diferenca < 0) insights.push(`Diminuiu ${Math.abs(metricas.percentualGordura.diferenca)}% de gordura corporal — ótima evolução!`);
      else if (metricas.percentualGordura.diferenca > 0) insights.push(`% de gordura corporal subiu ${metricas.percentualGordura.diferenca}% — vale revisar dieta/treino.`);
    }
    if (metricas.massaMagra && metricas.massaMagra.diferenca !== null && metricas.massaMagra.diferenca > 0) {
      insights.push(`Ganhou ${metricas.massaMagra.diferenca}kg de massa magra.`);
    }
    if (imc) insights.push(`IMC atual: ${imc.valor} (${imc.classificacao}).`);
    if (!atual) insights.push('Cadastre uma avaliação de dobras cutâneas para ver % de gordura, massa magra e o gráfico de evolução.');
    else if (!anterior) insights.push('Essa é a primeira avaliação registrada — a comparação aparece a partir da segunda.');

    const fotosOrdenadas = [...(fotos || [])].sort((a, b) => new Date(b.data) - new Date(a.data));
    const fotoAtual = fotosOrdenadas[0] || null;
    const fotoAnterior = fotosOrdenadas[1] || null;

    return {
      temComparacao: !!(anterior || (fotoAtual && fotoAnterior)),
      imc,
      metricas,
      serie,
      insights,
      fotoAtual,
      fotoAnterior
    };
  }

  // ========== BANCO DE VÍDEOS DE EXERCÍCIOS (catálogo global) ==========

  /**
   * Extrai o ID de um link do YouTube (várias variações de URL) para gerar
   * a miniatura e o link de embed. Retorna null se não for um link do YouTube.
   */
  extrairIdYoutube(url) {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/;
    const m = url.match(regex);
    return m ? m[1] : null;
  }

  /**
   * Devolve uma URL de embed pronta para <iframe>, tanto para YouTube
   * quanto (sem alteração) para outros links de vídeo direto/Vimeo.
   */
  urlEmbedVideo(url) {
    const idYoutube = this.extrairIdYoutube(url);
    if (idYoutube) return `https://www.youtube.com/embed/${idYoutube}`;
    const vimeo = (url || '').match(/vimeo\.com\/(\d+)/);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    return url;
  }

  carregarCatalogoExercicios() {
    return new Promise((resolve, reject) => {
      this.db.ref('catalogoExercicios').once('value', function (snapshot) {
        const catalogo = [];
        snapshot.forEach(function (child) { catalogo.push(child.val()); });
        catalogo.sort((a, b) => (a.grupoMuscular || '').localeCompare(b.grupoMuscular || '') || a.nome.localeCompare(b.nome));
        resolve(catalogo);
      }).catch(error => reject(error));
    });
  }

  adicionarExercicioCatalogo(dados) {
    return new Promise((resolve, reject) => {
      const id = 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const item = {
        id,
        nome: dados.nome.trim(),
        grupoMuscular: dados.grupoMuscular || 'Outros',
        videoUrl: dados.videoUrl ? dados.videoUrl.trim() : ''
      };
      this.db.ref('catalogoExercicios/' + id).set(item)
        .then(() => resolve(item))
        .catch(error => reject(error));
    });
  }

  atualizarVideoExercicio(id, videoUrl) {
    return this.db.ref('catalogoExercicios/' + id).update({ videoUrl: videoUrl.trim() });
  }

  deletarExercicioCatalogo(id) {
    return this.db.ref('catalogoExercicios/' + id).remove();
  }

  /**
   * Preenche o catálogo com uma lista extensa de exercícios comuns (sem vídeo)
   * na primeira vez que o app é usado, para o treinador já ter o "banco de
   * movimentos" pronto e só precisar colar o link do vídeo de cada um.
   * Só roda se o catálogo estiver vazio — nunca sobrescreve dados existentes.
   */
  semearCatalogoSeVazio() {
    return this.carregarCatalogoExercicios().then((catalogo) => {
      if (catalogo.length > 0) return catalogo;

      const seed = {
        'Peito': ['Supino Reto', 'Supino Inclinado', 'Supino Declinado', 'Supino com Halteres', 'Crucifixo Reto', 'Crucifixo Inclinado', 'Crossover', 'Peck Deck', 'Flexão de Braço'],
        'Costas': ['Puxada Frontal', 'Puxada Triângulo', 'Remada Curvada', 'Remada Cavalinho', 'Remada Baixa (Cross Over)', 'Remada Unilateral', 'Pull-down', 'Barra Fixa', 'Pulldown Corda'],
        'Ombro': ['Desenvolvimento Militar', 'Desenvolvimento com Halteres', 'Elevação Lateral', 'Elevação Frontal', 'Remada Alta', 'Crucifixo Invertido', 'Face Pull', 'Encolhimento de Ombros'],
        'Bíceps': ['Rosca Direta', 'Rosca Alternada', 'Rosca Martelo', 'Rosca Scott', 'Rosca Concentrada', 'Rosca 21', 'Rosca no Cabo'],
        'Tríceps': ['Tríceps Corda', 'Tríceps Testa', 'Tríceps Francês', 'Tríceps Coice', 'Mergulho no Banco', 'Tríceps Barra V', 'Supino Fechado'],
        'Pernas': ['Agachamento Livre', 'Agachamento Smith', 'Agachamento Búlgaro', 'Leg Press 45', 'Cadeira Extensora', 'Mesa Flexora', 'Stiff', 'Levantamento Terra', 'Afundo', 'Passada'],
        'Glúteos': ['Elevação Pélvica', 'Glúteo no Cross Over', 'Glúteo em Quatro Apoios', 'Abdução de Quadril', 'Cadeira Abdutora'],
        'Panturrilha': ['Panturrilha em Pé', 'Panturrilha Sentado', 'Panturrilha no Leg Press'],
        'Abdômen': ['Abdominal Canoa', 'Abdominal Infra', 'Elevação de Pernas', 'Prancha Isométrica', 'Abdominal Oblíquo', 'Abdominal na Polia', 'Rotação de Tronco'],
        'Cardio / Mobilidade': ['Corrida na Esteira', 'Bike Ergométrica', 'Elíptico', 'Corda Naval', 'Mobilidade de Quadril', 'Alongamento Dinâmico']
      };

      const promessas = [];
      Object.entries(seed).forEach(([grupo, exercicios]) => {
        exercicios.forEach(nome => {
          promessas.push(this.adicionarExercicioCatalogo({ nome, grupoMuscular: grupo, videoUrl: '' }));
        });
      });

      return Promise.all(promessas).then(() => this.carregarCatalogoExercicios());
    });
  }

  // ========== IMPORTAÇÃO DO free-exercise-db (banco gratuito, sem chave de API) ==========
  // https://github.com/yuhonas/free-exercise-db — domínio público (Unlicense).
  // Só tem imagens (2 fotos por exercício), não tem vídeo — mas é 100% grátis e sem cadastro.

  /**
   * Traduz o campo primaryMuscles (inglês) do free-exercise-db para os
   * grupos musculares em português usados no nosso catálogo.
   */
  _mapearGrupoMuscular(primaryMuscles) {
    const musculo = (primaryMuscles && primaryMuscles[0] || '').toLowerCase();
    const mapa = {
      chest: 'Peito',
      lats: 'Costas', 'middle back': 'Costas', 'lower back': 'Costas', traps: 'Costas',
      shoulders: 'Ombro',
      biceps: 'Bíceps',
      triceps: 'Tríceps',
      forearms: 'Antebraço',
      quadriceps: 'Pernas', hamstrings: 'Pernas', adductors: 'Pernas', abductors: 'Pernas',
      glutes: 'Glúteos',
      calves: 'Panturrilha',
      abdominals: 'Abdômen',
      neck: 'Pescoço'
    };
    return mapa[musculo] || 'Cardio / Mobilidade';
  }

  /**
   * Baixa (uma vez, e guarda em cache na memória) o dataset completo do
   * free-exercise-db direto do GitHub — não precisa de API key nem backend.
   */
  _carregarFreeExerciseDB() {
    if (this._cacheFreeExerciseDB) return Promise.resolve(this._cacheFreeExerciseDB);

    return fetch('https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json')
      .then(r => r.json())
      .then(lista => {
        this._cacheFreeExerciseDB = lista;
        return lista;
      });
  }

  /**
   * Busca no free-exercise-db por nome ou grupo muscular (em inglês — o dataset
   * original é em inglês) e devolve até 30 resultados já no formato do nosso catálogo.
   */
  buscarFreeExerciseDB(termo) {
    return this._carregarFreeExerciseDB().then(lista => {
      const alvo = (termo || '').toLowerCase().trim();
      const filtrados = !alvo ? lista.slice(0, 30) : lista.filter(ex =>
        ex.name.toLowerCase().includes(alvo) ||
        (ex.primaryMuscles || []).some(m => m.toLowerCase().includes(alvo)) ||
        (ex.category || '').toLowerCase().includes(alvo)
      ).slice(0, 30);

      return filtrados.map(ex => ({
        nome: ex.name,
        grupoMuscular: this._mapearGrupoMuscular(ex.primaryMuscles),
        imagens: (ex.images || []).map(caminho => `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${caminho}`),
        instrucoesOriginais: ex.instructions || []
      }));
    });
  }

  /**
   * Adiciona ao catálogo do Firebase um exercício vindo do free-exercise-db.
   * O vídeo fica vazio — o treinador cola o link do YouTube depois, se quiser;
   * enquanto isso, o aluno já vê as fotos de referência do movimento.
   */
  importarExercicioFreeDB(item) {
    const id = 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const registro = {
      id,
      nome: item.nome,
      grupoMuscular: item.grupoMuscular,
      videoUrl: '',
      imagens: item.imagens || [],
      fonte: 'free-exercise-db'
    };
    return this.db.ref('catalogoExercicios/' + id).set(registro).then(() => registro);
  }

  info() {
    console.log('=== SPANCERSKI TRAINER ===');
    console.log('Firebase Database:', firebase.database().ref().toString());
    console.log('');
    console.log('Comandos úteis:');
    console.log('- trainer.carregarAlunos()');
    console.log('- trainer.adicionarAluno({nome, idade, objetivo})');
    console.log('- trainer.carregarProtocolo(alunoId)');
    console.log('- trainer.gerarLinkAluno(alunoId)');
    console.log('');
  }
}

// Criar instância global
const trainer = new GerenciadorTreinador();

console.log('✅ Sistema de Treinador ativado!');
console.log('💡 Digite: trainer.info() para ver comandos');
