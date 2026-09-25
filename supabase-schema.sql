-- ==============================================================================
-- SISTEMA DE GESTÃO DE SUPERMERCADOS (PDV, ESTOQUE E DASHBOARD)
-- SCRIPT COMPLETO DE ESTRUTURA E POLÍTICAS DE SEGURANÇA E ARMAZENAMENTO (RLS)
-- ==============================================================================
-- Instruções:
-- 1. Acesse o painel do seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. No menu lateral esquerdo, clique no ícone "SQL Editor"
-- 3. Clique em "+ New query", cole todo este código e clique no botão "Run"
-- ==============================================================================

-- 1. Habilitar extensões necessárias para geração de UUID e criptografia
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- CRIAÇÃO DAS TABELAS
-- ==============================================================================

-- 2. Tabela de Produtos (Estoque do Supermercado)
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_barras VARCHAR(100) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL DEFAULT 'Mercearia',
    preco_custo NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    preco_venda NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    estoque_atual NUMERIC(12,3) NOT NULL DEFAULT 0,
    estoque_minimo NUMERIC(12,3) NOT NULL DEFAULT 5,
    unidade VARCHAR(10) NOT NULL DEFAULT 'UN',
    foto_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabela de Vendas (Fechamento no Ponto de Venda / PDV)
CREATE TABLE IF NOT EXISTS public.vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    valor_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    desconto NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    valor_pago NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    troco NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    metodo_pagamento VARCHAR(50) NOT NULL DEFAULT 'dinheiro',
    cliente_nome VARCHAR(255),
    cliente_cpf VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'concluida', -- 'concluida' ou 'cancelada'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Itens da Venda (Detalhe de cada produto comprado no cupom)
CREATE TABLE IF NOT EXISTS public.itens_venda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
    produto_nome VARCHAR(255) NOT NULL,
    codigo_barras VARCHAR(100),
    quantidade NUMERIC(12,3) NOT NULL DEFAULT 1,
    preco_unitario NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    unidade VARCHAR(10) NOT NULL DEFAULT 'UN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Movimentações de Estoque (Auditoria e rastreamento de compras, perdas e vendas)
CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    produto_nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'entrada', 'saida', 'ajuste', 'venda', 'estorno'
    quantidade NUMERIC(12,3) NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    data TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- ÍNDICES PARA VELOCIDADE E PERFORMANCE DO CAIXA E CONSULTAS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON public.produtos (codigo_barras);
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON public.produtos (nome);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON public.produtos (categoria);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON public.vendas (data);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON public.vendas (status);
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON public.itens_venda (venda_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto_id ON public.movimentacoes_estoque (produto_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON public.movimentacoes_estoque (data);

-- ==============================================================================
-- POLÍTICAS DE SEGURANÇA E ARMAZENAMENTO DAS TABELAS (ROW LEVEL SECURITY - RLS)
-- ==============================================================================

-- Habilita RLS em todas as tabelas públicas do sistema
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas se já existirem para evitar conflitos ao reexecutar o script
DROP POLICY IF EXISTS "produtos_select_policy" ON public.produtos;
DROP POLICY IF EXISTS "produtos_insert_policy" ON public.produtos;
DROP POLICY IF EXISTS "produtos_update_policy" ON public.produtos;
DROP POLICY IF EXISTS "produtos_delete_policy" ON public.produtos;

DROP POLICY IF EXISTS "vendas_select_policy" ON public.vendas;
DROP POLICY IF EXISTS "vendas_insert_policy" ON public.vendas;
DROP POLICY IF EXISTS "vendas_update_policy" ON public.vendas;
DROP POLICY IF EXISTS "vendas_delete_policy" ON public.vendas;

DROP POLICY IF EXISTS "itens_venda_select_policy" ON public.itens_venda;
DROP POLICY IF EXISTS "itens_venda_insert_policy" ON public.itens_venda;
DROP POLICY IF EXISTS "itens_venda_update_policy" ON public.itens_venda;
DROP POLICY IF EXISTS "itens_venda_delete_policy" ON public.itens_venda;

DROP POLICY IF EXISTS "movimentacoes_select_policy" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "movimentacoes_insert_policy" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "movimentacoes_update_policy" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "movimentacoes_delete_policy" ON public.movimentacoes_estoque;

-- Políticas Granulares de Acesso para a Tabela PRODUTOS (anon + authenticated)
CREATE POLICY "produtos_select_policy" ON public.produtos
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "produtos_insert_policy" ON public.produtos
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "produtos_update_policy" ON public.produtos
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "produtos_delete_policy" ON public.produtos
    FOR DELETE TO anon, authenticated USING (true);

-- Políticas Granulares de Acesso para a Tabela VENDAS (anon + authenticated)
CREATE POLICY "vendas_select_policy" ON public.vendas
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "vendas_insert_policy" ON public.vendas
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "vendas_update_policy" ON public.vendas
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "vendas_delete_policy" ON public.vendas
    FOR DELETE TO anon, authenticated USING (true);

-- Políticas Granulares de Acesso para a Tabela ITENS_VENDA (anon + authenticated)
CREATE POLICY "itens_venda_select_policy" ON public.itens_venda
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "itens_venda_insert_policy" ON public.itens_venda
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "itens_venda_update_policy" ON public.itens_venda
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "itens_venda_delete_policy" ON public.itens_venda
    FOR DELETE TO anon, authenticated USING (true);

-- Políticas Granulares de Acesso para a Tabela MOVIMENTACOES_ESTOQUE (anon + authenticated)
CREATE POLICY "movimentacoes_select_policy" ON public.movimentacoes_estoque
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "movimentacoes_insert_policy" ON public.movimentacoes_estoque
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "movimentacoes_update_policy" ON public.movimentacoes_estoque
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "movimentacoes_delete_policy" ON public.movimentacoes_estoque
    FOR DELETE TO anon, authenticated USING (true);


-- ==============================================================================
-- POLÍTICAS DE ARMAZENAMENTO DE ARQUIVOS (SUPABASE STORAGE BUCKETS & POLICIES)
-- ==============================================================================
-- Cria os buckets de armazenamento de fotos de produtos e recibos/comprovantes caso desejar
INSERT INTO storage.buckets (id, name, public)
VALUES ('supermercado-arquivos', 'supermercado-arquivos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('produtos-fotos', 'produtos-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Armazenamento para os arquivos em storage.objects
DROP POLICY IF EXISTS "storage_select_public_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_insert_public_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_update_public_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_public_policy" ON storage.objects;

CREATE POLICY "storage_select_public_policy" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id IN ('supermercado-arquivos', 'produtos-fotos'));

CREATE POLICY "storage_insert_public_policy" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (bucket_id IN ('supermercado-arquivos', 'produtos-fotos'));

CREATE POLICY "storage_update_public_policy" ON storage.objects
    FOR UPDATE TO anon, authenticated
    USING (bucket_id IN ('supermercado-arquivos', 'produtos-fotos'))
    WITH CHECK (bucket_id IN ('supermercado-arquivos', 'produtos-fotos'));

CREATE POLICY "storage_delete_public_policy" ON storage.objects
    FOR DELETE TO anon, authenticated
    USING (bucket_id IN ('supermercado-arquivos', 'produtos-fotos'));
