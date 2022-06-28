const axios = require('axios');

async function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

var infos = false
async function loadAPI() {
  infos = {
    user: process.env.SAFRA_USER,
    auth: process.env.SAFRA_AUTH,
    apiUrl: process.env.SAFRA_API,
  }
  var token = await getAuthToken()
  if (token) return true;
  return false
}

async function getAuthToken(test) {
  if (!infos) return `API não iniciada! Tente novamente...`
  if (!test) console.log(`[API Safra] => Starting API...`)
  try {
    const response = await axios.post(`${infos.apiUrl}/Token`, { "username": infos.user, "password": '$zf%VAx!3_' });
    if(response.errors) {
      console.log(`[API Safra ERROR (0)] => Falha ao conectar na API do Safra: ${response.title}`)
      return console.log(response)
    }
    infos.token = response.data.token;
    infos.api = axios.create({ baseURL: infos.apiUrl, headers: { Authorization: `Bearer ${infos.token}`} });
    console.log(`[API Safra] => API Loaded!`)
    return true;
  } catch(err) {
    if (err.response && (err.response.status == 403 || err.response.status == 500)) {
      await timeout(180000);
      return await getAuthToken(true)
    } else {
      console.log(`[API Safra ERROR (1)] => Erro na API do Safra: ${err}`)
      console.log(err.response ? err.response.data : 'Erro Safra')
      return false;
    }
  }
}

async function getSaldo(idCliente, tpProduto){    
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API Safra] => getSaldo...`)
  try {
    const response = await infos.api.get(`/Fgts?idCliente=${idCliente}&tpProduto=${tpProduto}`);   
    if(response.status == 401 || response.status == 429 || response.status == 404){
      await getAuthToken();
      return getSaldo(idCliente, tpProduto);
    } else if (response.data && response.data.erros && response.data.erros[0] && response.data.erros[0].descricao && (response.data.erros[0].descricao.includes('Tente novamente mais tarde') || response.data.erros[0].descricao.includes('Time out de Recebimento'))) {
      await timeout(5000);
      getSaldo(idCliente, tpProduto)
    } else return response;
  } catch(err) {
    if(err.response && (err.response.status == 401 || err.response.status == 429 || err.response.status == 404)) {
      await getAuthToken();
      return getSaldo(idCliente, tpProduto);  
    }
    if (err.response && err.response.data && err.response.data.errors) {
      console.log(err.response.data.errors)
      return `Ocorreu algum erro indefinido! Reporte ao Yuri...`;
    }
    console.log(`[API Safra ERROR (2)] => ${err}`)
    console.log(err)
    return false;
  }
}

async function getOrgaoEmpregador(){
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API Safra] => getOrgaoEmpregador...`)
  try {
    const response = await infos.api.get(`/OrgaoEmpregador/50057`);
    if(response.status == 401 || response.status == 429 || response.status == 404){
      await getAuthToken();
      return getOrgaoEmpregador();
    } else return response;
  } catch(e) {
    if(err.response && (err.response.status == 401 || err.response.status == 429 || err.response.status == 404)) {
      await getAuthToken();
      return getOrgaoEmpregador();  
    }
    if (err.response && err.response.data && err.response.data.errors) {
      console.log(err.response.data.errors)
      return `Ocorreu algum erro indefinido! Reporte ao Yuri...`;
    }
    console.log(`[API Safra ERROR (3)] => ${err}`)
    console.log(err)
    return false;
  }
}

async function getProfissao(){
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API Safra] => getProfissao...`)
  try {
    const response = await infos.api.get(`/Profissao/50057`); 
    if (response.status == 401 || response.status == 429 || response.status == 404) {
      await getAuthToken();
      return getProfissao();
    } else return response;
  } catch(err) {
    if(err.response && (err.response.status == 401 || err.response.status == 429 || err.response.status == 404)) {
      await getAuthToken();
      return getProfissao();  
    }
    if (err.response && err.response.data && err.response.data.errors) {
      console.log(err.response.data.errors)
      return `Ocorreu algum erro indefinido! Reporte ao Yuri...`;
    }
    console.log(`[API Safra ERROR (4)] => ${err}`)
    console.log(err)
    return false;
  }
}

async function getCargo(idProfissao){
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API Safra] => getCargo...`)
  try {
    const response = await infos.api.get(`/Cargo/${idProfissao}`);
    if(response.status == 401 || response.status == 429 || response.status == 404){
      await getAuthToken();
      return getCargo(idProfissao);
    } else return response;
  } catch(err) {
    if(err.response && (err.response.status == 401 || err.response.status == 429 || err.response.status == 404)) {
      await getAuthToken();
      return getCargo(idProfissao);  
    }
    if (err.response && err.response.data && err.response.data.errors) {
      console.log(err.response.data.errors)
      return `Ocorreu algum erro indefinido! Reporte ao Yuri...`;
    }
    console.log(`[API Safra ERROR (5)] => ${err}`)
    console.log(err)
    return false;
  }
}

