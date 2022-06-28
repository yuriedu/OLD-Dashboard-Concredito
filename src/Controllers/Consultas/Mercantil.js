const mercantil = require('../../APIs/Mercantil');

const consultarMercantil = async (cpf, type, numberParc) => {
  try {
    const loadAPI = await mercantil.loadAPI()
    if (loadAPI) {
      if(cpf && cpf != null && cpf.length == 11) {
        const response = await mercantil.getSaldo(cpf);
        if (response && response.data) {
          if (response.data.parcelas) {
            var test = {
              status: true,
              consulta: true,
              parcelas: [],
              valor: response.data.valor,
              valorTotal: response.data.valorTotal
            }
            await response.data.parcelas.forEach((parc, index)=>{
              if (type == "POR_QUANTIDADE_DE_PARCELAS" && index > Number(numberParc) - 1) return;
              var valor = parc.dataRepasse.slice(0, 10)
              var ano = valor.slice(0,4)
              var mes = valor.slice(5,7)
              var dia = valor.slice(8,10)
              test.parcelas[test.parcelas.length] = { data: `${dia}/${mes}/${ano}`, valor: parc.valor }
            })
            const correspondente = {
              usuarioDigitador:process.env.MERCANTIL_USUARIO,
              cpfAgenteCertificado:parseInt(process.env.MERCANTIL_CPF.replace(/\D+/g, '')),
              ufAtuacao:process.env.MERCANTIL_UF
            }
            const simula = {
              cpf: parseInt(cpf.replace(/\D+/g, '')),
              parcelas: [],
              correspondente
            }
            await response.data.parcelas.forEach((element,index)=>{
              if (type == "POR_QUANTIDADE_DE_PARCELAS" && index > Number(numberParc) - 1) return;
              if (element.valor < 9) return;
              return simula.parcelas[simula.parcelas.length] = { dataVencimento: element.dataRepasse, valor: element.valor }
            })
            const response2 = await mercantil.calculateNetValue(simula);
            if (response2 && response2.data) {
              if (response2.data.id && response2.data.valorEmprestimo && response2.data.calculoParcelas) {
                test.valor = response2.data.valorEmprestimo
                return test
              } else {
                if (response2.data.errors && response2.data.errors[0] && response2.data.errors[0].message) return { status: false, error: `[Mercantil Consultas (8)] => ${response2.data.errors[0].message}` }
                console.log(response2.data)
                return { status: false, error: `[Mercantil Consultas (7)] => Não foi possivel pegar os valores do cliente! Tente novamente, se o erro continuar reporte ao Yuri...` }
              }
            } else return { status: false, error: `[Mercantil Consultas (6)] => Não foi possivel calcular o net value do cliente! Tente novamente, se o erro persistir reporte ao Yuri...` }
          } else {
            if (response.erro) return { status: false, error: `[Mercantil Consultas (10)] => ${response.erro}` }
            if (response.data.errors && response.data.errors[0] && response.data.errors[0].message) return { status: false, error: `[Mercantil Consultas (9)] => ${response.data.errors[0].message}` }
            console.log(response.data)
            return { status: false, error: `[Mercantil Consultas (5)] => ${response.data}` }
          }
        } else return { status: false, error: `[Mercantil Consultas (3)] => Não foi possivel pegar o saldo do cliente! Tente novamente, se o erro persistir reporte ao Yuri...` }
      } else return { status: false, error: `[Mercantil Consultas (2)] => CPF do cliente é invalido...` }
    } else return { status: false, error: `[Mercantil Consultas (1)] => API não iniciada! Tente novamente...` }
  } catch(err) {
    console.log(`[Safra Consultas (0)] => ${err}`)
    console.log(err)
    return { status: false, error: `[Mercantil Consultas (0)] => Ocorreu algum erro indefinido! Tente novamente, se o erro persistir reporte ao Yuri...` }
  }
}

module.exports = {
  consultarMercantil
}