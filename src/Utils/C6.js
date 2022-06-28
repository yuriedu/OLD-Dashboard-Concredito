const { max } = require('date-fns');
const Joi = require('joi');

const c6In = Joi.object({
    IdContrato: Joi.number().required(),
    IdCliente: Joi.number().required(),
    Cpf: Joi.string().alphanum().required(),
    NomeCliente: Joi.string().max(35).required(),
    Maatricula: Joi.string().allow(null, ''),
    Especie: Joi.string().allow(null, ''),
    Datanascimento: Joi.date().cast('string').required()/* Colocar replace para padrão yyyy-mm-dd */,
    rg: Joi.string().required() ,
    OrgaoEmissor: Joi.string().allow(null, ''),
    EstadoCivil: Joi.string().allow(null, ''),
    sexo: Joi.string().required(),
    CodBancoCliente: Joi.number().required(),
    BancoCliente: Joi.string().required(),
    Agencia: Joi.string().max(4).required(),
    ContaCorrente: Joi.string().required(),
    Poupanca: Joi.boolean().required(),
    Endereco: Joi.string().required(),
    EndNumero: Joi.string().required(),
    Complemento: Joi.string().allow(null, ''),
    Bairro: Joi.string().max(35).required(),
    Cidade: Joi.string().required(),
    UF: Joi.string().max(2).required() ,
    Cep: Joi.string().length(8).required(),
    NomeMae: Joi.string().max(40).required(),
    NomePai: Joi.string().max(40).pattern(/^([a-zA-Zà-úÀ-Ú ])+$/),
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

const { RbancoTranslate } = require('./Utils')

const bancoTranslate = (banco) => {
  switch (banco) {
    default:
      return RbancoTranslate(banco);
  }
}

const bantToString = (banco) => {
  const b = banco.toString()
  if(b.length === 1){
    return `00${b}`
  }else if(b.length === 2){
    return `0${b}`
  } else {
    return b
  }
}

const validateBanck = (banco, agencia) => {
  const validos = [ 756, 748, 136, 091, 001, 104, 033, 070, 341, 237, 041, 336, 41, 260 ]
  const invalid341 = [ 3750, 3728, 3929, 3925, 7320, 7160, 7802, 6176, 7526, 7615, 3738, 3737 ]
  if(validos.includes(banco)){
    switch(banco){
      case 33:
        return agencia === 77 ? false : true
      case 237:
        return invalid341.includes(agencia) ? false : true
      case 655:
        return agencia === 655 ? false : true
      case 341:
        return agencia === 500 ? false : true
      default:
        return true;
    }
  } else return false
}

module.exports = {
  c6In,
  bancoTranslate,
  bantToString, 
  validateBanck
}