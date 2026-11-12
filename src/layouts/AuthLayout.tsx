import type { ReactElement } from 'react';
import { useLayoutEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, FileCheck, Sprout } from 'lucide-react';
import { SeedLogo } from '../components/SeedLogo.tsx';

export function AuthLayout(): ReactElement {
  const { pathname } = useLocation();
  const isRegistration = pathname === '/registro';
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return (
    <main className={`auth-page ${isRegistration ? 'auth-page-registration' : ''}`}>
      <div className="auth-shell">
        <section className="auth-intro" aria-labelledby="auth-intro-title">
          <Link to="/" aria-label="Seed, inicio" className="auth-brand">
            <SeedLogo size={36} wordmarkClassName="text-2xl font-bold text-white" />
          </Link>
          <div className="auth-art" aria-hidden="true">
            <div className="auth-orbit" /><div className="auth-seed-glass"><Sprout strokeWidth={1} /></div>
          </div>
          <div className="auth-intro-copy">
            <p className="auth-eyebrow">Comité de Investigación</p>
            <h1 id="auth-intro-title">Las grandes ideas<br />empiezan con<br /><em>una semilla.</em></h1>
            <p>Un espacio para impulsar su investigación. Radique solicitudes, acompañe su avance y conecte con el comité.</p>
          </div>
          <div className="auth-intro-footer"><FileCheck size={18} /><span>De la primera idea al siguiente logro.</span><ArrowUpRight size={18} /></div>
        </section>
        <section className="auth-form-panel" aria-label={isRegistration ? 'Registro de investigadores' : 'Acceso a Seed'}>
          <div className="auth-form-content"><Outlet /></div>
          <p className="auth-footer">Seed · Gestión de la investigación</p>
        </section>
      </div>
    </main>
  );
}
