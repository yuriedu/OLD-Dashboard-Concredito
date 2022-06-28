const safra = require('../../APIs/Safra');

const consultarSafra = async (cpf, produto) => {
  try {
    const loadAPI = await safra.loadAPI()
    if (loadAPI) {
      if(cpf && cpf != null && cpf.length == 11) {
        const response = await safra.getSaldo(cpf, produto)
        if (response && response.data && response.status == 200) {
          if (response.data.periodos) {
            var test = {
              status: true,
              consulta: response.data.permiteConsulta,
              parcelas: [],
              valor: 0,
              valorTotal: 0,
            }
            await response.data.periodos.forEach((parc)=>{
              var valor = parc.dtRepasse.slice(0, 10)
              var ano = valor.slice(0,4)
              var mes = valor.slice(5,7)
              var dia = valor.slice(8,10)
              test.valorTotal += Number(parc.valor)
              test.parcelas[test.parcelas.length] = { data: `${dia}/${mes}/${ano}`, valor: parc.valor }
            })
            const parcelas = response.data.periodos.map(element => { return { dtRepasse: element.dtRepasse, valorReservado: element.valor, dataRepasse: element.dtRepasse, valorRepasse: element.valor, valorFinanciado: element.valor }})
            const tabelas = await safra.getTabelaJuros()
            const response2 = await safra.calcularProposta(tabelas.data.find(element => { element.id === 223463}), parcelas, cpf, produto )
            if (response2 && response2.data) {
              if (response2.data.simulacoes && response2.data.simulacoes[0] && response2.data.simulacoes[0].valorPrincipal) {
                test.valor = response2.data.simulacoes[0].valorPrincipal
                return test
              } else {
                console.log(response2.data)
                return { status: false, error: `[Safra Consultas (6)] => Não foi possivel pegar o saldo do cliente! Tente novamente, se o erro persistir reporte ao Yuri...` }
              }
            } else return { status: false, error: `[Safra Consultas (5)] => Não foi possivel pegar o saldo do cliente! Tente novamente, se o erro persistir reporte ao Yuri...` }
          } else {
            if (response.data.erros && response.data.erros[0] && response.data.erros[0].descricao) return { status: false, error: `[Safra Consultas (4)] => ${response.data.erros[0].descricao}` }
            console.log(response.data)
            return { status: false, error: `[Safra Consultas (4)] => Não foi possivel pegar as parcelas do cliente! Tente novamente, se o erro persistir reporte ao Yuri...` }
          }
        } else return { status: false, error: `[Safra Consultas (3)] => Não foi possivel pegar o saldo do cliente! Tente novamente, se o erro persistir reporte ao Yuri...` }
      } else return { status: false, error: `[Safra Consultas (2)] => CPF do cliente é invalido...` }
    } else return { status: false, error: `[Safra Consultas (1)] => API não iniciada! Tente novamente...` }
  } catch(err) {
    console.log(`[Safra Consultas (0)] => ${err}`)
    console.log(err)
    return { status: false, error: `[Safra Consultas (0)] => Ocorreu algum erro indefinido! Tente novamente, se o erro persistir reporte ao Yuri...` }
  }
}

module.exports = {
  consultarSafra
}