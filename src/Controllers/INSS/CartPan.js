const pan = require('../../APIs/Pan');

const { messages } = require('joi-translation-pt-br');
const { tradutor } = require('../../Utils/Utils');
const { panINSS, removeProperties, isAprosentadoria, bancoTranslate } = require('../../Utils/Pan');

var clientes = []

const CadastrarPan = async (cliente, pool) => {
  try{
    if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) return { status: false, data: `[CartPan INSS (0)] => Cliente já está sendo cadastrado...` }
    clientes[clientes.length] = { id: cliente.Cpf }
    setTimeout(()=>{
      if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
    }, 600000)
    const client = await panINSS.validateAsync(cliente,{ messages });
    if(!client.Cpf || cliente.Cpf == null) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[CartPan INSS (10)] => CPF do cliente é invalido...`)
    const loadAPI = await pan.loadAPI()
    if (loadAPI) {
      const cartaos = [{
        codigo_tabela: "888700",
        deseja_saque: true,
        valor_saque: client.Valor
      },{
        codigo_tabela: "888700",
        deseja_saque: false,
      }]
      const telefones = [{
        tipo: "FONE_FISICO",
        ddd: client.TelefoneConvenio.split(' ')[0].replace(/\D+/g, '').slice(0,2),
        numero: client.TelefoneConvenio.split(' ')[0].replace(/\D+/g, '').slice(2),
        telefone: client.TelefoneConvenio.split(' ')[0].replace(/\D+/g, ''),
        ramal: null
      }]
      const enderecos = [{
        tipo: "FISICO",
        logradouro: client.Endereco,
        numero: client.EndNumero,
        complemento: client.Complemento,
        bairro: client.Bairro,
        cidade: client.Cidade,
        uf: client.UF,
        cep: client.Cep
      }]
      const dsdos_bancarios = [{
        conta_para_recebimento: true,
        codigo_operacao:  client.Poupanca? '013' : '001',
        numero_agencia: client.Agencia,
        numero_banco: bancoTranslate(client.CodBancoCliente),
        numero_conta: client.ContaCorrente.replace(/\D+/g, '').slice(0,-1),
        digito_conta: client.ContaCorrente.replace(/\D+/g, '').slice(-1),
        tipo_conta: client.Poupanca? "CONTA_POUPANCA_INDIVIDUAL" : "CONTA_CORRENTE_INDIVIDUAL",
        cartao_magnetico: client.TipoLiberacao === "" ? true : false
      },{
        conta_para_recebimento: true,
        numero_agencia: client.Agencia,
        numero_banco: bancoTranslate(client.CodBancoCliente),
        numero_conta: client.ContaCorrente.replace(/\D+/g, '').slice(0,-1),
        digito_conta: client.ContaCorrente.replace(/\D+/g, '').slice(-1),
        tipo_conta: client.Poupanca? "CONTA_POUPANCA_INDIVIDUAL" : "CONTA_CORRENTE_INDIVIDUAL",
        cartao_magnetico: client.TipoLiberacao === "" ? true : false
      }]
      const clienteData = {
        cpf: client.Cpf,
        nome_mae: client.NomeMae,
        nome_pai: client.NomePai,
        email: client.Email,
        receber_fatura_email: true,
        sexo: client.sexo === "M" ?"MASCULINO" : "FEMININO" ,
        telefones,
        enderecos,
        dados_bancarios:[bancoTranslate(client.CodBancoCliente) === 104 ? dsdos_bancarios[0]: dsdos_bancarios[1]],
        data_emissao_documento: "01-01-2010",
        data_nascimento: client.Datanascimento.toISOString().split('T')[0].split('-').reverse().join('-'),
        estado_civil: "SOLTEIRO",
        tipo_documento: "RG",
        matricula_preferencial: client.Maatricula,
        nacionalidade: "BRASILEIRA",
        nome: client.NomeCliente,
        numero_documento: client.rg,
        pessoa_politicamente_exposta: false,
        renda_valor: 1212,
        uf_beneficio: client.UF,
        uf_emissao_documento: client.UF,
        codigo_tipo_beneficio: client.Especie,
        uf_naturalidade: client.UF
      }
      const registerData = {
        cartao: client.Tabela === "CARTAO SEM SAQUE" ? cartaos[1]:cartaos[0],
        cliente: clienteData,
        codigo_usuario: process.env.PAN_USER_CODE,
        codigo_meio_liberacao: "100",
        codigo_orgao: isAprosentadoria(client.Especie) ? "000501" : "000502",
        cpf_usuario_certificado: process.env.PAN_CODIGO_CPF,
        codigo_filial: process.env.PAN_CODIGO_FILIAL,
        codigo_lotacao: "0001",
        codigo_secretaria: "001",
        codigo_supervisor: process.env.PAN_CODIGO_SUPERVISOR,
        codigo_promotora: process.env.PAN_PROMOTER_CODE,
        codigo_digitador: process.env.PAN_CODIGO_DIGITADOR,
        codigo_convenio: "007000",
        nome_operador: "Willian Conzatti",
        operacoes_credito: [{ tipo_operacao: "PROPOSTA_CARTAO" }],
        tipo_formalizacao: "DIGITAL"
      }
      const response = await pan.requestProposalINSS(registerData);
      if (response) {
        if (response.data && response.data[0] &&response.data[0].numero_proposta) {
          const link = await pan.getLink(client.Cpf, response.data[0].numero_proposta);
          if (link) {
            if (link.data && link.data.linkCliente) {
              await pool.request()
                .input('id', client.IdContrato)
                .input('faseDestino', 823)
                .input('CodContrato', response.data[0].numero_proposta)
                .input('texto', `${link.data.linkCliente}`)
                .execute('pr_atualiza_contrato_robo');
              if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
              return { status: true, data: `[Pan INSS] => ${link.data.linkCliente}` }
            } else {
              console.log(link)
              return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[CartPan INSS (8)] => Erro ao pegar o link! Reporte ao Yuri...`)
            }
          } return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[CartPan INSS (7)] => Erro ao pegar o link Pegue manualmente para completar o cadastro!`)
        } else {
          if (response.data && response.data[0].detalhes) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[CartPan INSS (6)] => ${response.data[0].detalhes}! Tente novamente se o erro continuar reporte ao Yuri...`)
          if (!response.data) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[CartPan INSS (9)] => ${response} Verifique e tente novamente...`)
          console.log(response.data)
          return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[CartPan INSS (5)] => Erro ao desconhecido! Reporte ao Yuri`)
        }
      } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[CartPan INSS (4)] => Erro ao pegar a proposta! Tente novamente, se o erro continuar reporte ao Yuri...`)
    } else {
      if (loadAPI) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[CartPan INSS (11)] => ${loadAPI}`)
      return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[CartPan INSS (3)] => Erro ao iniciar a API do PAN! Tente novamente, se o erro continuar reporte ao Yuri...`)
    }
  }catch(err){
    if (err.details) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[CartPan INSS (2)] => ${err.details.map(det => { return `"${tradutor[det.context.label]}" está errado, Verifique e tente novamente!`}).join(' ,')}`)
    console.log(`[Pan INSS ERROR] => Erro no codigo: ${err}`)
    console.log(err)
    return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[CartPan INSS (1)] => Há um erro indefinido! Tente novamente, se o erro continuar reporte ao Yuri!`)
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