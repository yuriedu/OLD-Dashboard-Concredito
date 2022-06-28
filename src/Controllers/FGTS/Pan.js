const pan = require('../../APIs/Pan');

const { messages } = require('joi-translation-pt-br');
const { tradutor } = require('../../Utils/Utils');
const { panIn, bancoTranslate } = require('../../Utils/Pan');

var clientes = []

const cadastrarPan = async (cliente, pool) => {
  try{
    if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) return { status: false, data: `[Pan FGTS (0)] => Cliente já está sendo cadastrado...` }
    clientes[clientes.length] = { id: cliente.Cpf }
    setTimeout(()=>{
      if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
    }, 600000)
    const loadAPI = await pan.loadAPI()
    if (loadAPI) {
      const client = await panIn.validateAsync(cliente,{ messages });
      if(cliente.Cpf && cliente.Cpf != null) {
        const data = {
          cpf_cliente: client.Cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"),
          codigo_promotora: process.env.PAN_PROMOTER_CODE,
          valor_solicitado: client.Valor
        };
        const response = await pan.calculateNetValue(data);
        if (response) {
          if (response.data && response.data[0] && response.data[0].condicoes_credito) {
            const tabela = response.data[0].condicoes_credito.find(element => element.codigo_tabela_financiamento == '900001')
            if(parseFloat(tabela.valor_cliente) - client.Valor > client.Valor*0.05) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan FGTS (5)] => Valor simulado é mais de 5% menor que o proposto ao cliente, por favor verificar. Valor retornado na simulação: ${tabela.valor_cliente}`)
            if (bancoTranslate(client.CodBancoCliente) == 104) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan FGTS (10)] => A API da Pan não aceita Caixa Economica Federal! Faça MANUALMENTE...`)
            const clienteDados = {
              cpf_cliente: data.cpf_cliente,
              telefones: [{
                tipo: "FONE_FISICO",
                ddd: client.TelefoneConvenio.split(' ')[0].replace(/\D+/g, '').slice(0,2),
                numero: client.TelefoneConvenio.split(' ')[0].replace(/\D+/g, '').slice(2),
                ramal: null
              }],
              enderecos: [{
                tipo: "FISICO",
                logradouro: client.Endereco,
                numero: client.EndNumero,
                complemento: client.Complemento,
                bairro: client.Bairro,
                cidade: client.Cidade,
                uf: client.UF,
                cep: client.Cep
              }],
              dados_bancarios: {
                numero_agencia: client.Agencia,
                numero_banco: bancoTranslate(client.CodBancoCliente),
                numero_conta: client.ContaCorrente.replace(/\D+/g, '').slice(0,-1),
                codigo_meio_liberacao: bancoTranslate(client.CodBancoCliente) === 623 ? "024" : "020",
                digito_conta: client.ContaCorrente.replace(/\D+/g, '').slice(-1),
                tipo_conta: client.Poupanca ? 'CONTA_POUPANCA_INDIVIDUAL' : "CONTA_CORRENTE_INDIVIDUAL"
              },
              data_nascimento: client.Datanascimento.toISOString().split('T')[0].split('-').reverse().join('-'),
              estado_civil: "OUTROS",
              nacionalidade: "BRASILEIRA",
              nome: client.NomeCliente,
              numero_documento: client.rg,
              data_emissao_documento: "01-01-2010",
              uf_emissao_documento: client.UF,
              nome_mae: client.NomeMae,
              pessoa_politicamente_exposta: false,
              renda_valor: 1212
            }
            if (String(clienteDados.dados_bancarios.numero_banco).length == 1) clienteDados.dados_bancarios.numero_banco = `00${clienteDados.dados_bancarios.numero_banco}`
            if (String(clienteDados.dados_bancarios.numero_banco).length == 2) clienteDados.dados_bancarios.numero_banco = `0${clienteDados.dados_bancarios.numero_banco}`
            const cond_cred = [{condicao_credito: tabela}]
            const allData = {
              cliente: clienteDados,
              codigo_digitador: process.env.PAN_CODIGO_DIGITADOR,
              codigo_filial: process.env.PAN_CODIGO_FILIAL,
              codigo_supervisor: process.env.PAN_CODIGO_SUPERVISOR,
              codigo_promotora: process.env.PAN_PROMOTER_CODE,
              cpf_usuario_certificado: process.env.PAN_CODIGO_CPF,
              operacoes_credito: cond_cred,
              NumeroExterno: "",
            }
            const response2 = await pan.requestProposal(allData);
            if (response2) {
              if (response2.data && response2.data[0] && response2.data[0].numero_proposta) {
                const link = await pan.getLink(client.Cpf, response2.data[0].numero_proposta);
                if (link) {
                  if (link.data && link.data.linkOperador && link.data.linkCliente) {
                    await pool.request()
                    .input('id', cliente.IdContrato)
                    .input('vlrContratoAtual', '')
                    .input('vlrParcelaAtual', '')
                    .input('texto', 'Valores do Contrato atualizados')
                    //.execute('pr_atualiza_valor_contrato_robo')
                    await pool.request()
                      .input('id', client.IdContrato)
                      .input('faseDestino', 9232)
                      .input('CodContrato', response2.data[0].numero_proposta)
                      .input('texto', `${link.data.linkCliente}`)
                      .execute('pr_atualiza_contrato_robo');
                    if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
                    return { status: true, data: `[Pan FGTS] => ${link.data.linkCliente}` }
                  } else {
                    console.log(link)
                    return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan FGTS (9)] => Erro desconhecido - REPORTE AO YURI: ${link}!`)
                  }
                } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan FGTS (8)] => Ocorreu algum erro em Obter a Proposta! Verifique se a proposta foi cadastrada no Banco, caso não for tente novamente...`)
              } else {
                console.log(response2)
                return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan FGTS (7)] =>  ${response2}!`)
              }
            } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan FGTS (6)] => Ocorreu algum erro ao enviar a Proposta, Verifique se aproposta foi cancelada no Banco, caso for tente novamente!`)
          } else {
            return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan FGTS (4)] => ${response}!`)
          }
        } return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan FGTS (3)] => Ocorreu algum erro em Calcular o NetValue, Aguarde um pouco e tente novamente!`)
      } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan FGTS (2)] => CPF do cliente é invalido...`)
    } else {
      if (loadAPI) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan FGTS (11)] => ${loadAPI}`)
      return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan FGTS (1)] => API não iniciada! Tente novamente...`)
    }
  } catch(e) {
    if (err.details) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan FGTS (11)] => ${err.details.map(det => { return `"${tradutor[det.context.label]}" está errado, Verifique e tente novamente!`}).join(' ,')}`)
    console.log(`[Pan FGTS ERROR] => Erro no codigo: ${err}`)
    return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Pan FGTS (12)] => Há um erro indefinido! Tente novamente, se o erro continuar reporte ao Yuri!`)
  }
}

module.exports = cadastrarPan

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