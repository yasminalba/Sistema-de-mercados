export interface Produto {
  id: string;
  codigo_barras: string;
  nome: string;
  categoria: string;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  unidade: 'UN' | 'KG' | 'L' | 'PCT' | 'CX' | 'G' | 'ML';
  created_at: string;
  updated_at?: string;
}

export type MetodoPagamento = 
  | 'dinheiro' 
  | 'cartao_credito' 
  | 'cartao_debito' 
  | 'pix' 
  | 'vale_alimentacao' 
  | 'outro';

export interface ItemVenda {
  id: string;
  venda_id: string;
  produto_id: string;
  produto_nome: string;
  codigo_barras: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  unidade: string;
  created_at: string;
}

export interface Venda {
  id: string;
  data: string;
  valor_total: number;
  desconto: number;
  valor_pago: number;
  troco: number;
  metodo_pagamento: MetodoPagamento;
  cliente_nome?: string;
  cliente_cpf?: string;
  status: 'concluida' | 'cancelada';
  created_at: string;
  itens?: ItemVenda[];
}

export interface MovimentacaoEstoque {
  id: string;
  produto_id: string;
  produto_nome: string;
  tipo: 'entrada' | 'saida' | 'ajuste' | 'venda' | 'estorno';
  quantidade: number;
  motivo: string;
  data: string;
  created_at: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export type Modulo = 'dashboard' | 'estoque' | 'vendas' | 'historico_vendas' | 'movimentacoes';
