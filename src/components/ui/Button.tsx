import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon,
  iconRight,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-xs px-3.5 py-2 gap-2 font-semibold',
    lg: 'text-sm px-4.5 py-2.5 gap-2.5 font-bold',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-[#14281D] hover:bg-[#1E3A2B] text-white shadow-xs active:scale-[0.99] border border-[#14281D]',
    accent:
      'bg-[#A3E635] hover:bg-[#84CC16] text-[#14281D] font-bold border border-[#84CC16] shadow-xs active:scale-[0.99]',
    secondary:
      'bg-[#F7F6F2] hover:bg-[#EFECE6] text-[#14281D] border border-[#E5E3DC] active:scale-[0.99]',
    outline:
      'bg-transparent hover:bg-stone-100 text-stone-700 border border-stone-200 active:scale-[0.99]',
    ghost:
      'bg-transparent hover:bg-stone-100 text-stone-600 hover:text-[#14281D]',
    danger:
      'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 active:scale-[0.99]',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 size={14} className="animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {!isLoading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
}
