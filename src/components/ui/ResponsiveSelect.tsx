import { Children, createContext, isValidElement, useContext, useRef, useState } from 'react';
import type { ReactElement, ReactNode, SelectHTMLAttributes } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Modal } from './Modal.tsx';

interface ResponsiveSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  sheetTitle: string;
}
export const SelectPresentationContext = createContext<'adaptive' | 'inline'>('adaptive');
interface OptionProps {
  value?: string | number;
  children?: ReactNode;
  disabled?: boolean;
}

function readOptions(children: ReactNode): OptionProps[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<OptionProps>(child)) return [];
    if (child.type === 'option') return [child.props];
    return readOptions(child.props.children);
  });
}

/** Controlled filters retain their native select and existing change handler. */
export function ResponsiveSelect({ sheetTitle, children, className = '', ...props }: ResponsiveSelectProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const presentation = useContext(SelectPresentationContext);
  const selectRef = useRef<HTMLSelectElement>(null);
  const options = readOptions(children);
  const selectedOption = options.find((option) => String(option.value) === String(props.value));

  if (presentation === 'inline') {
    return <label className="filter-sheet-field">
      <span>{sheetTitle}</span>
      <select {...props} aria-label={props['aria-label'] ?? sheetTitle} className={className}>{children}</select>
    </label>;
  }

  return <>
    <select ref={selectRef} {...props} aria-label={props['aria-label'] ?? sheetTitle} className={`hidden md:block ${className}`}>{children}</select>
    <button type="button" disabled={props.disabled} aria-label={sheetTitle}
      aria-haspopup="dialog" aria-expanded={isOpen} onClick={() => setIsOpen(true)}
      className={`md:hidden flex items-center justify-between gap-2 text-left ${className}`}>
      <span className="min-w-0 truncate">{selectedOption?.children ?? sheetTitle}</span><ChevronDown size={18} className="shrink-0" />
    </button>
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={sheetTitle} maxWidth="sm">
      <div className="space-y-1">
        {options.map((option) => <button key={String(option.value)} type="button" disabled={option.disabled}
          aria-pressed={String(option.value) === String(props.value)} className="sheet-menu-item w-full text-left disabled:opacity-40"
          onClick={() => {
            const select = selectRef.current;
            if (select) {
              select.value = String(option.value ?? '');
              select.dispatchEvent(new Event('change', { bubbles: true }));
            }
            setIsOpen(false);
          }}>
          <span className="flex-1">{option.children}</span>
          {String(option.value) === String(props.value) && <Check size={20} />}
        </button>)}
      </div>
    </Modal>
  </>;
}
