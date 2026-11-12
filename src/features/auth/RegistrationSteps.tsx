import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { Input } from '../../components/ui/Input.tsx';
import { registerSchema } from './schemas.ts';

export interface RegistrationDetails {
  fullName: string;
  email: string;
  password: string;
  academicLink: string;
  academicProgram: string;
  researchGroup: string;
}
interface RegistrationStepsProps {
  value: RegistrationDetails;
  onChange: (value: RegistrationDetails) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onError: (message: string | null) => void;
  isLoading: boolean;
}
const steps = ['Datos personales', 'Perfil académico', 'Seguridad'];
const identitySchema = z.object({ fullName: registerSchema.shape.fullName, email: registerSchema.shape.email });
const academicSchema = z.object({ academicProgram: registerSchema.shape.academicProgram });
const passwordSchema = registerSchema.shape.password;

export function RegistrationSteps({ value, onChange, onSubmit, onError, isLoading }: RegistrationStepsProps): ReactElement {
  const [step, setStep] = useState(0);
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);

  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [step]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;
    onError(null);
    const identity = identitySchema.safeParse({ fullName: value.fullName.trim(), email: value.email.trim() });
    if (!identity.success) { setStep(0); onError(identity.error.issues[0].message); return; }
    if (step === 0) { setStep(1); return; }
    const academic = academicSchema.safeParse({ academicProgram: value.academicProgram.trim() });
    if (!academic.success) { setStep(1); onError(academic.error.issues[0].message); return; }
    if (!value.academicLink || !value.researchGroup.trim()) {
      setStep(1); onError('Complete el vínculo y el grupo de investigación.'); return;
    }
    if (step === 1) { setStep(2); return; }
    const password = passwordSchema.safeParse(value.password);
    if (!password.success) { onError(password.error.issues[0].message); return; }
    if (value.password !== confirmation) { onError('Las contraseñas no coinciden.'); return; }
    await onSubmit(event);
  };

  return <form onSubmit={handleSubmit} className="registration-form">
    <div className="registration-progress" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1} aria-label={`Paso ${step + 1} de ${steps.length}`}>
      {steps.map((title, index) => <span key={title} className={index <= step ? 'is-complete' : ''} aria-hidden="true" />)}
    </div>
    <div className="registration-step-heading">
      <span>Paso {step + 1} de {steps.length}</span>
      <h3 ref={headingRef} tabIndex={-1}>{steps[step]}</h3>
    </div>
    <div className="registration-fields" key={step}>
      {step === 0 && <>
        <Input id="register-name" label="Nombre completo" autoComplete="name" name="fullName" required minLength={3} maxLength={120}
          value={value.fullName} onChange={(event) => onChange({ ...value, fullName: event.target.value })} placeholder="Su nombre y apellidos" enterKeyHint="next" />
        <Input id="register-email" label="Correo institucional" type="email" autoComplete="email" name="email" required autoCapitalize="none" spellCheck={false}
          value={value.email} onChange={(event) => onChange({ ...value, email: event.target.value })} placeholder="nombre@universidad.edu.co" enterKeyHint="go" />
      </>}
      {step === 1 && <>
        <label className="registration-select" htmlFor="register-link">Vínculo institucional
          <select id="register-link" name="academicLink" required value={value.academicLink} onChange={(event) => onChange({ ...value, academicLink: event.target.value })}>
            <option value="" disabled>Seleccione su vínculo</option>
            <option value="Docente planta">Docente de planta</option>
            <option value="Docente ocasional">Docente ocasional</option>
            <option value="Estudiante de posgrado">Estudiante de posgrado</option>
            <option value="Estudiante de pregrado">Estudiante de pregrado</option>
            <option value="Monitor de investigación">Monitor de investigación</option>
            <option value="Personal administrativo">Personal administrativo</option>
          </select>
        </label>
        <Input id="register-program" label="Programa académico o facultad" name="academicProgram" required minLength={3} maxLength={100}
          value={value.academicProgram} onChange={(event) => onChange({ ...value, academicProgram: event.target.value })} placeholder="Nombre de su programa" enterKeyHint="next" />
        <Input id="register-group" label="Grupo de investigación" name="researchGroup" required
          value={value.researchGroup} onChange={(event) => onChange({ ...value, researchGroup: event.target.value })} placeholder="Nombre de su grupo" enterKeyHint="go" />
      </>}
      {step === 2 && <>
        <div className="relative">
          <Input id="register-password" label="Contraseña" name="password" autoComplete="new-password" type={showPassword ? 'text' : 'password'} required minLength={6} maxLength={50}
            className="pr-12" helperText="Entre 6 y 50 caracteres." value={value.password} onChange={(event) => onChange({ ...value, password: event.target.value })} enterKeyHint="next" />
          <button type="button" className="auth-password-toggle" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <Input id="register-confirmation" label="Confirmar contraseña" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={6} maxLength={50}
          value={confirmation} onChange={(event) => setConfirmation(event.target.value)} enterKeyHint="done" />
      </>}
    </div>
    <div className="auth-form-actions">
      {step > 0 && <button type="button" disabled={isLoading} className="auth-back-button" onClick={() => { onError(null); setStep(step - 1); }}><ArrowLeft size={18} />Atrás</button>}
      <button type="submit" disabled={isLoading} className="auth-primary-button">
        {step < steps.length - 1 ? <>Continuar<ArrowRight size={18} /></> : (isLoading ? 'Creando cuenta…' : 'Crear cuenta')}
      </button>
    </div>
  </form>;
}
