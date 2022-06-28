const axios = require('axios');
const qs = require('qs');

var infos = false

async function loadAPI() {
  infos = {
    user: process.env.BANRISUL_USER,
    pass: process.env.BANRISUL_PASS,
    apiUrl: process.env.BANRISUL_URL,
  }
  var token = await getAuthToken()
  if (token) return true;
  return false
}

async function getAuthToken() {
  if (!infos) return console.log(`[API Banrisul] => erro...`)
  console.log(`[API Banrisul] => Starting API...`)
  try {
    const response = await axios.post(`${infos.apiUrl}/auth/Autenticacao/Autenticar`, {usuario: infos.user, senha: infos.pass } ,{ header: { 'Content-Type': 'application/json' } });
    //infos.token = response.data.retorno.bemWebToken;
    infos.token = response.data.retorno.jwtToken;
    console.log(response.data)
    infos.api = axios.create({ baseURL: infos.apiUrl, headers: { Authorization: `Bearer ${infos.token}` } });
    console.log(`[API Banrisul] => API Logged!`)
    return true;
  } catch(err) {
    console.log(err.response.data)
    if (err.response && err.response.data && err.response.data.erros && err.response.data.erros[0] && err.response.data.erros[0].mensagem) return { data: { erro: err.response.data.erros[0].mensagem } }
    console.log(`[API Banrisul ERROR (1)] => ${err}`)
    console.log(err.response ? err.response.data : 'Erro Banrisul')
  }
}

async function SimularPropostaPortabilidade(data, test) {
  if (!test) console.log(`[API Banrisul] => SimularPropostaPortabilidade...`)
  try {
    const response = await infos.api.post(`/consignado/Consignado/Simulacao/V2/SimularPropostaPortabilidade`, data);
    if (response && response.data && response.data.retorno && response.data.retorno.viabilidadeEspecial && response.data.retorno.viabilidadeEspecial.mensagem && response.data.retorno.viabilidadeEspecial.mensagem.includes('juros estar abaixo das tabelas vigentes')) {
      data.saldoDevedor = data.saldoDevedor / 1.02
      return await SimularPropostaPortabilidade(data, true)
    } else if (response && response.data && response.data.retorno && response.data.retorno.viabilidadeEspecial && response.data.retorno.viabilidadeEspecial.mensagem && response.data.retorno.viabilidadeEspecial.mensagem.includes(' juros estar acima da permitida pela conveniada')) {
      data.saldoDevedor = data.saldoDevedor * 1.02
      return await SimularPropostaPortabilidade(data, true)
    } else if (response && response.data && response.data.retorno && response.data.retorno.viabilidadeEspecial && response.data.retorno.viabilidadeEspecial.mensagem && response.data.retorno.viabilidadeEspecial.mensagem.includes('Parcela mínima portável')) {
      data.saldoDevedor = data.saldoDevedor / 1.02
      return await SimularPropostaPortabilidade(data, true)
    }
    return response
  } catch(err) {
    if (err.response && err.response.data && err.response.data.erros && err.response.data.erros[0] && err.response.data.erros[0].mensagem) return { data: { erro: err.response.data.erros[0].mensagem } }
    console.log(`[API Banrisul ERROR (2)] => ${err}`)
    console.log(err.response)
  }
}

async function GravarPropostaPortabilidade(data) {
  console.log(`[API Banrisul] => GravarPropostaPortabilidade...`)
  try {
    const response = await infos.api.post(`/consignado/Consignado/Proposta/GravarPropostaPortabilidade`, data);
    return response
  } catch(err) {
    if (err.response && err.response.data && err.response.data.erros && err.response.data.erros[0] && err.response.data.erros[0].mensagem) return { data: { erro: err.response.data.erros[0].mensagem } }
    console.log(`[API Banrisul ERROR (3)] => ${err}`)
    console.log(err.response)
  }
}

