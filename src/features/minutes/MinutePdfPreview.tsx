import { ResponsiveOverlay } from '../../components/ui/ResponsiveOverlay.tsx';

export function MinutePdfPreview({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  return <ResponsiveOverlay isOpen onClose={onClose} label={`Vista previa · ${title}`}>
    <div className="w-full max-w-5xl rounded-2xl bg-white p-4 shadow-xl">
      <div className="flex justify-between items-center gap-3 mb-3">
        <h3 className="font-semibold">Vista previa · {title}</h3>
        <button type="button" onClick={onClose} className="rounded-xl border px-3 py-2">Cerrar vista previa</button>
      </div>
      <iframe title="PDF del acta" src={url} className="w-full h-[75vh] border-0" />
    </div>
  </ResponsiveOverlay>;
}
