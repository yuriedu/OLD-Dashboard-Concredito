const Mercantil = require('../../APIs/Mercantil');

const { messages } = require('joi-translation-pt-br');
const { tradutor } = require('../../Utils/Utils');
const { mbIn, bancoTranslate } = require('../../Utils/Mercantil');

var clientes = []

const CadastrarPan = async (cliente, pool) => {
  try{
    if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) return { status: false, data: `[Mercantil FGTS (0)] => Cliente já está sendo cadastrado...` }
    clientes[clientes.length] = { id: cliente.Cpf }
    setTimeout(()=>{
      if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
    }, 600000)
    const client = await mbIn.validateAsync(cliente,{ messages });
    if (cliente.Agencia == 3880) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (E1)] => Mercantil não aceita Caixa TEM! Por favor verificar...`)
    const correspondente = {
      usuarioDigitador:process.env.MERCANTIL_USUARIO,
      cpfAgenteCertificado:parseInt(process.env.MERCANTIL_CPF.replace(/\D+/g, '')),
      ufAtuacao:process.env.MERCANTIL_UF
      // "usuarioDigitador": "X047895",
      // "cpfAgenteCertificado": 92729185704,
      // "ufAtuacao": "MG"
    }
    const loadAPI = await Mercantil.loadAPI()
    if (loadAPI) {
      const response = await Mercantil.getSaldo(client.Cpf);
      if (response && response.data) {
        if (response.data.parcelas) {
          const simula = {
            cpf: parseInt(client.Cpf.replace(/\D+/g, '')),
            parcelas: [],
            correspondente
          }
          await response.data.parcelas.forEach((element,index)=>{
            if (element.valor < 9) return;
            return simula.parcelas[simula.parcelas.length] = { dataVencimento: element.dataRepasse, valor: element.valor }
          })
          const response2 = await Mercantil.calculateNetValue(simula);
          if (response2 && response2.data) {
            if (response2.data.id && response2.data.valorEmprestimo && response2.data.calculoParcelas && response2.data.calculoParcelas[0] && response2.data.calculoParcelas[0].valorParcela) {
              const clientData = {
                contatos: {
                  dddCelular: parseInt(client.TelefoneConvenio.split(' ')[0].replace(/\D+/g, '').slice(0,2)),
                  dddTeletoneResidencial: parseInt(client.TelefoneConvenio.split(' ')[0].replace(/\D+/g, '').slice(0,2)),
                  email: client.Email,
                  numeroCelular: parseInt(client.TelefoneConvenio.split(' ')[0].replace(/\D+/g, '').slice(2)),
                  numeroTeletoneResidencial: parseInt(client.TelefoneConvenio.split(' ')[0].replace(/\D+/g, '').slice(2)),
                },
                cpf: parseInt(client.Cpf.replace(/\D+/g, '')),
                documentoIdentificacao: {
                  dataEmissao: "2010-01-01T01:49:46.458Z",
                  numero: client.rg,
                  numeroSerie: "",
                  orgaoEmissor: "SSP",
                  tipoDocumento: "RG",
                  ufOrgaoEmissor: client.UF
                },
                enderecoResidencial: {
                  cep: parseInt(client.Cep.replace(/\D+/g, '')),
                  complemento: client.Complemento,
                  numero: client.EndNumero.replace(/\D+/g, '')
                },
                valorRenda: 5000
              };
              const liberacao = {
                tipoContaBancaria: cliente.Poupanca ? 2 : 1, // 1 Corrente - 2 Poupança
                banco: parseInt(bancoTranslate(client.CodBancoCliente)),
                numeroConta: client.ContaCorrente.replace(/\D+/g, '').slice(0,-1),
                agencia: parseInt(client.Agencia),
                contaDigito: parseInt(client.ContaCorrente.replace(/\D+/g, '').slice(-1)),
              };
              const dados = {
                cliente: clientData,
                liberacao,
                correspondente,
                parcelas: simula.parcelas,
                simulacaoId: response2.data.id
              }
              const response3 = await Mercantil.requestProposal(dados);
              if (response3 && response3.data) {
                if (response3.data.id) {
                  //console.log(response3.data.id)
                  const proposta = await Mercantil.getProposta(response3.data.id);
                  if (proposta && proposta.data) {
                    //console.log(proposta)
                    if (proposta.data.id && proposta.data.numeroOperacao) {
                      const link = await Mercantil.getLink(proposta.data.id);
                      if (link && link.data) {
                        if (link.data.linkEncurtado) {
                          await pool.request()
                            .input('id', client.IdContrato)
                            .input('vlrContratoAtual', response2.data.valorEmprestimo)
                            .input('vlrParcelaAtual', cliente.ValorParcela)
                            .input('texto', 'Valores do Contrato atualizados')
                            .execute('pr_atualiza_valor_contrato_robo')
                          await pool.request()
                            .input('id', client.IdContrato)
                            .input('faseDestino', 823)
                            .input('CodContrato', proposta.data.numeroOperacao)
                            .input('texto', link.data.linkEncurtado)
                            .execute('pr_atualiza_contrato_robo');
                          if (clientes.findIndex(r => r.id == cliente.Cpf) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.Cpf), 1)
                          return { status: true, data: `[Mercantil FGTS] => ${link.data.linkEncurtado}` }
                        } else {
                          if (link.data.errors && link.data.errors[0] && link.data.errors[0].message) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (R3)] => ${link.data.errors[0].message}`)
                          console.log(link.data)
                          return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (13)] => aconteu algum erro no getLink! Verifique se o cadastro foi concluido e pegue o link Manualmente...`)
                        }
                      } return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (12)] => Erro ao pegar o link da proposta! Verifique se o cadastro foi concluido e pegue o link Manualmente...`)
                    } else {
                      if (proposta.data.errors && proposta.data.errors[0] && proposta.data.errors[0].message) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (R3)] => ${proposta.data.errors[0].message}`)
                      console.log(proposta.data)
                      return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (11)] => aconteu algum erro no getProposta! Tente novamente, se o erro continuar reporte ao Yuri...`)
                    }
                  } return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (10)] => Erro ao pegar a proposta do cliente! Tente novamente, se o erro continuar reporte ao Yuri...`)
                } else {
                  if (response3.data.errors && response3.data.errors[0] && response3.data.errors[0].message) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (R3)] => ${response3.data.errors[0].message}`)
                  console.log(response3.data)
                  return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (9)] => aconteu algum erro no requestProposal! Tente novamente, se o erro continuar reporte ao Yuri...`)
                }
              } return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (8)] => Erro ao enviar a proposta do cliente! Tente novamente, se o erro continuar reporte ao Yuri...`)
            } else {
              if (response2.data.calculoParcelas && response2.data.calculoParcelas[0] && response2.data.calculoParcelas[0].valorParcela <= 0) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (14)] => Cliente não possui saldo na primeira parcela! Verifique manualmente e tente novamente...`)
              if (response2.data.errors && response2.data.errors[0] && response2.data.errors[0].message) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (R2)] => ${response2.data.errors[0].message}`)
              console.log(response2.data)
              return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (7)] => Não foi possivel pegar os valores do cliente! Tente novamente, se o erro continuar reporte ao Yuri...`)
            }
          } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (6)] => Erro ao calcular o netValue do cliente! Tente novamente, se o erro continuar reporte ao Yuri...`)
        } else {
          if (response.data.errors && response.data.errors[0] && response.data.errors[0].message) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (R1)] => ${response.data.errors[0].message}`)
          console.log(response.data)
          return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (5)] => ${response.data}! Reporte ao Yuri...`)
        }
      } return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (4)] => Erro ao pegar o saldo do cliente! Tente novamente, se o erro continuar reporte ao Yuri...`)
    } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (3)] => Erro ao iniciar a API do Mercantil! Tente novamente, se o erro continuar reporte ao Yuri...`)
  }catch(err){
    if (err.details) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (2)] => ${err.details.map(det => { return `"${tradutor[det.context.label]}" está errado, Verifique e tente novamente!`}).join(' ,')}`)
    console.log(`[Mercantil FGTS ERROR] => Erro no codigo: ${err}`)
    console.log(err)
    return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Mercantil FGTS (1)] => Há um erro indefinido! Tente novamente, se o erro continuar reporte ao Yuri!`)
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