async function getVinculoEmpregaticio(){
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API Safra] => getVinculoEmpregaticio...`)
  try {
    const response = await infos.api.get(`VinculoEmpregaticio/50057`);
    if(response.status == 401 || response.status == 429 || response.status == 404){
      await getAuthToken();
      return getVinculoEmpregaticio();
    } else return response;
  } catch(err) {
    if(err.response && (err.response.status == 401 || err.response.status == 429 || err.response.status == 404)) {
      await getAuthToken();
      return getVinculoEmpregaticio();  
    }
    if (err.response && err.response.data && err.response.data.errors) {
      console.log(err.response.data.errors)
      return `Ocorreu algum erro indefinido! Reporte ao Yuri...`;
    }
    console.log(`[API Safra ERROR (6)] => ${err}`)
    console.log(err)
    return false;
  }
}

async function getTabelaJuros(){
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API Safra] => getTabelaJuros...`)
  try {
    const response = await infos.api.get(`/TabelaJuros/FGTS`);
    if(response.status == 401 || response.status == 429 || response.status == 404){
      await getAuthToken();
      return getTabelaJuros();
    } else if (response.data && response.data.erros && response.data.erros[0] && response.data.erros[0].descricao && (response.data.erros[0].descricao.includes('Tente novamente mais tarde') || response.data.erros[0].descricao.includes('Time out de Recebimento'))) {
      await timeout(5000);
      getTabelaJuros()
    } else return response;
  } catch(err) {
    if(err.response && (err.response.status == 401 || err.response.status == 429 || err.response.status == 404)) {
      await getAuthToken();
      return getTabelaJuros();  
    }
    if (err.response && err.response.data && err.response.data.errors) {
      console.log(err.response.data.errors)
      return `Ocorreu algum erro indefinido! Reporte ao Yuri...`;
    }
    console.log(`[API Safra ERROR (7)] => ${err}`)
    console.log(err)
    return false;
  }
}

async function calcularProposta(idTabelaJuros, periodos, idCliente, tpProduto){
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API Safra] => calcularProposta...`)
  try{
    const response = await infos.api.post(`/Calculo/FGTS`,{ idTabelaJuros, idCliente, tpProduto, periodos});   
    if(response.status == 401 || response.status == 429 || response.status == 404){
      await getAuthToken();
      return calcularProposta(idTabelaJuros, periodos, idCliente, tpProduto);
    } else if (response.data && response.data.erros && response.data.erros[0] && response.data.erros[0].descricao && (response.data.erros[0].descricao.includes('Tente novamente mais tarde') || response.data.erros[0].descricao.includes('Time out de Recebimento'))) {
      await timeout(5000);
      calcularProposta(idTabelaJuros, periodos, idCliente, tpProduto)
    } else return response;
  } catch(err) {
    if(err.response && (err.response.status == 401 || err.response.status == 429 || err.response.status == 404)) {
      await getAuthToken();
      return calcularProposta(idTabelaJuros, periodos, idCliente, tpProduto);  
    }
    if (err.response && err.response.data && err.response.data.errors) {
      console.log(err.response.data.errors)
      return `Ocorreu algum erro indefinido! Reporte ao Yuri...`;
    }
    console.log(`[API Safra ERROR (8)] => ${err}`)
    console.log(err)
    return false;
  }
}

async function gravarProposta(clientData){
  try {
    if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
    console.log(`[API Safra] => gravarProposta...`)
    const response = await infos.api.post(`/Propostas/Fgts`,clientData);
    return response;
  } catch(err) {
    if(err.response && (err.response.status == 401 || err.response.status == 429 || err.response.status == 404)) {
      await getAuthToken();
      return gravarProposta(clientData);  
    }
    if (err.response && err.response.data && err.response.data.errors) {
      console.log(err.response.data.errors)
      return `Ocorreu algum erro indefinido! Reporte ao Yuri...`;
    }
    console.log(`[API Safra ERROR (9)] => ${err}`)
    console.log(err)
    return false;
  }
}

async function getLinkFormalizacao(idProposta, idCliente, test){
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  if (!test) console.log(`[API Safra] => getLinkFormalizacao...`)
  try {
    const response = await infos.api.get(`/Propostas/ObterLinkFormalizacao?idProposta=${idProposta}&idCliente=${idCliente}&idConvenio=50057`);
    if (response && response.data && response.data.length <= 0) return getLinkFormalizacao(idProposta, idCliente, true);
    if(response && (response.status == 401 || response.status == 429 || response.status == 404)) {
      await timeout(180000);
      await getAuthToken();
      return getLinkFormalizacao(idProposta, idCliente, true);
    } else if (!response) return false;
    return response;
  } catch(err) {
    if(err.response && (err.response.status == 401 || err.response.status == 429 || err.response.status == 404)){
      await timeout(180000);
      await getAuthToken();
      return getLinkFormalizacao(idProposta, idCliente, true);
    }
    if (err.code && err.code == 'ETIMEDOUT') {
      await timeout(60000);
      await getAuthToken();
      return getLinkFormalizacao(idProposta, idCliente);
    }
    if (err.response && (err.response && err.response.data && err.response.data.errors)) {
      console.log(err.response.data.errors)
      return `${err.response.data.errors.length >= 1 ? err.response.data.errors[0] : err.response.data.errors }`
    }
    console.log(`[API Safra ERROR (10)] => ${err}`)
    console.log(err)
    return false;
  }
}

module.exports = {
  loadAPI,
  getSaldo,
  getOrgaoEmpregador,
  getProfissao,
  getCargo,
  getVinculoEmpregaticio,
  getTabelaJuros,
  calcularProposta,
  gravarProposta,
  getLinkFormalizacao
};

