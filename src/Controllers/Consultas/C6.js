const c6 = require('../../APIs/C6');

const consultarC6 = async (cpf, type, valor) => {
  try {
    const loadAPI = await c6.loadAPI()
    if (loadAPI) {
      if(cpf && cpf != null && cpf.length == 11) {
        const originObject = { table_code: process.env.TABLE_CODE, promoter_code: process.env.PROMOTER_CODE };
        var c6Data = {
          tax_identifier: cpf,
          birth_date: '1967-08-10',
          federation_unit: "RS",
          simulation_type: type,
          formalization_subtype:"DIGITAL_WEB"
        }
        if (type == "POR_VALOR_SOLICITADO") c6Data.requested_amount = Number(valor)
        if (type == "POR_QUANTIDADE_DE_PARCELAS") c6Data.installment_quantity = Number(valor)
        const data = Object.assign(c6Data, originObject);
        const response = await c6.simularProposta(data);
        if (response && response.data) {
          if (response.data.net_amount && response.data.gross_amount) {
            var test = {
              status: true,
              consulta: true,
              parcelas: [],
              valor: response.data.net_amount,
              valorTotal: response.data.gross_amount
            }
            await response.data.installments.forEach((parc)=>{
              var valor = parc.due_date
              var ano = valor.slice(0,4)
              var mes = valor.slice(5,7)
              var dia = valor.slice(8,10)
              test.parcelas[test.parcelas.length] = { data: `${dia}/${mes}/${ano}`, valor: parc.amount }
            })
            return test
          } else {
            if (String(response) && !response.data) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[C6 Consultas (3)] => ${response}`)
          }
        } else {
          if (response) return { status: false, error: `[C6 Consultas (2)] => ${response}` }
          return { status: false, error: `[C6 Consultas (2)] => Ocorreu algum erro ao simular a proposta! Tente novamente mais tarde, se o erro persistir reporte ao Yuri...` }
        }
      } else return { status: false, error: `[C6 Consultas (1)] => CPF invalido! Verifique e tente novamente...` }
    } else return { status: false, error: `[C6 Consultas (0)] => Ocorreu algum erro na API do C6! Tente novamente mais tarde, se o erro persistir reporte ao Yuri...` }
  } catch(err) {
    console.log(`[C6 Consultas (0)] => ${err}`)
    console.log(err)
    return { status: false, error: `[C6 Consultas (0)] => Ocorreu algum erro indefinido! Tente novamente, se o erro persistir reporte ao Yuri...` }
  }
}

module.exports = {
    consultarC6
};