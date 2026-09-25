/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Produto, Venda, MovimentacaoEstoque, Modulo } from './types';
import { dbService } from './services/db';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { EstoqueView } from './components/EstoqueView';
import { VendasView } from './components/VendasView';
import { HistoricoVendasView } from './components/HistoricoVendasView';
import { MovimentacoesView } from './components/MovimentacoesView';
import { SupabaseModal } from './components/SupabaseModal';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [moduloAtivo, setModuloAtivo] = useState<Modulo>('dashboard');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Modals state
  const [supabaseModalAberto, setSupabaseModalAberto] = useState(false);
  const [novoProdutoModalAberto, setNovoProdutoModalAberto] = useState(false);

  // Feedback notification
  const [toast, setToast] = useState<{ mensagem: string; tipo: 'sucesso' | 'info' | 'erro' } | null>(null);

  const showToast = (mensagem: string, tipo: 'sucesso' | 'info' | 'erro' = 'sucesso') => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  // Carregar dados de forma segura (sem dados modelo)
  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      const [prods, vends, movs] = await Promise.all([
        dbService.getProdutos(),
        dbService.getVendas(),
        dbService.getMovimentacoes(),
      ]);

      setProdutos(prods);
      setVendas(vends);
      setMovimentacoes(movs);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Ações de Produtos
  const handleCriarProduto = async (produtoData: Omit<Produto, 'id' | 'created_at'>) => {
    const novoProduto = await dbService.criarProduto(produtoData);
    await carregarDados();
    showToast(`Produto "${novoProduto.nome}" cadastrado com sucesso!`);
  };

  const handleAtualizarProduto = async (id: string, updates: Partial<Produto>) => {
    const prodAtualizado = await dbService.atualizarProduto(id, updates);
    await carregarDados();
    showToast(`Produto "${prodAtualizado.nome}" atualizado.`);
  };

  const handleDeletarProduto = async (id: string) => {
    await dbService.deletarProduto(id);
    await carregarDados();
    showToast('Produto excluído com sucesso.', 'info');
  };

  const handleAjustarEstoque = async (
    produtoId: string,
    qtd: number,
    tipo: 'entrada' | 'saida' | 'ajuste',
    motivo: string
  ) => {
    const prod = await dbService.ajustarEstoque(produtoId, qtd, tipo, motivo);
    await carregarDados();
    showToast(`Estoque de "${prod.nome}" atualizado para ${prod.estoque_atual} ${prod.unidade}.`);
  };

  // Ações de Vendas
  const handleRegistrarVenda = async (
    vendaData: Omit<Venda, 'id' | 'created_at'>,
    itens: Array<{
      produto_id: string;
      produto_nome: string;
      codigo_barras: string;
      quantidade: number;
      preco_unitario: number;
      subtotal: number;
      unidade: string;
    }>
  ) => {
    const novaVenda = await dbService.registrarVenda(vendaData, itens);
    await carregarDados();
    showToast(`Venda #${novaVenda.id.slice(0, 8)} finalizada com sucesso!`);
    return novaVenda;
  };

  const handleCancelarVenda = async (vendaId: string) => {
    await dbService.cancelarVenda(vendaId);
    await carregarDados();
    showToast(`Venda #${vendaId.slice(0, 8)} cancelada e estoque estornado.`, 'info');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 antialiased selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Top Header & Navigation */}
      <Header
        currentModulo={moduloAtivo}
        onSelectModulo={setModuloAtivo}
        onOpenSupabaseModal={() => setSupabaseModalAberto(true)}
        totalProdutos={produtos.length}
        totalVendas={vendas.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {carregando && (
          <div className="flex items-center justify-center py-6 text-xs text-gray-400 gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            <span>Sincronizando informações do sistema...</span>
          </div>
        )}

        {/* MODULO: DASHBOARD */}
        {moduloAtivo === 'dashboard' && (
          <DashboardView
            produtos={produtos}
            vendas={vendas}
            onNavigate={setModuloAtivo}
            onOpenNovoProduto={() => {
              setModuloAtivo('estoque');
              setNovoProdutoModalAberto(true);
            }}
          />
        )}

        {/* MODULO: ESTOQUE */}
        {moduloAtivo === 'estoque' && (
          <EstoqueView
            produtos={produtos}
            onCriarProduto={handleCriarProduto}
            onAtualizarProduto={handleAtualizarProduto}
            onDeletarProduto={handleDeletarProduto}
            onAjustarEstoque={handleAjustarEstoque}
            isModalNovoAberto={novoProdutoModalAberto}
            setIsModalNovoAberto={setNovoProdutoModalAberto}
          />
        )}

        {/* MODULO: VENDAS (PDV / CAIXA) */}
        {moduloAtivo === 'vendas' && (
          <VendasView
            produtos={produtos}
            onRegistrarVenda={handleRegistrarVenda}
            onIrParaEstoque={() => {
              setModuloAtivo('estoque');
              setNovoProdutoModalAberto(true);
            }}
          />
        )}

        {/* MODULO: HISTÓRICO DE VENDAS */}
        {moduloAtivo === 'historico_vendas' && (
          <HistoricoVendasView
            vendas={vendas}
            onCancelarVenda={handleCancelarVenda}
            onIrParaCaixa={() => setModuloAtivo('vendas')}
          />
        )}

        {/* MODULO: MOVIMENTAÇÕES DE ESTOQUE */}
        {moduloAtivo === 'movimentacoes' && (
          <MovimentacoesView movimentacoes={movimentacoes} />
        )}

      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
              toast.tipo === 'sucesso'
                ? 'bg-emerald-900 text-white border-emerald-800'
                : toast.tipo === 'erro'
                ? 'bg-red-900 text-white border-red-800'
                : 'bg-gray-900 text-white border-gray-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{toast.mensagem}</span>
          </div>
        </div>
      )}

      {/* Supabase Connection & Setup Modal */}
      <SupabaseModal
        isOpen={supabaseModalAberto}
        onClose={() => setSupabaseModalAberto(false)}
        onConfigUpdated={() => {
          carregarDados();
          showToast('Configurações atualizadas!');
        }}
      />

    </div>
  );
}
