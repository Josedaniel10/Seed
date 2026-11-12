import React from 'react';
import { ResponsiveOverlay } from './ResponsiveOverlay.tsx';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = 'lg',
}: ModalProps) {
  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <ResponsiveOverlay isOpen={isOpen} onClose={onClose} label={title}>
      <div
        className={`bg-white rounded-2xl w-full ${maxWidthStyles[maxWidth]} border border-[#E5E3DC] shadow-xl overflow-hidden`}
      >
        <div className="px-6 py-4 bg-[#F7F6F2] border-b border-[#E5E3DC] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {icon && <div className="text-[#14281D]">{icon}</div>}
            <div>
              <h3 className="font-bold text-sm text-[#14281D] leading-tight">{title}</h3>
              {subtitle && <p className="text-[11px] text-stone-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6 text-xs">{children}</div>
      </div>
    </ResponsiveOverlay>
  );
}
