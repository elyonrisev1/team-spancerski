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
          this.carregarPagamentos(alunoId)
        ]).then(([aluno, protocolo, mesociclos, pagamentos]) => {
          const dados = {
            aluno,
            protocolo,
            mesociclos,
            pagamentos,
            dataExportacao: new Date().toISOString()
          };

          const elemento = document.createElement('a');
          elemento.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dados, null, 2)));
          elemento.setAttribute('download', 'aluno_' + aluno.nome.replace(/ /g, '_') + '.json');
          elemento.style.display = 'none';
          document.body.appendChild(elemento);
          elemento.click();
          document.body.removeChild(elemento);

          console.log('✅ Dados exportados!');
          resolve(true);
        }).catch(error => reject(error));
      } catch (error) {
        reject(error);
      }
    });
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
