import { useEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { AlertTone } from './alertContext.ts';
import { getUserError } from '../../lib/userMessages.ts';

const appearance = {
  success: { icon: CheckCircle2, title: 'Acción completada' },
  error: { icon: AlertCircle, title: 'Ocurrió un problema' },
  warning: { icon: AlertTriangle, title: 'Atención' },
  info: { icon: Info, title: 'Información' },
};

interface AlertCardProps {
  message: string;
  tone: AlertTone;
  duration: number | null;
  dismissible: boolean;
  onDismiss: () => void;
  children?: ReactNode;
}

export function AlertCard({ message, tone, duration, dismissible, onDismiss, children }: AlertCardProps): ReactElement {
  const reducedMotion = useReducedMotion();
  const isPresent = useIsPresent();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const remaining = useRef(duration);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const { icon: Icon, title } = appearance[tone];

  useEffect(() => { remaining.current = duration; }, [duration]);

  useEffect(() => {
    const updateVisibility = () => setHidden(document.visibilityState === 'hidden');
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => {
    if (duration === null || hovered || focused || hidden) return;
    const started = Date.now();
    const timer = window.setTimeout(() => dismissRef.current(), Math.max(0, remaining.current ?? duration));
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, (remaining.current ?? duration) - (Date.now() - started));
    };
  }, [duration, hovered, focused, hidden]);

  return <motion.div layout={!reducedMotion} className={`alert-card alert-card-${tone}`}
    aria-hidden={!isPresent || undefined} inert={!isPresent || undefined}
    initial={{ opacity: 0, x: reducedMotion ? 0 : 24, y: reducedMotion ? 0 : -8 }}
    animate={{ opacity: 1, x: 0, y: 0 }}
    exit={{ opacity: 0, x: reducedMotion ? 0 : 24, scale: reducedMotion ? 1 : 0.98, pointerEvents: 'none' }}
    transition={{ duration: reducedMotion ? 0 : 0.24, ease: 'easeOut' }}
    onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    }}>
    <Icon className="alert-icon" size={20} aria-hidden="true" />
    <div className="min-w-0 flex-1">
      <div role={tone === 'error' ? 'alert' : 'status'} aria-atomic="true">
        <p className="alert-title">{title}</p>
        <p className="alert-message">{getUserError(message, tone === 'success' ? 'La acción se completó correctamente.' : tone === 'info' ? 'Consulta la información actualizada en esta página.' : undefined)}</p>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
    {dismissible && <button type="button" className="alert-close" aria-label="Cerrar aviso" onClick={onDismiss}><X size={17} aria-hidden="true" /></button>}
  </motion.div>;
}
