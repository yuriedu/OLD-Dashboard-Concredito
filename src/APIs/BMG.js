const axios = require('axios');
const { func } = require('joi');

var infos = false

async function loadAPI() {
  infos = {
    login: process.env.BMG_WS_USERNAME,
    password: process.env.BMG_WS_PASSWORD,
    apiUrl: process.env.BMG_API,
    apiToken: process.env.BMG_API_KEY,
    codigoEntidade: '4262',
    codigoServico: '135',
    codigoProduto: 9665,
    loja: '53541',
  }
  var token = await getAuthToken()
  if (token) return true;
  return false
}

async function getAuthToken(test) {
  if (!infos) return `API não iniciada! Tente novamente...`
  if(!test) console.log(`[API BMG] => Starting API...`)
  try {
    infos.api = axios.create({ baseURL: infos.apiUrl, headers: { 'app-token': `${infos.apiToken}` } });
    const params = new URLSearchParams();
    params.append('client_id', process.env.BMG_CLIENT_ID);
    params.append('client_secret', process.env.BMG_CLIENT_SECRET);
    params.append('grant_type', 'client_credentials');
    const response = await axios.post(`${process.env.BMG_API_PROD}/v1/autenticacao/`, params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    infos.api2 = axios.create({ baseURL: process.env.BMG_API_PROD, headers: { Authorization: `Bearer ${response.data.access_token}` } });
    console.log(`[API BMG] => API Loaded!`)
    return true;
  } catch(err) {
    if (err.response && err.response.status == 403) return await getAuthToken(true)
    if (err.code && (err.code == 'ETIMEDOUT')) {
      return await getAuthToken(true)
    }
    console.log(`[API BMG ERROR (1)] => Erro na API do BMG: ${err}`)
    console.log(err.response ? err.response.data : 'Erro BMG')
    return false;
  }
}

async function obterProduto() {
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`;
  console.log(`[API BMG] => obterProduto...`)
  try {
    const response = await infos.api.post('/v1/obterproduto', {
      login: infos.login,
      senha: infos.password,
      codigoEntidade: infos.codigoEntidade,
      codigoServico: infos.codigoServico,
      sequencialOrgao: '',
      tipoFormaEnvio: ''
    });
    console.log(response.data.obterProdutoResponse)
    return response;
  } catch(e) {
    if (e.response && e.response.data && e.response.data.obterProdutoResponse) return console.log(e.response.data.obterProdutoResponse)
    console.log(`[API BMG ERROR(2)] => ${e}`)
    console.log(e)
  }
}

async function simularSaqueAniversario(cliente) {
  if (!infos || !infos.api || !infos.api2) return `API não iniciada! Tente novamente...`;
  console.log(`[API BMG] => simularSaqueAniversario...`)
  try {
    var test = {
      "login":infos.login,
      "senha":infos.password,
      "cpfCliente":cliente.Cpf,
      "dataNascimento":cliente.Datanascimento,
      "entidade":infos.codigoEntidade,
      "loja":infos.loja,
      "produto":infos.codigoProduto,
      "qtdParcelas":cliente.Prazo,
      "sequencialOrgao":"",
      "servico":infos.codigoServico,
      "valorSolicitado":cliente.valorLiberado,
    }
    return await infos.api.post('/v1/simularsaqueaniversariofgts', test);
  } catch (err) {
    if (err.response && err.response.data && err.response.data.simularSaqueAniversarioFgtsResponse && err.response.data.simularSaqueAniversarioFgtsResponse.error && err.response.data.simularSaqueAniversarioFgtsResponse.error.message) return { error: { message: err.response.data.simularSaqueAniversarioFgtsResponse.error.message } }
    if (err.response && err.response.data && err.response.data.simularSaqueAniversarioFgtsResponse) {
      if (err.response.data.simularSaqueAniversarioFgtsResponse.error && err.response.data.simularSaqueAniversarioFgtsResponse.error.message) return err.response.data.simularSaqueAniversarioFgtsResponse.error.message
    }
    if (err.response && err.response.data && err.response.data.simularSaqueAniversarioFgtsResponse) return console.log(err.response.data.simularSaqueAniversarioFgtsResponse)
    if (err.response && err.response.data == "Gateway timeout") {
      return simularSaqueAniversario(cliente)
    }
    console.log(`[API BMG ERROR(3)] => ${err}`)
    console.log(err)
    return false;
  }
}

async function gravarPropostaAntecipacao(cliente, simulacao, token) {
  if (!infos || !infos.api || !infos.api2) return `API não iniciada! Tente novamente...`;
  console.log(`[API BMG] => gravarPropostaAntecipacao...`)
  try {
    var telefone1 = cliente.TelefoneConvenio.replace(cliente.TelefoneConvenio.slice(0,5), "").replace('-','')
    var telefone = telefone1.replace(telefone1.slice(8,telefone1.length),"")
    var test = {
      parameters: {
        simularSaqueAniversarioFgtsResponse: simulacao,
        login: infos.login,
        senha: infos.password,
        bancoOrdemPagamento: 0,
        agencia: {
          numero: cliente.Agencia,
          digitoVerificador: '' //VERIFICAR
        },
        banco: { numero: cliente.CodBancoCliente },
        cliente: {
          celular1: {
            ddd: cliente.TelefoneConvenio.substr(1, 2),
            numero: `9${telefone}`,
          },
          cpf: cliente.Cpf,
          cidadeNascimento: cliente.Cidade,
          dataNascimento: cliente.Datanascimento,
          email: cliente.Email,
          endereco: {
            cep: cliente.Cep,
            logradouro: cliente.Endereco,
            numero: cliente.EndNumero,
            bairro: cliente.Bairro,
            cidade: cliente.Cidade,
            uf: cliente.UF
          },
          estadoCivil: 'S',
          grauInstrucao: '7',
          identidade: {
            numero: cliente.rg,
            emissor: cliente.OrgaoEmissor,
            tipo: "RG", 
            uf: cliente.UF,
            dataEmissao: cliente.DataCadastramento
          },
          nacionalidade: 'Brasileira',
          nome: cliente.NomeCliente,
          nomeConjuge: '',
          nomeMae: cliente.NomeMae,
          nomePai: cliente.NomePai,
          pessoaPoliticamenteExposta: 'false',
          sexo: cliente.sexo,
          ufNascimento: cliente.UF,
          telefone: {
            ddd: "24",
            numero: "38568676",
            ramal: ''
          }
        },
        codEnt: infos.codigoEntidade,
        codigoEntidade: "4262-", 
        codigoFormaEnvioTermo: '21', // VERIFICAR
        codigoLoja: infos.loja,
        codigoServico: infos.codigoServico,
        conta: {
          numero: cliente.ContaCorrente.split('-')[0],
          digitoVerificador: cliente.ContaCorrente.split('-')[1],
          tipoConta: '1'
        },
        cpf: cliente.Cpf,
        finalidadeCredito: cliente.CodBancoCliente == 318 ? 3 : cliente.Poupanca ? 2 : 1,
        formaCredito: cliente.CodBancoCliente == 318 ? 18 : 2,
        loginConsig: 'concreditogreg',
        senhaConsig: 'Facta@743',
        matricula: cliente.Cpf,
        produto: infos.codigoProduto,
        tipoDomicilioBancario: '1',
        valorRenda: 2000,
        valorSolicitado: simulacao.simularSaqueAniversarioFgtsReturn.valorLiberado,
        valorSolicitadoAntecipar: '0',
        token: token
      }
    }
    const response = await infos.api.post('/v1/gravapropostaantecipasaquefgts', test);
    return response
  } catch (err) {
    if (err.response && err.response.data && err.response.data.gravaPropostaAntecipaSaqueFgtsResponse && err.response.data.gravaPropostaAntecipaSaqueFgtsResponse.gravaPropostaAntecipaSaqueFgtsReturn && err.response.data.gravaPropostaAntecipaSaqueFgtsResponse.gravaPropostaAntecipaSaqueFgtsReturn.mensagemDeErro) return err.response.data.gravaPropostaAntecipaSaqueFgtsResponse.gravaPropostaAntecipaSaqueFgtsReturn.mensagemDeErro
    if (err.response && err.response.data && err.response.data.gravaPropostaAntecipaSaqueFgtsResponse) return console.log(err.response.data.gravaPropostaAntecipaSaqueFgtsResponse)
    console.log(`[API BMG ERROR(4)] => ${err}`)
    console.log(err)
    return false;
  }
}

async function getLink(proposta) {
  if (!infos || !infos.api || !infos.api2) return `API não iniciada! Tente novamente...`;
  console.log(`[API BMG] => getLink...`)
  try {
    const response = await infos.api2.post(`/v1/consig/propostas/formalizacoes/link-compartilhado/aceite`, { loginUsuario: infos.login, nomeCorrespondente: "Concredito", numeroProposta: proposta });
    return response
  } catch (err) {
    if (err.response && err.response.data && err.response.data.simularSaqueAniversarioFgtsResponse && err.response.data.simularSaqueAniversarioFgtsResponse.error && err.response.data.simularSaqueAniversarioFgtsResponse.error.message) return { error: { message: err.response.data.simularSaqueAniversarioFgtsResponse.error.message } }
    if (err.response && err.response.data && err.response.data.simularSaqueAniversarioFgtsResponse) {
      if (err.response.data.simularSaqueAniversarioFgtsResponse.error && err.response.data.simularSaqueAniversarioFgtsResponse.error.message) return err.response.data.simularSaqueAniversarioFgtsResponse.error.message
    }
    if (err.response && err.response.data && err.response.data.simularSaqueAniversarioFgtsResponse) return console.log(err.response.data.simularSaqueAniversarioFgtsResponse)
    if (err.response && err.response.data == "Gateway timeout") {
      return simularSaqueAniversario(cliente)
    }
    console.log(`[API BMG ERROR(3)] => ${err}`)
    console.log(err)
    return false;
  }
}

module.exports = {
  loadAPI,
  obterProduto,
  simularSaqueAniversario,
  gravarPropostaAntecipacao,
  getLink
};

