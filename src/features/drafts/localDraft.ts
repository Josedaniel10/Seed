import { z } from 'zod';
import { createUuid } from '../../lib/uuid.ts';

const envelopeSchema = z.object({
  version: z.literal(1), ownerId: z.string(), scope: z.string(), context: z.string(),
  revision: z.string(), savedAt: z.string().datetime(), needsReview: z.boolean(), value: z.unknown(),
});
export type DraftStatus = 'empty' | 'saved' | 'restored' | 'pending' | 'unavailable' | 'conflict' | 'outdated' | 'invalid';
export interface DraftSnapshot<T> {
  value: T; status: DraftStatus; savedAt: string | null; needsReview: boolean; error: string | null;
}
export interface LocalDraft<T> {
  key: string;
  context: string;
  getSnapshot: () => DraftSnapshot<T>;
  subscribe: (listener: () => void) => () => void;
  update: (updater: (current: T) => T) => void;
  flush: () => boolean;
  recover: () => void;
  replace: () => void;
  discard: () => void;
  complete: () => void;
  externalChange: () => void;
  hasUnsavedChanges: () => boolean;
}
export interface LocalDraftOptions<T> {
  ownerId: string;
  scope: string;
  context: string;
  schema: z.ZodType<T>;
  createInitial: () => T;
  hasContent: (value: T) => boolean;
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
}

/** Stores only form data and uploaded object references, scoped to this browser and user. */
export function createLocalDraft<T>(options: LocalDraftOptions<T>): LocalDraft<T> {
  const { ownerId, scope, context, schema, createInitial, hasContent, storage } = options;
  const key = `seed:draft:v1:${encodeURIComponent(ownerId)}:${encodeURIComponent(scope)}`;
  let state: DraftSnapshot<T> = { value: createInitial(), status: 'empty', savedAt: null, needsReview: false, error: null };
  let expectedRaw: string | null | undefined;
  let dirty = false;
  let completed = false;
  const listeners = new Set<() => void>();
  const emit = () => { for (const listener of listeners) listener(); };
  const unavailable = () => {
    state = { ...state, status: 'unavailable', error: 'No se pudo guardar el borrador en este navegador. Mantenga esta pantalla abierta y vuelva a intentar.' };
    emit();
  };
  const parse = (raw: string) => {
    try {
      const envelope = envelopeSchema.safeParse(JSON.parse(raw));
      if (!envelope.success || envelope.data.ownerId !== ownerId || envelope.data.scope !== scope) return null;
      const value = schema.safeParse(envelope.data.value);
      return value.success ? { ...envelope.data, value: value.data } : null;
    } catch { return null; }
  };
  const load = (explicit: boolean) => {
    if (!storage || !ownerId) return;
    try {
      const raw = storage.getItem(key);
      expectedRaw = raw;
      if (!raw) {
        if (explicit) {
          state = { ...state, status: 'pending', savedAt: null, error: null };
          dirty = true;
        }
        return;
      }
      const saved = parse(raw);
      if (!saved) {
        state = { ...state, status: 'invalid', error: 'El borrador guardado no tiene un formato compatible. Puede descartarlo para comenzar de nuevo.' };
      } else if (saved.context !== context && !explicit) {
        state = { ...state, status: 'outdated', savedAt: saved.savedAt,
          error: 'La asignación o los documentos cambiaron desde este borrador. Revise su contenido antes de utilizarlo.' };
      } else {
        state = { value: saved.value, status: 'restored', savedAt: saved.savedAt,
          needsReview: saved.needsReview || saved.context !== context, error: null };
        dirty = explicit && saved.context !== context;
      }
    } catch { unavailable(); }
  };
  load(false);

  const controller: LocalDraft<T> = {
    key,
    context,
    getSnapshot: () => state,
    subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    update: (updater) => {
      if (completed) return;
      const next = updater(state.value);
      if (Object.is(next, state.value)) return;
      dirty = true;
      const blocked = ['conflict', 'outdated', 'invalid'].includes(state.status);
      state = { ...state, value: next, status: blocked ? state.status : 'pending', error: blocked ? state.error : null };
      emit();
    },
    flush: () => {
      if (completed || !dirty) return true;
      if (['conflict', 'outdated', 'invalid'].includes(state.status)) return false;
      if (!storage || !ownerId) { unavailable(); return false; }
      try {
        const actual = storage.getItem(key);
        if (actual !== (expectedRaw ?? null)) {
          state = { ...state, status: 'conflict', error: 'Hay otra versión del borrador en este navegador. El texto actual se conserva sin sobrescribirla.' };
          emit();
          return false;
        }
        const parsed = schema.safeParse(state.value);
        if (!parsed.success) { unavailable(); return false; }
        if (!hasContent(parsed.data)) {
          storage.removeItem(key);
          expectedRaw = null;
          state = { ...state, status: 'empty', savedAt: null, error: null };
        } else {
          const savedAt = new Date().toISOString();
          const raw = JSON.stringify({ version: 1, ownerId, scope, context, savedAt,
            revision: createUuid(), needsReview: state.needsReview, value: parsed.data });
          storage.setItem(key, raw);
          expectedRaw = raw;
          state = { ...state, status: 'saved', savedAt, error: null };
        }
        dirty = false;
        emit();
        return true;
      } catch { unavailable(); return false; }
    },
    recover: () => {
      if (completed) return;
      if (!storage || !ownerId) { unavailable(); return; }
      const wasDirty = dirty;
      dirty = false;
      load(true);
      if (state.status === 'unavailable' || state.status === 'invalid') dirty = wasDirty;
      if (dirty) controller.flush();
      emit();
    },
    replace: () => {
      if (!storage || !ownerId || completed) { unavailable(); return; }
      try {
        expectedRaw = storage.getItem(key);
        state = { ...state, status: 'pending', error: null };
        dirty = true;
        controller.flush();
      } catch { unavailable(); }
    },
    discard: () => {
      if (completed) return;
      if (!storage || !ownerId) { unavailable(); return; }
      try {
        storage?.removeItem(key);
        expectedRaw = null;
        dirty = false;
        state = { value: createInitial(), status: 'empty', savedAt: null, needsReview: false, error: null };
        emit();
      } catch { unavailable(); }
    },
    complete: () => {
      completed = true;
      dirty = false;
      try { if (storage && storage.getItem(key) === expectedRaw) storage.removeItem(key); } catch { /* Never turn a confirmed submission into an error because local cleanup failed. */ }
    },
    externalChange: () => {
      if (completed || !storage || !ownerId) return;
      try {
        if (storage.getItem(key) !== expectedRaw) {
          state = { ...state, status: 'conflict', error: 'El borrador cambió en otra pestaña. Elija qué versión conservar.' };
          emit();
        }
      } catch { unavailable(); }
    },
    hasUnsavedChanges: () => dirty && !completed,
  };
  return controller;
}
