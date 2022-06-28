const axios = require('axios');
const FormData = require('form-data');

var infos = false

async function loadAPI() {
  infos = {
    credentials: process.env.FACTA_WS_CREDENTIAL,
    apiUrl: process.env.FACTA_API,
    login_certificado: process.env.FACTA_LOGIN_CERTIFICADO,
    cidades: {},
  }
  var token = await getAuthToken()
  if (token) return true;
  return false
}

async function getAuthToken(info) {
  try {
    if (!infos) return `API não iniciada! Tente novamente...`
    if(!info)console.log(`[API Facta] => Starting API...`)
    const buffer = Buffer.from(infos.credentials, 'utf-8');
    const base64Credentials = buffer.toString('base64');
    const response = await axios.get(`${infos.apiUrl}/gera-token`, { headers: { Authorization: `Basic ${base64Credentials}` } });
    if (response && response.data && response.data.erro) {
      console.log(`[API Facta ERROR (0)] => Falha ao conseguir o Token ${response.data.mensagem}`)
      return false;
    }
    infos.token = response.data.token;
    infos.api = await axios.create({ baseURL: infos.apiUrl, headers: { Authorization: `Bearer ${infos.token}` } });
    console.log(`[API Facta] => API Logged!`)
    return true;
  } catch(err) {
    console.log(`[API Facta ERROR (1)] => Erro na API da Facta: ${err}`)
    console.log(err.response ? err.response.data : 'Erro Facta')
    return false;
  }
}

async function getComboData(field, pathEnd, returnField) {
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API Facta] => getComboData...`)
  if (!field || !pathEnd || !returnField) return `O cliente possui dados vazios! Verifique e tente novamente...`;
  if (infos[field] == null) {
    const response = await infos.api.get(`/proposta-combos/${pathEnd}`);
    const unencoded = Object.entries(response.data[returnField]);
    infos[field] = unencoded.map((entry) => ({ value: entry[0], text: entry[1] }));
  }
  return infos[field];
}
async function getBancos() {
  return await getComboData('bancos', 'banco', 'lista_banco');
}
async function getOrgaosEmissores() {
  return await getComboData('emissores', 'orgao-emissor', 'orgao_emissor');
}
async function getPaises() {
  return await getComboData('paises', 'paises', 'paises');
}
async function getEstados() {
  return await getComboData('estados', 'estado', 'estado');
}
async function getEstadoCivil() {
  return await getComboData('estadoCivil', 'estado-civil', 'estado_civil');
}
async function getValorPatrimonial() {
  return await getComboData('valorPatrimonial', 'valor-patrimonial', 'valor_patrimonio');
}

async function getCidadesByCidade(nomeCidade, estado) {
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API Facta] => getCidadesByCidade...`)
  const response = await infos.api.get(`/proposta-combos/cidade?estado=${estado}&nome_cidade=${nomeCidade}`);
  if (!response || !response.data) return `Ocorreu algum erro na API! Tente novamente...`
  if (response.data.erro && response.data.mensagem === "Token expirado") {
    await getAuthToken();
    const response2 = await infos.api.get(`/proposta-combos/cidade?estado=${estado}&nome_cidade=${nomeCidade}`);
    if (!response2 || !response2.data) return `Ocorreu algum erro na API! Tente novamente...`
    return response.data.cidade;
  }
  if(response.data.erro || response.data.erro === undefined) return false;
  const cidade = response.data.cidade;
  if(Object.keys(cidade).length > 1){
    let city;
    Object.keys(cidade).map(k => {  
      if (cidade[k].nome == nomeCidade) city = { [k]: cidade[k] };
    });
    return city;
  } else return cidade;
}

