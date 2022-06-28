const facta = require('../../APIs/Facta');

const consultarFacta = async (cpf) => {
  try {
    const loadAPI = await facta.loadAPI()
    if (loadAPI) {
      if(cpf && cpf != null && cpf.length == 11) {
        const response = await facta.getBalancesForCPF(cpf);
        if (response && response.data && response.data.retorno) {
          const balances = FactatransformBalances(response.data);
          if (balances) {
            return { status: true, valor: 'Simule para ver o valor liberado!', parcelas: balances.repasses }
          } else return { status: false, error: `[Facta Consultas (4)] => Ocorreu algum erro nos BalancesForCPF! Verifique e tente novamente, se o erro persistir reporte ao Yuri...` }
        } else {
          if (response.data.msg) return { status: false, error: `[Facta Consultas (3)] => ${response.data.msg}` }
          return { status: false, error: `[Facta Consultas (3)] => Ocorreu algum erro nos BalancesForCPF! Verifique e tente novamente, se o erro persistir reporte ao Yuri!` }
        }
      } else return { status: false, error: `[Facta Consultas (2)] => CPF do cliente é invalido...` }
    } else return { status: false, error: `[Facta Consultas (1)] => API não iniciada! Tente novamente...` }
  } catch(err) {
    console.log(`[Facta Consultas (0)] => ${err}`)
    console.log(err)
    return { status: false, error: `[Facta Consultas (0)] => Ocorreu algum erro indefinido! Tente novamente, se o erro persistir reporte ao Yuri...` }
  }
}

const simularFacta = async (cpf, table) => {
  try {
    const loadAPI = await facta.loadAPI()
    if (loadAPI) {
      if(cpf && cpf != null && cpf.length == 11) {
        const response = await facta.getBalancesForCPF(cpf);
        if (response && response.data && response.data.retorno) {
          const balances = FactatransformBalances(response.data);
          if (balances) {
            let tipo_tabela;
            let tabela;
            if(table == "GOLD") {
              tabela = 2.04;
              tipo_tabela = 38776;
            } else if (table == "NORMAL") {
              tabela = 2.04;
              tipo_tabela = 38768;
            } else return { status: false, error: `[Facta Consultas (5)] => A tabela não é valida! Só aceito tabelo GOLD ou NORMAL! Caso seja uma das duas reporte ao Yuri...` }
            const selectedIndexes = [...Array(balances.repasses.length).keys()]
            const parcelas = await balances.repasses.map((entry, index) => {
              const newEntry = { ...entry };
              if (!selectedIndexes.includes(index)) newEntry.valor = 0;
              return newEntry;
            });
            const response2 = await facta.calculateNetValue(cpf, parcelas, tipo_tabela, tabela);
            if (response2 && response2.data) {
              if (response2.data.permitido == "NAO" && response2.data.msg) return { status: false, error: `[Facta Consultas (6)] => ${response2.data.msg}...` }
              if (response2.data.permitido == "NAO") return { status: false, error: `[Facta Consultas (7)] => Não foi permitido simular com esse CPF...` }
                return { status: true, valor: response2.data.valor_liquido.replace(".","").replace(",","."), valorTotal:response.data.retorno.saldo_total,  parcelas: balances.repasses }
            }  else return { status: false, error: `[Facta Consultas (4)] => Ocorreu algum erro na simulação! Verifique o CPF e tente novamente, se o erro persistir reporte ao Yuri...` }
          } else return { status: false, error: `[Facta Consultas (4)] => Ocorreu algum erro nos BalancesForCPF! Verifique e tente novamente, se o erro persistir reporte ao Yuri...` }
        } else {
          if (response.data.msg) return { status: false, error: `[Facta Consultas (3)] => ${response.data.msg}` }
          return { status: false, error: `[Facta Consultas (3)] => Ocorreu algum erro nos BalancesForCPF! Verifique o cpf e tente novamente, se o erro persistir reporte ao Yuri...` }
        }
      } else return { status: false, error: `[Facta Consultas (2)] => CPF do cliente é invalido...` }
    } else return { status: false, error: `[Facta Consultas (1)] => API não iniciada! Tente novamente...` }
  } catch(err) {
    console.log(`[Facta Consultas (0)] => ${err}`)
    console.log(err)
    return { status: false, error: `[Facta Consultas (0)] => Ocorreu algum erro indefinido! Tente novamente, se o erro persistir reporte ao Yuri...` }
  }
}

module.exports = {
  consultarFacta,
  simularFacta
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