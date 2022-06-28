const c6 = require('../../APIs/C6');

const { messages } = require('joi-translation-pt-br');
const { tradutor } = require('../../Utils/Utils');
const { c6In, bancoTranslate, bantToString, validateBanck } = require('../../Utils/C6');
const res = require('express/lib/response');
const { ConstraintViolationError } = require('objection');

var clientes = []

const CadastraC6 = async (cliente, pool) => {
  if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) return { status: false, data: `[C6 FGTS (0)] => Cliente já está sendo cadastrado...` }
  clientes[clientes.length] = { id: cliente.Cpf }
  setTimeout(()=>{
    if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
  }, 600000)
  try {
    const loadAPI = await c6.loadAPI()
    if (loadAPI) {
      if(!validateBanck(bancoTranslate(cliente.CodBancoCliente), cliente.Agencia)) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[C6 FGTS (2)] => C6 não efetua pagamentos para esse Banco ou Agência`)
      const client = await c6In.validateAsync(cliente,{ messages });
      const originObject = { table_code: process.env.TABLE_CODE, promoter_code: process.env.PROMOTER_CODE };
      var simulation_type = 'POR_VALOR_SOLICITADO';
      if (client.Prazo == 10) simulation_type = 'POR_VALOR_TOTAL';
      const c6Data = {
        tax_identifier: client.Cpf,
        birth_date: client.Datanascimento.split('T')[0],
        simulation_type: simulation_type,
        federation_unit: client.UF,
        requested_amount: client.Valor,
        formalization_subtype:"DIGITAL_WEB"
      }
      const data = Object.assign(c6Data, originObject);
      const response = await c6.simularProposta(data);
      if (response) {
        if (response.data && response.data.net_amount) {
          if (parseFloat(response.data.net_amount) - client.Valor > client.Valor*0.05) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[C6 FGTS (6)] => Valor simulado é mais de 5% menor que o proposto ao cliente, por favor verificar. Valor retornado na simulação: ${response.data.net_amount}`)
          const client2 = {
            tax_identifier: client.Cpf,
            name: client.NomeCliente,
            nationality_code: "01",
            document_type: 'RG',
            document_number: client.rg,
            document_federation_unit: client.UF,
            document_issuance_date: '2010-01-01',
            marital_status: 'Solteiro',
            spouse_name: 'Minha Spouse',
            birth_date: client.Datanascimento.split('T')[0],
            gender: client.sexo === "M" ? 'Masculino' : 'Feminino',
            income_amount: 5000,
            mother_name: client.NomeMae,
            pep: "Nao",
            email: cliente.Email,
            mobile_phone_area_code: client.TelefoneConvenio.split(' ')[0].replace(/\D+/g, '').slice(0,2),
            mobile_phone_number: client.TelefoneConvenio.split(' ')[0].replace(/\D+/g, '').slice(2),
            address: {
              street: client.Endereco,
              number: client.EndNumero,
              neighborhood: client.Bairro,
              city: client.Cidade,
              federation_unit: client.UF,
              zip_code: client.Cep
            },
            bank_data: {
              bank_code: bantToString(bancoTranslate(client.CodBancoCliente)),
              agency_number: client.Agencia,
              account_type: client.Poupanca ? 'ContaPoupancaIndividual' : 'ContaCorrenteIndividual',
              account_number: client.ContaCorrente.replace(/\D+/g, '').slice(0,-1),
              account_digit: client.ContaCorrente.replace(/\D+/g, '').slice(-1)
            }
          }
          const originObject2 = {
            origin: {
              promoter_code: process.env.PROMOTER_CODE,
              typist_code: process.env.TYPIST_CODE,
              tax_identifier_of_certified_agent: process.env.CERT_PRO,
            },
            table_code: process.env.TABLE_CODE,
            formalization_subtype: "DIGITAL_WEB",
            requested_amount:  response.data.net_amount,
            client: client2
          }
          const data2 = originObject2;
          const response2 = await c6.registerProposta(data2);
          if (response2) {
            if (response2.data && response2.data.proposal_number) {
              const response3 = await c6.getLinkFormalization(response2.data.proposal_number);
              if (response3 && response3.data && response3.data.url) {
                await pool.request()
                  .input('id', cliente.IdContrato)
                  .input('vlrContratoAtual', String(response.data.net_amount).replace(".",","))
                  .input('vlrParcelaAtual', String(response.data.net_amount).replace(".",","))
                  .input('texto', 'Valores do Contrato atualizados')
                  //.execute('pr_atualiza_valor_contrato_robo')
                await pool.request()
                  .input('id', cliente.IdContrato)
                  .input('faseDestino', 9232)
                  .input('CodContrato', response2.data.proposal_number)
                  .input('texto', response3.data.url)
                  .execute('pr_atualiza_contrato_robo');
                if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
                return { status: true, data: `[C6 FGTS] => ${response3.data.url}` }
              } else {
                 console.log(response3)
                return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[C6 FGTS (???)] => Ocorreu algum erro ao pegar o Link! Pegue manualmente para completar o registro!`)
              }
            } else {
              if (response2.response && response2.response.data && response2.response.data.details && response2.response.data.details[0]) {
                if (response2.response.data.details[0].includes('Não foi possivel realizar comunicação com a CEF')) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[C6 FGTS (6)] => Erro na API da Caixa Economica Federal, Tente novamente...`)
                if (response2.response.data.details[0].includes('Limite da conta excedido')) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[C6 FGTS (7)] => Erro na API do C6, verifique no Banco C6 MANUALMENTE se o cadastro foi efetuado, caso não for tente novamente!`)
                return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[C6 FGTS (8)] => ${response2.response.data.details[0]}!`)
              }
              if (response2.response && response2.response.data && response2.response.data.message) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[C6 FGTS (12)] => ${response2.response.data.message}`)
              return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[C6 FGTS (11)] => ${response2}`)
            }
          } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[C6 FGTS (10)] => Ocorreu algum erro ao Registrar a Proposta! Tente novamente, caso o erro se repita faça MANUALMENTE...`)
        } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[C6 FGTS (5)] => ${response}`)
      } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[C6 FGTS (4)] => Ocorreu algum erro em Simular a Proposta! Tente novamente, caso o erro se repita faça MANUALMENTE...`)
    } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[C6 FGTS (3)] => Ocorreu algum erro na API! Tente novamente, caso o erro se repita faça MANUALMENTE...`)
  } catch(err) {
    if (err.details && err.details[0].message) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[C6 FGTS (9)] => ${err.details[0].message}`)
    console.log(err)
    return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[C6 FGTS (1)] => Ocorreu algum erro indefinido! REPORTE AO YURI URGENTE!!!`)
  }
}

module.exports = CadastraC6

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