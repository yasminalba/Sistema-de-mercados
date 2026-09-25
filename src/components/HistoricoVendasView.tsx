import React, { useState, useMemo } from 'react';
import { Venda } from '../types';
import { 
  History, 
  Search, 
  Filter, 
  Printer, 
  Ban, 
  Eye, 
  Clock, 
  Calendar, 
  DollarSign, 
  Receipt,
  X,
  CreditCard,
  CheckCircle,
  AlertOctagon
} from 'lucide-react';

interface HistoricoVendasViewProps {
  vendas: Venda[];
  onCancelarVenda: (vendaId: string) => Promise<void>;
  onIrParaCaixa: () => void;
}

export const HistoricoVendasView: React.FC<HistoricoVendasViewProps> = ({
  vendas,
  onCancelarVenda,
  onIrParaCaixa,
}) => {
  const [busca, setBusca] = useState('');
  const [metodoFiltro, setMetodoFiltro] = useState('todos');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'concluida' | 'cancelada'>('todos');
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);
  const [cancelando, setCancelando] = useState(false);

  // Filter sales
  const vendasFiltradas = useMemo(() => {
    return vendas.filter((v) => {
      // Search by ID, client name or client CPF
      const matchBusca =
        !busca.trim() ||
        v.id.toLowerCase().includes(busca.toLowerCase()) ||
        (v.cliente_nome && v.cliente_nome.toLowerCase().includes(busca.toLowerCase())) ||
        (v.cliente_cpf && v.cliente_cpf.includes(busca));

      // Payment method
      const matchMetodo = metodoFiltro === 'todos' || v.metodo_pagamento === metodoFiltro;

      // Status
      const matchStatus = statusFiltro === 'todos' || v.status === statusFiltro;

      return matchBusca && matchMetodo && matchStatus;
    });
  }, [vendas, busca, metodoFiltro, statusFiltro]);

  const faturamentoValido = useMemo(() => {
    return vendasFiltradas
      .filter((v) => v.status === 'concluida')
      .reduce((acc, v) => acc + Number(v.valor_total || 0), 0);
  }, [vendasFiltradas]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleCancelarVenda = async (vendaId: string) => {
    if (
      confirm(
        'Tem certeza que deseja cancelar esta venda? Os itens serão devolvidos automaticamente ao estoque!'
      )
    ) {
      setCancelando(true);
      try {
        await onCancelarVenda(vendaId);
        setVendaSelecionada(null);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        alert(`Erro ao cancelar venda: ${msg}`);
      } finally {
        setCancelando(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner and Summary */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            Histórico Geral de Vendas
          </h2>
          <p className="text-xs text-gray-500">
            Acompanhe todas as vendas concluídas, reimprima recibos ou realize estornos no estoque
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 text-xs">
            <span className="text-emerald-800 font-medium block">Total do Filtro:</span>
            <span className="text-base font-bold text-emerald-900">{formatBRL(faturamentoValido)}</span>
          </div>
          <button
            onClick={onIrParaCaixa}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            Abrir Caixa (PDV)
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ID da venda, nome do cliente ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={metodoFiltro}
            onChange={(e) => setMetodoFiltro(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-700 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="todos">Todos os Métodos</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="cartao_debito">Cartão de Débito</option>
            <option value="cartao_credito">Cartão de Crédito</option>
            <option value="vale_alimentacao">Vale Alimentação</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as any)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-700 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="todos">Todos os Status</option>
            <option value="concluida">Apenas Concluídas</option>
            <option value="cancelada">Apenas Canceladas</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {vendasFiltradas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Data e Hora</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Forma de Pagamento</th>
                  <th className="py-3 px-4 text-center">Itens</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vendasFiltradas.map((v) => {
                  const cancelada = v.status === 'cancelada';
                  return (
                    <tr key={v.id} className="hover:bg-gray-50/70 transition">
                      
                      <td className="py-3 px-4 font-mono font-medium text-gray-800 whitespace-nowrap">
                        #{v.id.slice(0, 8)}
                      </td>

                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{new Date(v.data).toLocaleString('pt-BR')}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-gray-800">
                        {v.cliente_nome ? (
                          <div>
                            <span className="font-semibold block">{v.cliente_nome}</span>
                            {v.cliente_cpf && (
                              <span className="text-[10px] text-gray-400 font-mono">CPF: {v.cliente_cpf}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Consumidor Final</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="capitalize px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[11px] font-medium">
                          {v.metodo_pagamento.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap font-medium text-gray-700">
                        {v.itens?.length || 0}
                      </td>

                      <td className="py-3 px-4 text-right font-bold whitespace-nowrap text-gray-900">
                        <span className={cancelada ? 'line-through text-gray-400' : 'text-emerald-700'}>
                          {formatBRL(v.valor_total)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            cancelada
                              ? 'bg-red-100 text-red-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {cancelada ? 'Cancelada' : 'Concluída'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          <button
                            type="button"
                            onClick={() => setVendaSelecionada(v)}
                            title="Ver Detalhes do Cupom"
                            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {!cancelada && (
                            <button
                              type="button"
                              onClick={() => handleCancelarVenda(v.id)}
                              disabled={cancelando}
                              title="Estornar / Cancelar Venda"
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-gray-400 text-xs px-4">
            <History className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <h3 className="text-sm font-bold text-gray-800">Nenhuma venda encontrada</h3>
            <p className="text-gray-400 mt-1 max-w-xs mx-auto">
              Quando você realizar vendas no Caixa (PDV), elas aparecerão listadas aqui com opção de impressão de cupom e estorno.
            </p>
          </div>
        )}
      </div>

      {/* MODAL: DETALHES DA VENDA / REIMPRESSÃO DO CUPOM */}
      {vendaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-emerald-700 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-sm">Comprovante de Venda</h3>
              </div>
              <button
                onClick={() => setVendaSelecionada(null)}
                className="text-white/80 hover:text-white p-1 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 font-mono text-xs text-gray-800 space-y-3 bg-[#faf9f6]">
              <div className="text-center border-b border-dashed border-gray-300 pb-2">
                <h4 className="font-bold text-sm tracking-wider uppercase">SUPERMERCADO GESTÃO</h4>
                <p className="text-[10px] text-gray-500">CUPOM NÃO FISCAL</p>
                <p className="text-[10px] text-gray-500">
                  {new Date(vendaSelecionada.data).toLocaleString('pt-BR')}
                </p>
                <p className="text-[10px] text-gray-500 font-bold">
                  Controle: #{vendaSelecionada.id.slice(0, 8)}
                </p>
                {vendaSelecionada.status === 'cancelada' && (
                  <p className="text-xs font-bold text-red-600 uppercase mt-1">*** VENDA CANCELADA / ESTORNADA ***</p>
                )}
              </div>

              {vendaSelecionada.cliente_nome && (
                <div className="text-[10px] border-b border-dashed border-gray-300 pb-2">
                  <p>CLIENTE: {vendaSelecionada.cliente_nome}</p>
                  {vendaSelecionada.cliente_cpf && <p>CPF: {vendaSelecionada.cliente_cpf}</p>}
                </div>
              )}

              {/* Items */}
              <div className="space-y-1.5 border-b border-dashed border-gray-300 pb-2 max-h-48 overflow-y-auto">
                {(vendaSelecionada.itens || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <div className="truncate max-w-[170px]">
                      <span>{it.quantidade}x {it.produto_nome}</span>
                    </div>
                    <span className="font-semibold">{formatBRL(it.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-[11px] pt-1 border-b border-dashed border-gray-300 pb-2">
                {vendaSelecionada.desconto > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>DESCONTO:</span>
                    <span>- {formatBRL(vendaSelecionada.desconto)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs">
                  <span>TOTAL:</span>
                  <span className="text-sm font-black">{formatBRL(vendaSelecionada.valor_total)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>PAGAMENTO ({vendaSelecionada.metodo_pagamento.toUpperCase()}):</span>
                  <span>{formatBRL(vendaSelecionada.valor_pago)}</span>
                </div>
                {vendaSelecionada.troco > 0 && (
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>TROCO:</span>
                    <span>{formatBRL(vendaSelecionada.troco)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-gray-600" />
                <span>Imprimir</span>
              </button>

              {vendaSelecionada.status !== 'cancelada' && (
                <button
                  type="button"
                  onClick={() => handleCancelarVenda(vendaSelecionada.id)}
                  disabled={cancelando}
                  className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Estornar</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
