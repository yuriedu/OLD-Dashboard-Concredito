const bmg = require('../../APIs/BMG');

const { messages } = require('joi-translation-pt-br');
const { tradutor } = require('../../Utils/Utils');
const { bmgIn, bancoTranslate } = require('../../Utils/BMG');

var clientes = []

var tokenDefault = false

const CadastraBMG = async (cliente, pool, token) => {
  try {
    if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) return { status: false, data: `[BMG FGTS (0)] => Cliente já está sendo cadastrado...` }
    clientes[clientes.length] = { id: cliente.Cpf }
    setTimeout(()=>{
      if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
    }, 600000)
    if (token && token.length == 6 && Number(token)) tokenDefault = token
    const loadAPI = await bmg.loadAPI()
    if (loadAPI) {
      const client = await bmgIn.validateAsync(cliente, { messages });
      const response = await bmg.simularSaqueAniversario(cliente);
      if (response) {
        if (response.data && response.data.simularSaqueAniversarioFgtsResponse && response.data.simularSaqueAniversarioFgtsResponse.simularSaqueAniversarioFgtsReturn && response.data.simularSaqueAniversarioFgtsResponse.simularSaqueAniversarioFgtsReturn.valorLiberado) {
          const response2 = await bmg.gravarPropostaAntecipacao(cliente, response.data.simularSaqueAniversarioFgtsResponse, tokenDefault);
          if (response2) {
            if (response2 && response2.data && response2.data.gravaPropostaAntecipaSaqueFgtsResponse && response2.data.gravaPropostaAntecipaSaqueFgtsResponse.gravaPropostaAntecipaSaqueFgtsReturn && response2.data.gravaPropostaAntecipaSaqueFgtsResponse.gravaPropostaAntecipaSaqueFgtsReturn.numeroPropostaGerada) {
              const response3 = await bmg.getLink(response2.data.gravaPropostaAntecipaSaqueFgtsResponse.gravaPropostaAntecipaSaqueFgtsReturn.numeroPropostaGerada);
              if (response3 && response3.data) {
                if (response3.data.linkCompartilhado) {
                  await pool.request()
                    .input('id', cliente.IdContrato)
                    .input('vlrContratoAtual', response.data.simularSaqueAniversarioFgtsResponse.simularSaqueAniversarioFgtsReturn.valorLiberado)
                    .input('vlrParcelaAtual', cliente.Prazo)
                    .input('texto', 'Valores do Contrato atualizados')
                    .execute('pr_atualiza_valor_contrato_robo')
                  await pool.request()
                    .input('id', cliente.IdContrato)
                    .input('faseDestino', 823) //9232
                    .input('CodContrato', response2.data.gravaPropostaAntecipaSaqueFgtsResponse.gravaPropostaAntecipaSaqueFgtsReturn.numeroPropostaGerada)
                    .input('texto', response3.data.linkCompartilhado)
                    .execute('pr_atualiza_contrato_robo');
                    if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
                    return { status: true, data: `[BMG FGTS] => ${response3.data.linkCompartilhado}` }
                } else {
                  console.log(response3.data)
                  return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[BMG FGTS (9)] => Proposta cadastrada, porem não foi possivel pegar o Link! Pegue MANUALMENTE...`)
                }
              } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[BMG FGTS (8)] => Proposta cadastrada, porem não foi possivel pegar o Link! Pegue MANUALMENTE...`)
            } else {
              return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[BMG FGTS (7)] => ${response2.replace("java.lang.IllegalArgumentException:", "").replace("com.bmg.econsig.common.exception.ServiceException:", "")}`)
            }
          } return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[BMG FGTS (6)] => Ocorreu algum erro ao Registrar a Proposta! Tente novamente, se o erro continuar reporte ao Yuri!`)
        } else {
          if (String(response) && !response.data) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[BMG FGTS (5)] => ${response.replace("java.lang.IllegalArgumentException:", "").replace("com.bmg.econsig.common.exception.ServiceException:", "")} Verifique e tente novamente, se não souber o que é o erro reporte ao Yuri!`)
          console.log(response.data)
          return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[BMG FGTS (?1)] => Ocorrou algum erro indefinido! Reporte ao Yuri`)

        }
      } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[BMG FGTS (5)] => Ocorreu algum erro ao Simular o Saque Aniversario! Tente novamente, se o erro continuar reporte ao Yuri!`)
    } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[BMG FGTS (3)] => API não iniciada! Tente novamente...`)
  } catch(err) {
    if (err.details) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[BMG FGTS (1)] => ${err.details.map(det => { return `"${tradutor[det.context.label]}" está errado, Verifique e tente novamente!`}).join(' ,')}`)
    console.log(`[BMG FGTS ERROR] => Erro no codigo: ${err}`)
    console.log(err)
    return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[BMG FGTS (2)] => Há um erro indefinido! Tente novamente, se o erro continuar reporte ao Yuri!`)
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

module.exports = CadastraBMG