import { FolderCheck, Calculator, CalendarDays, ChartNoAxesCombined, FileCheck2, FlaskConical, Megaphone, GraduationCap, Users, Leaf } from 'lucide-react';

export const identityIcons = [
  { key: 'folder-check', label: 'Proyecto', icon: FolderCheck },
  { key: 'calculator', label: 'Presupuesto', icon: Calculator },
  { key: 'calendar', label: 'Calendario', icon: CalendarDays },
  { key: 'chart', label: 'Avance', icon: ChartNoAxesCombined },
  { key: 'file-check', label: 'Informe', icon: FileCheck2 },
  { key: 'flask', label: 'Investigación', icon: FlaskConical },
  { key: 'megaphone', label: 'Convocatoria', icon: Megaphone },
  { key: 'graduation', label: 'Formación', icon: GraduationCap },
  { key: 'users', label: 'Equipo', icon: Users },
  { key: 'leaf', label: 'Innovación', icon: Leaf },
];

export const identityColors = [
  { key: 'forest', label: 'Verde institucional', foreground: '#28543b', background: '#eaf2e7' },
  { key: 'blue', label: 'Azul', foreground: '#245b91', background: '#eaf2fb' },
  { key: 'violet', label: 'Violeta', foreground: '#694298', background: '#f2ecfa' },
  { key: 'amber', label: 'Ámbar', foreground: '#8b5513', background: '#fcf2df' },
  { key: 'rose', label: 'Rosa', foreground: '#9b3f61', background: '#fbeef3' },
  { key: 'teal', label: 'Turquesa', foreground: '#226c69', background: '#e6f4f1' },
];

export interface VisualIdentity { icon_key?: string | null; accent_color?: string | null }

export function getIdentityColor(key?: string | null): (typeof identityColors)[number] {
  return identityColors.find((color) => color.key === key) ?? identityColors[0];
}