async function getCidades(estado) {
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API Facta] => getCidades...`)
  if (infos.cidades[estado] == null) {
    const response = await infos.api.get(`/proposta-combos/cidade?estado=${estado}`);
    if (!response || !response.data) return `Ocorreu algum erro na API! Tente novamente...`
    if(response.data.erro && response.data.mensagem == "Token expirado"){
      await getAuthToken();
      return await infos.api.get(`/proposta-combos/cidade?estado=${estado}`);
    }
    infos.cidades[estado] = Object.entries(response.data.cidade).map((entry) => ({ value: entry[0], text: entry[1].nome }));
  }
  return infos.cidades[estado];
}

async function getBalancesForCPF(cpf, info) {
  if (!info) console.log(`[API Facta] => getBalancesForCPF...`)
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  try {
    const response = await infos.api.get('/fgts/saldo', { params: { cpf: cpf } });
    if (!response || !response.data) return `Ocorreu algum erro na API! Tente novamente...`
    if(response.data.erro && response.data.mensagem === "Token expirado") {
      await getAuthToken();
      return getBalancesForCPF(cpf, true)
    }
    if (response.data.msg && response.data.msg.includes('Tente novamente em alguns minutos')) {
      await await getAuthToken();
      return getBalancesForCPF(cpf,true)
    }
    return response;
  } catch(err) {
    console.log(`[API Facta ERROR (1)] => getBalancesForCPF: ${err}`)
    console.log(err)
    return false;
  }
}

async function calculateNetValue(cpf, selectedInstallments, tabela = 38768 , taxa = 2.04) {
  console.log(`[API Facta] => calculateNetValue...`)
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  const parcelas = selectedInstallments.map((installment) => ({
    [`dataRepasse_${installment.index + 1}`]: installment.data,
    [`valor_${installment.index + 1}`]: installment.valor
  }));
  try{
    const response = await infos.api.post('fgts/calculo', { cpf, parcelas, tabela, taxa });
    if (!response || !response.data) return `Ocorreu algum erro na API! Tente novamente...`
    if(response.data.erro && response.data.mensagem === "Token expirado"){
      await getAuthToken();
      return await infos.api.post('fgts/calculo', { cpf, parcelas, tabela, taxa });
    }
    return response;
  }catch(err){
    if(err.data && err.data.erro && err.data.mensagem === "Token expirado"){
      await getAuthToken();
      return await infos.api.post('fgts/calculo', { cpf, parcelas, tabela, taxa });
    }else{
      console.log(`[API Facta ERROR (2)] Erro em getBalancesForCPF: ${err}`)
      //console.log(err)
      return false;
    }
  }
}

async function linkSimulationToProposal(cpf, simulacao_fgts, data_nascimento) {
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API Facta] => linkSimulationToProposal...`)
  const form = new FormData();
  form.append('cpf', cpf);
  form.append('simulacao_fgts', simulacao_fgts);
  form.append('data_nascimento', data_nascimento);
  form.append('produto', 'D');
  form.append('tipo_operacao', '13');
  form.append('averbador', '20095');
  form.append('convenio', '3');
  form.append('login_certificado', infos.login_certificado);
  const response = await infos.api.post('/proposta/etapa1-simulador', form, { headers: form.getHeaders() });
  if (!response || !response.data) return `Ocorreu algum erro na API! Tente novamente...`
  if (response.data.erro && response.data.mensagem === "Token expirado") {
    await getAuthToken();
    return await infos.api.post('/proposta/etapa1-simulador', form, { headers: form.getHeaders() });
  } else return response;
}





async function getOperDisponivelINSS(dados) {
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API Facta] => getOperDisponivelINSS...`)
  const url = dados.opcao_valor === 1 ?
    `/proposta/operacoes-disponiveis?produto=D&tipo_operacao=${dados.tipo_oper}&averbador=3&convenio=3&opcao_valor=${dados.opcao_valor}&valor=${dados.valor}&valor_parcela=&prazo=${dados.prazo}&cpf=${dados.cpf}&data_nascimento=${dados.data_nascimento}` :
    `/proposta/operacoes-disponiveis?produto=D&tipo_operacao=${dados.tipo_oper}&averbador=3&convenio=3&opcao_valor=${dados.opcao_valor}&valor=&valor_parcela=${dados.parcela}&prazo=${dados.prazo}&cpf=${dados.cpf}&data_nascimento=${dados.data_nascimento}`;
  const response = await infos.api.get(url, { Authorization: `Bearer ${infos.token}` });
  if (!response || !response.data) return `Ocorreu algum erro na API! Tente novamente...`
  if (response.data.erro && response.data.mensagem === "Token expirado") {
    await getAuthToken();
    return await infos.api.get(url, { Authorization: `Bearer ${infos.token}` });
  } else return response;
}

async function linkSimulationToProposalINSS(dados) {
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API Facta] => linkSimulationToProposalINSS...`)
  const form = new FormData();
  form.append('produto', 'D');
  form.append('tipo_operacao', dados.tipo_oper);
  form.append('averbador', '3');
  form.append('convenio', '3');
  form.append('cpf', dados.cpf);
  form.append('data_nascimento', dados.data_nascimento);
  form.append('login_certificado', infos.login_certificado);
  form.append('codigo_tabela', dados.tabela);
  form.append('prazo', dados.prazo);
  form.append('valor_operacao', dados.valor);
  form.append('valor_parcela', dados.parcela);
  form.append('coeficiente', dados.coeficiente);
  const response = await infos.api.post('/proposta/etapa1-simulador', form, { headers: form.getHeaders() });
  if (!response || !response.data) return `Ocorreu algum erro na API! Tente novamente...`
  if (response.data.erro && response.data.mensagem === "Token expirado") {
    await getAuthToken();
    return await infos.api.post('/proposta/etapa1-simulador', form, { headers: form.getHeaders() });
  } else return response;
}

