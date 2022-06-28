const axios = require('axios');
const qs = require('qs');

var infos = false

async function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadAPI() {
  infos = {
    user: process.env.C6_USER,
    auth: process.env.C6_AUTH,
    apiUrl: process.env.C6_API,
  }
  var token = await getAuthToken()
  if (token) return true;
  return false
}

async function getAuthToken() {
  if (!infos) return `API não iniciada! Tente novamente...`
  console.log(`[API C6] => Starting API...`)
  try {
    const login = qs.stringify({ "username": infos.user, "password": infos.auth });
    const response = await axios.post(`${infos.apiUrl}/auth/token`, login,{ header: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    if(response.errors) {
      console.log(`[API C6 ERROR (0)] => Falha ao conectar na API do C6. ${response.title}`)
      console.log(response.errors)
      return false;
    }
    infos.token = response.data.access_token;
    infos.api = axios.create({ baseURL: infos.apiUrl, headers: { Authorization: `${infos.token}` } });
    console.log(`[API C6] => API Logged!`)
    return true;
  } catch(err) {
    console.log(`[API C6 ERROR (1)] => ${err}`)
    console.log(err.response ? err.response.data : "Erro C6")
  }
}

async function getProposta(proposalNumber) {
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API C6] => getProposta...`)
  try{
    return await infos.api.get(`/marketplace/proposal?proposalNumber=${proposalNumber}`);
  } catch(err) {
    if(err.response.status == 401) {
      await getAuthToken();
      return await infos.api.get(`/marketplace/proposal?proposalNumber=${proposalNumber}`);
    } else if (err.response && err.response.data && err.response.data.details && err.response.data.details[0]) {
      return err.response.data.details[0]
    } else {
      console.log(`[API C6 ERROR (1)] => ${err}`)
      console.log(err);
      return false;
    }
  }
}

async function simularProposta(clientData) {
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API C6] => simularProposta...`)
  try{
    const response = await infos.api.post(`/marketplace/proposal/fgts/simulation`, clientData );
    if (response && response.data && response.data.details && response.data.details[0] && response.data.details[0].includes('Não foi possivel realizar comunicação com a CEF')) return simularProposta(clientData)
    if (response && response.data && response.data.details && response.data.details[0] && response.data.details[0].includes('Limite da conta excedido')) return simularProposta(clientData)
    return response;
  } catch(err) {
    if (err.response && err.response.data && err.response.data.details && err.response.data.details[0] && err.response.data.details[0].includes('Não foi possivel realizar comunicação com a CEF')) return simularProposta(clientData)
    if (err.response && err.response.data && err.response.data.details && err.response.data.details[0] && err.response.data.details[0].includes('Limite da conta excedido')) return simularProposta(clientData)
    if (err.response && err.response.status == 401) {
      await getAuthToken();
      return simularProposta(clientData)
    } else if (err.response && err.response.data && err.response.data.details && err.response.data.details[0]) {
      return err.response.data.details[0]
    } else {
      console.log(`[API C6 ERROR (2)] => ${err}`)
      console.log(err);
      return err.response;
    }
  }
}

async function registerProposta(clientData) {
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API C6] => registerProposta...`)
  try{
    const response = await infos.api.post(`/marketplace/proposal/fgts`, clientData);
    if (response && response.data && response.data.details && response.data.details[0] && response.data.details[0].includes('Não foi possivel realizar comunicação com a CEF')) return registerProposta(clientData)
    if (response && response.data && response.data.details && response.data.details[0] && response.data.details[0].includes('Limite da conta excedido')) return registerProposta(clientData)
    return response;
  } catch(err) {
    if (err) {
      if (err.response && err.response.data && err.response.data.details && err.response.data.details[0] && err.response.data.details[0].includes('Não foi possivel realizar comunicação com a CEF')) return registerProposta(clientData)
      if (err.response && err.response.data && err.response.data.details && err.response.data.details[0] && err.response.data.details[0].includes('Limite da conta excedido')) return registerProposta(clientData)
      if (err.response.status == 401 || err.response.status == 500) {
        await getAuthToken();
        return registerProposta(clientData)
      } else if (err.response && err.response.data && err.response.data.details && err.response.data.details[0]) {
        return err.response.data.details[0]
      } else if (err.response && err.response.data && err.response.data.message) {
        return `${err.response.data.message}`
      } else {
        console.log(`[API C6 ERROR (2)] => ${err}`)
        console.log(err)
        return false;
      }
    } else return false;
  }
}

async function getLinkFormalization(idProposta, test) {
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  if (!test) console.log(`[API C6] => getLinkFormalization...`)
  try{
    const response = await infos.api.get(`/marketplace/proposal/formalization-url?proposalNumber=${idProposta}`);
    if (response.status == 404) return getLinkFormalization(idProposta, true)
    if (response.data && !response.data.url) {
      await timeout(10000)
      await getAuthToken();
      return getLinkFormalization(idProposta)
    }
    return response;
  } catch(err) {
    if (err) {
      if (err.response && err.response.data && err.response.data.details && err.response.data.details[0] && err.response.data.details[0].includes('Não foi possivel realizar comunicação com a CEF')) return getLinkFormalization(idProposta, test)
      if (err.response && err.response.data && err.response.data.details && err.response.data.details[0] && err.response.data.details[0].includes('Limite da conta excedido')) return getLinkFormalization(idProposta, test)
      if (err.response.status == 401 || err.response.status == 500) {
        await getAuthToken();
        return getLinkFormalization(idProposta, test)
      } else if (err.response && err.response.data && err.response.data.details && err.response.data.details[0]) {
        if (err.response.data.details[0].includes('formalization link for the proposal') && err.response.data.details[0].includes('not found')) {
          await timeout(10000)
          await getAuthToken();
          return getLinkFormalization(idProposta, test)
        }
        return err.response.data.details[0]
      } else if (err.response && err.response.data && err.response.data.message) {
        if (err.response.data.message.includes('formalization link for the proposal') && err.response.data.message.includes('not found')) {
          await timeout(10000)
          await getAuthToken();
          return getLinkFormalization(idProposta, test)
        }
        return `${err.response.data.message}`
      } else {
        console.log(`[API C6 ERROR (3)] => ${err}`)
        console.log(err)
        return false;
      }
    } else return false;
  }
}


module.exports = {
  loadAPI,
  getProposta,
  simularProposta,
  registerProposta,
  getLinkFormalization
};
