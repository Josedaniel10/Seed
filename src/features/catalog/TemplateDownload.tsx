import { getUserError } from '../../lib/userMessages.ts';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { downloadTemplate } from './templateFiles.ts';

export function TemplateDownload({ path }: { path: string }): ReactElement {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const handleDownload = async () => {
    setBusy(true); setError('');
    try { await downloadTemplate(path); }
    catch (cause) { setError(getUserError(cause, 'No se pudo descargar.')); }
    finally { setBusy(false); }
  };
  return <span className="inline-flex flex-col gap-1">
    <button type="button" disabled={busy} onClick={() => { void handleDownload(); }} className="min-h-12 rounded-lg border border-stone-300 px-3 text-xs font-semibold focus-visible:outline-2">{busy ? 'Descargando…' : 'Descargar plantilla'}</button>
    {error && <span role="alert" className="text-xs text-rose-800">{error}</span>}
  </span>;
}
