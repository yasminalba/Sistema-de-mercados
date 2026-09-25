import React from 'react';
import { Modulo } from '../types';
import { 
  BarChart3, 
  Package, 
  ShoppingCart, 
  History, 
  ArrowLeftRight, 
  Database, 
  CheckCircle2, 
  Store
} from 'lucide-react';
import { getStoredSupabaseConfig } from '../lib/supabase';

interface HeaderProps {
  currentModulo: Modulo;
  onSelectModulo: (m: Modulo) => void;
  onOpenSupabaseModal: () => void;
  totalProdutos: number;
  totalVendas: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentModulo,
  onSelectModulo,
  onOpenSupabaseModal,
  totalProdutos,
  totalVendas,
}) => {
  const config = getStoredSupabaseConfig();
  const isSupabaseConfigured = Boolean(config.url && config.anonKey);

  const navItems: { id: Modulo; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard & Relatórios',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'estoque',
      label: 'Estoque de Produtos',
      icon: <Package className="w-4 h-4" />,
      badge: totalProdutos,
    },
    {
      id: 'vendas',
      label: 'Frente de Caixa (PDV)',
      icon: <ShoppingCart className="w-4 h-4" />,
    },
    {
      id: 'historico_vendas',
      label: 'Histórico de Vendas',
      icon: <History className="w-4 h-4" />,
      badge: totalVendas,
    },
    {
      id: 'movimentacoes',
      label: 'Movimentações',
      icon: <ArrowLeftRight className="w-4 h-4" />,
    },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top row: Brand & Status */}
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900 tracking-tight">Supermercado Gestão</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  PDV & Estoque
                </span>
              </div>
              <p className="text-xs text-gray-500 hidden sm:block">Controle completo de estoque, ponto de vendas e relatórios</p>
            </div>
          </div>

          {/* Database Connection Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSupabaseModal}
              title="Configurar conexão com o Supabase"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                isSupabaseConfigured
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <div className="flex items-center gap-1.5">
                {isSupabaseConfigured ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-semibold">Supabase Ativo</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-0.5" />
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span className="font-semibold">Conectar Supabase</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Bottom row: Tab Navigation */}
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {navItems.map((item) => {
            const isActive = currentModulo === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectModulo(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-emerald-700 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
