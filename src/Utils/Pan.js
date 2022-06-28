const { max } = require('date-fns');
const Joi = require('joi');

const panIn = Joi.object({
  IdContrato: Joi.number().required(),
  IdCliente: Joi.number().required(),
  Cpf: Joi.string().alphanum().required(),
  NomeCliente: Joi.string().required(),
  Maatricula: Joi.string().allow(null, ''),
  Especie: Joi.string().allow(null, ''),
  Datanascimento: Joi.date().required(),
  rg: Joi.string().required() ,
  OrgaoEmissor: Joi.string().allow(null, ''),
  EstadoCivil: Joi.string().allow(null, ''),
  sexo: Joi.string().required(),
  CodBancoCliente: Joi.number().required(),
  BancoCliente: Joi.string().required(),
  Agencia: Joi.string().required(),
  ContaCorrente: Joi.string().required(),
  Poupanca: Joi.boolean().required(),
  Endereco: Joi.string().required(),
  EndNumero: Joi.string().required(),
  Complemento: Joi.string().allow(null, ''),
  Bairro: Joi.string().required(),
  Cidade: Joi.string().required(),
  UF: Joi.string().max(2).required() ,
  Cep: Joi.string().length(8).required(),
  NomeMae: Joi.string().required(),
  NomePai: Joi.string().pattern(/^([a-zA-Zà-úÀ-Ú ])+$/),
  Email: Joi.string().email().allow(' '),
  TelefoneConvenio: Joi.string().required(),
  Data: Joi.date().allow(null, ''),
  Valor: Joi.number().required() ,
  Tabela: Joi.string().required(),
  Prazo: Joi.number().required(),
  ValorParcela: Joi.number().allow(null, ''),
  CodBancoContrato: Joi.number().allow(null, ''),
  BancoContrato: Joi.string().required(),
  CodAgente: Joi.number().allow(null, ''),
  Agente: Joi.string().allow(null, ''),
  PrimeiroVencimento: Joi.date().allow(null, ''),
  UltimoVencimento: Joi.date().allow(null, ''),
  CodFase: Joi.number().required().allow(null, ''),
  Fase: Joi.string().allow(null, ''),
  NumeroContrato: Joi.string().allow(null, ''),
  DataLiberacao: Joi.date().allow(null, ''),
  MotivoFase: Joi.string().allow(null, ''),
  ObsMotivoFase: Joi.string().allow(null, ''),
  DataCadastramento: Joi.date().allow(null, ''),
  PendenteDocumentacao: Joi.boolean().allow(null, ''),
  ObsPendenteDocumentacao: Joi.string().allow(null, ''),
  TipoLiberacao: Joi.number().allow(null, ''),
  PortabilidadeContrato: Joi.string().allow(null, ''),
  PortabilidadeParcelas: Joi.string().allow(null, ''),
  PortabilidadePrestacao: Joi.string().allow(null, ''),
  PortabilidadeBanco: Joi.string().allow(null, ''),
})
const panINSS = Joi.object({
  IdContrato: Joi.number().required(),
  IdCliente: Joi.number().required(),
  Cpf: Joi.string().alphanum().required(),
  NomeCliente: Joi.string().required(),
  Maatricula: Joi.string().required(),
  Especie: Joi.string().required(),
  Datanascimento: Joi.date().required(),
  rg: Joi.string().required() ,
  OrgaoEmissor: Joi.string().allow(null, ''),
  EstadoCivil: Joi.string().allow(null, ''),
  sexo: Joi.string().required(),
  CodBancoCliente: Joi.number().required(),
  BancoCliente: Joi.string().required(),
  Agencia: Joi.string().required(),
  ContaCorrente: Joi.string().required(),
  Poupanca: Joi.boolean().required(),
  Endereco: Joi.string().required(),
  EndNumero: Joi.string().required(),
  Complemento: Joi.string().allow(null, ''),
  Bairro: Joi.string().required(),
  Cidade: Joi.string().required(),
  UF: Joi.string().max(2).required() ,
  Cep: Joi.string().length(8).required(),
  NomeMae: Joi.string().required(),
  NomePai: Joi.string().pattern(/^([a-zA-Zà-úÀ-Ú ])+$/),
  Email: Joi.string().email().allow(' '),
  TelefoneConvenio: Joi.string().required(),
  Data: Joi.date().allow(null, ''),
  Valor: Joi.number().required() ,
  Tabela: Joi.string().required(),
  Prazo: Joi.number().required(),
  ValorParcela: Joi.number().allow(null, ''),
  CodBancoContrato: Joi.number().allow(null, ''),
  BancoContrato: Joi.string().required(),
  CodAgente: Joi.number().allow(null, ''),
  Agente: Joi.string().allow(null, ''),
  PrimeiroVencimento: Joi.date().allow(null, ''),
  UltimoVencimento: Joi.date().allow(null, ''),
  CodFase: Joi.number().required().allow(null, ''),
  Fase: Joi.string().allow(null, ''),
  NumeroContrato: Joi.string().allow(null, ''),
  DataLiberacao: Joi.date().allow(null, ''),
  MotivoFase: Joi.string().allow(null, ''),
  ObsMotivoFase: Joi.string().allow(null, ''),
  DataCadastramento: Joi.date().allow(null, ''),
  PendenteDocumentacao: Joi.boolean().allow(null, ''),
  ObsPendenteDocumentacao: Joi.string().allow(null, ''),
  TipoLiberacao: Joi.number().required(),
  PortabilidadeContrato: Joi.string().allow(null, ''),
  PortabilidadeParcelas: Joi.string().allow(null, ''),
  PortabilidadePrestacao: Joi.string().allow(null, ''),
  PortabilidadeBanco: Joi.string().allow(null, ''),
})

const { RbancoTranslate } = require('./Utils')

const bancoTranslate = (banco) => {
  switch (banco) {
    default:
      return RbancoTranslate(banco);
  }
}

const isAprosentadoria = especie => {
  const is = ['07', '08', '41', '52','78','81','04','06','32','33','34','51','83','42','43','44','45','46','49','57','72','82','05','92','37','38','58']
  return (is.includes(especie))
}

const removeProperties = (object, propertyList) => Object.keys(object).reduce((cleanObject, key) => {
  if (!propertyList.includes(key)) {
    cleanObject[key] = object[key];
  }
  return cleanObject;
}, {});

module.exports = {
  panIn,
  panINSS,
  isAprosentadoria,
  bancoTranslate,
  removeProperties
}