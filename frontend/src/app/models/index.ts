export interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: string;
  categoria: string;
  conta?: string;
  contaOrigem?: string;
  contaDestino?: string;
  data: string;
  mesReferencia?: string;
}

export interface Conta {
  id: string;
  nome: string;
  tipo: string;
  saldoInicial?: number;
  diaFechamento?: number;
  diaVencimento?: number;
  finalCartao?: string;
  corCartao?: string;
  saldo?: number;
}

export interface Categoria {
  id: string;
  nome: string;
  iconName: string;
  cor: string;
  tipo: string;
  iconClass?: string;
}
