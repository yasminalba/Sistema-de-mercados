import { Produto, Venda, ItemVenda, MovimentacaoEstoque } from '../types';
import { getSupabaseClient } from '../lib/supabase';

const LOCAL_STORAGE_PRODUTOS = 'supermercado_produtos_data';
const LOCAL_STORAGE_VENDAS = 'supermercado_vendas_data';
const LOCAL_STORAGE_MOVIMENTACOES = 'supermercado_movimentacoes_data';

// Helper to generate UUIDs
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------- LOCAL STORAGE FALLBACK HELPERS ----------------
// Strictly empty initial datasets - no mock data!
function getLocalProdutos(): Produto[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_PRODUTOS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalProdutos(produtos: Produto[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_PRODUTOS, JSON.stringify(produtos));
  } catch (err) {
    console.error('Erro ao salvar produtos localmente:', err);
  }
}

function getLocalVendas(): Venda[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_VENDAS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalVendas(vendas: Venda[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_VENDAS, JSON.stringify(vendas));
  } catch (err) {
    console.error('Erro ao salvar vendas localmente:', err);
  }
}

function getLocalMovimentacoes(): MovimentacaoEstoque[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_MOVIMENTACOES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalMovimentacoes(movs: MovimentacaoEstoque[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_MOVIMENTACOES, JSON.stringify(movs));
  } catch (err) {
    console.error('Erro ao salvar movimentacoes localmente:', err);
  }
}

// ---------------- DATABASE SERVICE METHODS ----------------

