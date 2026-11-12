import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useLocation } from 'react-router-dom';
import { useSessionStore } from '../stores/session.store.ts';

/** Keep list criteria for this user and role throughout the current browser session. */
export function useListFilter(name: string, defaultValue = ''): [string, Dispatch<SetStateAction<string>>] {
  const user = useSessionStore((state) => state.user);
  const { pathname } = useLocation();
  const storageKey = `seed:list:${user?.id}:${user?.activeRole}:${pathname}:${name}`;
  const readValue = () => {
    try { return sessionStorage.getItem(storageKey) ?? defaultValue; }
    catch { return defaultValue; }
  };
  const [stored, setStored] = useState(() => ({ key: storageKey, value: readValue() }));
  if (stored.key !== storageKey) setStored({ key: storageKey, value: readValue() });
  const value = stored.key === storageKey ? stored.value : readValue();

  useEffect(() => {
    try { sessionStorage.setItem(storageKey, value); }
    catch { /* The list remains usable when session storage is unavailable. */ }
  }, [storageKey, value]);

  const setValue: Dispatch<SetStateAction<string>> = (nextValue) => {
    setStored((previous) => ({
      key: storageKey,
      value: typeof nextValue === 'function' ? nextValue(previous.value) : nextValue,
    }));
  };
  return [value, setValue];
}
