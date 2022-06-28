const mysql = require('mysql');
const mssql = require('mssql');
const bluebird = require('bluebird');

bluebird.promisifyAll(require('mysql/lib/Connection').prototype);
bluebird.promisifyAll(require('mysql/lib/Pool').prototype);

const { Model } = require('objection')

const Knex = require('knex')

const knex = Knex({
  client: 'mysql',
  useNullAsDefault: true,
  connection: {
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
  }
})

Model.knex(knex)

class Vendedores extends Model {
  static get tableName(){
      return 'Vendedores'
  }
  
  static get idColumn(){
      return 'idVendedor'
  }
}

class Acompanhamento extends Model {
  static get tableName(){
      return 'Acompanhamento'
  }
  
  static get idColumn(){
      return 'idAcompanhamento'
  }
}

class Cliente extends Model {
  static get tableName(){
      return 'Cliente'
  }

  static get idColumn(){
      return 'idCliente'
  }

}

class Fase extends Model{
  static get tableName(){
      return 'Fase'
  }
  static get idColumn(){
      return 'idFase'
  }
}

class PropostaFGTS extends Model {
  static get tableName(){
      return 'PropostaFGTS'
  }
  static get idColumn(){
      return 'id_proposta'
  }


}

const SLQServerDB = async () => {
  return await mssql.connect({
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PWD,
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      },
      options: {
        encrypt: true,
        enableArithAbort: true,
        trustServerCertificate: true
      }
  });
}

class DatabaseService {
  constructor() {
    this.pool = mysql.createPool({
      connectionLimit: 30,
      dateStrings: true,
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      port: process.env.MYSQL_PORT,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      multipleStatements: false,
      waitForConnections: true,
      queueLimit: 0
    });
    this.useSlave = false;
    this.escape = mysql.escape;
    this.raw = mysql.raw;
  }

  async query(sql, sqlParams, logFunctionName) {
    console.log(`[MySQL QUERY] => ${logFunctionName}`, { sql, sqlParams });
    return this.pool.queryAsync(sql, sqlParams);
  }
}

module.exports = { DatabaseService, SLQServerDB, Vendedores, Cliente, PropostaFGTS, Acompanhamento, Fase }