export const dbService = {
  // PRODUTOS
  async getProdutos(): Promise<Produto[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('produtos')
          .select('*')
          .order('nome', { ascending: true });

        if (!error && data) {
          // Keep local storage in sync as cache
          saveLocalProdutos(data);
          return data as Produto[];
        }
        console.warn('Erro ao buscar produtos do Supabase, utilizando dados locais:', error?.message);
      } catch (err) {
        console.warn('Falha na comunicação com Supabase, utilizando dados locais:', err);
      }
    }
    return getLocalProdutos();
  },

  async getProdutoByCodigoBarras(codigo: string): Promise<Produto | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('produtos')
          .select('*')
          .eq('codigo_barras', codigo.trim())
          .maybeSingle();

        if (!error && data) {
          return data as Produto;
        }
      } catch (err) {
        console.warn('Erro na busca Supabase por código:', err);
      }
    }

    const localList = getLocalProdutos();
    const found = localList.find((p) => p.codigo_barras.trim() === codigo.trim());
    return found || null;
  },

  async criarProduto(produtoData: Omit<Produto, 'id' | 'created_at'>): Promise<Produto> {
    const novoProduto: Produto = {
      ...produtoData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('produtos')
          .insert([novoProduto])
          .select()
          .single();

        if (error) {
          console.error('Erro ao inserir produto no Supabase:', error);
          throw new Error(error.message);
        }
        if (data) {
          // Record initial stock movement if > 0
          if (novoProduto.estoque_atual > 0) {
            await this.registrarMovimentacao({
              produto_id: data.id,
              produto_nome: data.nome,
              tipo: 'entrada',
              quantidade: data.estoque_atual,
              motivo: 'Cadastro inicial de produto',
              data: new Date().toISOString(),
            });
          }
          const localList = getLocalProdutos();
          saveLocalProdutos([data as Produto, ...localList]);
          return data as Produto;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('Falha ao gravar no Supabase, salvando localmente:', msg);
        // Fallback to local
      }
    }

    // Local save
    const localList = getLocalProdutos();
    const existing = localList.find((p) => p.codigo_barras === novoProduto.codigo_barras);
    if (existing) {
      throw new Error(`Já existe um produto com o código de barras "${novoProduto.codigo_barras}".`);
    }

    localList.unshift(novoProduto);
    saveLocalProdutos(localList);

    if (novoProduto.estoque_atual > 0) {
      await this.registrarMovimentacao({
        produto_id: novoProduto.id,
        produto_nome: novoProduto.nome,
        tipo: 'entrada',
        quantidade: novoProduto.estoque_atual,
        motivo: 'Cadastro inicial de produto',
        data: new Date().toISOString(),
      });
    }

    return novoProduto;
  },

  async atualizarProduto(id: string, updates: Partial<Produto>): Promise<Produto> {
    const supabase = getSupabaseClient();
    const updatedPayload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('produtos')
          .update(updatedPayload)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          const localList = getLocalProdutos().map((p) => (p.id === id ? (data as Produto) : p));
          saveLocalProdutos(localList);
          return data as Produto;
        }
        if (error) {
          console.error('Erro ao atualizar produto no Supabase:', error);
        }
      } catch (err) {
        console.warn('Falha ao atualizar no Supabase:', err);
      }
    }

    // Local update
    const localList = getLocalProdutos();
    const index = localList.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error('Produto não encontrado');
    }

    const updated = {
      ...localList[index],
      ...updatedPayload,
    };
    localList[index] = updated;
    saveLocalProdutos(localList);
    return updated;
  },

  async deletarProduto(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('produtos').delete().eq('id', id);
        if (error) {
          console.error('Erro ao deletar no Supabase:', error);
          throw new Error(error.message);
        }
      } catch (err) {
        console.warn('Erro ao deletar produto do Supabase:', err);
      }
    }

    const localList = getLocalProdutos().filter((p) => p.id !== id);
    saveLocalProdutos(localList);
    return true;
  },

  async ajustarEstoque(
    produtoId: string,
    quantidadeAjuste: number,
    tipo: 'entrada' | 'saida' | 'ajuste',
    motivo: string
  ): Promise<Produto> {
    const produtos = await this.getProdutos();
    const produto = produtos.find((p) => p.id === produtoId);
    if (!produto) {
      throw new Error('Produto não encontrado para ajuste de estoque');
    }

    let novoEstoque = Number(produto.estoque_atual);
    let delta = Math.abs(quantidadeAjuste);

    if (tipo === 'entrada') {
      novoEstoque += delta;
    } else if (tipo === 'saida') {
      novoEstoque = Math.max(0, novoEstoque - delta);
    } else if (tipo === 'ajuste') {
      delta = quantidadeAjuste - novoEstoque;
      novoEstoque = quantidadeAjuste;
    }

    const produtoAtualizado = await this.atualizarProduto(produtoId, {
      estoque_atual: novoEstoque,
    });

    await this.registrarMovimentacao({
      produto_id: produtoId,
      produto_nome: produto.nome,
      tipo,
      quantidade: Math.abs(delta),
      motivo: motivo || 'Ajuste manual de estoque',
      data: new Date().toISOString(),
    });

    return produtoAtualizado;
  },

  // VENDAS
  async getVendas(): Promise<Venda[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('vendas')
          .select(`
            *,
            itens:itens_venda(*)
          `)
          .order('data', { ascending: false });

        if (!error && data) {
          saveLocalVendas(data as Venda[]);
          return data as Venda[];
        }
        console.warn('Erro ao buscar vendas do Supabase:', error?.message);
      } catch (err) {
        console.warn('Falha na requisição de vendas ao Supabase:', err);
      }
    }
    return getLocalVendas();
  },

  async registrarVenda(
    vendaData: Omit<Venda, 'id' | 'created_at'>,
    itens: Array<Omit<ItemVenda, 'id' | 'venda_id' | 'created_at'>>
  ): Promise<Venda> {
    const vendaId = generateUUID();
    const now = new Date().toISOString();

    const novaVenda: Venda = {
      ...vendaData,
      id: vendaId,
      created_at: now,
      data: vendaData.data || now,
      itens: itens.map((item) => ({
        ...item,
        id: generateUUID(),
        venda_id: vendaId,
        created_at: now,
      })),
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // 1. Inserir venda
        const { error: vendaError } = await supabase.from('vendas').insert([
          {
            id: novaVenda.id,
            data: novaVenda.data,
            valor_total: novaVenda.valor_total,
            desconto: novaVenda.desconto,
            valor_pago: novaVenda.valor_pago,
            troco: novaVenda.troco,
            metodo_pagamento: novaVenda.metodo_pagamento,
            cliente_nome: novaVenda.cliente_nome || null,
            cliente_cpf: novaVenda.cliente_cpf || null,
            status: novaVenda.status,
            created_at: novaVenda.created_at,
          },
        ]);

        if (vendaError) {
          throw new Error(`Falha ao registrar venda no Supabase: ${vendaError.message}`);
        }

        // 2. Inserir itens da venda
        if (novaVenda.itens && novaVenda.itens.length > 0) {
          const { error: itensError } = await supabase.from('itens_venda').insert(novaVenda.itens);
          if (itensError) {
            console.error('Erro ao inserir itens no Supabase:', itensError);
          }
        }

        // 3. Abater estoque no Supabase e registrar movimentação
        for (const item of novaVenda.itens || []) {
          if (item.produto_id) {
            const { data: prodData } = await supabase
              .from('produtos')
              .select('estoque_atual, nome')
              .eq('id', item.produto_id)
              .maybeSingle();

            if (prodData) {
              const estoqueAntigo = Number(prodData.estoque_atual) || 0;
              const novoEstoque = Math.max(0, estoqueAntigo - item.quantidade);
              await supabase
                .from('produtos')
                .update({ estoque_atual: novoEstoque, updated_at: now })
                .eq('id', item.produto_id);

              await this.registrarMovimentacao({
                produto_id: item.produto_id,
                produto_nome: item.produto_nome,
                tipo: 'venda',
                quantidade: item.quantidade,
                motivo: `Venda #${novaVenda.id.slice(0, 8)}`,
                data: now,
              });
            }
          }
        }

        const localVendas = getLocalVendas();
        saveLocalVendas([novaVenda, ...localVendas]);
        return novaVenda;
      } catch (err) {
        console.warn('Falha ao salvar venda no Supabase, processando localmente:', err);
      }
    }

    // Local execution
    // Abater estoque local
    const produtos = getLocalProdutos();
    for (const item of novaVenda.itens || []) {
      const idx = produtos.findIndex((p) => p.id === item.produto_id);
      if (idx !== -1) {
        const prod = produtos[idx];
        const novoEstoque = Math.max(0, Number(prod.estoque_atual) - item.quantidade);
        produtos[idx] = {
          ...prod,
          estoque_atual: novoEstoque,
          updated_at: now,
        };

        await this.registrarMovimentacao({
          produto_id: prod.id,
          produto_nome: prod.nome,
          tipo: 'venda',
          quantidade: item.quantidade,
          motivo: `Venda #${novaVenda.id.slice(0, 8)}`,
          data: now,
        });
      }
    }
    saveLocalProdutos(produtos);

    const localVendas = getLocalVendas();
    localVendas.unshift(novaVenda);
    saveLocalVendas(localVendas);

    return novaVenda;
  },

  async cancelarVenda(vendaId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    if (supabase) {
      try {
        // Obter itens da venda para estornar estoque
        const { data: venda } = await supabase
          .from('vendas')
          .select('*, itens:itens_venda(*)')
          .eq('id', vendaId)
          .maybeSingle();

        if (venda && venda.status !== 'cancelada') {
          // Atualiza status
          await supabase.from('vendas').update({ status: 'cancelada' }).eq('id', vendaId);

          // Devolve itens para estoque
          if (venda.itens) {
            for (const item of venda.itens) {
              if (item.produto_id) {
                const { data: prod } = await supabase
                  .from('produtos')
                  .select('estoque_atual, nome')
                  .eq('id', item.produto_id)
                  .maybeSingle();

                if (prod) {
                  const novoEstoque = Number(prod.estoque_atual || 0) + Number(item.quantidade);
                  await supabase
                    .from('produtos')
                    .update({ estoque_atual: novoEstoque, updated_at: now })
                    .eq('id', item.produto_id);

                  await this.registrarMovimentacao({
                    produto_id: item.produto_id,
                    produto_nome: item.produto_nome,
                    tipo: 'estorno',
                    quantidade: item.quantidade,
                    motivo: `Estorno de Venda #${vendaId.slice(0, 8)}`,
                    data: now,
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao cancelar venda no Supabase:', err);
      }
    }

    // Local update
    const localVendas = getLocalVendas();
    const idx = localVendas.findIndex((v) => v.id === vendaId);
    if (idx !== -1 && localVendas[idx].status !== 'cancelada') {
      const venda = localVendas[idx];
      localVendas[idx] = { ...venda, status: 'cancelada' };
      saveLocalVendas(localVendas);

      // Devolver estoque
      const localProds = getLocalProdutos();
      if (venda.itens) {
        for (const item of venda.itens) {
          const pIdx = localProds.findIndex((p) => p.id === item.produto_id);
          if (pIdx !== -1) {
            localProds[pIdx] = {
              ...localProds[pIdx],
              estoque_atual: Number(localProds[pIdx].estoque_atual) + Number(item.quantidade),
              updated_at: now,
            };

            await this.registrarMovimentacao({
              produto_id: item.produto_id,
              produto_nome: item.produto_nome,
              tipo: 'estorno',
              quantidade: item.quantidade,
              motivo: `Estorno de Venda #${vendaId.slice(0, 8)}`,
              data: now,
            });
          }
        }
        saveLocalProdutos(localProds);
      }
    }

    return true;
  },

  // MOVIMENTAÇÕES DE ESTOQUE
  async getMovimentacoes(): Promise<MovimentacaoEstoque[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('movimentacoes_estoque')
          .select('*')
          .order('data', { ascending: false });

        if (!error && data) {
          saveLocalMovimentacoes(data as MovimentacaoEstoque[]);
          return data as MovimentacaoEstoque[];
        }
      } catch (err) {
        console.warn('Erro ao buscar movimentações do Supabase:', err);
      }
    }
    return getLocalMovimentacoes();
  },

  async registrarMovimentacao(
    movData: Omit<MovimentacaoEstoque, 'id' | 'created_at'>
  ): Promise<MovimentacaoEstoque> {
    const novaMov: MovimentacaoEstoque = {
      ...movData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('movimentacoes_estoque').insert([novaMov]);
      } catch (err) {
        console.warn('Erro ao salvar movimentação no Supabase:', err);
      }
    }

    const localList = getLocalMovimentacoes();
    localList.unshift(novaMov);
    saveLocalMovimentacoes(localList);

    return novaMov;
  },

  // MIGRAÇÃO / SINCRONIZAÇÃO DE DADOS LOCAIS PARA O SUPABASE
  async sincronizarLocalParaSupabase(): Promise<{ produtos: number; vendas: number; itens: number }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase não está configurado.');
    }

    const produtos = getLocalProdutos();
    const vendas = getLocalVendas();
    let prodsCount = 0;
    let vendCount = 0;
    let itnCount = 0;

    // Inserir produtos no Supabase (upsert)
    if (produtos.length > 0) {
      const { error: prodErr } = await supabase.from('produtos').upsert(
        produtos.map((p) => ({
          id: p.id,
          codigo_barras: p.codigo_barras,
          nome: p.nome,
          categoria: p.categoria,
          preco_custo: p.preco_custo,
          preco_venda: p.preco_venda,
          estoque_atual: p.estoque_atual,
          estoque_minimo: p.estoque_minimo,
          unidade: p.unidade,
          created_at: p.created_at,
          updated_at: p.updated_at || p.created_at,
        })),
        { onConflict: 'codigo_barras' }
      );

      if (prodErr) {
        throw new Error(`Erro ao enviar produtos: ${prodErr.message}`);
      }
      prodsCount = produtos.length;
    }

    // Inserir vendas
    if (vendas.length > 0) {
      for (const v of vendas) {
        const { error: vErr } = await supabase.from('vendas').upsert(
          [
            {
              id: v.id,
              data: v.data,
              valor_total: v.valor_total,
              desconto: v.desconto,
              valor_pago: v.valor_pago,
              troco: v.troco,
              metodo_pagamento: v.metodo_pagamento,
              cliente_nome: v.cliente_nome || null,
              cliente_cpf: v.cliente_cpf || null,
              status: v.status,
              created_at: v.created_at,
            },
          ],
          { onConflict: 'id' }
        );

        if (!vErr) {
          vendCount++;
          if (v.itens && v.itens.length > 0) {
            const { error: iErr } = await supabase
              .from('itens_venda')
              .upsert(v.itens, { onConflict: 'id' });
            if (!iErr) {
              itnCount += v.itens.length;
            }
          }
        }
      }
    }

    return { produtos: prodsCount, vendas: vendCount, itens: itnCount };
  },
};
