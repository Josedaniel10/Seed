import React, { useState, useEffect } from 'react';
import { Database, FileText, Check, AlertTriangle, RefreshCw, UploadCloud, Download, ShieldCheck } from 'lucide-react';
import { testSupabaseConnection } from '../../../lib/supabase.ts';
import { Button } from '../../../components/ui/Button.tsx';

export function ServiceStatusWidget() {
  const [supabaseTest, setSupabaseTest] = useState<{
    configured: boolean;
    connected: boolean;
    latencyMs: number;
    url: string;
    message: string;
  } | null>(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);

  const [fileTestResult, setFileTestResult] = useState<{
    status: 'idle' | 'running' | 'success' | 'error';
    fileName?: string;
    savedPath?: string;
    fileSizeBytes?: number;
    uploadHash?: string;
    downloadHash?: string;
    match?: boolean;
    error?: string;
  }>({ status: 'idle' });

  const runSupabaseTest = async () => {
    setIsTestingSupabase(true);
    const result = await testSupabaseConnection();
    setSupabaseTest(result);
    setIsTestingSupabase(false);
  };

  const runFileServiceTest = async () => {
    setFileTestResult({ status: 'running' });
    try {
      const sampleText = `UNIVERSIDAD - COMITÉ DE INVESTIGACIONES\nDocumento oficial de verificación Seed.\nFecha: ${new Date().toISOString()}\nValidación criptográfica SHA-256 e integridad física.`;
      const base64Data = btoa(unescape(encodeURIComponent(sampleText)));
      const fileName = `verificacion_seed_${Date.now()}.pdf`;

      const uploadRes = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          fileBase64: base64Data,
          mimeType: 'application/pdf',
        }),
      });

      if (!uploadRes.ok) {
        const errJson = await uploadRes.json();
        throw new Error(errJson.error || 'Error al subir archivo');
      }

      const uploadedMeta = await uploadRes.json();
      const downloadRes = await fetch(`/api/files/download/${uploadedMeta.savedName}`);
      if (!downloadRes.ok) {
        throw new Error('Error al descargar archivo desde el almacenamiento local');
      }

      const downloadBlob = await downloadRes.blob();
      const downloadBuffer = await downloadBlob.arrayBuffer();

      const hashBuffer = await crypto.subtle.digest('SHA-256', downloadBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const downloadHashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      const hashesMatch = uploadedMeta.hashSha256 === downloadHashHex;

      setFileTestResult({
        status: hashesMatch ? 'success' : 'error',
        fileName: uploadedMeta.originalName,
        savedPath: uploadedMeta.filePath,
        fileSizeBytes: uploadedMeta.fileSizeBytes,
        uploadHash: uploadedMeta.hashSha256,
        downloadHash: downloadHashHex,
        match: hashesMatch,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar archivo';
      setFileTestResult({ status: 'error', error: msg });
    }
  };

  useEffect(() => {
    runSupabaseTest();
    runFileServiceTest();
  }, []);

  return (
    <div className="space-y-4">
      {/* Supabase status card */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-[#14281D]" />
            <h3 className="font-bold text-xs text-[#14281D]">Conexión</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={runSupabaseTest}
            disabled={isTestingSupabase}
            icon={<RefreshCw size={12} className={isTestingSupabase ? 'animate-spin' : ''} />}
          >
            {isTestingSupabase ? 'Verificando...' : 'Verificar'}
          </Button>
        </div>

        {supabaseTest && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Estado conexión:</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 border ${
                  supabaseTest.connected
                    ? 'bg-[#A3E635] text-[#14281D] border-[#84CC16]'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                <Check size={10} />
                {supabaseTest.connected ? 'Conectado' : 'Sin conexión'}
              </span>
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed bg-[#F7F6F2] p-2.5 rounded-lg border border-[#E5E3DC]">
              {supabaseTest.connected ? 'El servicio está disponible.' : 'No se pudo conectar. Intente nuevamente.'}
            </p>
          </div>
        )}
      </div>

      {/* Local file service card */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[#14281D]" />
            <h3 className="font-bold text-xs text-[#14281D]">Documentos</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={runFileServiceTest}
            disabled={fileTestResult.status === 'running'}
            icon={<UploadCloud size={12} />}
          >
            Probar
          </Button>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Comprobación de archivos</span>
            {fileTestResult.status === 'success' && (
              <span className="font-semibold px-2 py-0.5 rounded-full text-[10px] bg-[#A3E635] text-[#14281D] border border-[#84CC16] flex items-center gap-1">
                <Check size={10} />
                Archivo verificado
              </span>
            )}
            {fileTestResult.status === 'running' && (
              <span className="text-stone-400">Verificando...</span>
            )}
          </div>

          <div className="text-[11px] text-stone-600 bg-[#F7F6F2] p-2.5 rounded-lg border border-[#E5E3DC] space-y-1">
            <div className="flex items-center justify-between">
              <span>Formatos y tamaño</span>
              <span className="font-semibold text-emerald-800">PDF / DOCX &lt; 10MB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
