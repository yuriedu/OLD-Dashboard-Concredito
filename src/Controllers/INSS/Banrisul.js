const Banrisul = require('../../APIs/Banrisul');

const { messages } = require('joi-translation-pt-br');
const { tradutor } = require('../../Utils/Utils');
const { panINSS, removeProperties, isAprosentadoria, bancoTranslate } = require('../../Utils/Pan');

var clientes = []

const CadastrarPan = async (cliente, pool) => {
  try{
    if (clientes.findIndex(r => r.id == cliente.IdContrato) >= 0) return { status: false, data: `[Pan INSS (0)] => Cliente já está sendo cadastrado...` }
    clientes[clientes.length] = { id: cliente.IdContrato }
    setTimeout(()=>{
      if (clientes.findIndex(r => r.id == cliente.IdContrato) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.IdContrato), 1)
    }, 600000)
    if(!cliente.Tabela.includes("PORTABILIDADE COM REFIN")) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Banrisul INSS (10)] => Não consigo cadastrar propostas nessa tabela...`)
    const loadAPI = await Banrisul.loadAPI()
    if (loadAPI) {
      var codBank = `${String(cliente.CodBancoCliente).length == 1 ? `000${cliente.CodBancoCliente}` :  String(cliente.CodBancoCliente).length == 2 ? `00${cliente.CodBancoCliente}` : String(cliente.CodBancoCliente).length == 3 ? `0${cliente.CodBancoCliente}` : cliente.CodBancoCliente }`
      var codBankPort = `${String(cliente.PortabilidadeBanco).length == 1 ? `000${cliente.PortabilidadeBanco}` :  String(cliente.PortabilidadeBanco).length == 2 ? `00${cliente.PortabilidadeBanco}` : String(cliente.PortabilidadeBanco).length == 3 ? `0${cliente.PortabilidadeBanco}` : cliente.PortabilidadeBanco }`
      var simulacao = {
        "ifOriginadora": await Banrisul.ListarBancos(codBankPort), //CNPJ Banco
        "conveniada": "000020", //Codigo INSS (FUNÇÃO)
        "prazoRestante": cliente.PortabilidadeParcelas, //PRAZO PORTABILIDADE
        "prazoTotal": cliente.Prazo,
        "saldoDevedor": cliente.Valor, //SALDO
        "valorPrestacaoPortabilidade": cliente.PortabilidadePrestacao,
        "valorPrestacaoDesejada": cliente.ValorParcela,
        "dataNascimento": cliente.Datanascimento,
        "retornarSomenteOperacoesViaveis": true,
        "simulacaoEspecial": true,
        "planoRefin": "KEQ6",
        "prazoRefin": cliente.Prazo,
        "valorPrestacaoRefin": cliente.ValorParcela
      }
      const response = await Banrisul.SimularPropostaPortabilidade(simulacao);
      if (response && response.data) {
        if (response.data.retorno && response.data.retorno.viabilidadeEspecial && response.data.retorno.viabilidadeEspecial.portavel) {
          var proposta = {
            "cpfAgente": "68264186068", // CPF CH
            "cpf": cliente.Cpf,
            "endereco": {
              "cepResidencial": cliente.Cep,
              "enderecoResidencial": cliente.Endereco,
              "complementoEndereco": "",
              "numeroResidencial": cliente.EndNumero,
              "bairroResidencial": cliente.Bairro,
              "cidadeResidencial": cliente.Cidade,
              "ufResidencial": cliente.UF,
              "codigoLogradouro": 081 //Codigo de RUA
            },
            "telefones": {
              "ddD1": parseInt(cliente.TelefoneConvenio.split(' ')[0].replace(/\D+/g, '').slice(0,2)),
              "telefone1": parseInt(cliente.TelefoneConvenio.split(' ')[0].replace(/\D+/g, '').slice(2)),
              "ddD2": "",
              "telefone2": ""
            },
            "dadosBasicos": {
              "nome": cliente.NomeCliente,
              "nacionalidade": "BR",
              "dataNascimento": cliente.Datanascimento,
              "ufNascimento": cliente.UF,
              "cidadeNascimento": cliente.Cidade,
              "sexo": "F",
              "nomeMae": cliente.NomeMae,
              "nomePai": cliente.NomePai,
              "email": cliente.Email,
              "codigoGrauInstrucao": 4,
              "deficienteVisual": false,
              "codigoEstadoCivil": "S",
              "codigoRegimeCasamento": null,
              "nomeConjuge": "",
              "cpfConjuge": "",
              "dataNascimentoConjuge": "",
              "sexoConjuge": "",
              "codigoTipoDocumentoIdentidade": "1",
              "numeroDocumentoIdentidade": cliente.rg,
              "codigoOrgaoEmissor": "01", // 01 SSP
              "dataEmissaoDocumentoIdentidade": "2010-06-11T00:00:00.626Z",
              "ufEmissaoDocumentoIdentidade": cliente.UF,
              "naturalidadeEstrangeiro": ""
            },
            "rendimento": {
              "matricula": cliente.Maatricula,
              "ufRendimento": cliente.UF,
              "banco": codBank,
              "agencia": cliente.Agencia,
              "conta": cliente.ContaCorrente,
              "tipoConta": "N",
              "valorRendimento": 2000,
              "dataAdmissao": "2001-01-01T00:00:00.626Z",
              "conveniada": "000020", //000020 = INSS (Função)
              "orgao": "00001", // 00001 = INSS
              "especieINSS": cliente.Especie,
              "funcaoSIAPE": 0,
              "matriculaInstituidorSIAPE": "",
              "nomeInstituidorSIAPE": "",
              "possuiProcuradorSIAPE": false
            },
            "operacao": {
              "ifOriginadora": await Banrisul.ListarBancos(codBankPort), //CNPJ do Banco PORTABILIDADE (Função)
              "contratoPortado": cliente.PortabilidadeContrato.replace("-",""), //Numero Contrato PORTABILIDADE
              "conveniada": "000020", //000020 = INSS (Função)
              "orgao": "00001", // 00001 = INSS
              "prazoRestante": cliente.PortabilidadeParcelas,
              "prazoTotal": '84',
              "valorPrestacaoPortabilidade": response.data.retorno.viabilidadeEspecial.prestacao ? response.data.retorno.viabilidadeEspecial.prestacao : cliente.PortabilidadePrestacao,
              "saldoDevedor": response.data.retorno.viabilidadeEspecial.saldoDevedorCorrigido ? response.data.retorno.viabilidadeEspecial.saldoDevedorCorrigido : cliente.Valor,
              "planoRefin": "KEQ6", //TABELA PORTABILIDADE
              "prazoRefin": '84',
              "valorPrestacaoRefin": response.data.retorno.viabilidadeEspecial.prestacao ? response.data.retorno.viabilidadeEspecial.prestacao : cliente.PortabilidadePrestacao,
              "valorPrestacaoDesejada": response.data.retorno.viabilidadeEspecial.prestacao ? response.data.retorno.viabilidadeEspecial.prestacao : cliente.PortabilidadePrestacao,
              "simulacaoEspecial": true,
              "aceitePortabilidadeEspecial": true,
              "possuiAssinaturaEletronica": true,
              "operacaoAgrupadaMargemNegativa": true
            },
            "recebimento": {
              "matricula": cliente.Maatricula,
              "utilizarDadosRendimento": true,
              "banco": codBank,
              "agencia": cliente.Agencia,
              "conta": cliente.ContaCorrente,
              "tipoConta": "N",
              "formaLiberacao": 5, //ListarFormasLiberacao(cliente.Cpf, '000020', 'KEQ6', '4')
              "codigoCorreioAgencia": Number(cliente.Agencia)
            }
          }
          const response2 = await Banrisul.GravarPropostaPortabilidade(proposta);
          if (response2 && response2.data) {
            if (response2.data.retorno && response2.data.retorno.proposta) {
              // await pool.request()
              //   .input('id', cliente.IdContrato)
              //   .input('vlrContratoAtual', tabela.valor_cliente)
              //   .input('vlrParcelaAtual', tabela.valor_parcela)
              //   .input('texto', 'Valores do Contrato atualizados')
              //   .execute('pr_atualiza_valor_contrato_robo')
              await pool.request()
                .input('id', cliente.IdContrato)
                .input('faseDestino', 823) //9232
                .input('CodContrato', response2.data.retorno.proposta)
                .input('texto', `Proposta cadastrada, o cliente recebeu um SMS para efetuar a assinatura. Se preferir, o cliente pode chamar o banco no WhatsApp e obter o link de formalização. Link abaixo: \n https://wa.me/555140639848?text=Oi \n\n OBS: O cliente precisa entrar em contato pelo WhatsApp com o mesmo número que esta no cadastro`)
                .execute('pr_atualiza_contrato_robo');
                if (clientes.findIndex(r => r.id == cliente.IdContrato) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.IdContrato), 1)
                return { status: true, data: `[Banrisul INSS] => Cadastrado com Sucesso!` }
            } else {
              if (response2.data.erro) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Banrisul INSS (8)] => ${response2.data.erro}`)  
              console.log(response2.data)
              return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Banrisul INSS (9)] => Ocorreu um erro indefinido! Reporte ao Yuri...`)  
            }
          } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Banrisul INSS (7)] => Erro ao gravar a proposta! Tente novamente, se o erro continuar reporte ao Yuri...`)
        } else {
          if (response.data.erro) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Banrisul INSS (5)] => ${response.data.erro}`)
          if (response.data.retorno && response.data.retorno.viabilidadeEspecial && !response.data.retorno.viabilidadeEspecial.portavel && response.data.retorno.viabilidadeEspecial.mensagem) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Banrisul INSS (6)] => ${response.data.retorno.viabilidadeEspecial.mensagem}`)
          console.log(response.data)
          return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Banrisul INSS (6)] => Ocorreu um erro indefinido! Reporte ao Yuri...`)
        }
      } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Banrisul INSS (4)] => Erro ao simular a proposta! Tente novamente, se o erro continuar reporte ao Yuri...`)
    } else return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Banrisul INSS (3)] => Erro ao iniciar a API do Banrisul! Tente novamente, se o erro continuar reporte ao Yuri...`)
  }catch(err){
    if (err.details) return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Banrisul INSS (2)] => ${err.details.map(det => { return `"${tradutor[det.context.label]}" está errado, Verifique e tente novamente!`}).join(' ,')}`)
    console.log(`[Banrisul INSS ERROR] => Erro no codigo: ${err}`)
    console.log(err)
    return execSQL(pool, cliente, cliente.IdContrato, 824, '', `[Banrisul INSS (1)] => Há um erro indefinido! Tente novamente, se o erro continuar reporte ao Yuri!`)
  }
}

async function execSQL(pool, cliente, contratoID, fase, contrato, text) {
  await pool.request()
    .input('id', contratoID)
    .input('faseDestino', fase)
    .input('CodContrato', contrato)
    .input('texto', text)
    .execute('pr_atualiza_contrato_robo');
  if (clientes.findIndex(r => r.id == cliente.IdContrato) >= 0) clientes.splice(clientes.findIndex(r => r.id == cliente.IdContrato), 1)
  return { status: false, data: text };
}

module.exports = CadastrarPan