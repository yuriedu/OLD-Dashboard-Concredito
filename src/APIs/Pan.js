const axios = require('axios');
const qs = require('qs');

var infos = false

async function loadAPI() {
  infos = {
    client: process.env.PAN_CLIENT_ID,
    secret: process.env.PAN_CLIENT_SECRET,
    auth: process.env.PAN_AUTH,
    url: process.env.PAN_URL,
  }
  var token = await getAuthToken()
  if (token) return true;
  return false
}

async function getAuthToken() {
  if (!infos) return `API não iniciada! Tente novamente...`
  console.log(`[API PAN] => Starting API...`)
  try {
    const body = {
      username: `${process.env.PAN_CPF}_${process.env.PAN_PROMOTER_CODE_LOGIN}`,
      password: process.env.PAN_SENHA,
      grant_type: 'client_credentials+password'
    };
    const response = await axios.post(`${infos.url}consignado/v0/tokens`, body, { headers: { Authorization: `Basic ${infos.auth}`, ApiKey: infos.client }
    });
    infos.token = response.data.token;
    infos.api = axios.create({ baseURL: infos.url, headers: { Authorization: `Bearer ${infos.token}`, ApiKey: infos.client } });
    console.log(`[API Pan] => API Logged!`)
    return true;
  } catch (err) {
    if (err.response && err.response.data && err.response.data.detalhes && err.response.data.detalhes[0]) return err.response.data.detalhes[0]
    if (err.response && err.response.data && err.response.data.detalhes) return err.response.data.detalhes
    console.log(`[API Pan ERROR (0)] => Erro ao conectar na API da Pan: ${err}`)
    console.log(err.response ? err.response.data : "Erro Pan")
    return false;
  }
}

async function getLink(cpf, numeroProposta){
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API PAN] => getLink...`)
  try{
    return await infos.api.get(`consignado/v0/formalizador/${process.env.PAN_PROMOTER_CODE}/${cpf}/${numeroProposta}/links`);
  } catch(err){
    if(err.response && err.response.status == 401){
      await getAuthToken();
      return getLink(cpf, numeroProposta)
    } else {
      console.log(`[API Pan ERROR (1)] => ${err}`)
      console.log(err)
      return false;
    }
  }
}

async function getId(id, tipoProposta){
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API PAN] => getId...`)
  try{
      return await infos.api.get(`consignado/v0/emprestimos/propostas/${id}`, { params: { tipo_proposta: tipoProposta } } )
  } catch(err){
    if(err.response && err.response.status == 401){
      await getAuthToken();
      return getId(id, tipoProposta);
    } else {
      console.log(`[API Pan ERROR (2)] => ${err}`)
      console.log(err)
      return false;
    }
  }
}

async function calculateNetValue(data){
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API PAN] => calculateNetValue...`)
  try{
    return await infos.api.post(`openapi/consignado/v1/emprestimos/simulacao/fgts`, data );
  } catch(err){
    if(err.response && (err.response.status == 401 || err.response.status == 504)){
      await getAuthToken();
      return calculateNetValue(data);
    } else if (err.response && err.response.data && err.response.data.detalhes && err.response.data.detalhes[0]) {
      return err.response.data.detalhes[0];
    } else {
      console.log(`[API Pan ERROR (3)] => ${err}`)
      console.log(err)
      return false;
    }
  }
}

async function requestProposal(data){
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API PAN] => requestProposal...`)
  try{
    return await infos.api.post(`openapi/consignado/v1/emprestimos/propostas/fgts`, data );
  } catch(err){
    if(err.response && (err.response.status == 401 || err.response.status == 504)){
      await getAuthToken();
      return requestProposal(data)
    } else if (err.response && err.response.data && err.response.data.detalhes && err.response.data.detalhes[0]) {
      return err.response.data.detalhes[0];
    } else {
      console.log(`[API Pan ERROR (4)] => ${err}`)
      console.log(err)
      return false;
    }
  }
}

async function getTabelasJuros(){
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API PAN] => getTabelasJuros...`)
  try{
    return await infos.api.get(`openapi/consignado/v1/tabelas-financiamento?codigo_convenio=v&codigo_promotora=${process.env.PAN_PROMOTER_CODE_LOGIN}&tipo_operacao=MARGEM_LIVRE`);
  }catch(err){
    if(err.response && err.response.status == 401){
      await getAuthToken();
      return getTabelasJuros()
    } else {
      console.log(`[API Pan ERROR (5)] => ${err}`)
      console.log(err)
      return false;
    }
  }
}

async function calculateNetValueINSS(data){
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API PAN] => calculateNetValueINSS...`)
  try{
    return await infos.api.post(`openapi/consignado/v1/emprestimos/simulacao`, data );
  } catch(err){
    if(err.response && (err.response.status == 401 || err.response.status == 504)){
      await getAuthToken();
      return calculateNetValueINSS(data)
    } else {
      console.log(`[API Pan ERROR (6)] => ${err}`)
      console.log(err)
      return false;
    }
  }
}

async function requestProposalINSS(data){
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API PAN] => requestProposalINSS...`)
  try{
    return await infos.api.post(`openapi/consignado/v1/emprestimos/propostas`, data );
  } catch(err){
    if(err.response && (err.response.status == 401 || err.response.status == 504)){
      await getAuthToken();
      return requestProposalINSS(data)
    } else {
      if (err.response && err.response.data && err.response.data.detalhes) {
        if (err.response.data.detalhes[0]) return err.response.data.detalhes[0]
        return err.response.data.detalhes
      }
      console.log(`[API Pan ERROR (7)] => ${err}`)
      console.log(err.response)
      return false;
    }
  }
}

module.exports = {
  loadAPI,
  getLink,
  getId,
  calculateNetValue,
  requestProposal,
  getTabelasJuros,
  calculateNetValueINSS,
  requestProposalINSS
};
