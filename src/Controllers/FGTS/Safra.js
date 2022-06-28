const safra = require('../../APIs/Safra');

const { messages } = require('joi-translation-pt-br');
const { tradutor } = require('../../Utils/Utils');
const { safraIn, bancoTranslate } = require('../../Utils/Safra');

var clientes = []

const cadastraSafra = async (cliente, pool) => {
  try {
    if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) return { status: false, data: `[Safra FGTS (0)] => Cliente já está sendo cadastrado...` }
    clientes[clientes.length] = { id: cliente.Cpf }
    setTimeout(()=>{
      if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
    }, 600000)
    const loadAPI = await safra.loadAPI()
    if (loadAPI) {
      const client = await safraIn.validateAsync(cliente,{ messages });
      const produto = client.Prazo <= 5 ? 1 : 2;
      const response = await safra.getSaldo(client.Cpf, produto)
      if (response) {
        if (response.data && response.data.periodos && response.status == 200) {
          const parcelas = response.data.periodos.map(element => { return { dtRepasse: element.dtRepasse, valorReservado: element.valor, dataRepasse: element.dtRepasse, valorRepasse: element.valor, valorFinanciado: element.valor }})
          const tabelas = await safra.getTabelaJuros()
          const response2 = await safra.calcularProposta(tabelas.data.find(element => { element.id === 223463}).id, parcelas, client.Cpf, produto )
          if(response2) {
            if (response2.data && response2.data.simulacoes[0].valorPrincipal) {
              const dados = controesJson(client, response2.data.simulacoes[0], produto, parcelas)
              const response3 = await safra.gravarProposta(dados);
              if (response3) {
                if (response3.data && response3.data.idProposta) {
                  const response4 = await safra.getLinkFormalizacao(response3.data.idProposta, client.Cpf);
                  if (response4) {
                    if (response4.data && response4.data[0] && response4.data[0].idProposta && response4.data[0].link) {
                      await pool.request()
                        .input('id', cliente.IdContrato)
                        .input('vlrContratoAtual', String(response2.data.simulacoes[0].valorPrincipal).replace(".","").replace(",","."))
                        .input('vlrParcelaAtual', cliente.ValorParcela)
                        .input('texto', 'Valores do Contrato atualizados')
                        .execute('pr_atualiza_valor_contrato_robo')
                      await pool.request()
                        .input('id', cliente.IdContrato)
                        .input('faseDestino', 9232)
                        .input('CodContrato', response4.data[0].idProposta)
                        .input('texto', response4.data[0].link)
                        .execute('pr_atualiza_contrato_robo');
                      if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
                      return { status: true, data: `[Safra FGTS] => ${response4.data[0].link}` }
                    } else {
                      return execSQL(pool, cliente, cliente.IdContrato, 824, response3.data.idProposta, `[Safra FGTS (14)] => O cliente foi Cadastrado! Porem não foi possivel pegar o Link! Pegue manualmente para terminar o cadastro!`)
                    }
                  } else return execSQL(pool, cliente, cliente.IdContrato, 824, response3.data.idProposta, `[Safra FGTS (13)] => O cliente foi Cadastrado! Porem não foi possivel pegar o Link! Pegue manualmente para terminar o cadastro!`)
                } else {
                  if (response3.data && response3.data.erros && response3.data.erros.descricao) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Safra FGTS (10)] => ${response3.data.erros.descricao}`)
                  if (response3.data && response3.data.erros) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Safra FGTS (11)] => Ocorreu algum erro! Reporte ao Yuri: ${JSON.stringify(response3.data.erros)}`)
                  console.log(response3)
                  return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Safra FGTS (12)] => Ocorreu algum erro não indentificado! Reporte ao Yuri...`)
                }
              } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Safra FGTS (9)] => Não foi possivel Cadastrar a Proposta! Aguarde um tempo e tente novamente...`)
            } else {
              if (response.status != 200) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Safra FGTS (7)] => Não foi possivel realizar a consulta de saldo! Aguarde um pouco e tente novamente...`)
              return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Safra FGTS (8)] => ${response2}`)
            }
          } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Safra FGTS (6)] => Não foi possivel Calcular a Proposta! Aguarde um tempo e tente novamente...`)
        } else {
          if (response.status != 200) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Safra FGTS (3)] => Não foi possivel realizar a consulta de saldo! Aguarde um pouco e tente novamente...`)
          if(response.data && response.data.erros && response.data.erros.length > 0 && response.data.erros[0].descricao && response.data.erros[0].descricao.includes('Tente novamente'))
          if(response.data && response.data.erros && response.data.erros.length > 0 && response.data.erros[0].descricao) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Safra FGTS (4)] => ${response.data.erros[0].descricao}`)
          return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Safra FGTS (5)] => ${response}`)
        }
      } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Safra FGTS (2)] => Ocorreu algum erro em consultar o Saldo, Aguarde um pouco e tente novamente!`)
    } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Safra FGTS (1)] => Ocorreu algum erro na API! Tente novamente, caso o erro se repita faça MANUALMENTE...`)
  } catch(err) {
    if (err.details) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Safra FGTS (15)] => ${err.details.map(det => { return `"${tradutor[det.context.label]}" está errado, Verifique e tente novamente!`}).join(' ,')}`)
    console.log(`[Safra FGTS ERROR] => Erro no codigo: ${err}`)
    console.log(err)
    return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Safra FGTS (16)] => Há um erro indefinido! Tente novamente, se o erro continuar reporte ao Yuri!`)
  }
}

module.exports = cadastraSafra

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

const controesJson = (client, calculado, produto, periodos) => {
  try {
    var tabela = {
      dadosProposta: {
        idTabelaJuros: calculado.idTabelaJuros,
        prazo: calculado.prazo,
        valorPrincipal: calculado.valorPrincipal,
        valorParcela: calculado.valorParcela,
        cpfAgenteCertificado: process.env.SAFRA_CPF,
        tpProduto: produto,
        periodos: periodos,
      },
      dadosPessoais: {
        cpf: client.Cpf,
        nomeCompleto: client.NomeCliente,
        dataNascimento: client.Datanascimento,
        email: client.Email,
      },
      contatos: [{
        ddd: client.TelefoneConvenio.split(' ')[0].replace(/\D+/g, '').slice(0,2),
        telefone: client.TelefoneConvenio.split(' ')[0].replace(/\D+/g, '').slice(2),
        email: client.Email,
        whatsapp: true,
      }],
      endereco: {
        cep: client.Cep.replace(/\D+/g, ''),
        logradouro: client.Endereco,
        numero: client.EndNumero,
        complemento: client.Complemento,
        bairro: client.Bairro,
        cidade: client.Cidade,
        uf: client.UF,
      },
      dadosBancarios: {
        banco: bancoTranslate(client.CodBancoCliente),
        agencia: client.Agencia,
        tipoConta: client.Poupanca ? 'PP' : 'CC',
        conta: client.ContaCorrente.replace(/\D+/g, ''),
      },
      submeter: true
    }
    return tabela
  } catch(e) {

  }
}