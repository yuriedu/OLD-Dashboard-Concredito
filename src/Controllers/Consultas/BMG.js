const bmg = require('../../APIs/BMG');

const consultarBMG = async (cpf) => {
  try {
    const loadAPI = await bmg.loadAPI()
    if (loadAPI) {
      if(cpf && cpf != null && cpf.length == 11) {
        var cliente = { Cpf: cpf, Prazo: 10, Datanascimento: new Date('1967-08-10T00:00:00.000Z') }
        const response = await bmg.simularSaqueAniversario(cliente);
        if (response && response.data) {
          if (response.data.simularSaqueAniversarioFgtsResponse && response.data.simularSaqueAniversarioFgtsResponse.simularSaqueAniversarioFgtsReturn && response.data.simularSaqueAniversarioFgtsResponse.simularSaqueAniversarioFgtsReturn.parcelas) {
            var test = {
              status: true,
              consulta: true,
              parcelas: [],
              valor: response.data.simularSaqueAniversarioFgtsResponse.simularSaqueAniversarioFgtsReturn.valorLiberado,
              valorTotal: response.data.simularSaqueAniversarioFgtsResponse.simularSaqueAniversarioFgtsReturn.valorOriginal
            }
            await response.data.simularSaqueAniversarioFgtsResponse.simularSaqueAniversarioFgtsReturn.parcelas.forEach((parc)=>{
              var valor = parc.dataVencimento.slice(0, 10)
              var ano = valor.slice(0,4)
              var mes = valor.slice(5,7)
              var dia = valor.slice(8,10)
              test.parcelas[test.parcelas.length] = { data: `${dia}/${mes}/${ano}`, valor: parc.parcelaLiberada }
            })
            return test
          } else {
            if (response.data.error && response.data.error.message) return { status: false, error: `[BMG Consultas (5)] => ${response.data.error.message.replace("java.lang.IllegalArgumentException:", "").replace("com.bmg.econsig.common.exception.ServiceException:", "")}!` }
            console.log(response.data)
            return { status: false, error: `[BMG Consultas (4)] => Não foi possivel pegar o saldo do cliente! Tente novamente, se o erro persistir reporte ao Yuri...` }
          }
        } else {
          //console.log(response)
          if (response && response.error && response.error.message) return { status: false, error: `[BMG Consultas (6)] => ${response.error.message.replace("java.lang.IllegalArgumentException:", "").replace("com.bmg.econsig.common.exception.ServiceException:", "")}!` }
          return { status: false, error: `[BMG Consultas (3)] => Não foi possivel pegar o saldo do cliente! Tente novamente, se o erro persistir reporte ao Yuri...` }
        }
      } else return { status: false, error: `[BMG Consultas (2)] => CPF do cliente é invalido...` }
    } else return { status: false, error: `[BMG Consultas (1)] => API não iniciada! Tente novamente...` }
  } catch(err) {
    console.log(`[Safra Consultas (0)] => ${err}`)
    console.log(err)
    return { status: false, error: `[BMG Consultas (0)] => Ocorreu algum erro indefinido! Tente novamente, se o erro persistir reporte ao Yuri...` }
  }
}

module.exports = {
  consultarBMG
}