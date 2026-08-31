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
          this.carregarFotos(alunoId)
        ]).then(([aluno, protocolo, mesociclos, pagamentos, avaliacoes, fotos]) => {
          this._gerarPDFCompleto(aluno, protocolo, mesociclos, pagamentos, avaliacoes, fotos);
          console.log('✅ PDF exportado!');
          resolve(true);
        }).catch(error => reject(error));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Monta o PDF completo do aluno usando jsPDF (biblioteca carregada via CDN no index.html).
   * Inclui: dados cadastrais, protocolo de treino, mesociclos, financeiro,
   * histórico de avaliações físicas e fotos de evolução.
   */
  _gerarPDFCompleto(aluno, protocolo, mesociclos, pagamentos, avaliacoes, fotos) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margem = 40;
    const larguraUtil = doc.internal.pageSize.getWidth() - margem * 2;
    let y = margem;

    const novaLinha = (altura = 16) => {
      y += altura;
      if (y > doc.internal.pageSize.getHeight() - margem) {
        doc.addPage();
        y = margem;
      }
    };
    const titulo = (texto) => {
      novaLinha(26);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(texto, margem, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    };
    const linha = (texto) => {
      const partes = doc.splitTextToSize(texto, larguraUtil);
      partes.forEach(p => {
        novaLinha(14);
        doc.text(p, margem, y);
      });
    };

    // Cabeçalho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Team Spancerski', margem, y);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    novaLinha(16);
    doc.text('Relatório completo — gerado em ' + new Date().toLocaleString('pt-BR'), margem, y);

    // Dados do aluno
    titulo('Dados do aluno');
    linha('Nome: ' + (aluno.nome || '-'));
    linha('Idade: ' + (aluno.idade || '-') + '   Objetivo: ' + (aluno.objetivo || '-'));
    linha('Peso: ' + (aluno.peso || '-') + ' kg   Altura: ' + (aluno.altura || '-') + ' cm');
    linha('Telefone: ' + (aluno.telefone || '-') + '   Mensalidade: R$ ' + (aluno.mensalidade || '-'));

    // Protocolo de treino
    titulo('Protocolo de treino');
    if (protocolo && Object.keys(protocolo).length) {
      Object.keys(protocolo).forEach(dia => {
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
    titulo('Mesociclos');
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
    titulo('Financeiro');
    if (pagamentos && Object.keys(pagamentos).length) {
      Object.values(pagamentos).forEach(p => {
        linha('• ' + (p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '-') + ' — R$ ' + (p.valor || '0') + ' — ' + (p.status || '-') + (p.descricao ? ' (' + p.descricao + ')' : ''));
      });
    } else {
      linha('Nenhum pagamento registrado.');
    }

    // Avaliações físicas
    titulo('Histórico de avaliações físicas');
    if (avaliacoes && avaliacoes.length) {
      avaliacoes.forEach(a => {
        linha('• ' + new Date(a.data).toLocaleDateString('pt-BR') + ' — ' + a.resultado.percentualGordura + '% gordura, massa magra: ' + a.resultado.massaMagra + 'kg');
      });
    } else {
      linha('Nenhuma avaliação registrada.');
    }

    // Fotos de evolução
    titulo('Fotos de evolução');
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
          doc.addImage(f.url, 'JPEG', xFoto, y - alturaFoto, larguraFoto, alturaFoto);
          doc.setFontSize(8);
          doc.text(new Date(f.data).toLocaleDateString('pt-BR'), xFoto, y + 10);
          doc.setFontSize(10);
        } catch (e) { /* ignora foto corrompida */ }
        xFoto += larguraFoto + espaco;
      });
    } else {
      linha('Nenhuma foto enviada.');
    }

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
