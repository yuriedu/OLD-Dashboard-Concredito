console.log(`[Consultas WebSite] => Starting...`)
require('dotenv-safe').config();
const { SLQServerDB } = require('./src/database/mysql');
const database = require('./src/database/mongodb');
const bodyparser = require("body-parser");
const express = require("express");
const moment = require(`moment`);
moment.locale("pt-BR");
//FGTS
const FactaFGTS = require('./src/Controllers/FGTS/Facta');
const C6FGTS = require('./src/Controllers/FGTS/C6');
const PanFGTS = require('./src/Controllers/FGTS/Pan');
const SafraFGTS = require('./src/Controllers/FGTS/Safra');
const BMGFGTS = require('./src/Controllers/FGTS/BMG');
const MercantilFGTS = require('./src/Controllers/FGTS/Mercantil');
//INSS
const FactaINSS = require('./src/Controllers/INSS/Facta');
const PanINSS = require('./src/Controllers/INSS/Pan');
const CartPanINSS = require('./src/Controllers/INSS/CartPan');
const BanrisulINSS = require('./src/Controllers/INSS/Banrisul');
//CONSULTAS
const FactaConsultas = require('./src/Controllers/Consultas/Facta');
const SafraConsultas = require('./src/Controllers/Consultas/Safra');
const BMGConsultas = require('./src/Controllers/Consultas/BMG');
const MercantilConsultas = require('./src/Controllers/Consultas/Mercantil');
const C6Consultas = require('./src/Controllers/Consultas/C6');
const PanConsultas = require('./src/Controllers/Consultas/Pan');

var lotesCSV = []

// const bmg = require('./src/APIs/Banrisul')
// bmg.loadAPI()

var consultandoLotes = false

