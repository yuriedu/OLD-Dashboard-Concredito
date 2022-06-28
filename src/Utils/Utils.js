const tradutor = {
  IdContrato: 'Codigo da AF',
  IdCliente: 'Codigo Cliente',
  Cpf: 'Cpf',
  NomeCliente: 'Nome do Cliente',
  Maatricula: 'Matricula',
  Especie: 'Espécie do Benefício',
  Datanascimento: 'Data de Nascimento',
  rg: 'RG',
  OrgaoEmissor: 'Orgão Emissor',
  EstadoCivil: 'Estado Civil',
  sexo: 'Sexo',
  CodBancoCliente: 'Codigo do Banco do Cliente',
  BancoCliente: 'Banco do Cliente',
  Agencia: 'Agencia do Cliente',
  ContaCorrente: 'Conta do Cliente',
  Poupanca: 'Poupança',
  Endereco: 'Logradouro',
  EndNumero: 'Numero do Endereço',
  Complemento: 'Complemento',
  Bairro: 'Bairro',
  Cidade: 'Cidade',
  UF: 'Estado',
  Cep: 'CEP',
  NomeMae: 'Nome da Mãe',
  NomePai: 'Nome do Pai',
  Email: 'Email',
  TelefoneConvenio: 'Telefone da Lista',
  Data: 'Data',
  Valor: 'Valor da AF',
  Tabela: 'Tabela',
  Prazo: 'Prazo',
  ValorParcela: 'Valor da Parcela',
  CodBancoContrato: 'Codigo do Banco do Contrato',
  BancoContrato: 'Banco do Contrato',
  CodAgente: 'Codigo do Agente',
  Agente: 'Nome Agente',
  PrimeiroVencimento: 'Primeira data de vencimento',
  UltimoVencimento: 'Ultima data de vencimento',
  CodFase: 'Codigo da Fase',
  Fase: 'Fase',
  NumeroContrato: 'Numero do Contrato',
  DataLiberacao: 'Data de Liberação',
  MotivoFase: 'Motivo da Fase',
  ObsMotivoFase: 'Observação de motivo da Fase',
  DataCadastramento: 'DataCadastramento',
  PendenteDocumentacao: 'Pendente de documentação',
  ObsPendenteDocumentacao: 'Observação de pensencia de documentação',
  TipoLiberacao: 'Tipo Liberação do Beneficio'
}

const RbancoTranslate = (banco) => {
  switch (banco) {
    case 1072:
      return 756;
    case 1071:
      return 748; 
    case 394:
      return 237;
    case 29:
      return 341;
    case 626:
      return 336;
    default:
      return banco;
  }
}

async function save(table) {
  table.save()
}

module.exports = {
  save,
  tradutor,
  RbancoTranslate
}