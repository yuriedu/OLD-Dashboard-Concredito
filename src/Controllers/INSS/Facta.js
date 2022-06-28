const facta = require('../../APIs/Facta');

const { messages } = require('joi-translation-pt-br');
const { tradutor } = require('../../Utils/Utils');
const { factaINSSIn, bancoTranslate, revisaoPoupanca } = require('../../Utils/Facta');
const { compile } = require('joi');

var clientes = []

const cadastrarFacta = async (cliente, pool) => {
  try {
    const client = await factaINSSIn.validateAsync(cliente,{ messages });
    const retorno = {};
    const loadAPI = await facta.loadAPI()
    if (loadAPI) {
      if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) return { status: false, data: `[Facta INSS (18)] => Cliente já está sendo cadastrado...` }
      clientes[clientes.length] = { id: cliente.Cpf }
      setTimeout(()=>{
        if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
      }, 600000)
      if(cliente.Cpf && cliente.Cpf != null) {
        const opData = {
          tipo_oper: 13 /* client.Tabela.split(' ')[0] === 'MARGEM' ? 27 : 13 */,
          opcao_valor: 2,
          valor: client.Valor,
          parcela: client.ValorParcela,
          prazo: client.Prazo,
          cpf: client.Cpf,
          data_nascimento: client.Datanascimento.toISOString().split('T')[0]
        }
        const operacoes = await facta.getOperDisponivelINSS(opData);
        if (operacoes) {
          if (operacoes.data && operacoes.data.tabelas) {
            const tabela = client.Tabela.indexOf('Gold') >= 0 ? operacoes.data.tabelas.find(element => element.tabela.indexOf('Gold') >= 0) : operacoes.data.tabelas.find(element => element.tabela.indexOf('Especial') >= 0);
            if (parseFloat(tabela.valor) <= client.Valor*0.95) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (6)] => Valor simulado é mais de 5% menor que o proposto ao cliente, favor verificar. Valor retornado na simulação ${tabela.valor}`)
            const enviei = {
              tipo_oper: tabela.tipoop,
              cpf: client.Cpf,
              data_nascimento: client.Datanascimento.toISOString().split('T')[0],
              tabela: tabela.codigoTabela,
              prazo: client.Prazo,
              valor: tabela.contrato,
              parcela: tabela.parcela,
              coeficiente: tabela.coeficiente
            }
            const response1 = await facta.linkSimulationToProposalINSS(enviei)
            if (response1) {
              if (response1.data && response1.data.id_simulador) {
                const cidadeDoCliente = await facta.getCidadesByCidade(cliente.Cidade.normalize('NFD').replace(/[\u0300-\u036f]/g, ""), cliente.UF)
                if (cidadeDoCliente) {
                  const clientData = {
                    id_simulador: response1.data.id_simulador,
                    cpf: client.Cpf,
                    nome: client.NomeCliente,
                    sexo: client.sexo,
                    estado_civil: 6,
                    data_nascimento: client.Datanascimento.toISOString().split('T')[0],
                    rg: client.rg.replace(/\D+/g, ''), 
                    estado_rg: client.UF,
                    orgao_emissor: 'SSP',
                    data_expedicao: '01/01/2001',
                    estado_natural: client.UF,
                    cidade_natural: Object.keys(cidadeDoCliente)[0],
                    nacionalidade: 1,
                    pais_origem: 26,
                    celular: client.TelefoneConvenio.split(' ')[0].replace(/\D+/g, '').replace(/^(\d{2})(\d{5})(\d{4})/,'(0$1) $2-$3'),
                    renda: 2000,
                    cep: client.Cep,
                    endereco: client.Endereco,
                    numero: client.EndNumero,
                    bairro: client.Bairro,
                    cidade: Object.keys(cidadeDoCliente)[0],
                    estado: client.UF,
                    nome_mae: client.NomeMae,
                    nome_pai: client.NomePai == null ? 'Não Consta' : client.NomePai,
                    valor_patrimonio: 2,
                    cliente_iletrado_impossibilitado: 'N',
                    banco: bancoTranslate(client.CodBancoCliente),
                    agencia: client.Agencia,
                    conta: client.ContaCorrente.replace(/\D+/g, ''),
                    matricula: client.Maatricula ,
                    tipo_credito_nb: client.TipoLiberacao === 1? 1 : 2,
                    tipo_beneficio: client.Especie,
                    estado_beneficio: client.UF
                  }
                  const response3 = await facta.registerClient(response1.data.id_simulador,clientData);
                  if (response3) {
                    if (response3.data && response3.data.codigo_cliente) {
                      const response4 = await facta.requestProposal(response1.data.id_simulador, response3.data.codigo_cliente);
                      if (response4) {
                        if (response4.data && response4.data.codigo && response4.data.url_formalizacao) {
                          await pool.request()
                            .input('id', client.idContrato)
                            .input('vlrContratoAtual', enviei.valor)
                            .input('vlrParcelaAtual', enviei.parcela)
                            .input('texto', 'Valores do Contrato atualizados')
                          await pool.request()
                            .input('id', client.IdContrato)
                            .input('faseDestino', 9232)
                            .input('CodContrato', response4.data.codigo)
                            .input('texto', `http://${response4.data.url_formalizacao}`)
                            .execute('pr_atualiza_contrato_robo');
                            if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
                            return { status: true, data: `[Facta INSS] => ${response4.data.url_formalizacao}` }
                        } else {
                          if (response4.data && response4.data.erro && response4.data.mensagem) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (17)] => ${response4.data.mensagem}!`)
                        }
                      } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (16)] => Erro ao puxar a proposta do cliente!`)
                    } else {
                      if (response3.data && response3.data.erro && response3.data.message) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (13)] => ${response3.data.message}`)
                      if (response3.data && response3.data.erro && response3.data.mensagem) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (14)] => ${response3.data.mensagem}`)
                      console.log(response3)
                      if (response3.data && response3.data.codigo_cliente) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (15)] => Erro ao registrar o cliente! Tente novamente, se o erro continuar faça manualmente!`)
                      return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (15)] => Erro indefinido! Reporte ao Yuri!`)
                    }
                  } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (12)] => Não foi possivel Registrar o cliente! Tente novamente mais tarde...`)
                } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (11)] => Não foi possivel verificar a cidade do cliente! Tente novamente mais tarde...`)
              } else {
                if (response1.data.erro && response1.data.mensagem) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (10)] => Identificador da simulação obrigatório!`)
                if (response1.data && !response1.data.id_simulador) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (9)] => Erro indefinido! Reporte ao Yuri...`)
                console.log(response1)
                return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (9)] => Erro indefinido! Reporte ao Yuri...`)
              }
            } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (7)] => Erro ao pegar o Link da Simulaçao da Proposta! Tente novamente mais tarde...`)
          } else {
            if (operacoes.data.erro && operacoes.data.msg) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (4)] => ${operacoes.data.msg}`)
            if (operacoes.data && operacoes.data.erro && operacoes.data.mensagem) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (19)] => ${operacoes.data.mensagem}`)
            console.log(operacoes)
            return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (5)] => Erro indefinido! Reporte ao Yuri...`)
          }
        } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (3)] => Erro ao conseguir o Saldo INSS Disponivel! Tente novamente mais tarde...`)
      } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (2)] => CPF do cliente é invalido...`)
    } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (1)] => API não iniciada! Tente novamente...`)
  } catch(err) {
    if (err.details) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (20)] => ${err.details.map(det => { return `"${tradutor[det.context.label]}" está errado, Verifique e tente novamente!`}).join(' ,')}`)
    console.log(`[Facta INSS ERROR] => Erro no codigo: ${err}`)
    return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta INSS (21)] => Há um erro indefinido! Tente novamente, se o erro continuar reporte ao Yuri!`)
  }
}

module.exports = cadastrarFacta

async function execSQL(pool, cliente, contratoID, fase, contrato, text) {
  await pool.request()
    .input('id', contratoID)
    .input('faseDestino', fase)
    .input('CodContrato', contrato)
    .input('texto', text)
    //.execute('pr_atualiza_contrato_robo');
  if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
  return { status: false, data: text };
}