import React, { useState, useMemo } from 'react';
import { MovimentacaoEstoque } from '../types';
import { 
  ArrowLeftRight, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RotateCcw, 
  ShoppingCart, 
  Clock, 
  SlidersHorizontal 
} from 'lucide-react';

interface MovimentacoesViewProps {
  movimentacoes: MovimentacaoEstoque[];
}

export const MovimentacoesView: React.FC<MovimentacoesViewProps> = ({ movimentacoes }) => {
  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');

  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoes.filter((m) => {
      const matchBusca =
        !busca.trim() ||
        m.produto_nome.toLowerCase().includes(busca.toLowerCase()) ||
        m.motivo.toLowerCase().includes(busca.toLowerCase());

      const matchTipo = tipoFiltro === 'todos' || m.tipo === tipoFiltro;

      return matchBusca && matchTipo;
    });
  }, [movimentacoes, busca, tipoFiltro]);

  const getTipoBadge = (tipo: MovimentacaoEstoque['tipo']) => {
    switch (tipo) {
      case 'entrada':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
            Entrada
          </span>
        );
      case 'saida':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 w-fit">
            <ArrowUpRight className="w-3 h-3 text-amber-600" />
            Saída
          </span>
        );
      case 'venda':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1 w-fit">
            <ShoppingCart className="w-3 h-3 text-blue-600" />
            Venda
          </span>
        );
      case 'estorno':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 flex items-center gap-1 w-fit">
            <RotateCcw className="w-3 h-3 text-purple-600" />
            Estorno
          </span>
        );
      case 'ajuste':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800 flex items-center gap-1 w-fit">
            <SlidersHorizontal className="w-3 h-3 text-gray-600" />
            Ajuste
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-emerald-600" />
            Auditoria de Movimentações de Estoque
          </h2>
          <p className="text-xs text-gray-500">
            Registro detalhado de cada entrada, saída, venda no caixa e ajuste de inventário
          </p>
        </div>

        <div className="text-xs font-semibold px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl self-start sm:self-auto">
          {movimentacoesFiltradas.length} registro(s)
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por produto ou motivo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-700 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="todos">Todos os Tipos</option>
            <option value="entrada">Entradas (Compras/Reposição)</option>
            <option value="saida">Saídas (Perdas/Avarias)</option>
            <option value="venda">Vendas no Caixa</option>
            <option value="estorno">Estornos / Cancelamentos</option>
            <option value="ajuste">Ajustes Manuais</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {movimentacoesFiltradas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Data e Hora</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4 text-right">Quantidade</th>
                  <th className="py-3 px-4">Motivo / Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movimentacoesFiltradas.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{new Date(m.data).toLocaleString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {m.produto_nome}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getTipoBadge(m.tipo)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900 whitespace-nowrap">
                      {m.tipo === 'saida' || m.tipo === 'venda' ? '-' : '+'}
                      {m.quantidade}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {m.motivo || 'Operação manual'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-gray-400 text-xs px-4">
            <ArrowLeftRight className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <h3 className="text-sm font-bold text-gray-800">Nenhuma movimentação registrada</h3>
            <p className="text-gray-400 mt-1 max-w-xs mx-auto">
              Quando houver cadastro de produtos, vendas no caixa ou ajustes de estoque, a auditoria completa aparecerá aqui.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
