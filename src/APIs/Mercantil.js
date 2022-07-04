const axios = require('axios');
const qs = require('qs');

async function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

var infos = false
async function loadAPI() {
  infos = {
    client: process.env.MERCANTIL_API_KEY,
    secret: process.env.MERCANTIL_SECRET_KEY,
    url: process.env.MERCANTIL_URL,
  }
  var token = await getAuthToken()
  if (token) return true;
  return false
}

async function getAuthToken() {
  if (!infos) return `API não iniciada! Tente novamente...`
  console.log(`[API Mercantil] => Starting API...`)
  try {
    const response = await axios.post(`${infos.url}auth/oauth/v2/token?grant_type=client_credentials&client_id=${infos.client}&client_secret=${infos.secret}`);
    if(response.errors) {
      console.log(`[API Mercantil ERROR (0)] => Falha ao conectar na API do Mercantil. ${response.title}`)
      console.log(response.errors)
      return false;
    }
    infos.token = response.data.access_token;
    infos.api = await axios.create({ baseURL: infos.apiUrl, headers: { Authorization: `Bearer ${infos.token}` } });
    console.log(`[API Mercantil] => API Logged!`)
    return true;
  } catch(err) {
    if (err.response && (err.response.status == 401 || err.response.status == 400 || err.response.status == 504)){
      await timeout(5000);
      await getAuthToken();
    }
    console.log(`[API Mercantil ERROR (1)] => ${err}`)
    console.log(err.response ? err.response.data : "Erro Mercantil")
  }
}

async function getSaldo(cpf) {
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`;
  console.log(`[API Mercantil] => getSaldo...`)
  try {
    const response = await infos.api.get(`${infos.url}PropostasExternas/v1/Clientes/${cpf}/SaquesAniversario/Saldo`);
    if (response && response.data && response.data.errors && response.data.errors[0] && response.data.errors[0].message ) return response.data.errors[0].message
    return response;
  } catch(err) {
    if (err.response && (err.response.status == 401 || err.response.status == 504)){
      await timeout(5000);
      await getAuthToken();
      return await getSaldo(cpf)
    }
    if (err.response && err.response.data && err.response.data.errors && err.response.data.errors[0] && err.response.data.errors[0].message) return err.response
    console.log(`[API Mercantil ERROR(2)] => ${err}`)
    console.log(err.response.data)
    return err.response;
  }
}

async function calculateNetValue(data, info) {
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`;
  if (!info) console.log(`[API Mercantil] => calculateNetValue...`)
  try {
    const response = await infos.api.post(`${infos.url}PropostasExternas/v1/Simulacoes/Fgts`, data)
    if (response.data && response.data.errors && response.data.errors[0] && response.data.errors[0].message) return err.response
    return response;
  } catch(err) {
    if (err.response && (err.response.status == 401 || err.response.status == 504)){
      await timeout(5000);
      await getAuthToken();
      return await calculateNetValue(data, true)
    }
    if (err.response && err.response.data && err.response.data.errors && err.response.data.errors[0] && err.response.data.errors[0].message ) return err.response
    if (err.response && err.response.data &&  err.response.data.includes("Unable to route to API.")) {
      await timeout(5000);
      await getAuthToken();
      return await calculateNetValue(data, true)
    }
    if (err.response && err.response.data && err.response.data.logEntry)
    console.log(`[API Mercantil ERROR(3)] => ${err}`)
    console.log(err.response.data)
  }
}

async function requestProposal(data) {
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`;
  console.log(`[API Mercantil] => requestProposal...`)
  try {
    const response = await infos.api.post(`${infos.url}PropostasExternas/v1/Propostas/FGTS`, data)
    if (response && response.data && response.data.errors && response.data.errors[0] && response.data.errors[0].message ) return response.data.errors[0].message
    return response;
  } catch(err) {
    if (err.response && (err.response.status == 401 || err.response.status == 504)){
      await timeout(5000);
      await getAuthToken();
      return await requestProposal(data)
    }
    if (err.response && err.response.data && err.response.data.errors && err.response.data.errors[0] && err.response.data.errors[0].message ) return err.response
    if (err.response && err.response.data && err.response.data.errors) return err.response
    console.log(`[API Mercantil ERROR(4)] => ${err}`)
    console.log(err)
  }
}

async function getProposta(data) {
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`;
  console.log(`[API Mercantil] => getProposta...`)
  try {
    const response = await infos.api.get(`${infos.url}PropostasExternas/v1/Propostas/${data}`)
    if (response && response.data && response.data.errors && response.data.errors[0] && response.data.errors[0].message ) return response.data.errors[0].message
    if (response.data && !response.data.numeroOperacao) {
      await timeout(60000);
      await getAuthToken();
      return await getProposta(data)
    }
    return response;
  } catch(err) {
    if (err.response && (err.response.status == 401 || err.response.status == 504)){
      await timeout(5000);
      await getAuthToken();
      return await getProposta(data)
    }
    if (err.response && err.response.data && err.response.data.errors && err.response.data.errors[0] && err.response.data.errors[0].message ) return err.response
    console.log(`[API Mercantil ERROR(4)] => ${err}`)
    console.log(err)
  }
}

async function getLink(data, info) {
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`;
  if (!info) console.log(`[API Mercantil] => getLink...`)
  try {
    const response = await infos.api.get(`${infos.url}PropostasExternas/v1/AutorizacoesDigitais/Proposta/${data}`)
    if (response && response.data && response.data.errors && response.data.errors[0] && response.data.errors[0].message ) return response.data.errors[0].message
    if (response.data && !response.data.linkEncurtado) return await getLink(data)
    return response;
  } catch(err) {
    if (err.response && err.response.data && err.response.data.linkEncurtado) return err.response
    if (err.response && (err.response.status == 401 || err.response.status == 504)){
      await timeout(5000);
      await getAuthToken();
      return await getLink(data, true)
    }
    if (err.response && (err.response.status == 400 || err.response.status == 204)) {
      await timeout(60000);
      await getAuthToken();
      return await getLink(data)
    }
    if (err.response && err.response.data && err.response.data.errors && err.response.data.errors[0] && err.response.data.errors[0].message ) return err.response
    console.log(`[API Mercantil ERROR(4)] => ${err}`)
    console.log(err.response)
    return false;
  }
}

module.exports = {
  loadAPI,
  getSaldo,
  calculateNetValue,
  requestProposal,
  getProposta,
  getLink
};