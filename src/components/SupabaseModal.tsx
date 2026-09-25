import React, { useState } from 'react';
import { getStoredSupabaseConfig, saveStoredSupabaseConfig, testSupabaseConnection, getSupabaseSqlSchema, clearStoredSupabaseConfig } from '../lib/supabase';
import { dbService } from '../services/db';
import { 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Database, 
  RefreshCw, 
  ExternalLink, 
  X, 
  ShieldAlert, 
  Download, 
  FileCode, 
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose, onConfigUpdated }) => {
  const currentConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [status, setStatus] = useState<{ loading: boolean; success?: boolean; message?: string }>({ loading: false });
  const [copiedSql, setCopiedSql] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'config' | 'sql'>('config');
  const [mostrarSqlPreview, setMostrarSqlPreview] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setStatus({ loading: true });
    const result = await testSupabaseConnection(url.trim(), anonKey.trim());
    setStatus({
      loading: false,
      success: result.success,
      message: result.message,
    });
  };

  const handleSave = async () => {
    saveStoredSupabaseConfig({
      url: url.trim(),
      anonKey: anonKey.trim(),
    });
    onConfigUpdated();
    
    // Test right after save
    setStatus({ loading: true });
    const result = await testSupabaseConnection(url.trim(), anonKey.trim());
    setStatus({
      loading: false,
      success: result.success,
      message: result.message,
    });
  };

  const handleDisconnect = () => {
    clearStoredSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setStatus({ loading: false, message: 'Configuração do Supabase removida. O sistema agora está operando em Modo Local.' });
    onConfigUpdated();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(getSupabaseSqlSchema());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleDownloadSql = () => {
    const element = document.createElement('a');
    const file = new Blob([getSupabaseSqlSchema()], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = 'supabase-schema.sql';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSyncLocalData = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await dbService.sincronizarLocalParaSupabase();
      setSyncResult(`Sincronização concluída! ${res.produtos} produtos e ${res.vendas} vendas enviadas ao Supabase.`);
      onConfigUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncResult(`Erro na sincronização: ${msg}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-emerald-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-800/80 rounded-lg">
              <Database className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Conexão & Políticas Supabase</h2>
              <p className="text-emerald-100 text-xs">Banco de dados e armazenamento em nuvem</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white p-1.5 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-6 pt-2">
          <button
            onClick={() => setAbaAtiva('config')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              abaAtiva === 'config'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Configurar Conexão</span>
          </button>

          <button
            onClick={() => setAbaAtiva('sql')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              abaAtiva === 'sql'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Script SQL & Políticas de Armazenamento</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto text-gray-800 text-sm">
          
          {abaAtiva === 'config' && (
            <>
              {/* Instructions Box */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <h3 className="font-semibold text-emerald-900 text-xs flex items-center gap-2 mb-2">
                  <ExternalLink className="w-4 h-4 text-emerald-700" />
                  Instruções para conexão com o Supabase:
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-emerald-800 leading-relaxed">
                  <li>
                    Acesse seu projeto no <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-emerald-950">Supabase</a>.
                  </li>
                  <li>
                    No <strong>SQL Editor</strong>, execute o script de tabelas e políticas de armazenamento RLS.
                  </li>
                  <li>
                    Em <strong>Project Settings &gt; API</strong>, copie a <strong>Project URL</strong> e <strong>anon public key</strong> e cole abaixo.
                  </li>
                </ol>

                <div className="mt-3 pt-3 border-t border-emerald-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-emerald-900">Arquivo SQL com políticas de armazenamento pronto:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopySql}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-lg transition shadow-xs cursor-pointer"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSql ? 'Copiado!' : 'Copiar SQL'}
                    </button>
                    <button
                      onClick={handleDownloadSql}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-xs font-medium rounded-lg transition shadow-xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar .SQL</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://xyzcompany.supabase.co"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Supabase Anon Public API Key
                  </label>
                  <textarea
                    rows={2}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition resize-none"
                  />
                </div>
              </div>

              {/* Status Message */}
              {status.message && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
                    status.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {status.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">{status.success ? 'Conexão validada' : 'Aviso / Erro'}</p>
                    <p>{status.message}</p>
                  </div>
                </div>
              )}

              {/* Sync Local Data to Supabase */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-gray-900 text-xs">Migrar dados locais para o Supabase</h4>
                  <p className="text-[11px] text-gray-500">
                    Se você cadastrou produtos ou vendas antes de conectar, clique para sincronizá-los com o banco na nuvem.
                  </p>
                </div>
                <button
                  onClick={handleSyncLocalData}
                  disabled={syncing || !url || !anonKey}
                  className="px-3.5 py-2 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-2 shrink-0 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Sincronizando...' : 'Sincronizar Dados'}
                </button>
              </div>

              {syncResult && (
                <p className="text-xs font-medium text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  {syncResult}
                </p>
              )}
            </>
          )}

          {abaAtiva === 'sql' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs mb-1">
                  <Lock className="w-4 h-4 text-emerald-700" />
                  <span>Políticas de Armazenamento e Segurança (RLS) Inclusas</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  O script SQL foi gerado e salvo no arquivo <strong>supabase-schema.sql</strong>. Ele inclui:
                </p>
                <ul className="list-disc list-inside text-xs text-emerald-800 mt-2 space-y-1">
                  <li><strong>Tabelas completas:</strong> <code>produtos</code>, <code>vendas</code>, <code>itens_venda</code> e <code>movimentacoes_estoque</code>.</li>
                  <li><strong>Políticas RLS salvas:</strong> Permissões granulares de SELECT, INSERT, UPDATE e DELETE.</li>
                  <li><strong>Buckets de Armazenamento:</strong> <code>supermercado-arquivos</code> e <code>produtos-fotos</code> criados em <code>storage.buckets</code>.</li>
                  <li><strong>Políticas em storage.objects:</strong> Permissão de upload e leitura pública para imagens e arquivos.</li>
                  <li><strong>Índices de performance:</strong> Otimizados para código de barras, data e status de venda.</li>
                </ul>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={handleCopySql}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSql ? 'Código Copiado com Sucesso!' : 'Copiar Todo o Script SQL'}
                  </button>

                  <button
                    onClick={handleDownloadSql}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-600" />
                    <span>Baixar Arquivo supabase-schema.sql</span>
                  </button>
                </div>
              </div>

              {/* Code preview toggle */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setMostrarSqlPreview(!mostrarSqlPreview)}
                  className="w-full bg-gray-100 hover:bg-gray-200 p-3 text-left font-semibold text-xs text-gray-700 flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-emerald-700" />
                    Visualizar Código SQL Completo ({mostrarSqlPreview ? 'Ocultar' : 'Expandir'})
                  </span>
                  {mostrarSqlPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {mostrarSqlPreview && (
                  <pre className="p-4 bg-gray-900 text-gray-200 text-[11px] font-mono overflow-x-auto max-h-96 overflow-y-auto leading-relaxed whitespace-pre selection:bg-emerald-700">
                    {getSupabaseSqlSchema()}
                  </pre>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            {url && anonKey && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-xs text-red-600 hover:text-red-700 hover:underline font-medium cursor-pointer"
              >
                Desconectar Supabase (Usar apenas Local)
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={status.loading || !url || !anonKey}
              className="px-4 py-2 border border-gray-300 hover:bg-white text-gray-700 rounded-lg text-xs font-semibold disabled:opacity-50 transition cursor-pointer"
            >
              {status.loading ? 'Testando...' : 'Testar Conexão'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              Salvar e Conectar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
