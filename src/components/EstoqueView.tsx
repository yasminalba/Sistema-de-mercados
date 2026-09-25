import React, { useState, useMemo } from 'react';
import { Produto } from '../types';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Barcode, 
  SlidersHorizontal, 
  X, 
  Sparkles,
  DollarSign
} from 'lucide-react';

interface EstoqueViewProps {
  produtos: Produto[];
  onCriarProduto: (produto: Omit<Produto, 'id' | 'created_at'>) => Promise<void>;
  onAtualizarProduto: (id: string, produto: Partial<Produto>) => Promise<void>;
  onDeletarProduto: (id: string) => Promise<void>;
  onAjustarEstoque: (id: string, qtd: number, tipo: 'entrada' | 'saida' | 'ajuste', motivo: string) => Promise<void>;
  isModalNovoAberto: boolean;
  setIsModalNovoAberto: (aberto: boolean) => void;
}

const CATEGORIAS_PADRAO = [
  'Mercearia',
  'Hortifruti',
  'Açougue / Carnes',
  'Bebidas',
  'Frios e Laticínios',
  'Padaria e Confeitaria',
  'Limpeza',
  'Higiene e Perfumaria',
  'Congelados',
  'Doces e Biscoitos',
  'Pet Shop',
  'Outros',
];

