import { useState } from 'react';
import type { ReactElement } from 'react';
import { Info } from 'lucide-react';
import type { Request } from '../../types/database.ts';
import { Modal } from '../../components/ui/Modal.tsx';
import { NextActionCard } from './NextActionCard.tsx';
import { useNextAction } from './useNextAction.ts';

export function NextActionCell({ request }: { request: Request }): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const { action } = useNextAction(request);

  return <div onClick={(event) => event.stopPropagation()}>
    <button type="button" onClick={() => setIsOpen(true)} aria-haspopup="dialog"
      aria-label={`Ver próxima acción de ${request.filing_number}`} title={`Ver detalles: ${action.title}`}
      className="flex w-full min-w-0 items-center gap-1.5 rounded-lg py-1 text-left text-sm font-semibold text-stone-600 hover:text-[#14281D] focus-visible:outline-2 focus-visible:outline-[#4d7c0f] cursor-pointer">
      <span className="min-w-0 flex-1 whitespace-normal">{action.title}</span>
      <Info size={13} aria-hidden="true" className="shrink-0 text-stone-400" />
    </button>
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Seguimiento de la solicitud" subtitle={request.filing_number} maxWidth="md">
      {isOpen && <NextActionCard request={request} />}
    </Modal>
  </div>;
}
