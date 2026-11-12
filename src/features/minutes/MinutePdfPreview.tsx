import { useEffect, useId, useRef } from 'react';

export function MinutePdfPreview({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const trigger = document.activeElement;
    dialog.current?.showModal();
    return () => { if (trigger instanceof HTMLElement) trigger.focus(); };
  }, []);
  return <dialog ref={dialog} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }}
    className="m-auto w-[95vw] max-w-5xl rounded-2xl bg-white p-4 shadow-xl backdrop:bg-black/60">
    <div className="flex justify-between items-center gap-3 mb-3">
      <h3 id={titleId} className="font-semibold">Vista previa · {title}</h3>
      <button type="button" onClick={onClose} className="rounded-xl border px-3 py-2">Cerrar vista previa</button>
    </div>
    <iframe title="PDF del acta" src={url} className="w-full h-[75vh] border-0" />
  </dialog>;
}
