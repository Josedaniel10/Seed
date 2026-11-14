import type { ReactElement, ReactNode } from 'react';
import { Modal } from './Modal.tsx';
import { DecisionConfirmContent } from './DecisionConfirmContent.tsx';
import type { PendingDecision } from './decisionConfirmation.ts';

export function DecisionConfirmDialog({ decision, onCancel, onConfirm, children }: {
  decision: PendingDecision | null; onCancel: () => void; onConfirm: () => void; children?: ReactNode;
}): ReactElement {
  return <Modal isOpen={Boolean(decision)} title={decision?.prompt.title ?? 'Confirmar decisión'}
    onClose={onCancel} isDismissible={!decision?.isPending} maxWidth="lg">
    {decision && <DecisionConfirmContent decision={decision} onCancel={onCancel} onConfirm={onConfirm}>{children}</DecisionConfirmContent>}
  </Modal>;
}
