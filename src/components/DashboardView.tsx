import React, { useState, useMemo } from 'react';
import { Produto, Venda, Modulo } from '../types';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Package, 
  AlertTriangle, 
  Calendar, 
  Printer, 
  Download, 
  ArrowUpRight, 
  CreditCard, 
  PlusCircle, 
  CheckCircle,
  Clock,
  ChevronRight
} from 'lucide-react';

interface DashboardViewProps {
  produtos: Produto[];
  vendas: Venda[];
  onNavigate: (modulo: Modulo) => void;
  onOpenNovoProduto: () => void;
}

type PeriodoFiltro = 'hoje' | 'ontem' | '7dias' | '30dias' | 'mes_atual' | 'todos';

export const DashboardView: React.FC<DashboardViewProps> = ({
  produtos,
  vendas,
  onNavigate,
  onOpenNovoProduto,
}) => {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('todos');

  // Filtragem de vendas por período selecionado
  const vendasFiltradas = useMemo(() => {
    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const inicioOntem = new Date(inicioHoje.getTime() - 24 * 60 * 60 * 1000);
    const fimOntem = new Date(inicioHoje.getTime() - 1);
    const inicio7dias = new Date(inicioHoje.getTime() - 7 * 24 * 60 * 60 * 1000);
    const inicio30dias = new Date(inicioHoje.getTime() - 30 * 24 * 60 * 60 * 1000);
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    return vendas.filter((v) => {
      if (v.status === 'cancelada') return false;
      const dataVenda = new Date(v.data);

      switch (periodo) {
        case 'hoje':
          return dataVenda >= inicioHoje;
        case 'ontem':
          return dataVenda >= inicioOntem && dataVenda <= fimOntem;
        case '7dias':
          return dataVenda >= inicio7dias;
        case '30dias':
          return dataVenda >= inicio30dias;
        case 'mes_atual':
          return dataVenda >= inicioMes;
        case 'todos':
        default:
          return true;
      }
    });
  }, [vendas, periodo]);

  // Cálculos de Indicadores Financeiros
  const faturamentoTotal = useMemo(() => {
    return vendasFiltradas.reduce((acc, v) => acc + Number(v.valor_total || 0), 0);
  }, [vendasFiltradas]);

  const totalVendasQtd = vendasFiltradas.length;

  const ticketMedio = totalVendasQtd > 0 ? faturamentoTotal / totalVendasQtd : 0;

  // Mapa de custo dos produtos para cálculo de margem e lucro real
  const produtosMap = useMemo(() => {
    const map = new Map<string, Produto>();
    produtos.forEach((p) => map.set(p.id, p));
    return map;
  }, [produtos]);

  const custoTotalVendido = useMemo(() => {
    let custo = 0;
    vendasFiltradas.forEach((v) => {
      (v.itens || []).forEach((item) => {
        const prod = produtosMap.get(item.produto_id);
        const precoCusto = prod ? Number(prod.preco_custo || 0) : 0;
        custo += precoCusto * Number(item.quantidade || 0);
      });
    });
    return custo;
  }, [vendasFiltradas, produtosMap]);

  const lucroBruto = faturamentoTotal - custoTotalVendido;
  const margemLucroPercent = faturamentoTotal > 0 ? (lucroBruto / faturamentoTotal) * 100 : 0;

  // Métricas do Estoque Geral
  const totalItensEstoque = useMemo(() => {
    return produtos.reduce((acc, p) => acc + Number(p.estoque_atual || 0), 0);
  }, [produtos]);

  const valorEstoqueCusto = useMemo(() => {
    return produtos.reduce((acc, p) => acc + Number(p.estoque_atual || 0) * Number(p.preco_custo || 0), 0);
  }, [produtos]);

  const valorEstoqueVenda = useMemo(() => {
    return produtos.reduce((acc, p) => acc + Number(p.estoque_atual || 0) * Number(p.preco_venda || 0), 0);
  }, [produtos]);

  const produtosEstoqueBaixo = useMemo(() => {
    return produtos.filter((p) => Number(p.estoque_atual) <= Number(p.estoque_minimo));
  }, [produtos]);

  // Relatório: Vendas por Método de Pagamento
  const vendasPorMetodo = useMemo(() => {
    const metodos: Record<string, { label: string; valor: number; qtd: number }> = {
      dinheiro: { label: 'Dinheiro', valor: 0, qtd: 0 },
      pix: { label: 'PIX', valor: 0, qtd: 0 },
      cartao_debito: { label: 'Cartão de Débito', valor: 0, qtd: 0 },
      cartao_credito: { label: 'Cartão de Crédito', valor: 0, qtd: 0 },
      vale_alimentacao: { label: 'Vale Alimentação', valor: 0, qtd: 0 },
      outro: { label: 'Outro', valor: 0, qtd: 0 },
    };

    vendasFiltradas.forEach((v) => {
      const m = v.metodo_pagamento || 'outro';
      if (!metodos[m]) {
        metodos[m] = { label: m, valor: 0, qtd: 0 };
      }
      metodos[m].valor += Number(v.valor_total || 0);
      metodos[m].qtd += 1;
    });

    return Object.values(metodos).filter((item) => item.qtd > 0);
  }, [vendasFiltradas]);

  // Relatório: Top Produtos Mais Vendidos
  const topProdutos = useMemo(() => {
    const ranking: Record<string, { nome: string; quantidade: number; receita: number; unidade: string }> = {};

    vendasFiltradas.forEach((v) => {
      (v.itens || []).forEach((item) => {
        const key = item.produto_id || item.produto_nome;
        if (!ranking[key]) {
          ranking[key] = {
            nome: item.produto_nome,
            quantidade: 0,
            receita: 0,
            unidade: item.unidade || 'UN',
          };
        }
        ranking[key].quantidade += Number(item.quantidade || 0);
        ranking[key].receita += Number(item.subtotal || 0);
      });
    });

    return Object.values(ranking)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }, [vendasFiltradas]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (vendasFiltradas.length === 0) {
      alert('Não há vendas no período para exportar.');
      return;
    }

    const headers = ['ID Venda', 'Data', 'Valor Total', 'Desconto', 'Metodo Pagamento', 'Status', 'Qtd Itens'];
    const rows = vendasFiltradas.map((v) => [
      v.id,
      new Date(v.data).toLocaleString('pt-BR'),
      v.valor_total.toFixed(2),
      v.desconto.toFixed(2),
      v.metodo_pagamento,
      v.status,
      v.itens?.length || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_vendas_${periodo}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Filter & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Dashboard & Relatórios Gerenciais
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Métricas em tempo real geradas exclusivamente a partir dos seus cadastros.
          </p>
        </div>

        {/* Filter & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-gray-500 ml-1.5" />
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as PeriodoFiltro)}
              className="bg-transparent text-xs font-semibold text-gray-700 py-1 pr-3 focus:outline-hidden cursor-pointer"
            >
              <option value="todos">Todo o Período</option>
              <option value="hoje">Hoje</option>
              <option value="ontem">Ontem</option>
              <option value="7dias">Últimos 7 dias</option>
              <option value="30dias">Últimos 30 dias</option>
              <option value="mes_atual">Este Mês</option>
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            title="Exportar dados do período em CSV"
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-xl transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handlePrint}
            title="Imprimir relatório"
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-xl transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-gray-500" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          <button
            onClick={() => onNavigate('vendas')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Frente de Caixa</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Faturamento */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs relative overflow-hidden group hover:border-emerald-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Faturamento</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">{formatBRL(faturamentoTotal)}</h3>
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
              <span>{totalVendasQtd} venda(s) registrada(s)</span>
            </p>
          </div>
        </div>

        {/* Card 2: Lucro Estimado */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs relative overflow-hidden group hover:border-teal-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lucro Bruto</span>
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">{formatBRL(lucroBruto)}</h3>
            <p className="text-[11px] text-teal-600 font-medium mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{margemLucroPercent.toFixed(1)}% de margem sobre vendas</span>
            </p>
          </div>
        </div>

        {/* Card 3: Ticket Médio */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs relative overflow-hidden group hover:border-blue-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket Médio</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">{formatBRL(ticketMedio)}</h3>
            <p className="text-[11px] text-gray-500 mt-1">Média por cliente atendido</p>
          </div>
        </div>

        {/* Card 4: Valor do Estoque */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs relative overflow-hidden group hover:border-amber-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estoque Atual</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">{produtos.length} produtos</h3>
            <p className="text-[11px] text-gray-500 mt-1">
              {totalItensEstoque.toLocaleString('pt-BR')} itens | Custo: {formatBRL(valorEstoqueCusto)}
            </p>
          </div>
        </div>

      </div>

      {/* Zero State if empty database */}
      {produtos.length === 0 && vendas.length === 0 && (
        <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-200 rounded-2xl p-8 text-center max-w-2xl mx-auto shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Seu Sistema de Supermercado está Pronto!</h3>
          <p className="text-xs text-gray-600 mt-2 max-w-lg mx-auto leading-relaxed">
            Conforme solicitado, <strong>nenhuma informação de modelo foi pré-cadastrada</strong>. Você tem controle total: comece cadastrando seus produtos no estoque e realizando vendas na frente de caixa.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button
              onClick={onOpenNovoProduto}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Cadastrar Primeiro Produto</span>
            </button>
            <button
              onClick={() => onNavigate('estoque')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <Package className="w-4 h-4" />
              <span>Ir para Módulo de Estoque</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Reports Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Col 1 & 2: Vendas e Top Produtos */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Relatório de Top Produtos Mais Vendidos */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Produtos Mais Vendidos</h3>
                <p className="text-xs text-gray-500">Ranking por volume de itens comercializados</p>
              </div>
              <button 
                onClick={() => onNavigate('historico_vendas')}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                Ver histórico <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {topProdutos.length > 0 ? (
              <div className="space-y-3">
                {topProdutos.map((item, idx) => {
                  const maxQtd = topProdutos[0].quantidade || 1;
                  const pct = Math.min(100, Math.round((item.quantidade / maxQtd) * 100));
                  return (
                    <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-gray-800">{item.nome}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-gray-900">{item.quantidade} {item.unidade}</span>
                          <span className="text-gray-400 mx-1">|</span>
                          <span className="font-semibold text-emerald-700">{formatBRL(item.receita)}</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                Nenhuma venda registrada ainda no período selecionado.
              </div>
            )}
          </div>

          {/* Relatório de Formas de Pagamento */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Vendas por Forma de Pagamento</h3>
                <p className="text-xs text-gray-500">Distribuição financeira das vendas fechadas</p>
              </div>
              <CreditCard className="w-4 h-4 text-gray-400" />
            </div>

            {vendasPorMetodo.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vendasPorMetodo.map((m, idx) => {
                  const pct = faturamentoTotal > 0 ? (m.valor / faturamentoTotal) * 100 : 0;
                  return (
                    <div key={idx} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-gray-700 block">{m.label}</span>
                        <span className="text-[11px] text-gray-400">{m.qtd} venda(s) ({pct.toFixed(1)}%)</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{formatBRL(m.valor)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                Sem dados de pagamento no período.
              </div>
            )}
          </div>

          {/* Últimas Vendas */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Últimas Vendas Registradas</h3>
                <p className="text-xs text-gray-500">Histórico recente de transações no caixa</p>
              </div>
              <button
                onClick={() => onNavigate('historico_vendas')}
                className="text-xs text-emerald-600 font-semibold hover:underline cursor-pointer"
              >
                Ver Todas
              </button>
            </div>

            {vendasFiltradas.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500 font-semibold pb-2">
                      <th className="py-2">Código</th>
                      <th className="py-2">Data/Hora</th>
                      <th className="py-2">Forma Pgto</th>
                      <th className="py-2 text-right">Itens</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vendasFiltradas.slice(0, 5).map((v) => (
                      <tr key={v.id} className="hover:bg-gray-50/60 transition">
                        <td className="py-2.5 font-mono font-medium text-gray-800">
                          #{v.id.slice(0, 8)}
                        </td>
                        <td className="py-2.5 text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {new Date(v.data).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 capitalize text-gray-600">
                          {v.metodo_pagamento.replace('_', ' ')}
                        </td>
                        <td className="py-2.5 text-right font-medium text-gray-700">
                          {v.itens?.length || 0}
                        </td>
                        <td className="py-2.5 text-right font-bold text-emerald-700">
                          {formatBRL(v.valor_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                Nenhuma venda registrada até o momento.
              </div>
            )}
          </div>

        </div>

        {/* Col 3: Alertas de Estoque & Resumo Patrimonial */}
        <div className="space-y-6">
          
          {/* Card: Alertas de Estoque Baixo */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Alertas de Estoque</h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                {produtosEstoqueBaixo.length} alerta(s)
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">Produtos abaixo ou igual ao estoque mínimo</p>

            {produtosEstoqueBaixo.length > 0 ? (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {produtosEstoqueBaixo.map((p) => {
                  const zerado = Number(p.estoque_atual) <= 0;
                  return (
                    <div 
                      key={p.id} 
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                        zerado ? 'bg-red-50/60 border-red-200' : 'bg-amber-50/60 border-amber-200'
                      }`}
                    >
                      <div>
                        <h4 className="font-semibold text-gray-900">{p.nome}</h4>
                        <span className="text-[11px] text-gray-500">
                          Cód: {p.codigo_barras} | Mín: {p.estoque_minimo} {p.unidade}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold block ${zerado ? 'text-red-700' : 'text-amber-700'}`}>
                          {p.estoque_atual} {p.unidade}
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">
                          {zerado ? 'Esgotado' : 'Estoque Baixo'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-emerald-700 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                Todos os produtos estão com estoque em nível normal!
              </div>
            )}

            <button
              onClick={() => onNavigate('estoque')}
              className="mt-4 w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold border border-gray-200 transition cursor-pointer"
            >
              Gerenciar Estoque de Produtos
            </button>
          </div>

          {/* Card: Patrimônio em Mercadorias */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Valor Imobilizado em Estoque</h3>
            <p className="text-xs text-gray-500 mb-4">Comparativo financeiro do seu estoque</p>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                <span className="text-gray-600">Total a Preço de Custo:</span>
                <span className="font-bold text-gray-900">{formatBRL(valorEstoqueCusto)}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                <span className="text-gray-600">Potencial a Preço de Venda:</span>
                <span className="font-bold text-emerald-700">{formatBRL(valorEstoqueVenda)}</span>
              </div>
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                <span className="font-medium text-emerald-900">Lucro Potencial Projetado:</span>
                <span className="font-bold text-emerald-800">
                  {formatBRL(Math.max(0, valorEstoqueVenda - valorEstoqueCusto))}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-md">
            <h3 className="text-sm font-bold mb-1">Ações Rápidas</h3>
            <p className="text-xs text-emerald-100 mb-4">Acesse os recursos mais comuns do supermercado</p>
            <div className="space-y-2">
              <button
                onClick={onOpenNovoProduto}
                className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer"
              >
                <span>+ Cadastrar Novo Produto</span>
                <PlusCircle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigate('vendas')}
                className="w-full py-2 px-3 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer shadow-xs"
              >
                <span>Abrir Frente de Caixa (PDV)</span>
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