async function registerClient(id_simulador, clientData) {
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API Facta] => registerClient...`)
  try {
    const form = new FormData();
    // form.append('id_simulador', id_simulador);
    // form.append('cpf', clientData.cpf);
    // form.append('nome', clientData.nome);
    // form.append('sexo', clientData.sexo);
    // form.append('estado_civil', clientData.estado_civil);
    // form.append('data_nascimento', clientData.data_nascimento);
    // form.append('rg', clientData.rg);
    // form.append('estado_rg', clientData.estado_rg);
    // form.append('orgao_emissor', clientData.orgao_emissor);
    // form.append('data_expedicao', clientData.data_expedicao);
    // form.append('estado_natural', clientData.estado_natural);
    // form.append('cidade_natural', clientData.cidade_natural);
    // form.append('nacionalidade', clientData.nacionalidade);
    // form.append('pais_origem', clientData.pais_origem);
    // form.append('celular', clientData.celular);
    // form.append('renda', clientData.renda);
    // form.append('cep', clientData.cep);
    // form.append('endereco', clientData.endereco);
    // form.append('numero', clientData.numero);
    // form.append('bairro', clientData.bairro);
    // form.append('cidade', clientData.cidade);
    // form.append('estado', clientData.estado);
    // form.append('nome_mae', clientData.nome_mae);
    // form.append('nome_pai', clientData.nome_pai);
    // form.append('valor_patrimonio', clientData.valor_patrimonio);
    // form.append('cliente_iletrado_impossibilitado', clientData.cliente_iletrado_impossibilitado);
    // form.append('banco', clientData.banco);
    // form.append('agencia', clientData.agencia);
    // form.append('conta', clientData.conta);
    // form.append('matricula', clientData.matricula);
    // form.append('tipo_credito_nb', clientData.tipo_credito_nb);
    // form.append('tipo_beneficio', clientData.tipo_beneficio);
    // form.append('estado_beneficio', clientData.estado_beneficio);
    const postData = { id_simulador, ...clientData };
    const entries = Object.entries(postData);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      form.append(entry[0], entry[1]);
    }
    const response =  await infos.api.post('/proposta/etapa2-dados-pessoais', form, { headers: form.getHeaders() });
    if (!response || !response.data) return `Ocorreu algum erro na API! Tente novamente...`
    if (response.data.erro && response.data.mensagem === "Token expirado") {
      await getAuthToken();
      return registerClient(id_simulador, clientData);
    } else return response;
  } catch(err) {
    console.log(err)
  }
}

async function requestProposal(id_simulador, codigo_cliente) {
  if (!infos || !infos.api) return `API não iniciada! Tente novamente...`
  console.log(`[API Facta] => requestProposal...`)
  const form = new FormData();
  if (!id_simulador || !codigo_cliente) return `Erro ao fazer a proposta! Tente novamente...`;
  form.append('id_simulador', id_simulador);
  form.append('codigo_cliente', codigo_cliente);
  const response = await infos.api.post('/proposta/etapa3-proposta-cadastro', form, { headers: form.getHeaders() });
  if (!response || !response.data) return `Ocorreu algum erro na API! Tente novamente...`
  if (response.data.erro && response.data.mensagem === "Token expirado") {
    await getAuthToken();
    return await infos.api.post('/proposta/etapa3-proposta-cadastro', form, { headers: form.getHeaders() });
  }
  return response;
}

module.exports = {
  loadAPI,
  getComboData,
  getBancos,
  getOrgaosEmissores,
  getPaises,
  getEstados,
  getEstadoCivil,
  getValorPatrimonial,
  getCidadesByCidade,
  getCidades,
  getBalancesForCPF,
  calculateNetValue,
  linkSimulationToProposal,
  getOperDisponivelINSS,
  linkSimulationToProposalINSS,
  registerClient,
  requestProposal
}