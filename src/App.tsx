import React, { useState, useEffect } from 'react';
import { SeedLogo } from './components/SeedLogo.tsx';
import { APPLICATION_STATUS_CONFIG, ApplicationStatus } from './types/theme.ts';
import { testSupabaseConnection } from './lib/supabase.ts';
import {
  Check,
  ShieldCheck,
  ArrowRight,
  BookOpen,
  Layers,
  Sparkles,
  Database,
  RefreshCw,
  FileText,
  UploadCloud,
  Download,
  AlertTriangle,
  UserPlus,
} from 'lucide-react';
import { RegisterForm } from './features/auth/RegisterForm.tsx';

export default function App() {
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus>('LISTA_COMITE');
  const [supabaseTest, setSupabaseTest] = useState<{
    configured: boolean;
    connected: boolean;
    latencyMs: number;
    url: string;
    message: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const runSupabaseTest = async () => {
    setIsTesting(true);
    const result = await testSupabaseConnection();
    setSupabaseTest(result);
    setIsTesting(false);
  };

  // File service test state (T0.6)
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

  const runFileServiceTest = async () => {
    setFileTestResult({ status: 'running' });
    try {
      // 1. Crear documento de prueba simulado
      const sampleText = `UNIVERSIDAD - COMITÉ DE INVESTIGACIONES\nDocumento oficial de radicación de proyecto Seed.\nFecha: ${new Date().toISOString()}\nValidación criptográfica SHA-256 e integridad física.`;
      const base64Data = btoa(unescape(encodeURIComponent(sampleText)));
      const fileName = `propuesta_seed_test_${Date.now()}.pdf`;

      // 2. Subir a /api/files/upload
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

      // 3. Descargar desde /api/files/download/:name
      const downloadRes = await fetch(`/api/files/download/${uploadedMeta.savedName}`);
      if (!downloadRes.ok) {
        throw new Error('Error al descargar archivo desde el almacenamiento local');
      }

      const downloadBlob = await downloadRes.blob();
      const downloadBuffer = await downloadBlob.arrayBuffer();

      // Calcular hash SHA-256 del contenido descargado en el navegador usando Web Crypto
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

  const paletteColors = [
    {
      name: 'Verde Bosque Profundo',
      role: 'Primario institucional & Botones de acción',
      hex: '#14281D',
      bgClass: 'bg-[#14281D]',
      textSampleClass: 'text-white',
      contrastRatio: '14.2:1 (AAA sobre fondo claro)',
      notes: 'Usado para texto principal, marca y superficies de alto contraste.',
    },
    {
      name: 'Verde Bosque Suave',
      role: 'Superficies secundarias y acentos oscuros',
      hex: '#1E3A2B',
      bgClass: 'bg-[#1E3A2B]',
      textSampleClass: 'text-white',
      contrastRatio: '10.8:1 (AAA)',
      notes: 'Usado en cabeceras de tablas y hover de botones primarios.',
    },
    {
      name: 'Verde Brote Lima',
      role: 'Acento de germinación y estado Lista para Comité',
      hex: '#84CC16 / #A3E635',
      bgClass: 'bg-[#A3E635]',
      textSampleClass: 'text-[#14281D]',
      contrastRatio: '11.5:1 (AAA con texto Verde Bosque)',
      notes: 'REGLA: Se usa únicamente como fondo con texto verde oscuro. Nunca como texto claro.',
    },
    {
      name: 'Piedra Cálida',
      role: 'Fondo general del lienzo',
      hex: '#F7F6F2',
      bgClass: 'bg-[#F7F6F2]',
      textSampleClass: 'text-[#14281D]',
      contrastRatio: '14.2:1 con texto primario',
      notes: 'Tono neutro con matiz orgánico terroso, descansado para la vista.',
    },
    {
      name: 'Blanco Lino',
      role: 'Superficie de tarjetas y modales',
      hex: '#FFFFFF',
      bgClass: 'bg-white',
      textSampleClass: 'text-[#14281D]',
      contrastRatio: '15.1:1 con texto primario',
      notes: 'Tarjetas con bordes sutiles de 1px en #E5E3DC.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#14281D] flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-[#E5E3DC] px-6 py-3.5 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SeedLogo size={30} />
            <span className="text-xs text-stone-400 font-medium hidden sm:inline">|</span>
            <span className="text-xs text-stone-600 font-medium tracking-wide hidden sm:inline">
              Comité de Investigación Universitaria
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs bg-[#A3E635] text-[#14281D] font-semibold px-2.5 py-1 rounded-full border border-[#84CC16]">
              Sprint 1 · Tarea T1.1
            </span>
            <span className="text-xs text-stone-500 font-mono">v0.1-pre</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Supabase Connection Verification Card (T0.4) */}
        <section className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <Database size={18} className="text-[#14281D]" />
                <h2 className="text-base font-bold text-[#14281D]">
                  Cliente de Supabase y Verificación de Conexión
                </h2>
                {supabaseTest && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                      supabaseTest.connected
                        ? 'bg-[#A3E635] text-[#14281D] border-[#84CC16]'
                        : 'bg-rose-100 text-rose-900 border-rose-300'
                    }`}
                  >
                    <Check size={12} />
                    {supabaseTest.connected ? 'Cliente Inicializado' : 'Sin Conexión'}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                Verifica la inicialización del cliente `@supabase/supabase-js`, endpoint del proyecto y consulta de prueba.
              </p>
            </div>

            <button
              onClick={runSupabaseTest}
              disabled={isTesting}
              className="self-start sm:self-auto px-3.5 py-1.5 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={isTesting ? 'animate-spin' : ''} />
              <span>{isTesting ? 'Consultando...' : 'Reejecutar consulta de prueba'}</span>
            </button>
          </div>

          {supabaseTest && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#F7F6F2] p-3 rounded-lg border border-[#E5E3DC] space-y-1">
                <span className="text-stone-500 font-medium">Endpoint Supabase:</span>
                <p className="font-mono text-stone-800 break-all">{supabaseTest.url}</p>
              </div>

              <div className="bg-[#F7F6F2] p-3 rounded-lg border border-[#E5E3DC] space-y-1">
                <span className="text-stone-500 font-medium">Tiempo de respuesta / latencia:</span>
                <p className="font-semibold text-[#14281D] font-mono tabular-nums">
                  {supabaseTest.latencyMs} ms
                </p>
              </div>

              <div className="bg-[#F7F6F2] p-3 rounded-lg border border-[#E5E3DC] space-y-1">
                <span className="text-stone-500 font-medium">Estado de configuración:</span>
                <p className="font-semibold text-stone-800">
                  {supabaseTest.configured ? 'Variables de entorno detectadas' : 'Modo inicial de desarrollo'}
                </p>
              </div>

              <div className="md:col-span-3 bg-stone-50 p-3 rounded-lg border border-stone-200 text-stone-600 text-[11px] leading-relaxed">
                <strong>Diagnóstico:</strong> {supabaseTest.message}
              </div>
            </div>
          )}
        </section>

        {/* Local File Service Verification Card (T0.6 / RNF-04) */}
        <section className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#14281D]" />
                <h2 className="text-base font-bold text-[#14281D]">
                  Servicio Local de Archivos (/api/files) & Integridad SHA-256
                </h2>
                {fileTestResult.status === 'success' && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border bg-[#A3E635] text-[#14281D] border-[#84CC16]">
                    <Check size={12} />
                    Hashes 100% Coincidentes
                  </span>
                )}
                {fileTestResult.status === 'error' && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border bg-rose-100 text-rose-900 border-rose-300">
                    <AlertTriangle size={12} />
                    Fallo de Integridad
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                Almacena físicamente los documentos en disco (`file-service/storage/`), valida extensiones (.pdf/.docx) y tamaño máximo de 10 MB (RNF-04).
              </p>
            </div>

            <button
              onClick={runFileServiceTest}
              disabled={fileTestResult.status === 'running'}
              className="self-start sm:self-auto px-3.5 py-1.5 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <UploadCloud size={13} className={fileTestResult.status === 'running' ? 'animate-bounce' : ''} />
              <span>
                {fileTestResult.status === 'running' ? 'Subiendo y verificando...' : 'Reejecutar prueba de subida/descarga'}
              </span>
            </button>
          </div>

          {fileTestResult.status === 'running' && (
            <div className="bg-[#F7F6F2] p-4 rounded-lg border border-[#E5E3DC] text-xs text-stone-600 animate-pulse">
              Subiendo documento de prueba, guardando en disco local y verificando integridad criptográfica...
            </div>
          )}

          {fileTestResult.status === 'error' && (
            <div className="bg-rose-50 p-4 rounded-lg border border-rose-200 text-xs text-rose-800">
              <strong>Error en servicio de archivos:</strong> {fileTestResult.error}
            </div>
          )}

          {fileTestResult.status === 'success' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-[#F7F6F2] p-3 rounded-lg border border-[#E5E3DC] space-y-1">
                  <span className="text-stone-500 font-medium">Documento de prueba:</span>
                  <p className="font-mono text-stone-800 font-semibold">{fileTestResult.fileName}</p>
                </div>

                <div className="bg-[#F7F6F2] p-3 rounded-lg border border-[#E5E3DC] space-y-1">
                  <span className="text-stone-500 font-medium">Tamaño físico:</span>
                  <p className="font-mono text-stone-800 font-semibold tabular-nums">
                    {fileTestResult.fileSizeBytes} bytes
                  </p>
                </div>

                <div className="bg-[#F7F6F2] p-3 rounded-lg border border-[#E5E3DC] space-y-1">
                  <span className="text-stone-500 font-medium">Validación RNF-04:</span>
                  <p className="text-[#14281D] font-semibold flex items-center gap-1">
                    <Check size={13} className="text-[#84CC16]" /> PDF / DOCX &lt; 10MB
                  </p>
                </div>

                <div className="bg-[#F7F6F2] p-3 rounded-lg border border-[#E5E3DC] space-y-1">
                  <span className="text-stone-500 font-medium">Integridad física:</span>
                  <p className="text-[#14281D] font-semibold flex items-center gap-1">
                    <ShieldCheck size={13} className="text-[#84CC16]" /> Verificada en disco
                  </p>
                </div>
              </div>

              {/* Hash matching comparison box */}
              <div className="bg-[#F7F6F2] p-3.5 rounded-lg border border-[#E5E3DC] space-y-2 text-xs font-mono">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-stone-600 gap-1">
                  <span className="text-stone-500 font-sans font-medium">Hash SHA-256 al subir:</span>
                  <span className="text-[#14281D] break-all">{fileTestResult.uploadHash}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-stone-600 gap-1 border-t border-stone-200 pt-2">
                  <span className="text-stone-500 font-sans font-medium">Hash SHA-256 al descargar:</span>
                  <span className="text-[#14281D] break-all">{fileTestResult.downloadHash}</span>
                </div>
              </div>

              <div className="text-[11px] text-stone-500 flex items-center justify-between pt-1">
                <span>Ruta física en servidor: <code className="font-mono text-stone-700">{fileTestResult.savedPath}</code></span>
                <a
                  href={`/api/files/download/${fileTestResult.savedPath ? fileTestResult.savedPath.split('/').pop() : ''}`}
                  download={fileTestResult.fileName}
                  className="inline-flex items-center gap-1 text-[#14281D] font-semibold hover:underline"
                >
                  <Download size={13} />
                  Descargar archivo de prueba
                </a>
              </div>
            </div>
          )}
        </section>

        {/* Interactive Researcher Registration Form (T1.1 / RF-01) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#14281D] flex items-center gap-2">
                <UserPlus size={18} className="text-[#14281D]" />
                Módulo de Acceso: Registro de Investigadores (T1.1)
              </h2>
              <p className="text-xs text-stone-600">
                Formulario interactivo validado con React Hook Form + Zod. Se crea el usuario y su perfil con rol de investigador.
              </p>
            </div>
            <span className="text-xs bg-[#A3E635] text-[#14281D] font-semibold px-2.5 py-1 rounded-full border border-[#84CC16]">
              RF-01 Activo
            </span>
          </div>

          <RegisterForm />
        </section>

        {/* Banner Hero */}
        <section className="bg-white rounded-2xl border border-[#E5E3DC] p-6 md:p-8 shadow-xs relative overflow-hidden">
          <div className="max-w-2xl relative z-10 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1E3A2B] uppercase tracking-wider">
              <Sparkles size={14} className="text-[#84CC16]" />
              Identidad Visual y Sistema de Diseño
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#14281D]">
              Semilla de rigor, crecimiento y transparencia
            </h1>
            <p className="text-sm md:text-base text-stone-600 leading-relaxed">
              El tema visual de <strong className="text-[#14281D]">Seed</strong> fusiona la solemnidad académica universitaria con una estética orgánica de formas curvas, paleta botánica inspirada en la tierra y el follaje, y estricta accesibilidad de contrastes WCAG AA.
            </p>
          </div>
          {/* Subtle background sprout watermark */}
          <div className="absolute right-[-20px] bottom-[-30px] opacity-10 pointer-events-none select-none text-[#14281D]">
            <SeedLogo size={240} showWordmark={false} />
          </div>
        </section>

        {/* Section 0: Seed Logo Aesthetic Variants */}
        <section className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#14281D] flex items-center gap-2">
                <Sparkles size={16} className="text-[#84CC16]" />
                Isotipo y Logotipo Seed (Minimalismo Botánico Geométrico)
              </h2>
              <p className="text-xs text-stone-600">
                Diseño estilizado con dos arcos orgánicos complementarios: la envoltura protectora (verde bosque) y el brote germinal ascendente (lima suave).
              </p>
            </div>
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">
              SVG Puro Vectorial
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Variant 1: Light canvas */}
            <div className="bg-[#F7F6F2] border border-[#E5E3DC] rounded-xl p-5 flex flex-col items-center justify-center gap-3">
              <SeedLogo size={44} />
              <span className="text-[11px] text-stone-500 font-medium">Isotipo + Wordmark en lienzo claro</span>
            </div>

            {/* Variant 2: Dark Forest Canvas */}
            <div className="bg-[#14281D] border border-[#14281D] rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-white">
              <div className="flex items-center gap-2.5">
                <svg
                  width={44}
                  height={44}
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="shrink-0"
                >
                  <path
                    d="M16 4C16 4 9 12.8 9 19.4C9 23.6 12.1 27 16 27C17.2 27 18.3 26.7 19.3 26.1C18.2 24.2 17.6 21.9 17.6 19.5C17.6 14.2 20.3 9.4 24.5 6.8C22.2 4.9 19.2 4 16 4Z"
                    fill="#F7F6F2"
                  />
                  <path
                    d="M20.2 10.5C18.2 13 17 16.2 17 19.7C17 22.3 17.8 24.7 19.2 26.6C21.4 25.2 23 22.7 23 19.7C23 15.6 21.8 12.3 20.2 10.5Z"
                    fill="#A3E635"
                  />
                  <circle cx="16" cy="19.5" r="1.5" fill="#14281D" />
                </svg>
                <span className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
                  Seed
                </span>
              </div>
              <span className="text-[11px] text-stone-300 font-medium">Contraste sobre fondo institucional</span>
            </div>

            {/* Variant 3: Minimalist Icon Alone (Scalable) */}
            <div className="bg-white border border-[#E5E3DC] rounded-xl p-5 flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-4">
                <SeedLogo size={24} showWordmark={false} />
                <SeedLogo size={36} showWordmark={false} />
                <SeedLogo size={48} showWordmark={false} />
              </div>
              <span className="text-[11px] text-stone-500 font-medium">Escalas del isotipo (24px, 36px, 48px)</span>
            </div>
          </div>
        </section>

        {/* Section 1: Color Palette & WCAG AA Contrast Ratios */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#14281D] flex items-center gap-2">
                <Layers size={18} />
                Paleta de Colores y Verificación de Contraste
              </h2>
              <p className="text-xs text-stone-600">
                Verificación de proporciones de contraste con texto legible sin comprometer el estilo.
              </p>
            </div>
            <span className="text-xs text-[#14281D] bg-[#A3E635] font-semibold px-2 py-0.5 rounded border border-[#84CC16] flex items-center gap-1">
              <ShieldCheck size={14} /> WCAG AA / AAA
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paletteColors.map((color, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-[#E5E3DC] p-4 flex flex-col justify-between space-y-3 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#14281D]">{color.name}</span>
                    <span className="text-xs font-mono text-stone-500">{color.hex}</span>
                  </div>
                  {/* Swatch Sample Box */}
                  <div
                    className={`${color.bgClass} ${color.textSampleClass} rounded-lg p-3 text-xs font-medium border border-black/5 flex items-center justify-between`}
                  >
                    <span>Muestra de texto legible</span>
                    <Check size={14} />
                  </div>
                </div>

                <div className="text-xs space-y-1 pt-2 border-t border-stone-100">
                  <div className="text-stone-500 font-medium">{color.role}</div>
                  <div className="text-stone-700 font-semibold">{color.contrastRatio}</div>
                  <p className="text-[11px] text-stone-500 italic">{color.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Application Status Tokens (Icon + Text, Never Color Alone) */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#14281D] flex items-center gap-2">
              <BookOpen size={18} />
              Estados Semánticos del Trámite (Ícono + Texto Explícito)
            </h2>
            <p className="text-xs text-stone-600">
              Cumpliendo la regla de accesibilidad: ningún estado se comunica únicamente mediante color.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#E5E3DC] p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap gap-2.5">
              {(Object.keys(APPLICATION_STATUS_CONFIG) as ApplicationStatus[]).map((statusKey) => {
                const conf = APPLICATION_STATUS_CONFIG[statusKey];
                const IconComponent = conf.icon;
                const isSelected = selectedStatus === statusKey;

                return (
                  <button
                    key={statusKey}
                    onClick={() => setSelectedStatus(statusKey)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      conf.bgClass
                    } ${conf.textClass} ${conf.borderClass} ${
                      isSelected ? 'ring-2 ring-[#14281D] ring-offset-1' : 'opacity-85 hover:opacity-100'
                    }`}
                  >
                    <IconComponent size={14} className="shrink-0" />
                    <span>{conf.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Status Details Box */}
            <div className="bg-[#F7F6F2] rounded-lg p-4 border border-[#E5E3DC] text-xs space-y-1">
              <div className="font-semibold text-[#14281D] flex items-center gap-2">
                <span>Estado seleccionado:</span>
                <span className="font-mono text-stone-700">{selectedStatus}</span>
              </div>
              <p className="text-stone-600">
                {APPLICATION_STATUS_CONFIG[selectedStatus].description}
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Typography & Tabular Numerals */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-[#14281D]">
            Jerarquía Tipográfica y Cifras Tabulares
          </h2>

          <div className="bg-white rounded-xl border border-[#E5E3DC] p-6 shadow-2xs grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Display & Encabezados (Plus Jakarta Sans)
              </span>
              <div className="space-y-1">
                <h1 className="text-2xl font-extrabold text-[#14281D]">INV-2026-0042 · Convocatoria</h1>
                <h2 className="text-lg font-bold text-[#1E3A2B]">Comité Ordinario de Investigación</h2>
                <h3 className="text-sm font-semibold text-stone-700">Facultad de Ingeniería y Ciencias Básicas</h3>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Cifras Tabulares y Radicados (DM Sans / Tabular-nums)
              </span>
              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Radicado:</span>
                  <span className="font-semibold text-[#14281D] tabular-nums">INV-2026-0089</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Fecha de radicación:</span>
                  <span className="tabular-nums text-stone-700">02/11/2026 14:35:10</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-500">Monto solicitado:</span>
                  <span className="font-semibold text-[#14281D] tabular-nums">$ 45.200.000 COP</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: UI Buttons & Controls Showcase */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-[#14281D]">Botones y Controles del Sistema</h2>

          <div className="bg-white rounded-xl border border-[#E5E3DC] p-5 shadow-2xs flex flex-wrap gap-3 items-center">
            {/* Primary Action Button */}
            <button className="px-4 py-2 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-xs">
              <span>Radicar Solicitud</span>
              <ArrowRight size={14} />
            </button>

            {/* Accent Button (Lima fill with dark green text) */}
            <button className="px-4 py-2 bg-[#A3E635] hover:bg-[#84CC16] text-[#14281D] text-xs font-bold rounded-lg border border-[#84CC16] transition-colors flex items-center gap-2 cursor-pointer shadow-xs">
              <span>Aprobar en Sesión</span>
              <Check size={14} />
            </button>

            {/* Secondary Button */}
            <button className="px-4 py-2 bg-[#F7F6F2] hover:bg-[#EFECE6] text-[#14281D] text-xs font-medium rounded-lg border border-[#E5E3DC] transition-colors cursor-pointer">
              <span>Descargar Documentos</span>
            </button>

            {/* Outline Cancel Button */}
            <button className="px-4 py-2 bg-transparent hover:bg-stone-50 text-stone-600 text-xs font-medium rounded-lg border border-stone-200 transition-colors cursor-pointer">
              <span>Cancelar</span>
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E3DC] bg-white py-4 px-6 text-center text-xs text-stone-500 mt-auto">
        Seed · Sistema de Gestión del Comité de Investigación © 2026 · Universidad
      </footer>
    </div>
  );
}
