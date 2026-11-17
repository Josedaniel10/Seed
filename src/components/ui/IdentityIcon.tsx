import type { ReactElement } from 'react';
import { getIdentityColor, identityIcons } from '../../lib/visualIdentity.ts';
import type { VisualIdentity } from '../../lib/visualIdentity.ts';

export function IdentityIcon({ icon_key, accent_color, size = 22 }: VisualIdentity & { size?: number }): ReactElement {
  const Icon = (identityIcons.find((item) => item.key === icon_key) ?? identityIcons[0]).icon;
  const color = getIdentityColor(accent_color);
  return <span aria-hidden="true" className="identity-icon" style={{ color: color.foreground, backgroundColor: color.background }}>
    <Icon size={size} strokeWidth={1.7} />
  </span>;
}
