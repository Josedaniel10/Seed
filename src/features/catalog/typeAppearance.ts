import type { VisualIdentity } from '../../lib/visualIdentity.ts';

export function getTypeAppearance(type?: VisualIdentity & { code?: string; name?: string }): { icon_key: string; accent_color: string } {
  const name = `${type?.code ?? ''} ${type?.name ?? ''}`.toLowerCase();
  let fallback = { icon_key: 'folder-check', accent_color: 'forest' };
  if (/rubro|presupuest|mod-rub/.test(name)) fallback = { icon_key: 'calculator', accent_color: 'amber' };
  else if (/prórroga|prorroga|pror-/.test(name)) fallback = { icon_key: 'calendar', accent_color: 'violet' };
  else if (/avance/.test(name)) fallback = { icon_key: 'chart', accent_color: 'blue' };
  else if (/cierre|final/.test(name)) fallback = { icon_key: 'file-check', accent_color: 'teal' };
  return { icon_key: type?.icon_key || fallback.icon_key, accent_color: type?.accent_color || fallback.accent_color };
}
