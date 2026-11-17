import { useEffect, useId, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '../../lib/supabase.ts';
import { hasPendingAccountWrites } from '../../lib/accountDataScope.ts';
import { getAuthError, getUserError } from '../../lib/userMessages.ts';
import { ROLE_HOME_PATHS } from '../../lib/permissions.ts';
import { useSessionStore } from '../../stores/session.store.ts';
import { useCommitteeSessionsStore } from '../sessions/committeeSessionsStore.ts';
import { useMinutesStore } from '../minutes/minutesStore.ts';
import { clearPresentationData, loadPresentationData } from './presentationData.ts';
import {
  PRESENTATION_EMAILS, clearPresentationSessions, getPresentationPassword, hasPresentationSession,
  isPresentationShortcut, preparePresentationSession, rememberPresentationSession,
} from './presentationAccounts.ts';

interface PresentationSwitcherProps {
  onSwitchingChange: (switching: boolean) => void;
}

export function PresentationSwitcher({ onSwitchingChange }: PresentationSwitcherProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const busyRef = useRef(false);
  const titleId = useId();
  const helpId = useId();
  const passwordId = useId();
  const [selectedEmail, setSelectedEmail] = useState<string>(PRESENTATION_EMAILS[0]);
  const [password, setPassword] = useState(getPresentationPassword);
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [readyEmails, setReadyEmails] = useState<string[]>([]);
  const user = useSessionStore(state => state.user);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (pendingDestination === null || location.pathname !== pendingDestination) return;
    // Router navigation runs in a transition. Keep the old route unmounted until
    // its replacement commits, so its role guard cannot reject the new identity.
    onSwitchingChange(false);
    setPendingDestination(null);
  }, [pendingDestination, location.pathname, onSwitchingChange]);

  useEffect(() => {
    const client = getSupabaseClient();
    let active = true;
    const refreshReady = () => setReadyEmails(PRESENTATION_EMAILS.filter(hasPresentationSession));
    const subscription = client?.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'SIGNED_OUT') clearPresentationSessions();
      else rememberPresentationSession(session);
      refreshReady();
    }).data.subscription;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isPresentationShortcut(event) || busyRef.current) return;
      const dialog = dialogRef.current;
      if (!dialog || (document.querySelector('dialog[open]') && !dialog.open)) return;
      event.preventDefault();
      if (dialog.open) { dialog.close(); return; }
      setError(null); setNotice(null); setPassword(getPresentationPassword());
      refreshReady();
      dialog.showModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { active = false; subscription?.unsubscribe(); window.removeEventListener('keydown', handleKeyDown); clearPresentationSessions(); };
  }, []);

  const isSaving = () => hasPendingAccountWrites() || queryClient.isMutating() > 0
    || useCommitteeSessionsStore.getState().isSaving || useMinutesStore.getState().isSaving;

  const handleSwitch = async () => {
    if (busyRef.current) return;
    if (isSaving()) { setError('Hay un guardado en curso. Espera a que termine y vuelve a intentar.'); return; }
    const client = getSupabaseClient();
    if (!client) { setError('No se pudo conectar con el servicio.'); return; }
    busyRef.current = true; setBusy(true); setError(null); setNotice(null);
    let identityChanged = false;
    let navigatingToAccount = false;
    let previousSession: Session | null = null;
    try {
      const current = await client.auth.getSession();
      if (current.error) throw current.error;
      previousSession = current.data.session;
      rememberPresentationSession(previousSession);
      const prepared = await preparePresentationSession(selectedEmail,
        hasPresentationSession(selectedEmail) ? undefined : password || undefined);
      setPassword('');
      setReadyEmails(PRESENTATION_EMAILS.filter(hasPresentationSession));
      if (isSaving()) throw new Error('Hay un guardado en curso. Espera a que termine y vuelve a intentar.');
      onSwitchingChange(true);
      await queryClient.cancelQueries();
      queryClient.clear();
      clearPresentationData();
      identityChanged = true;
      await useSessionStore.getState().activatePreparedSession(prepared);
      const refreshed = await client.auth.getSession();
      rememberPresentationSession(refreshed.data.session);
      const loaded = await loadPresentationData();
      const nextUser = useSessionStore.getState().user;
      if (!nextUser) throw new Error('No se pudo completar el cambio de cuenta.');
      const destination = ROLE_HOME_PATHS[nextUser.activeRole];
      navigate(destination, { replace: true });
      setPendingDestination(destination);
      navigatingToAccount = true;
      if (loaded) dialogRef.current?.close();
      else setNotice('La cuenta cambió, pero algunos datos no pudieron actualizarse. Puedes reintentar la carga o cerrar el modal para continuar.');
    } catch (cause) {
      if (identityChanged) {
        clearPresentationData();
        try {
          if (previousSession) await useSessionStore.getState().activatePreparedSession(previousSession);
          else await useSessionStore.getState().logout();
          await loadPresentationData();
        } catch { /* The session store fails closed if restoration is denied. */ }
      }
      setPassword(getPresentationPassword());
      setReadyEmails(PRESENTATION_EMAILS.filter(hasPresentationSession));
      setError(identityChanged || (cause instanceof Error && !('code' in cause))
        ? getUserError(cause, 'No se pudo completar el cambio de cuenta. Vuelve a intentar.')
        : getAuthError(cause, 'login'));
    } finally {
      busyRef.current = false; setBusy(false);
      if (!navigatingToAccount) onSwitchingChange(false);
    }
  };

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={helpId}
      className="presentation-switcher" onCancel={event => { if (busyRef.current) event.preventDefault(); }}
      onClose={() => { setPassword(''); }}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div><p className="text-xs uppercase tracking-widest text-stone-500 mb-1">Modo presentación</p>
          <h2 id={titleId} className="text-xl font-semibold">Cambiar cuenta</h2></div>
        <button type="button" autoFocus disabled={busy} onClick={() => dialogRef.current?.close()}
          className="rounded-lg px-3 py-2 hover:bg-stone-100 disabled:opacity-50" aria-label="Cerrar cambio de cuenta">✕</button>
      </div>
      <p id={helpId} className="text-sm text-stone-600 mb-4">Ctrl + Shift + . abre este modal. Guarda tus cambios antes de continuar. Los datos y las acciones son reales.</p>
      <p className="text-xs text-stone-500 mb-4 break-all">Cuenta activa: {user?.email ?? 'Sin sesión'}</p>
      <form onSubmit={event => { event.preventDefault(); void handleSwitch(); }}>
        <fieldset disabled={busy} className="space-y-2">
          <legend className="text-sm font-medium mb-2">Selecciona una cuenta</legend>
          {PRESENTATION_EMAILS.map(email => (
            <label key={email} className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${selectedEmail === email ? 'border-green-800 bg-green-50' : 'border-stone-200'}`}>
              <input type="radio" name="presentation-account" value={email} checked={selectedEmail === email}
                onChange={() => { setSelectedEmail(email); setPassword(getPresentationPassword()); setError(null); setNotice(null); }} />
              <span className="min-w-0"><span className="block text-sm break-all">{email}</span>
                <span className="block text-xs text-stone-500">{user?.email === email ? 'Activa' : readyEmails.includes(email) ? 'Preparada' : 'Requiere contraseña una vez'}</span></span>
            </label>
          ))}
          {!readyEmails.includes(selectedEmail) && <div className="pt-3">
            <label htmlFor={passwordId} className="block text-sm font-medium mb-1">Contraseña de la cuenta</label>
            <input id={passwordId} type="password" autoComplete="off" required value={password}
              onChange={event => setPassword(event.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2" />
            <p className="text-xs text-stone-500 mt-2">Las sesiones preparadas se conservan hasta recargar o cerrar la página, o cerrar sesión.</p>
          </div>}
        </fieldset>
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-4 text-sm text-amber-800">{notice}</p>}
        <button type="submit" disabled={busy} className="mt-5 w-full rounded-xl bg-[#14281D] text-white py-3 font-medium disabled:opacity-60">
          {busy ? 'Validando cuenta y actualizando datos…' : notice ? 'Reintentar carga' : 'Cambiar cuenta'}
        </button>
      </form>
    </dialog>
  );
}
