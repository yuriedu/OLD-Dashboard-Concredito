const pan = require('../../APIs/Pan');

const consultarPan = async (cpf, type, valor) => {
  try {
    const loadAPI = await pan.loadAPI()
    if (loadAPI) {
      if(cpf && cpf != null && cpf.length == 11) {
        var data = {
          cpf_cliente: cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"),
          codigo_promotora: process.env.PAN_PROMOTER_CODE,
        };
        if (type == 'POR_VALOR_SOLICITADO') data.valor_solicitado = valor
        const response = await pan.calculateNetValue(data);
        if (response && response.data) {
          if (response.data[0] && response.data[0].condicoes_credito) {
            const tabela = response.data[0].condicoes_credito.find(element => element.codigo_tabela_financiamento == '900001')
            if (tabela && tabela.parcelas && tabela.valor_cliente) {
              var test = {
                status: true,
                consulta: true,
                parcelas: [],
                valor: tabela.valor_cliente,
                valorTotal: tabela.valor_bruto,
              }
              await tabela.parcelas.forEach((parc)=>{
                test.parcelas[test.parcelas.length] = { data: parc.data_vencimento, valor: parc.valor_parcela }
              })
              return test
            } else return { status: false, error: `[Pan Consultas (4)] => Não foi possivel fazer a consulta de saldo com esse cpf e valor!` }
          } else {
            console.log(response.data)
            return { status: false, error: `[Pan Consultas (3)] => Ocorreu algum erro ao simular o CPF! tente novamente, se o erro persistir reporte ao Yuri...` }
          }
        } else {
          if (response && !response.data) return { status: false, error: `[Pan Consultas (2)] => ${response}` }
          return { status: false, error: `[Pan Consultas (2)] => Ocorreu algum erro ao consultar o saldo do cliente...` }
        }
      } else return { status: false, error: `[Pan Consultas (1)] => CPF invalido! Verifique e tente novamente...` }
    } else return { status: false, error: `[Pan Consultas (0)] => Ocorreu algum erro na API do C6! Tente novamente mais tarde, se o erro persistir reporte ao Yuri...` }
  } catch(err) {
    console.log(`[Pan Consultas (0)] => ${err}`)
    console.log(err)
    return { status: false, error: `[Pan Consultas (0)] => Ocorreu algum erro indefinido! Tente novamente, se o erro persistir reporte ao Yuri...` }
  }
}

module.exports = {
  consultarPan
};