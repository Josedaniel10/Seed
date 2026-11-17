import { useId } from 'react';
import type { ReactElement } from 'react';
import { identityIcons, identityColors } from '../../lib/visualIdentity.ts';

export interface IdentityValue { icon_key: string; accent_color: string }

export function IdentityPicker({ value, onChange }: { value: IdentityValue; onChange: (value: IdentityValue) => void }): ReactElement {
  const id = useId();
  return <div className="space-y-5">
    <fieldset><legend className="mb-3 text-sm font-semibold">Icono</legend>
      <div className="identity-options">{identityIcons.map(({ key, label, icon: Icon }) => <label key={key} className="identity-option">
        <input type="radio" name={`${id}-icon`} value={key} checked={value.icon_key === key} onChange={() => onChange({ ...value, icon_key: key })} />
        <Icon size={22} aria-hidden="true" /><span>{label}</span>
      </label>)}</div>
    </fieldset>
    <fieldset><legend className="mb-3 text-sm font-semibold">Color de acento</legend>
      <div className="flex flex-wrap gap-2">{identityColors.map((color) => <label key={color.key} className="identity-color" title={color.label}>
        <input type="radio" name={`${id}-color`} value={color.key} checked={value.accent_color === color.key} onChange={() => onChange({ ...value, accent_color: color.key })} aria-label={color.label} />
        <span aria-hidden="true" style={{ backgroundColor: color.foreground }} />
      </label>)}</div>
    </fieldset>
  </div>;
}
