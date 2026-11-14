import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Download, Eye, LoaderCircle } from 'lucide-react';
import type { RequestDocument } from '../../types/database.ts';
import { Modal } from '../../components/ui/Modal.tsx';
import { downloadDocumentFile, saveDocumentBlob } from './documentFiles.ts';

export function DocumentFileActions({ document }: { document: RequestDocument }): ReactElement {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const isPdf = /\.pdf$/i.test(document.file_name);

  const handleRead = async (action: 'preview' | 'download') => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const blob = await downloadDocumentFile(document);
      if (!mounted.current) return;
      if (action === 'download') saveDocumentBlob(blob, document.file_name);
      else setPreview(URL.createObjectURL(blob));
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : 'No se pudo consultar el documento.');
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return <div className="space-y-2 text-xs">
    <div className="flex flex-wrap items-center gap-2">
      {isPdf && <button type="button" disabled={busy} onClick={() => void handleRead('preview')}
        aria-label={`Ver PDF: ${document.file_name}`}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 font-semibold text-[#14281D] hover:bg-stone-50 disabled:opacity-50">
        <Eye size={14} />Ver PDF
      </button>}
      <button type="button" disabled={busy} onClick={() => void handleRead('download')}
        aria-label={`Descargar original: ${document.file_name}`}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 font-semibold text-[#14281D] hover:bg-stone-50 disabled:opacity-50">
        <Download size={14} />Descargar original
      </button>
      {busy && <span role="status" className="inline-flex items-center gap-1 text-stone-600"><LoaderCircle size={14} className="animate-spin" />Obteniendo archivo…</span>}
    </div>
    {!isPdf && <p className="text-stone-500">Documento Word: descargue el original para consultarlo.</p>}
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-rose-800">{error}</p>}
    <Modal isOpen={Boolean(preview)} onClose={() => setPreview(null)} title={document.file_name}
      subtitle="Vista del archivo original · Solo lectura" maxWidth="2xl">
      {preview && <div className="space-y-3">
        <p className="text-stone-600">Si su navegador no muestra el PDF, cierre esta vista y descargue el original.</p>
        <iframe src={preview} title={`Documento: ${document.file_name}`} className="h-[60vh] w-full rounded-lg border border-stone-200" />
      </div>}
    </Modal>
  </div>;
}