express()
  .use(bodyparser.json())
  .use(bodyparser.urlencoded({ extended: true }))
  .engine("html", require("ejs").renderFile)
  .use(express.static(require('path').join(__dirname, '/public')))
  .set("view engine", "ejs")
  .get('/login', async function(req, res) { res.render(__dirname+'/views/login.ejs', {}); })
  .get('/logout', async function(req, res) { res.render(__dirname+'/views/logout.ejs', {}); })
  .get('/', async function(req, res) { res.redirect("/consultar") })
  .get('/cadastrar', async function(req, res) {
    res.render(__dirname+'/views/cadastrar.ejs', {});
  })
  .get('/consultar', async function(req, res) {
    res.render(__dirname+'/views/consultar.ejs', {});
  })
  .get('/lotes/:user/:pass', async function(req, res) {
    if (req.params.user !== "Willian" || req.params.user !== "Gustavo") return res.redirect('/consultar')
    if (req.params.user !== "willianConcredito4334" || req.params.pass !== "gustavoConcredito4334") return res.redirect('/consultar')
    res.render(__dirname+'/views/lotes.ejs', {});
  })
  .get('/download', async function(req, res){
    const createCsvWriter = require('csv-writer').createObjectCsvWriter;
    const csvWriter = createCsvWriter({
      path: 'lotes.csv',
      header: [
        {id: 'hours', title: 'Horas'},
        {id: 'cpf', title: 'Cpf'},
        {id: 'bank', title: 'Banco'},
        {id: 'valor', title: 'Valor Liberado'},
        {id: 'valorTotal', title: 'Valor Total'}
      ]
    });
    csvWriter.writeRecords(lotesCSV).then(()=> {
      const file = `${__dirname}/lotes.csv`;
      return res.download(file);
    });
  })
  .post('/lotes', async function(req, res) {
    try {
      if (req.body.cpf && req.body.cpf.length == 11) {
        if (req.body.user !== "Willian" || req.body.user !== "Gustavo") return res.send({cpf: req.body.cpf, error: 'VOCÊ NÃO TEM PERMISSÃO PARA FAZER CONSULTAS EM LOTES!'})
        if (req.body.pass !== "willianConcredito4334" || req.body.pass !== "gustavoConcredito4334") return res.send({cpf: req.body.cpf, error: 'VOCÊ NÃO TEM PERMISSÃO PARA FAZER CONSULTAS EM LOTES!'})
        database.Lotes.findById('Lotes', async (error, table) => {
          if (consultandoLotes) return res.send({cpf: req.body.cpf, error: 'ALGUEM JÁ ESTÁ CONSULTANDO NO MOMENTE! PESSO QUE FECHE A PAGINA E ESPERE A OUTRA PESSOA CONSULTAR!'})
          consultandoLotes = true
          await timeout(3000)
          console.log(`Consulta em Lotes - USER: ${req.body.user} - CPF: ${req.body.cpf}`)
          let response = []
          if (req.body.facta == 'true') {
            response[response.length] = { cpf: req.body.cpf, bank: "FACTA FINANCEIRA", response: await FactaConsultas.simularFacta(req.body.cpf, req.body.factaTabela) };
          }
          if (req.body.c6 == 'true') {
            if (req.body.c6Type == 'POR_VALOR_SOLICITADO' && !req.body.c6Valor) {
              consultandoLotes = false
              return res.send({cpf: req.body.cpf, error: 'Valor não colocado...'})
            }
            response[response.length] = { cpf: req.body.cpf, bank: "BANCO C6", response: await C6Consultas.consultarC6(req.body.cpf, req.body.c6Type, req.body.c6Valor) };
          }
          if (req.body.pan == 'true') {
            response[response.length] = { cpf: req.body.cpf, bank: "PANAMERICANO", response: await PanConsultas.consultarPan(req.body.cpf, req.body.panType, req.body.panValor) };
          }
          if (req.body.safra == 'true') {
            response[response.length] = { cpf: req.body.cpf, bank: "SAFRA", response: await SafraConsultas.consultarSafra(req.body.cpf, req.body.safraParcelas) };
          }
          if (req.body.mercantil == 'true') {
            response[response.length] = { cpf: req.body.cpf, bank: "MERCANTIL", response: await MercantilConsultas.consultarMercantil(req.body.cpf) };
          }
          if (req.body.bmg == 'true') {
            response[response.length] = { cpf: req.body.cpf, bank: "BMG", response: await BMGConsultas.consultarBMG(req.body.cpf) };
          }
          if (response.length <= 0) {
            consultandoLotes = false
            return res.send({cpf: req.body.cpf, error: 'CPF não foi consultado por algum erro na API! Tente novamente...'})
          }
          await response.forEach((element,index)=>{
            if (!element.cpf || !element.response) return;
            if (lotesCSV.findIndex(r=>r.cpf == element.cpf && r.bank == element.bank) < 0) {
              var now = moment();
              lotesCSV[lotesCSV.length] = {
                hours: `${now.hour()}:${now.minutes()}`,
                cpf: element.cpf,
                bank: element.bank,
                valor: element.response.error ? element.response.error : element.response.valor,
                valorTotal: element.response.valorTotal,          
              }
            } else {
              var now = moment();
              lotesCSV[lotesCSV.findIndex(r=>r.cpf == element.cpf && r.bank == element.bank)] = {
                hours: `${now.hour()}:${now.minutes()}`,
                cpf: element.cpf,
                bank: element.bank,
                valor: element.response.error ? element.response.error : element.response.valor,
                valorTotal: element.response.valorTotal             
              }
            }
          })
          consultandoLotes = false
          return res.send(response)
        })
      } else {
        consultandoLotes = false
        return res.send({cpf: req.body.cpf, error: 'Cpf Invalido...'})
      }
    } catch(e) {
      consultandoLotes = false
      return res.send({cpf: req.body.cpf, error: 'CPF não foi consultado por algum erro na API! Tente novamente...'})
    }
  })
  .post('/login', async function(req, res) {
    if (req.body.error) console.log(req.body.error)
    if (req.body.user && req.body.password) {
      if (req.body.user == "Concredito" && req.body.password == "Concredito@4334") {
        return res.send(true)
      } else return res.status(500).send('User or Password incorrect...')
    } else return res.status(500).send('User or Password undefined...')
  })
  .post('/refreshFGTS', async function(req, res) {
    try {
      const pool = await SLQServerDB();
      const result = await pool.request().input('orgao', 23).execute('pr_consulta_contratos_para_robo');
      return res.send(result)
    }catch(err){
      console.log(`[POST /refreshFGTS] => ${err}`)
      console.log(err)
      return res.status(500).send(`Ocorreu algum erro ao atualizar as propostas FGTS!\nReporte ao Yuri`)
    }
  })
  .post('/cadastrarFGTS', async function(req, res) {
    try {
      const pool = await SLQServerDB();
      const result = await pool.request().input('orgao', 23).execute('pr_consulta_contratos_para_robo');
      var sucess = []
      var errors = []
      await Promise.all(result.recordset.map(async function(element) {
        if (element.Cpf == "50817078053") return;
        for(var key in element) { element[key] = removeSpaces(element[key]) }
        let response = false
        if(element.BancoContrato === 'FACTA FINANCEIRA') {
          response = await FactaFGTS(element, pool);
        } else if (element.BancoContrato == 'BANCO C6') {
          response = await C6FGTS(element, pool);
        } else if (element.BancoContrato == 'PANAMERICANO') {
          response = await PanFGTS(element, pool);
        } else if (element.BancoContrato == 'SAFRA' && result.recordset.filter(r=>r.BancoContrato == 'SAFRA').length == result.recordset.length ) {
          response = await SafraFGTS(element, pool);
        } else if (element.BancoContrato == 'BMG') {
          response = await BMGFGTS(element, pool, req.body.token);
        } else if (element.BancoContrato == 'MERCANTIL') {
          response = await MercantilFGTS(element, pool);
        }
        if (response) {
          if (response.status) sucess[sucess.length] = { client: element, data: response.data }
          if (!response.status) errors[errors.length] = { client: element, data: response.data }
        }
      }))
      return res.send({ sucess: sucess, erros: errors })
    } catch(err) {
      console.log(`[POST /cadastrarFGTS] => ${err}`)
      console.log(err)
      return res.status(500).send(`Ocorreu algum erro ao cadastrar as propostas FGTS!\nReporte ao Yuri`)
    }
  })
  .post('/refreshINSS', async function(req, res) {
    try {
      const pool = await SLQServerDB();
      const result = await pool.request().input('orgao', 1).execute('pr_consulta_contratos_para_robo');
      const cart = await pool.request().input('orgao', 7).execute('pr_consulta_contratos_para_robo');
      return res.send({default: result, cart: cart})
    } catch(err) {
      console.log(`[POST /refreshINSS] => ${err}`)
      console.log(err)
      return res.status(500).send(`Ocorreu algum erro ao atualizar as propostas INSS!\nReporte ao Yuri`)
    }
  })
  .post('/cadastrarINSS', async function(req, res) {
    try {
      const pool = await SLQServerDB();
      var sucess = []
      var errors = []
      const result = await pool.request().input('orgao', 1).execute('pr_consulta_contratos_para_robo');
      await Promise.all(result.recordset.map(async function(element) {
        if (element.Cpf == "50817078053") return;
        for(var key in element) { element[key] = removeSpaces(element[key]) }
        let response = false
        if(element.BancoContrato === 'FACTA FINANCEIRA') {
          // response = await FactaINSS(element, pool);
        } else if (element.BancoContrato == 'PANAMERICANO') {
          response = await PanINSS(element, pool);
        } else if (element.BancoContrato == 'BANRISUL') {
          response = await BanrisulINSS(element, pool);
        }
        if (response) {
          if (response.status) sucess[sucess.length] = { client: element, data: response.data }
          if (!response.status) errors[errors.length] = { client: element, data: response.data }
        }
      }))
      const result2 = await pool.request().input('orgao', 7).execute('pr_consulta_contratos_para_robo');
      await Promise.all(result2.recordset.map(async function(element) {
        if (element.Cpf == "50817078053") return;
        for(var key in element) { element[key] = removeSpaces(element[key]) }
        let response = false
        if (element.BancoContrato == 'PANAMERICANO') {
          response = await CartPanINSS(element, pool);
        }
        if (response) {
          if (response.status) sucess[sucess.length] = { client: element, data: response.data }
          if (!response.status) errors[errors.length] = { client: element, data: response.data }
        }
      }))
      return res.send({ sucess: sucess, erros: errors })
    } catch(err) {
      console.log(`[POST /cadastrar] => ${err}`)
      console.log(err)
      return res.status(500).send(`Ocorreu algum erro ao cadastrar as propostas INSS!\nReporte ao Yuri`)
    }
  })
  .post('/consultar', async function(req, res) {
    if (req.body.bank && req.body.cpf) {
      let response = false
      var sucess = []
      var errors = []
      if (req.body.bank == "FACTA FINANCEIRA") {
        response = await FactaConsultas.simularFacta(req.body.cpf, req.body.option1);
      } else if (req.body.bank == "SAFRA") {
        response = await SafraConsultas.consultarSafra(req.body.cpf, req.body.option1);
      } else if (req.body.bank == "BMG") {
        response = await BMGConsultas.consultarBMG(req.body.cpf, req.body.option1);
      } else if (req.body.bank == "MERCANTIL") {
        if (req.body.option1 == 'POR_QUANTIDADE_DE_PARCELAS' && !req.body.option2) return res.status(500).send(`Valor no colocado...`)
        response = await MercantilConsultas.consultarMercantil(req.body.cpf, req.body.option1, req.body.option2);
      } else if (req.body.bank == "BANCO C6") {
        if (req.body.option1 == 'false') return res.status(500).send(`Tipo de Simulação não colocado...`)
        if (req.body.option1 == 'POR_VALOR_SOLICITADO' && !req.body.option2) return res.status(500).send(`Valor no colocado...`)
        if (req.body.option1 == 'POR_QUANTIDADE_DE_PARCELAS' && !req.body.option2) return res.status(500).send(`Valor no colocado...`)
        response = await C6Consultas.consultarC6(req.body.cpf, req.body.option1, req.body.option2);
      } else if (req.body.bank == "PANAMERICANO") {
        if (req.body.option1 == 'false') return res.status(500).send(`Tipo de Simulação não colocado...`)
        if (req.body.option1 == 'POR_VALOR_SOLICITADO' && !req.body.option2) return res.status(500).send(`Valor no colocado...`)
        response = await PanConsultas.consultarPan(req.body.cpf, req.body.option1, req.body.option2);
      } else return res.status(500).send(`Banco não encontrado...`);
      if (response && response.status) return res.send({ parcelas: response.parcelas, valor: response.valor, valorTotal: response.valorTotal })
      if (response && response.error) return res.status(500).send(response.error)
      return res.status(500).send('Ocorreu algum erro indefinido! Tente novamente mais tarde...')
    } else return res.status(500).send(`Banco ou Cpf não colocado...`)
  })
  .post('/simular', async function(req, res) {
    if (req.body.bank && req.body.cpf && req.body.option2) {
      let response = false
      var sucess = []
      var errors = []
      if (req.body.bank == "FACTA FINANCEIRA") {
        response = await FactaConsultas.simularFacta(req.body.cpf, req.body.option2);
      } else return res.status(500).send(`Banco não encontrado...`);
      if (response.status) return res.send({ parcelas: response.parcelas, valor: response.valor })
      return res.status(500).send(response.error)
    } else return res.status(500).send(`Banco ou Cpf não colocado...`)
  })
  .listen(3000, function (err) {
    if (err) return console.log(`[Consultas WebSite] => Site Error:\n${err}`)
    console.log(`[Consultas WebSite] => WebSite Loaded!`)
  });

async function timeout(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function removeSpaces(value) {
  if (typeof value == "string") {
    if (value.slice(0,1) == " ") value = value.slice(1,value.length)
    if (value.slice(value.length-1, value.length) == " ") value = value.slice(0,value.length-1)
    if (value.slice(0,1) == " " || value.slice(value.length-1, value.length) == " ") return removeSpaces(value)
    return value;
  } else return value;
}