import { createContext } from 'react';

export const AlertViewportContext = createContext<HTMLElement | null>(null);
export type AlertTone = 'success' | 'error' | 'warning' | 'info';
