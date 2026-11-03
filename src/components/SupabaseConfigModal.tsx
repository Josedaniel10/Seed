import React, { useState } from 'react';
import {
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  getSupabaseCredentials,
  testSupabaseConnection,
} from '../lib/supabase.ts';
import { Database, Key, Globe, Check, AlertTriangle, RefreshCw, X, Copy, ExternalLink } from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigured: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigured,
}) => {
  const currentCreds = getSupabaseCredentials();
  const [url, setUrl] = useState(currentCreds.url || '');
  const [anonKey, setAnonKey] = useState(currentCreds.anonKey || '');
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setIsTesting(true);

    const saveRes = saveSupabaseCredentials(url, anonKey);
    if (!saveRes.success) {
      setStatusMessage({ type: 'error', text: saveRes.error || 'Credenciales inválidas' });
      setIsTesting(false);
      return;
    }

    const testRes = await testSupabaseConnection();
    setIsTesting(false);

    if (testRes.connected) {
      setStatusMessage({
        type: 'success',
        text: `¡Conexión exitosa con Supabase! Latencia: ${testRes.latencyMs}ms. Ahora el registro y login crearán usuarios reales en la nube.`,
      });
      setTimeout(() => {
        onConfigured();
        onClose();
      }, 1500);
    } else {
      setStatusMessage({
        type: 'error',
        text: `Fallo al verificar: ${testRes.message}. Asegúrate de que el proyecto no esté pausado y que la Anon Key sea correcta.`,
      });
    }
  };

  const handleClear = () => {
    clearSupabaseCredentials();
    setUrl('');
    setAnonKey('');
    setStatusMessage({ type: 'info', text: 'Credenciales eliminadas.' });
    onConfigured();
  };

  const copySqlSchemaInstructions = () => {
    const sqlNotice = `-- Ejecuta la migración inicial en el Editor SQL de tu proyecto Supabase:
-- supabase/migrations/20261102000001_initial_schema.sql
-- y habilita las políticas de seguridad:
-- supabase/migrations/20261102000002_rls_policies.sql`;
    navigator.clipboard.writeText(sqlNotice);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 max-w-lg w-full shadow-xl space-y-5 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#14281D] text-[#84CC16] flex items-center justify-center">
              <Database size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#14281D]">
                Conectar Proyecto Real de Supabase
              </h3>
              <p className="text-[11px] text-stone-500">
                Autenticación y base de datos PostgreSQL institucional en tiempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Alert */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-200'
                : 'bg-stone-50 text-stone-800 border-stone-200'
            }`}
          >
            {statusMessage.type === 'success' && <Check size={15} className="text-emerald-600 shrink-0 mt-0.5" />}
            {statusMessage.type === 'error' && <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Instructions / Help */}
        <div className="bg-[#F7F6F2] p-3.5 rounded-xl border border-[#E5E3DC] text-xs text-stone-600 space-y-1.5 leading-relaxed">
          <p className="font-semibold text-[#14281D] flex items-center gap-1.5">
            <Globe size={13} className="text-[#84CC16]" />
            ¿Dónde encuentro estas credenciales en Supabase?
          </p>
          <p className="text-[11px]">
            En tu panel de <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-[#14281D] font-semibold underline inline-flex items-center gap-0.5">supabase.com <ExternalLink size={10} /></a>:
            ve a <strong>Project Settings → API</strong>. Copia la <strong>Project URL</strong> y la <strong>anon public key</strong>.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSaveAndTest} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#14281D] mb-1" htmlFor="supa-url">
              Project URL de Supabase *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                <Globe size={14} />
              </span>
              <input
                id="supa-url"
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzabcdefg.supabase.co"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E5E3DC] focus:outline-none focus:ring-2 focus:ring-[#14281D] font-mono text-[11px]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#14281D] mb-1" htmlFor="supa-key">
              Anon Public Key (API Key pública de Supabase) *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                <Key size={14} />
              </span>
              <textarea
                id="supa-key"
                required
                rows={3}
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E5E3DC] focus:outline-none focus:ring-2 focus:ring-[#14281D] font-mono text-[11px] leading-tight resize-none"
              />
            </div>
            <p className="text-[10px] text-stone-500 mt-1">
              Es la clave pública 'anon' para clientes web protegida por Row Level Security (RLS).
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-stone-100">
            {currentCreds.isConfigured ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-rose-700 hover:text-rose-900 text-xs font-medium cursor-pointer"
              >
                Desconectar
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isTesting}
                className="px-4 py-1.5 rounded-lg bg-[#14281D] text-white font-bold hover:bg-[#1E3A2B] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <RefreshCw size={13} className={isTesting ? 'animate-spin' : ''} />
                <span>{isTesting ? 'Probando conexión...' : 'Conectar y Guardar'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
