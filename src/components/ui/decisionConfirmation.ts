export interface DecisionPrompt {
  title: string;
  target: string;
  consequence: string;
  confirmLabel: string;
  details?: ReadonlyArray<{ label: string; value: string }>;
  intent?: 'default' | 'warning' | 'danger';
}

export interface PendingDecision {
  prompt: DecisionPrompt;
  isPending: boolean;
  error: string | null;
}

export interface DecisionConfirmationController {
  getSnapshot: () => PendingDecision | null;
  subscribe: (listener: () => void) => () => void;
  request: (prompt: DecisionPrompt, operation: () => Promise<void> | void) => void;
  cancel: () => void;
  reset: () => void;
  confirm: () => Promise<void>;
}

/** One confirmation at a time. The action starts only on explicit confirmation. */
export function createDecisionConfirmation(): DecisionConfirmationController {
  let state: PendingDecision | null = null;
  let action: (() => Promise<void> | void) | null = null;
  const listeners = new Set<() => void>();
  const emit = () => { for (const listener of listeners) listener(); };
  return {
    getSnapshot: (): PendingDecision | null => state,
    subscribe: (listener: () => void): (() => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    request: (prompt: DecisionPrompt, operation: () => Promise<void> | void): void => {
      if (state) return;
      // Capture values so the approved summary and the operation cannot diverge.
      state = { prompt: { ...prompt, details: prompt.details?.map((detail) => ({ ...detail })) }, isPending: false, error: null };
      action = operation;
      emit();
    },
    cancel: (): void => {
      if (state?.isPending) return;
      state = null;
      action = null;
      emit();
    },
    reset: (): void => { state = null; action = null; emit(); },
    confirm: async (): Promise<void> => {
      if (!state || state.isPending || !action) return;
      const operation = action;
      const pending = { ...state, isPending: true, error: null };
      state = pending;
      emit();
      try {
        await operation();
        if (state !== pending) return;
        state = null;
        action = null;
      } catch (error) {
        if (state !== pending) return;
        state = { ...pending, isPending: false, error: error instanceof Error ? error.message : 'No se pudo confirmar el guardado. Intente nuevamente.' };
      }
      emit();
    },
  };
}
