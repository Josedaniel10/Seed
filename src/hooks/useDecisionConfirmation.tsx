import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactElement } from 'react';
import { createDecisionConfirmation } from '../components/ui/decisionConfirmation.ts';
import type { DecisionPrompt } from '../components/ui/decisionConfirmation.ts';
import { DecisionConfirmDialog } from '../components/ui/DecisionConfirmDialog.tsx';

interface DecisionConfirmation {
  requestDecision: (prompt: DecisionPrompt, operation: () => Promise<void> | void) => void;
  isDecisionOpen: boolean;
  decisionDialog: ReactElement;
}

export function useDecisionConfirmation(scope: string): DecisionConfirmation {
  const [controller] = useState(createDecisionConfirmation);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const decision = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => { controller.reset(); return () => controller.reset(); }, [controller, scope]);
  const requestDecision = (prompt: DecisionPrompt, operation: () => Promise<void> | void): void => {
    const requestedScope = scope;
    controller.request(prompt, async () => {
      if (currentScope.current !== requestedScope) throw new Error('La sesión o el expediente cambió. Abra la acción nuevamente.');
      await operation();
    });
  };
  return {
    requestDecision,
    isDecisionOpen: Boolean(decision),
    decisionDialog: <DecisionConfirmDialog decision={decision} onCancel={controller.cancel} onConfirm={() => { void controller.confirm(); }} />,
  };
}
