const pan = require('../../APIs/Pan');

const { messages } = require('joi-translation-pt-br');
const { tradutor } = require('../../Utils/Utils');
const { panINSS, removeProperties, isAprosentadoria, bancoTranslate } = require('../../Utils/Pan');

var clientes = []

const CadastrarPan = async (cliente, pool) => {
  try{
    if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) return { status: false, data: `[Pan INSS (0)] => Cliente já está sendo cadastrado...` }
    clientes[clientes.length] = { id: cliente.Cpf }
    setTimeout(()=>{
      if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
    }, 600000)
    const client = await panINSS.validateAsync(cliente,{ messages });
    if(!client.Cpf || cliente.Cpf == null) return 'Erro no CPF do cliente';
    const loadAPI = await pan.loadAPI()
    if (loadAPI) {
      const clienteData = {
          cpf: client.Cpf,
          matricula_preferencial: client.Maatricula,
          matricula_complementar: client.Maatricula,
          data_nascimento: client.Datanascimento.toISOString().split('T')[0].split('-').reverse().join('-'),
          renda_mensal: 5000
      }
      const dataSimulacao = {
        cliente: clienteData,
        codigo_filial: process.env.PAN_CODIGO_FILIAL,
        codigo_supervisor: process.env.PAN_CODIGO_SUPERVISOR,
        codigo_promotora: process.env.PAN_PROMOTER_CODE,
        codigo_digitador: process.env.PAN_CODIGO_DIGITADOR,
        codigo_convenio: "007000",
        valor: client.ValorParcela,
        metodo: "PARCELA",
        prazo: client.Prazo,
        incluir_seguro: false,
        tipo_operacao: "MARGEM_LIVRE"
      }
      const response = await pan.calculateNetValueINSS(dataSimulacao);
      if (response && response.data) {
        if (response.data[0] && response.data[0].prazos_permitidos && response.data[0].condicoes_credito) {
          if(!response.data[0].prazos_permitidos.includes(client.Prazo)) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan INSS (3)] => Prazo do contrato não se encontra disponivel para o cliente. Prazos disponiveis: ${response.data[0].prazos_permitidos}`)
          var tabela = {};
          if(client.Especie == 32 || client.Especie == 92){
            tabela = response.data[0].condicoes_credito.find(element => element.codigo_tabela_financiamento === "703195")
          }else if(client.Especie == 88){
            tabela = response.data[0].condicoes_credito.find(element => element.codigo_tabela_financiamento === "703627")
          }else{
            tabela = response.data[0].condicoes_credito.find(element => element.codigo_tabela_financiamento === "701434")
          }
          if(parseFloat(tabela.valor_cliente) <= client.Valor*0.95) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan INSS (4)] => Valor simulado é mais de 5% menor que o proposto ao cliente, favor verificar. Valor retornado na simulação: ${tabela.valor_cliente}`)
          const dsdos_bancarios = [{
            codigo_operacao:  client.Poupanca? '013' : '001',
            numero_agencia: client.Agencia,
            numero_banco: bancoTranslate(client.CodBancoCliente),
            numero_conta: client.ContaCorrente.replace(/\D+/g, '').slice(0,-1),
            digito_conta: client.ContaCorrente.replace(/\D+/g, '').slice(-1),
            tipo_conta: client.Poupanca? "CONTA_POUPANCA_INDIVIDUAL" : "CONTA_CORRENTE_INDIVIDUAL" 
          },{
            numero_agencia: client.Agencia,
            numero_banco: bancoTranslate(client.CodBancoCliente),
            numero_conta: client.ContaCorrente.replace(/\D+/g, '').slice(0,-1),
            digito_conta: client.ContaCorrente.replace(/\D+/g, '').slice(-1),
            tipo_conta: client.Poupanca? "CONTA_POUPANCA_INDIVIDUAL" : "CONTA_CORRENTE_INDIVIDUAL" 
          }]
          const clienteProposta = {
            codigo_tipo_beneficio: client.Especie,
            cpf: client.Cpf,
            dados_bancarios:[bancoTranslate(client.CodBancoCliente) === 104 ? dsdos_bancarios[0]: dsdos_bancarios[1]],
            data_emissao_documento: "01-01-2010",
            data_nascimento: client.Datanascimento.toISOString().split('T')[0].split('-').reverse().join('-'),
            enderecos: [{
              bairro: client.Bairro,
              cep: client.Cep,
              cidade: client.Cidade,
              numero: client.EndNumero,
              logradouro: client.Endereco,
              tipo: "FISICO",
              uf: client.UF
            }],
            estado_civil: "OUTROS",
            matricula_preferencial: client.Maatricula,
            nacionalidade: "BRASILEIRA",
            nome: client.NomeCliente,
            numero_documento: client.rg,
            pessoa_politicamente_exposta: false,
            renda_valor: 5000
          }
          const cond_credit = removeProperties(tabela, ['sucesso', 'mensagem_erro', 'descricao_tabela_financiamento', 'descricao_produto', 'despesas', 'refinanciamentos'])
          const op_credit = {
            condicao_credito: cond_credit,
            tipo_operacao: "MARGEM_LIVRE"
          }
          const registerData = {
            cliente: clienteProposta,
            codigo_usuario: process.env.PAN_USER_CODE,
            codigo_convenio: "007000",
            codigo_filial: process.env.PAN_CODIGO_FILIAL,
            codigo_meio_liberacao: "100",
            codigo_orgao: isAprosentadoria(client.Especie) ? "000501" : "000502",
            codigo_promotora: process.env.PAN_PROMOTER_CODE,
            codigo_digitador: process.env.PAN_CODIGO_DIGITADOR,
            codigo_supervisor: process.env.PAN_CODIGO_SUPERVISOR,
            cpf_usuario_certificado: process.env.PAN_CODIGO_CPF,
            operacoes_credito: [op_credit],
            tipo_formalizacao: "DIGITAL"
          }
          const response2 = await pan.requestProposalINSS(registerData);
          if (response2 && response2.data) {
            if (response2.data[0] && response2.data[0].numero_proposta) {
              const link = await pan.getLink(client.Cpf, response2.data[0].numero_proposta);
              if (link && link.data) {
                if (link.data.linkCliente) {
                  await pool.request()
                    .input('id', cliente.IdContrato)
                    .input('vlrContratoAtual', tabela.valor_cliente)
                    .input('vlrParcelaAtual', tabela.valor_parcela)
                    .input('texto', 'Valores do Contrato atualizados')
                    .execute('pr_atualiza_valor_contrato_robo')
                  await pool.request()
                    .input('id', cliente.IdContrato)
                    .input('faseDestino', 9232)
                    .input('CodContrato', response2.data[0].numero_proposta)
                    .input('texto', `${link.data.linkCliente}`)
                    .execute('pr_atualiza_contrato_robo');
                  if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
                  return { status: true, data: `[Pan INSS] => ${link.data.linkCliente}` }
                } else {
                  return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan INSS (9)] => Erro desconhecido! Reporte ao Yuri...`)
                }
              } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan INSS (8)] => Erro ao pegar o link da propsota! Pegue manualmente para compeltar o cadastro...`)
            } else {
              if (response2.status == 400) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan INSS (6)] => ${response2.data.detalhes.join('. ')}`)
              console.log(response2.data)
              return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan INSS (7)] => Erro desconhecido! Reporte ao Yuri...`)
            }
          } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan INSS (5)] => Erro pegar a proposta em INSS! Tente novamente, se o erro continuar reporte ao Yuri...`)
        } else {
          console.log(response.data)
          return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan INSS (2)] => Erro ao desconhecido! Reporte ao Yuri`)
        }
      } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan INSS (1)] => Erro ao calcular o NetValueINSS! Tente novamente, se o erro continuar reporte ao Yuri...`)
    } else {
      if (loadAPI) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan INSS (11)] => ${loadAPI}`)
      return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan INSS (11)] => Erro ao iniciar a API do PAN! Tente novamente, se o erro continuar reporte ao Yuri...`)
    }
  }catch(err){
    if (err.details) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan INSS (10)] => ${err.details.map(det => { return `"${tradutor[det.context.label]}" está errado, Verifique e tente novamente!`}).join(' ,')}`)
    console.log(`[Pan INSS ERROR] => Erro no codigo: ${err}`)
    return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan INSS (12)] => Há um erro indefinido! Tente novamente, se o erro continuar reporte ao Yuri!`)
  }
}

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

module.exports = CadastrarPan