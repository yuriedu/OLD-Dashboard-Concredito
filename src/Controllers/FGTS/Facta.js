const facta = require('../../APIs/Facta');

const { messages } = require('joi-translation-pt-br');
const { tradutor } = require('../../Utils/Utils');
const { factaIn, bancoTranslate, revisaoPoupanca } = require('../../Utils/Facta');
const { compile } = require('joi');

var clientes = []

const cadastrarFacta = async (cliente, pool) => {
  if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) return { status: false, data: `[Facta FGTS (19)] => Cliente já está sendo cadastrado...` }
  clientes[clientes.length] = { id: cliente.Cpf }
  setTimeout(()=>{
    if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
  }, 600000)
  try{
    await factaIn.validateAsync(cliente,{ messages });
  } catch(err) {
    if (err.details && err.details[0] && err.details[0].message) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (0)] => ${err.details[0].message}`)
    console.log(`[Facta FGTS ERROR] => Erro no codigo: ${err}`)
    return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (21)] => Há um erro indefinido nas informações do cliente, Verifique e tente novamente, se o erro continuar reporte ao Yuri!`)
  }
  const retorno = {};
  const loadAPI = await facta.loadAPI()
  if (loadAPI) {
    if(cliente.Cpf && cliente.Cpf != null) {
      const response = await facta.getBalancesForCPF(cliente.Cpf);
      if (response && response.data) {
        if (!response.data || response.data.tipo !== 'Sucesso') return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (4))] => ${response.data.msg}`)

        const balances = await FactatransformBalances(response.data); 
        let tipo_tabela;
        let tabela;
        if(cliente.Tabela.includes("GOLD")) {
          tabela = 2.04;
          tipo_tabela = 38776;
        } else if (cliente.Tabela.includes("NORMAL")) {
          tabela = 2.04;
          tipo_tabela = 38768;
        } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (5)] => A tabela não é valida! Só aceito tabelo GOLD ou NORMAL! Caso seja uma das duas reporte ao Yuri...`)

        const selectedIndexes = [...Array(cliente.Prazo).keys()]
        const parcelas = await balances.repasses.map((entry, index) => {
          const newEntry = { ...entry };
          if (!selectedIndexes.includes(index)) newEntry.valor = 0;
          return newEntry;
        });

        const response2 = await facta.calculateNetValue(cliente.Cpf, parcelas, tipo_tabela, tabela);
        if (response2 && response2.data) {
          //VERIFICAR PARCELA N 1 MENOR QUE 10
          if(response2.data.permitido === 'NAO') return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (7)] => ${response2.data.msg}`)

          if (parseFloat(response2.data.valor_liquido.replace(',','.')) - cliente.Valor > cliente.Valor*0.05) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (8)] => Valor simulado é mais de 5% menor que o proposto ao cliente, por favor verificar. Valor retornado na simulação: ${response2.data.valor_liquido}`)
          
          const cidadeDoCliente = await facta.getCidadesByCidade(cliente.Cidade.normalize('NFD').replace(/[\u0300-\u036f]/g, ""), cliente.UF)
          if (cidadeDoCliente && cidadeDoCliente != undefined) {
            const clientData = {
              cpf: cliente.Cpf,
              nome: cliente.NomeCliente,
              sexo: cliente.sexo,
              estado_civil: 6,
              data_nascimento: cliente.Datanascimento.toISOString().split('T')[0],
              rg: cliente.rg, 
              estado_rg: cliente.UF,
              orgao_emissor: 'SSP',
              data_expedicao: '01/01/2010',
              estado_natural: cliente.UF,
              cidade_natural: Object.keys(cidadeDoCliente)[0],
              nacionalidade: 1,
              pais_origem: 26,
              celular: cliente.TelefoneConvenio.split(' ')[0].replace(/\D+/g, '').replace(/^(\d{2})(\d{5})(\d{4})/,'(0$1) $2-$3'),
              renda: 2000,
              cep: cliente.Cep,
              endereco: cliente.Endereco,
              numero: cliente.EndNumero,
              bairro: cliente.Bairro,
              cidade: Object.keys(cidadeDoCliente)[0],
              estado: cliente.UF,
              nome_mae: cliente.NomeMae,
              nome_pai: cliente.NomePai == null ? 'Não Consta' : cliente.NomePai,
              valor_patrimonio: 2,
              cliente_iletrado_impossibilitado: 'N',
              banco: bancoTranslate(cliente.CodBancoCliente),
              agencia: cliente.Agencia,
              conta: revisaoPoupanca(parseInt(cliente.ContaCorrente.replace(/\D+/g, '')).toString(),cliente.Poupanca)
            }
            const linkReponse = await facta.linkSimulationToProposal(cliente.Cpf, response2.data.simulacao_fgts.toString(), clientData.data_nascimento);
            if (linkReponse && linkReponse.data) {
              if (linkReponse.data.erro) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (11)] => ${linkReponse.data}`)
              if (!linkReponse.data.id_simulador || linkReponse.data.id_simulador == null) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (12)] => O identificador da simulação obrigatório!`)
              const response3 = await facta.registerClient(linkReponse.data.id_simulador, clientData);
              if (response3 && response3.data) {
                if (response3.data.erro) {
                  if (!response3.data.message && response3.data.message === undefined) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (14)] => ${response3.data.mensagem}`)
                  if (response3.data.message) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (20)] => ${response3.data.message}, Verifique e tente novamente...`)
                  return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (15)] => Ocorreu algum erro na API! Cadastre manualmente...`)
                }
                retorno.dados = response2.data;
                if(!response3.data.codigo_cliente || response3.data.codigo_cliente === false) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (16)] => Ocorreu algum problema ao registrar o cliente! Verifique os dados do cliente e tente novamente, cadastre manualmente se o erro continuar!`)
                const response4 = await facta.requestProposal(linkReponse.data.id_simulador, response3.data.codigo_cliente);
                if (response4 && response4.data) {
                  if (response4.data.erro) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (18)] => ${response4.data.mensagem}`)
                  retorno.link = response4.data;
                  await pool.request()
                    .input('id', cliente.IdContrato)
                    .input('vlrContratoAtual', Number(response2.data.valor_liquido.replace(".","").replace(",",".")))
                    .input('vlrParcelaAtual', cliente.ValorParcela)
                    .input('texto', 'Valores do Contrato atualizados')
                    .execute('pr_atualiza_valor_contrato_robo')
                  await pool.request()
                    .input('id', cliente.IdContrato)
                    .input('faseDestino', 9232)
                    .input('CodContrato', response4.data.codigo)
                    .input('texto', `http://${response4.data.url_formalizacao}`)
                    .execute('pr_atualiza_contrato_robo');
                  if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
                  return { status: true, data: `[Facta FGTS] => ${response4.data.url_formalizacao}` }
                } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (17)] => Ocorreu algum erro no Request da Proposta! Tente novamente, se o erro continuar reporte ao Yuri...`)
              } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (13)] => Ocorreu algum erro na Simulação da Proposta! Tente novamente, se o erro continuar reporte ao Yuri...`)
            } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (10)] => Ocorreu algum erro na Simulação da Proposta! Tente novamente, se o erro continuar reporte ao Yuri...`)
          } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (9)] => Cidade não encontrada no Facta...`)
        } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (6)] => Ocorreu algum erro em Calcular o NetValue! Verifique e tente novamente, se o erro continuar reporte ao Yuri...`)
      } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (3)] => Ocorreu algum erro nos BalancesForCPF! Verifique e tente novamente, se o erro continuar reporte ao Yuri...`)
    } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (2)] => CPF do cliente é invalido...`)
  } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Facta FGTS (1)] => API não iniciada! Tente novamente...`)
}

module.exports = cadastrarFacta

async function execSQL(pool, cliente, contratoID, fase, contrato, text) {
  await pool.request()
    .input('id', contratoID)
    .input('faseDestino', fase)
    .input('CodContrato', contrato)
    .input('texto', text)
    .execute('pr_atualiza_contrato_robo');
  if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
  return { status: false, data: text };
}

function FactatransformBalances(responseData) {
  const retornoKeys = Object.keys(responseData.retorno);
  const repassesKeys = retornoKeys.filter((key) => key.includes('dataRepasse'));
  const { data_saldo, horaSaldo, saldo_total } = responseData.retorno;
  const balances = { data_saldo, horaSaldo, saldo_total };
  balances.repasses = [];
  for (let index = 0; index < repassesKeys.length; index += 1) {
    const dataRepasse = responseData.retorno[`dataRepasse_${index + 1}`];
    const valorRepasse = responseData.retorno[`valor_${index + 1}`];
    balances.repasses.push({ index, data: dataRepasse, valor: valorRepasse });
  }
  return balances;
};