async function ListarTiposConta(recebimento) {
  console.log(`[API Banrisul] => ListarTiposConta...`)
  try {
    const response = await infos.api.get(`/consignado/Consignado/Proposta/ListarTiposConta?recebimento=${recebimento ? 'true':'false'}`);
    return console.log(response.data)
  } catch (err) {
    console.log(`[API Banrisul ERROR (?)] => Erro ao Listar os Bancos: ${err}`)
    console.log(err)
  }
}
async function ListarConveniadas(app, cartao) {
  console.log(`[API Banrisul] => ListarConveniadas...`)
  try {
    const response = await infos.api.get(`consignado/Consignado/Conveniada/ListarConveniadas?app=${app?'true':'false'}&cartao=${cartao?'true':false}`);
    return console.log(response.data.retorno)
  } catch (err) {
    console.log(`[API Banrisul ERROR (?)] => Erro ao Listar as Conveniadas: ${err}`)
    console.log(err)
  }
}
async function ListarConveniadasOrgaos(conveniada) {
  console.log(`[API Banrisul] => ListarConveniadasOrgaos...`)
  try {
    const response = await infos.api.get(`consignado/Consignado/Conveniada/ListarConveniadasOrgaos?conveniada=${conveniada}`);
    return console.log(response.data.retorno)
  } catch (err) {
    console.log(`[API Banrisul ERROR (?)] => Erro ao Listar as Conveniadas: ${err}`)
    console.log(err)
  }
}
async function ListarFormasLiberacao(cpf, conveniada, plano, grau) {
  if (!cpf || !conveniada || !plano || !grau) return false;
  console.log(`[API Banrisul] => ListarTiposConta...`)
  try {
    const response = await infos.api.get(`/consignado/Consignado/Proposta/ListarFormasLiberacao?CpfCliente=${cpf}&Conveniada=${conveniada}&Plano=${plano}&GrauInstrucao=${grau}`);
    if (response.data && response.data.retorno && response.data.retorno[0] && response.data.retorno[0].codigo) return response.data.retorno[0].codigo;
    return false;
  } catch (err) {
    console.log(`[API Banrisul ERROR (?)] => Erro ao Listar os Bancos: ${err}`)
    console.log(err)
  }
}
async function ListarBancos(banco) {
  console.log(`[API Banrisul] => ListarBancos...`)
  try {
    const response = await infos.api.get(`consignado/Consignado/Proposta/ListarBancos`);
    if (response.data && response.data.retorno && response.data.retorno.findIndex(r=>r.codigo == banco) >= 0 && response.data.retorno[response.data.retorno.findIndex(r=>r.codigo == banco)].cnpj) return response.data.retorno[response.data.retorno.findIndex(r=>r.codigo == banco)].cnpj
    return false;
  } catch (err) {
    if (err.response && err.response.data && err.response.data.erros && err.response.data.erros[0] && err.response.data.erros[0].mensagem) return { data: { erro: err.response.data.erros[0].mensagem } }
    console.log(`[API Banrisul ERROR (2)] => Erro ao Listar os Bancos: ${err}`)
    console.log(err)
  }
}
// async function ListarBancosAgencias(banco) {
//   console.log(`[API Banrisul] => ListarBancosAgencias...`)
//   try {
//     const response = await infos.api.get(`consignado/Consignado/Proposta/ListarBancosAgencias?banco=${banco}`);
//     return console.log(response.data.retorno[response.data.retorno.findIndex(r=>r.codigo == 3880)])
//   } catch (err) {
//     console.log(`[API Banrisul ERROR (2)] => Erro ao Listar os Bancos: ${err}`)
//     console.log(err)
//   }
// }
// async function ListarGrauInstrucao() {
//   console.log(`[API Banrisul] => /Pessoa/ListarGrauInstrucao...`)
//   try {
//     const response = await infos.api.get(`/Bemapi/Pessoa/ListarGrauInstrucao`);
//     return console.log(response.data.retorno)
//   } catch (err) {
//     console.log(`[API Banrisul ERROR (?)] => Erro ao Listar os Bancos: ${err}`)
//     console.log(err)
//   }
// }


module.exports = {
  loadAPI,
  SimularPropostaPortabilidade,
  GravarPropostaPortabilidade,
  ListarBancos
};