export const EstoqueView: React.FC<EstoqueViewProps> = ({
  produtos,
  onCriarProduto,
  onAtualizarProduto,
  onDeletarProduto,
  onAjustarEstoque,
  isModalNovoAberto,
  setIsModalNovoAberto,
}) => {
  // Filters state
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'baixo' | 'esgotado' | 'normal'>('todos');

  // Edit modal state
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);

  // Quick Adjustment modal state
  const [ajusteModal, setAjusteModal] = useState<{
    aberto: boolean;
    produtoId: string;
    tipo: 'entrada' | 'saida' | 'ajuste';
    quantidade: string;
    motivo: string;
  }>({
    aberto: false,
    produtoId: '',
    tipo: 'entrada',
    quantidade: '1',
    motivo: '',
  });

  // Product Form State (for both create and edit)
  const [formCodigo, setFormCodigo] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formCategoria, setFormCategoria] = useState('Mercearia');
  const [formPrecoCusto, setFormPrecoCusto] = useState('');
  const [formPrecoVenda, setFormPrecoVenda] = useState('');
  const [formEstoqueAtual, setFormEstoqueAtual] = useState('');
  const [formEstoqueMinimo, setFormEstoqueMinimo] = useState('5');
  const [formUnidade, setFormUnidade] = useState<'UN' | 'KG' | 'L' | 'PCT' | 'CX' | 'G' | 'ML'>('UN');
  const [formErro, setFormErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Generate random standard EAN-13 barcode
  const gerarCodigoBarras = () => {
    let codigo = '789'; // Prefixo Brasil
    for (let i = 0; i < 9; i++) {
      codigo += Math.floor(Math.random() * 10);
    }
    // Check digit
    let soma = 0;
    for (let i = 0; i < 12; i++) {
      soma += parseInt(codigo[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const digito = (10 - (soma % 10)) % 10;
    codigo += digito;
    setFormCodigo(codigo);
  };

  // Open Edit Modal
  const handleAbrirEdicao = (prod: Produto) => {
    setProdutoEditando(prod);
    setFormCodigo(prod.codigo_barras);
    setFormNome(prod.nome);
    setFormCategoria(prod.categoria || 'Mercearia');
    setFormPrecoCusto(String(prod.preco_custo));
    setFormPrecoVenda(String(prod.preco_venda));
    setFormEstoqueAtual(String(prod.estoque_atual));
    setFormEstoqueMinimo(String(prod.estoque_minimo));
    setFormUnidade(prod.unidade || 'UN');
    setFormErro(null);
  };

  const handleAbrirNovo = () => {
    setProdutoEditando(null);
    setFormCodigo('');
    setFormNome('');
    setFormCategoria('Mercearia');
    setFormPrecoCusto('');
    setFormPrecoVenda('');
    setFormEstoqueAtual('0');
    setFormEstoqueMinimo('5');
    setFormUnidade('UN');
    setFormErro(null);
    setIsModalNovoAberto(true);
  };

  // Calculate margin % on the fly
  const margemLucroCalculada = useMemo(() => {
    const custo = parseFloat(formPrecoCusto) || 0;
    const venda = parseFloat(formPrecoVenda) || 0;
    if (venda <= 0) return 0;
    return ((venda - custo) / venda) * 100;
  }, [formPrecoCusto, formPrecoVenda]);

  // Handle Save (Create or Update)
  const handleSalvarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErro(null);

    if (!formNome.trim()) {
      setFormErro('Informe o nome do produto.');
      return;
    }

    if (!formCodigo.trim()) {
      setFormErro('Informe ou gere um código de barras para o produto.');
      return;
    }

    const custo = parseFloat(formPrecoCusto) || 0;
    const venda = parseFloat(formPrecoVenda) || 0;
    const estoque = parseFloat(formEstoqueAtual) || 0;
    const estoqueMin = parseFloat(formEstoqueMinimo) || 0;

    if (venda <= 0) {
      setFormErro('O preço de venda deve ser maior que zero.');
      return;
    }

    setSalvando(true);
    try {
      if (produtoEditando) {
        await onAtualizarProduto(produtoEditando.id, {
          codigo_barras: formCodigo.trim(),
          nome: formNome.trim(),
          categoria: formCategoria,
          preco_custo: custo,
          preco_venda: venda,
          estoque_atual: estoque,
          estoque_minimo: estoqueMin,
          unidade: formUnidade,
        });
        setProdutoEditando(null);
      } else {
        await onCriarProduto({
          codigo_barras: formCodigo.trim(),
          nome: formNome.trim(),
          categoria: formCategoria,
          preco_custo: custo,
          preco_venda: venda,
          estoque_atual: estoque,
          estoque_minimo: estoqueMin,
          unidade: formUnidade,
        });
        setIsModalNovoAberto(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFormErro(msg);
    } finally {
      setSalvando(false);
    }
  };

  // Handle Quick Adjustment submit
  const handleSalvarAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ajusteModal.produtoId) return;
    const qtd = parseFloat(ajusteModal.quantidade) || 0;
    if (qtd <= 0 && ajusteModal.tipo !== 'ajuste') {
      alert('Informe uma quantidade válida.');
      return;
    }

    setSalvando(true);
    try {
      await onAjustarEstoque(
        ajusteModal.produtoId,
        qtd,
        ajusteModal.tipo,
        ajusteModal.motivo || 'Ajuste manual de estoque'
      );
      setAjusteModal({
        aberto: false,
        produtoId: '',
        tipo: 'entrada',
        quantidade: '1',
        motivo: '',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Erro ao ajustar estoque: ${msg}`);
    } finally {
      setSalvando(false);
    }
  };

  // Filter products list
  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      // Search
      const matchBusca =
        !busca.trim() ||
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.codigo_barras.toLowerCase().includes(busca.toLowerCase());

      // Category
      const matchCat = categoriaFiltro === 'todas' || p.categoria === categoriaFiltro;

      // Status
      let matchStatus = true;
      const atual = Number(p.estoque_atual);
      const min = Number(p.estoque_minimo);
      if (statusFiltro === 'esgotado') {
        matchStatus = atual <= 0;
      } else if (statusFiltro === 'baixo') {
        matchStatus = atual > 0 && atual <= min;
      } else if (statusFiltro === 'normal') {
        matchStatus = atual > min;
      }

      return matchBusca && matchCat && matchStatus;
    });
  }, [produtos, busca, categoriaFiltro, statusFiltro]);

  // Overall stock stats
  const totalItens = useMemo(() => {
    return produtos.reduce((acc, p) => acc + Number(p.estoque_atual || 0), 0);
  }, [produtos]);

  const totalValorCusto = useMemo(() => {
    return produtos.reduce((acc, p) => acc + Number(p.estoque_atual || 0) * Number(p.preco_custo || 0), 0);
  }, [produtos]);

  const totalValorVenda = useMemo(() => {
    return produtos.reduce((acc, p) => acc + Number(p.estoque_atual || 0) * Number(p.preco_venda || 0), 0);
  }, [produtos]);

  const totalAlertas = useMemo(() => {
    return produtos.filter((p) => Number(p.estoque_atual) <= Number(p.estoque_minimo)).length;
  }, [produtos]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner and Quick Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Produtos</span>
          <p className="text-xl font-bold text-gray-900 mt-1">{produtos.length} cadastrados</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Itens em Estoque</span>
          <p className="text-xl font-bold text-gray-900 mt-1">{totalItens.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Valor em Venda</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">{formatBRL(totalValorVenda)}</p>
          <span className="text-[10px] text-gray-400">Custo: {formatBRL(totalValorCusto)}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Alertas Estoque</span>
          <p className="text-xl font-bold text-amber-800 mt-1">{totalAlertas} produto(s)</p>
          <span className="text-[10px] text-amber-600">Abaixo do mínimo</span>
        </div>
      </div>

      {/* Control Bar: Search & Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              Controle de Estoque e Catálogo
            </h2>
            <p className="text-xs text-gray-500">Cadastre, edite e gerencie quantidades e preços das mercadorias</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (produtos.length === 0) {
                  alert('Cadastre um produto primeiro para poder ajustar o estoque.');
                  return;
                }
                setAjusteModal({
                  aberto: true,
                  produtoId: produtos[0].id,
                  tipo: 'entrada',
                  quantidade: '1',
                  motivo: '',
                });
              }}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Ajuste Rápido</span>
            </button>

            <button
              onClick={handleAbrirNovo}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Produto</span>
            </button>
          </div>
        </div>

        {/* Filter inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-gray-100">
          
          {/* Search by Name or Barcode */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome ou código de barras..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter by Category */}
          <div className="sm:col-span-3">
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-700 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="todas">Todas as Categorias</option>
              {CATEGORIAS_PADRAO.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Stock Status */}
          <div className="sm:col-span-3">
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-700 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="todos">Todos os Níveis</option>
              <option value="baixo">⚠️ Estoque Baixo</option>
              <option value="esgotado">🛑 Esgotado (Zerado)</option>
              <option value="normal">✅ Estoque Normal</option>
            </select>
          </div>

        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {produtosFiltrados.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-right">P. Custo</th>
                  <th className="py-3 px-4 text-right">P. Venda</th>
                  <th className="py-3 px-4 text-center">Margem</th>
                  <th className="py-3 px-4 text-center">Estoque</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {produtosFiltrados.map((p) => {
                  const atual = Number(p.estoque_atual);
                  const min = Number(p.estoque_minimo);
                  const zerado = atual <= 0;
                  const baixo = !zerado && atual <= min;
                  const margem = p.preco_venda > 0 ? ((p.preco_venda - p.preco_custo) / p.preco_venda) * 100 : 0;

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/70 transition">
                      
                      {/* Barcode */}
                      <td className="py-3 px-4 font-mono font-medium text-gray-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Barcode className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{p.codigo_barras}</span>
                        </div>
                      </td>

                      {/* Product Name */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-900 block">{p.nome}</span>
                        <span className="text-[10px] text-gray-400">Unidade: {p.unidade}</span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[11px] font-medium">
                          {p.categoria || 'Geral'}
                        </span>
                      </td>

                      {/* Preço Custo */}
                      <td className="py-3 px-4 text-right text-gray-500 whitespace-nowrap">
                        {formatBRL(p.preco_custo)}
                      </td>

                      {/* Preço Venda */}
                      <td className="py-3 px-4 text-right font-bold text-gray-900 whitespace-nowrap">
                        {formatBRL(p.preco_venda)}
                      </td>

                      {/* Margem */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`text-[11px] font-bold px-1.5 py-0.5 rounded-sm ${
                            margem > 30
                              ? 'bg-emerald-50 text-emerald-700'
                              : margem > 10
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {margem.toFixed(0)}%
                        </span>
                      </td>

                      {/* Estoque com Badges */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center">
                          <span
                            className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                              zerado
                                ? 'bg-red-100 text-red-800'
                                : baixo
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {atual} {p.unidade}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-0.5">mín: {min}</span>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Ajuste rápido modal trigger */}
                          <button
                            onClick={() =>
                              setAjusteModal({
                                aberto: true,
                                produtoId: p.id,
                                tipo: 'entrada',
                                quantidade: '1',
                                motivo: '',
                              })
                            }
                            title="Ajustar estoque (+/-)"
                            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleAbrirEdicao(p)}
                            title="Editar produto"
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja excluir o produto "${p.nome}"?`)) {
                                onDeletarProduto(p.id);
                              }
                            }}
                            title="Excluir produto"
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6" />
            </div>
            {produtos.length === 0 ? (
              <div>
                <h3 className="text-sm font-bold text-gray-800">Nenhum produto cadastrado ainda</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
                  Cadastre o primeiro item do seu supermercado para começar a controlar o estoque e vendas.
                </p>
                <button
                  onClick={handleAbrirNovo}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  + Cadastrar Primeiro Produto
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-bold text-gray-800">Nenhum produto corresponde aos filtros</h3>
                <p className="text-xs text-gray-500 mt-1 mb-3">Tente alterar os termos da busca ou a categoria selecionada.</p>
                <button
                  onClick={() => {
                    setBusca('');
                    setCategoriaFiltro('todas');
                    setStatusFiltro('todos');
                  }}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 cursor-pointer"
                >
                  Limpar Filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: NOVO PRODUTO / EDITAR PRODUTO */}
      {(isModalNovoAberto || produtoEditando) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-emerald-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-emerald-200" />
                <h3 className="text-base font-bold">
                  {produtoEditando ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsModalNovoAberto(false);
                  setProdutoEditando(null);
                }}
                className="text-white/80 hover:text-white p-1 hover:bg-emerald-800 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarProduto} className="p-6 space-y-4 text-xs">
              
              {formErro && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formErro}</span>
                </div>
              )}

              {/* Barcode input with generator button */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Código de Barras (EAN / Código do Produto) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Ex: 7891000100103"
                    value={formCodigo}
                    onChange={(e) => setFormCodigo(e.target.value)}
                    className="flex-1 px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl font-mono text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={gerarCodigoBarras}
                    title="Gerar código de barras aleatório automático"
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Gerar Código</span>
                  </button>
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Arroz Tipo 1 Camil 5kg"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Categoria</label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {CATEGORIAS_PADRAO.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Unidade de Medida</label>
                  <select
                    value={formUnidade}
                    onChange={(e) => setFormUnidade(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="UN">UN (Unidade)</option>
                    <option value="KG">KG (Quilograma)</option>
                    <option value="L">L (Litro)</option>
                    <option value="PCT">PCT (Pacote)</option>
                    <option value="CX">CX (Caixa)</option>
                    <option value="G">G (Grama)</option>
                    <option value="ML">ML (Mililitro)</option>
                  </select>
                </div>
              </div>

              {/* Pricing: Custo, Venda e Margem */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <span className="font-bold text-gray-800 text-[11px] block">Precificação e Margem</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-600 font-medium mb-1">Preço de Custo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formPrecoCusto}
                      onChange={(e) => setFormPrecoCusto(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-800 font-bold mb-1">Preço de Venda (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={formPrecoVenda}
                      onChange={(e) => setFormPrecoVenda(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-500 rounded-lg text-xs font-semibold text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-[11px]">
                  <span className="text-gray-500">Margem Estimada de Lucro:</span>
                  <span className={`font-bold ${margemLucroCalculada >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {margemLucroCalculada.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Stock: Atual e Mínimo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Estoque Inicial / Atual</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formEstoqueAtual}
                    onChange={(e) => setFormEstoqueAtual(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Estoque Mínimo (Alerta)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formEstoqueMinimo}
                    onChange={(e) => setFormEstoqueMinimo(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalNovoAberto(false);
                    setProdutoEditando(null);
                  }}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs disabled:opacity-50 transition cursor-pointer"
                >
                  {salvando ? 'Salvando...' : produtoEditando ? 'Atualizar Produto' : 'Cadastrar Produto'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: AJUSTE RÁPIDO DE ESTOQUE */}
      {ajusteModal.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-emerald-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-emerald-200" />
                <h3 className="text-base font-bold">Ajuste de Estoque</h3>
              </div>
              <button
                onClick={() => setAjusteModal({ ...ajusteModal, aberto: false })}
                className="text-white/80 hover:text-white p-1 hover:bg-emerald-800 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarAjuste} className="p-6 space-y-4 text-xs">
              
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Selecione o Produto *</label>
                <select
                  value={ajusteModal.produtoId}
                  onChange={(e) => setAjusteModal({ ...ajusteModal, produtoId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} (Atual: {p.estoque_atual} {p.unidade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Tipo de Movimentação *</label>
                <select
                  value={ajusteModal.tipo}
                  onChange={(e) => setAjusteModal({ ...ajusteModal, tipo: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="entrada">➕ Entrada (Compra / Reposição de Fornecedor)</option>
                  <option value="saida">➖ Saída (Perda, Avaria ou Vencimento)</option>
                  <option value="ajuste">🔄 Definir Novo Estoque Total (Inventário)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {ajusteModal.tipo === 'ajuste' ? 'Novo Estoque Total' : 'Quantidade a Movimentar'} *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={ajusteModal.quantidade}
                  onChange={(e) => setAjusteModal({ ...ajusteModal, quantidade: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Motivo / Observação</label>
                <input
                  type="text"
                  placeholder="Ex: Nota Fiscal 1234, Quebra de mercadoria, etc."
                  value={ajusteModal.motivo}
                  onChange={(e) => setAjusteModal({ ...ajusteModal, motivo: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAjusteModal({ ...ajusteModal, aberto: false })}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs disabled:opacity-50 transition cursor-pointer"
                >
                  {salvando ? 'Processando...' : 'Confirmar Ajuste'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
