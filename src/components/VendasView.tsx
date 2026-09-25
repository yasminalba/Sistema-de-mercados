import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Produto, Venda, MetodoPagamento } from '../types';
import { 
  ShoppingCart, 
  Barcode, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Receipt, 
  X, 
  Printer, 
  CheckCircle2, 
  Search,
  User,
  ArrowRight,
  Package
} from 'lucide-react';

interface VendasViewProps {
  produtos: Produto[];
  onRegistrarVenda: (
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
  ) => Promise<Venda>;
  onIrParaEstoque: () => void;
}

interface CartItem {
  produto: Produto;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

// Simple audio beep generator via Web Audio API for checkout scanning feel
function playScanBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    }
  } catch {
    // Audio might not be allowed before user interaction
  }
}

export const VendasView: React.FC<VendasViewProps> = ({
  produtos,
  onRegistrarVenda,
  onIrParaEstoque,
}) => {
  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  const [codigoInput, setCodigoInput] = useState('');
  const [buscaNome, setBuscaNome] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>('dinheiro');
  const [desconto, setDesconto] = useState<string>('0');
  const [valorRecebido, setValorRecebido] = useState<string>('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteCpf, setClienteCpf] = useState('');
  const [processando, setProcessando] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  // Completed sale receipt modal
  const [vendaConcluida, setVendaConcluida] = useState<Venda | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode input on mount and when sale resets
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [vendaConcluida]);

  // Keyboard shortcut listener: F8 to finish sale, F2 to focus barcode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Quick lookup products matching search
  const produtosFiltrados = useMemo(() => {
    if (!buscaNome.trim()) return [];
    return produtos
      .filter(
        (p) =>
          p.nome.toLowerCase().includes(buscaNome.toLowerCase()) ||
          p.codigo_barras.toLowerCase().includes(buscaNome.toLowerCase())
      )
      .slice(0, 6);
  }, [produtos, buscaNome]);

  // Cart calculations
  const subtotalGeral = useMemo(() => {
    return carrinho.reduce((acc, item) => acc + item.subtotal, 0);
  }, [carrinho]);

  const valorDesconto = Math.max(0, parseFloat(desconto) || 0);
  const totalGeral = Math.max(0, subtotalGeral - valorDesconto);

  const valorPagoNum = parseFloat(valorRecebido) || 0;
  const trocoCalculado = metodoPagamento === 'dinheiro' && valorPagoNum > totalGeral ? valorPagoNum - totalGeral : 0;

  // Add product to cart
  const adicionarAoCarrinho = (prod: Produto, qtd = 1) => {
    setErroMsg(null);

    // Verify stock availability
    const itemExistente = carrinho.find((i) => i.produto.id === prod.id);
    const qtdAtualNoCarrinho = itemExistente ? itemExistente.quantidade : 0;
    const qtdTotalDesejada = qtdAtualNoCarrinho + qtd;

    if (prod.estoque_atual < qtdTotalDesejada) {
      setErroMsg(
        `Atenção: Estoque insuficiente para "${prod.nome}". Disponível: ${prod.estoque_atual} ${prod.unidade}.`
      );
      return;
    }

    playScanBeep();

    setCarrinho((prev) => {
      const idx = prev.findIndex((i) => i.produto.id === prod.id);
      if (idx !== -1) {
        const novo = [...prev];
        const novaQtd = novo[idx].quantidade + qtd;
        novo[idx] = {
          ...novo[idx],
          quantidade: novaQtd,
          subtotal: novaQtd * novo[idx].preco_unitario,
        };
        return novo;
      } else {
        return [
          ...prev,
          {
            produto: prod,
            quantidade: qtd,
            preco_unitario: Number(prod.preco_venda),
            subtotal: qtd * Number(prod.preco_venda),
          },
        ];
      }
    });

    setCodigoInput('');
    setBuscaNome('');
    barcodeInputRef.current?.focus();
  };

  // Handle barcode submit
  const handleCodigoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const termo = codigoInput.trim();
    if (!termo) return;

    // Search exact barcode first
    let prod = produtos.find((p) => p.codigo_barras.trim() === termo);

    // If not found by barcode, search exact or matching name
    if (!prod) {
      prod = produtos.find((p) => p.nome.toLowerCase() === termo.toLowerCase());
    }

    if (prod) {
      adicionarAoCarrinho(prod, 1);
    } else {
      setErroMsg(`Produto com código ou nome "${termo}" não encontrado no estoque.`);
      playScanBeep();
    }
  };

  // Adjust item quantity in cart
  const atualizarQuantidade = (produtoId: string, delta: number) => {
    setCarrinho((prev) => {
      return prev
        .map((item) => {
          if (item.produto.id === produtoId) {
            const novaQtd = item.quantidade + delta;
            if (novaQtd <= 0) return null;

            if (item.produto.estoque_atual < novaQtd) {
              setErroMsg(
                `Estoque máximo atingido para ${item.produto.nome} (${item.produto.estoque_atual} ${item.produto.unidade})`
              );
              return item;
            }

            return {
              ...item,
              quantidade: novaQtd,
              subtotal: novaQtd * item.preco_unitario,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removerDoCarrinho = (produtoId: string) => {
    setCarrinho((prev) => prev.filter((i) => i.produto.id !== produtoId));
  };

  const limparCarrinho = () => {
    if (carrinho.length > 0 && confirm('Deseja realmente cancelar e esvaziar a venda atual?')) {
      setCarrinho([]);
      setDesconto('0');
      setValorRecebido('');
      setClienteNome('');
      setClienteCpf('');
      setErroMsg(null);
      barcodeInputRef.current?.focus();
    }
  };

  // Finalize sale
  const handleFinalizarVenda = async () => {
    setErroMsg(null);

    if (carrinho.length === 0) {
      setErroMsg('O carrinho está vazio. Adicione produtos antes de finalizar a venda.');
      return;
    }

    if (metodoPagamento === 'dinheiro' && valorPagoNum > 0 && valorPagoNum < totalGeral) {
      setErroMsg(`Valor recebido (R$ ${valorPagoNum.toFixed(2)}) é menor que o total da venda (R$ ${totalGeral.toFixed(2)}).`);
      return;
    }

    setProcessando(true);
    try {
      const vendaRegistrada = await onRegistrarVenda(
        {
          data: new Date().toISOString(),
          valor_total: totalGeral,
          desconto: valorDesconto,
          valor_pago: metodoPagamento === 'dinheiro' && valorPagoNum > 0 ? valorPagoNum : totalGeral,
          troco: trocoCalculado,
          metodo_pagamento: metodoPagamento,
          cliente_nome: clienteNome.trim() || undefined,
          cliente_cpf: clienteCpf.trim() || undefined,
          status: 'concluida',
        },
        carrinho.map((item) => ({
          produto_id: item.produto.id,
          produto_nome: item.produto.nome,
          codigo_barras: item.produto.codigo_barras,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          subtotal: item.subtotal,
          unidade: item.produto.unidade,
        }))
      );

      // Open receipt modal
      setVendaConcluida(vendaRegistrada);

      // Reset cart
      setCarrinho([]);
      setDesconto('0');
      setValorRecebido('');
      setClienteNome('');
      setClienteCpf('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErroMsg(`Falha ao registrar venda: ${msg}`);
    } finally {
      setProcessando(false);
    }
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            Frente de Caixa (PDV)
          </h2>
          <p className="text-xs text-gray-500">
            Escaneie o código de barras ou pesquise o produto para iniciar o atendimento
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="hidden md:inline px-2 py-1 bg-gray-100 rounded-md font-mono text-[10px]">
            [F2] Focar Código
          </span>
          <span className="hidden md:inline px-2 py-1 bg-emerald-100 text-emerald-800 rounded-md font-mono text-[10px] font-bold">
            [ENTER] Adicionar
          </span>
        </div>
      </div>

      {erroMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
          <span>{erroMsg}</span>
          <button onClick={() => setErroMsg(null)} className="text-red-500 hover:text-red-700 font-bold p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Cashier Layout: Left side Scanning & Cart, Right side Totals & Payment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Col: Barcode, Quick Search & Cart Items */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Barcode & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <form onSubmit={handleCodigoSubmit} className="relative">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Leitor de Código de Barras (ou digite o código e pressione ENTER)
              </label>
              <div className="relative">
                <Barcode className="w-5 h-5 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Escaneie o código de barras ou digite aqui..."
                  value={codigoInput}
                  onChange={(e) => setCodigoInput(e.target.value)}
                  className="w-full pl-11 pr-24 py-3 bg-emerald-50/40 border-2 border-emerald-500/70 rounded-xl font-mono text-sm text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition font-medium"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  Adicionar
                </button>
              </div>
            </form>

            {/* Quick Name Search with Dropdown */}
            <div className="relative pt-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ou pesquise pelo nome do produto..."
                  value={buscaNome}
                  onChange={(e) => setBuscaNome(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {produtosFiltrados.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-gray-100 max-h-60 overflow-y-auto">
                  {produtosFiltrados.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => adicionarAoCarrinho(p, 1)}
                      className="w-full p-2.5 text-left hover:bg-emerald-50 flex items-center justify-between transition cursor-pointer"
                    >
                      <div>
                        <span className="font-semibold text-xs text-gray-900 block">{p.nome}</span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {p.codigo_barras} | Estoque: {p.estoque_atual} {p.unidade}
                        </span>
                      </div>
                      <span className="font-bold text-xs text-emerald-700">{formatBRL(p.preco_venda)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Itens na Cesta ({carrinho.length})
              </span>
              {carrinho.length > 0 && (
                <button
                  type="button"
                  onClick={limparCarrinho}
                  className="text-xs text-red-600 hover:text-red-700 hover:underline font-medium cursor-pointer"
                >
                  Cancelar Venda
                </button>
              )}
            </div>

            {carrinho.length > 0 ? (
              <div className="divide-y divide-gray-100 max-h-[460px] overflow-y-auto">
                {carrinho.map((item, idx) => (
                  <div key={item.produto.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/60 transition text-xs">
                    
                    {/* Item info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <h4 className="font-semibold text-gray-900 truncate">{item.produto.nome}</h4>
                        <span className="text-[10px] text-gray-400 font-mono">
                          Unit: {formatBRL(item.preco_unitario)} / {item.produto.unidade}
                        </span>
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-gray-100 rounded-lg p-1">
                      <button
                        type="button"
                        onClick={() => atualizarQuantidade(item.produto.id, -1)}
                        className="w-6 h-6 flex items-center justify-center bg-white hover:bg-gray-200 rounded-md text-gray-700 shadow-xs transition cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-bold text-gray-900 text-xs">
                        {item.quantidade}
                      </span>
                      <button
                        type="button"
                        onClick={() => atualizarQuantidade(item.produto.id, 1)}
                        className="w-6 h-6 flex items-center justify-center bg-white hover:bg-gray-200 rounded-md text-gray-700 shadow-xs transition cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right shrink-0 w-24">
                      <span className="font-bold text-gray-900 block">{formatBRL(item.subtotal)}</span>
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removerDoCarrinho(item.produto.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                      title="Remover item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-gray-400 text-xs px-4">
                <ShoppingCart className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="font-semibold text-gray-700">Caixa Livre</p>
                <p className="text-gray-400 mt-1 max-w-xs mx-auto">
                  Escaneie o código de barras com o leitor ou digite o código/nome acima para adicionar itens ao pedido.
                </p>
                {produtos.length === 0 && (
                  <button
                    onClick={onIrParaEstoque}
                    className="mt-4 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition cursor-pointer"
                  >
                    Cadastrar Produtos no Estoque Primeiro
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick Select Buttons from catalog (if items exist) */}
          {produtos.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-bold text-gray-700 mb-2 block flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                Atalho Rápido de Produtos
              </span>
              <div className="flex flex-wrap gap-2">
                {produtos.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => adicionarAoCarrinho(p, 1)}
                    className="px-2.5 py-1.5 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{p.nome}</span>
                    <span className="font-bold text-emerald-700">{formatBRL(p.preco_venda)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Col: Totals, Payment Method & Finalize Button */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            
            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Forma de Pagamento
              </label>
              <div className="grid grid-cols-3 gap-2">
                
                <button
                  type="button"
                  onClick={() => setMetodoPagamento('dinheiro')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                    metodoPagamento === 'dinheiro'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Dinheiro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMetodoPagamento('pix')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                    metodoPagamento === 'pix'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>PIX</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMetodoPagamento('cartao_debito')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                    metodoPagamento === 'cartao_debito'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>C. Débito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMetodoPagamento('cartao_credito')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                    metodoPagamento === 'cartao_credito'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>C. Crédito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMetodoPagamento('vale_alimentacao')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                    metodoPagamento === 'vale_alimentacao'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Vale Alim.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMetodoPagamento('outro')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                    metodoPagamento === 'outro'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Outro</span>
                </button>

              </div>
            </div>

            {/* Discount & Received Value (for Cash / Troco calculation) */}
            <div className="space-y-3 pt-2 border-t border-gray-100 text-xs">
              
              <div className="flex items-center justify-between gap-3">
                <label className="text-gray-600 font-medium">Desconto (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                  placeholder="0.00"
                  className="w-32 px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-right font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {metodoPagamento === 'dinheiro' && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-emerald-900 font-bold">Valor Recebido (R$):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorRecebido}
                      onChange={(e) => setValorRecebido(e.target.value)}
                      placeholder="0.00"
                      className="w-32 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-right font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {valorPagoNum > 0 && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-200 font-bold">
                      <span className="text-emerald-800">Troco a Devolver:</span>
                      <span className="text-emerald-700 text-base">{formatBRL(trocoCalculado)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Optional Customer Identification */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <span className="font-semibold text-gray-700 block flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  Identificação do Cliente (Opcional)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nome do Cliente"
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                    className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="CPF (000.000.000-00)"
                    value={clienteCpf}
                    onChange={(e) => setClienteCpf(e.target.value)}
                    className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

            </div>

            {/* Total Summary */}
            <div className="bg-gray-900 text-white p-5 rounded-2xl space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Subtotal dos Itens:</span>
                <span>{formatBRL(subtotalGeral)}</span>
              </div>
              {valorDesconto > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-400">
                  <span>Desconto:</span>
                  <span>- {formatBRL(valorDesconto)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                <span className="text-sm font-semibold text-gray-300">Total a Pagar:</span>
                <span className="text-2xl font-black text-emerald-400">{formatBRL(totalGeral)}</span>
              </div>
            </div>

            {/* Finalize Button */}
            <button
              type="button"
              onClick={handleFinalizarVenda}
              disabled={processando || carrinho.length === 0}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-base font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{processando ? 'Processando Venda...' : 'FINALIZAR VENDA'}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

          </div>

        </div>

      </div>

      {/* MODAL: CUPOM NÃO FISCAL DE VENDA (RECIBO) */}
      {vendaConcluida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="bg-emerald-700 p-4 text-white text-center relative">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-1 text-emerald-200" />
              <h3 className="font-bold text-base">Venda Finalizada com Sucesso!</h3>
              <p className="text-xs text-emerald-100">Estoque atualizado automaticamente</p>
              <button
                onClick={() => setVendaConcluida(null)}
                className="absolute right-3 top-3 text-white/80 hover:text-white p-1 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Body (Formatted like supermarket thermal receipt) */}
            <div className="p-6 font-mono text-xs text-gray-800 space-y-3 bg-[#faf9f6]">
              <div className="text-center border-b border-dashed border-gray-300 pb-2">
                <h4 className="font-bold text-sm tracking-wider uppercase">SUPERMERCADO GESTÃO</h4>
                <p className="text-[10px] text-gray-500">CUPOM NÃO FISCAL DE VENDA</p>
                <p className="text-[10px] text-gray-500">
                  {new Date(vendaConcluida.data).toLocaleString('pt-BR')}
                </p>
                <p className="text-[10px] text-gray-500">Controle: #{vendaConcluida.id.slice(0, 8)}</p>
              </div>

              {vendaConcluida.cliente_nome && (
                <div className="text-[10px] border-b border-dashed border-gray-300 pb-2">
                  <p>CLIENTE: {vendaConcluida.cliente_nome}</p>
                  {vendaConcluida.cliente_cpf && <p>CPF: {vendaConcluida.cliente_cpf}</p>}
                </div>
              )}

              {/* Items List */}
              <div className="space-y-1.5 border-b border-dashed border-gray-300 pb-2 max-h-48 overflow-y-auto">
                {(vendaConcluida.itens || []).map((it, idx) => (
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
                {vendaConcluida.desconto > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>DESCONTO:</span>
                    <span>- {formatBRL(vendaConcluida.desconto)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs">
                  <span>TOTAL A PAGAR:</span>
                  <span className="text-sm font-black">{formatBRL(vendaConcluida.valor_total)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>PAGAMENTO ({vendaConcluida.metodo_pagamento.toUpperCase()}):</span>
                  <span>{formatBRL(vendaConcluida.valor_pago)}</span>
                </div>
                {vendaConcluida.troco > 0 && (
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>TROCO:</span>
                    <span>{formatBRL(vendaConcluida.troco)}</span>
                  </div>
                )}
              </div>

              <div className="text-center text-[10px] text-gray-400 pt-1">
                Obrigado pela preferência! Volte sempre!
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-gray-600" />
                <span>Imprimir</span>
              </button>
              <button
                type="button"
                onClick={() => setVendaConcluida(null)}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Nova Venda
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
